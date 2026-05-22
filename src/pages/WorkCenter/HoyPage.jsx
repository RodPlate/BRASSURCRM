import { useEffect, useMemo, useState, useCallback } from 'react';
import { subscribeSuppliers } from '../../services/suppliersService';
import { subscribeContacts } from '../../services/contactsService';
import { subscribeActivities } from '../../services/activitiesService';
import { subscribeOpportunities } from '../../services/opportunitiesService';
import { subscribePendingVisitPhotos } from '../../services/visitPhotosService';
import { markFollowUpComplete } from '../../services/followUpsService';
import { createActivity } from '../../services/activitiesService';
import { addQuickNote } from '../../services/timelineService';
import { subscribeWorkDayProgress, recordTaskCompleted } from '../../services/workDayService';
import {
  buildWorkCenterSnapshot,
  buildGreetingMessage,
  hasWorkCenterTasks,
} from '../../utils/workCenter';
import { useAuth } from '../../context/AuthContext';
import { toInputDate } from '../../utils/format';
import StatusBadge from '../../components/common/StatusBadge';
import NegotiationBadge from '../../components/common/NegotiationBadge';
import ActivityFormModal from '../../components/activities/ActivityFormModal';
import SupplierDetailPanel from '../Suppliers/SupplierDetailPanel';
import WorkCenterTaskCard, { FollowUpMeta } from '../../components/workCenter/WorkCenterTaskCard';
import '../../styles/workCenter.css';

const REQUIRED_SOURCES = ['suppliers', 'activities', 'opportunities'];

function Section({ variant, title, count, children }) {
  return (
    <section className={`work-center-section work-center-section--${variant}`}>
      <header className="work-center-section__head">
        <h3>{title}</h3>
        <span className="work-center-section__count">{count}</span>
      </header>
      <div className="work-center-section__body">{children}</div>
    </section>
  );
}

export default function HoyPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [pendingPhotosCount, setPendingPhotosCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sourcesReady, setSourcesReady] = useState({
    suppliers: false,
    activities: false,
    opportunities: false,
  });
  const [workProgress, setWorkProgress] = useState({ completedCount: 0 });
  const [busyId, setBusyId] = useState(null);
  const [activityModal, setActivityModal] = useState(null);
  const [detailSupplier, setDetailSupplier] = useState(null);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const userEmail = user?.email || '';

  const markSourceReady = useCallback((source) => {
    setSourcesReady((prev) => ({ ...prev, [source]: true }));
  }, []);

  const handleSourceError = useCallback(
    (source, error) => {
      console.error('[Hoy] error:', error);
      const msg = error?.message || String(error);
      setLoadError((prev) => prev || `Error al cargar ${source}: ${msg}`);
      markSourceReady(source);
    },
    [markSourceReady]
  );

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    setSourcesReady({
      suppliers: false,
      activities: false,
      opportunities: false,
    });

    let unsubs = [];

    try {
      unsubs = [
        subscribeSuppliers(
          (data) => {
            console.log('[Hoy] suppliers:', data.length);
            setSuppliers(data);
            markSourceReady('suppliers');
          },
          (err) => handleSourceError('suppliers', err)
        ),
        subscribeActivities(
          (data) => {
            console.log('[Hoy] activities:', data.length);
            setActivities(data);
            markSourceReady('activities');
          },
          (err) => handleSourceError('activities', err)
        ),
        subscribeOpportunities(
          (data) => {
            console.log('[Hoy] opportunities:', data.length);
            setOpportunities(data);
            markSourceReady('opportunities');
          },
          (err) => handleSourceError('opportunities', err)
        ),
        subscribeContacts(
          (data) => setContacts(data),
          (err) => console.error('[Hoy] error contacts (no bloquea):', err)
        ),
        subscribePendingVisitPhotos(
          (data) => {
            console.log('[Hoy] photos pendientes:', data.length);
            setPendingPhotosCount(data.length);
          },
          (err) => console.error('[Hoy] error visitPhotos (no bloquea):', err)
        ),
      ];
    } catch (err) {
      console.error('[Hoy] error:', err);
      setLoadError(err.message || 'Error al iniciar suscripciones');
      REQUIRED_SOURCES.forEach((s) => markSourceReady(s));
    }

    return () => unsubs.forEach((u) => u?.());
  }, [markSourceReady, handleSourceError]);

  useEffect(() => {
    const allReady = REQUIRED_SOURCES.every((key) => sourcesReady[key]);
    if (allReady) {
      setLoading(false);
    }
  }, [sourcesReady]);

  useEffect(() => {
    if (!userEmail) return undefined;
    return subscribeWorkDayProgress(
      userEmail,
      setWorkProgress,
      (err) => console.error('[Hoy] error workDayProgress (no bloquea):', err)
    );
  }, [userEmail]);

  const snapshot = useMemo(
    () => buildWorkCenterSnapshot(suppliers, activities, opportunities),
    [suppliers, activities, opportunities]
  );

  const greeting = useMemo(
    () =>
      buildGreetingMessage(
        user,
        snapshot.seguimientosCount,
        snapshot.priorityOpportunities
      ),
    [user, snapshot.seguimientosCount, snapshot.priorityOpportunities]
  );

  const showGlobalEmpty = !hasWorkCenterTasks(snapshot);

  const handleComplete = async (item) => {
    setBusyId(item.id);
    try {
      await markFollowUpComplete(item);
      if (userEmail) await recordTaskCompleted(userEmail, item.id);
    } catch (err) {
      console.error('[Hoy] error:', err);
      alert(err.message || 'No se pudo marcar como realizado');
    } finally {
      setBusyId(null);
    }
  };

  const quickActivity = async (supplierId, type, summary) => {
    setBusyId(`quick-${supplierId}-${type}`);
    try {
      await createActivity({
        supplierId,
        contactId: null,
        type,
        date: toInputDate(new Date()),
        summary,
        nextAction: '',
        nextFollowUpDate: null,
      });
      const key = `quick-activity-${supplierId}-${Date.now()}`;
      if (userEmail) await recordTaskCompleted(userEmail, key);
    } catch (err) {
      console.error('[Hoy] error:', err);
      alert(err.message || 'Error al registrar actividad');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTarget || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      await addQuickNote(noteTarget, noteText.trim());
      const key = `note-${noteTarget}-${Date.now()}`;
      if (userEmail) await recordTaskCompleted(userEmail, key);
      setNoteTarget(null);
      setNoteText('');
    } catch (err) {
      console.error('[Hoy] error:', err);
      alert(err.message || 'No se pudo guardar la nota');
    } finally {
      setNoteSaving(false);
    }
  };

  const openSupplier = (supplierId) => {
    const s = suppliers.find((x) => x.id === supplierId);
    if (s) setDetailSupplier(s);
  };

  const actionButtons = (item, { showComplete = true } = {}) => (
    <>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        title="Llamada"
        disabled={!!busyId}
        onClick={() => quickActivity(item.supplierId, 'Llamada', 'Llamada registrada desde Centro de Trabajo')}
      >
        📞
      </button>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        title="WhatsApp"
        disabled={!!busyId}
        onClick={() => quickActivity(item.supplierId, 'WhatsApp', 'WhatsApp registrado desde Centro de Trabajo')}
      >
        💬
      </button>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        title="Nota rápida"
        disabled={!!busyId}
        onClick={() => {
          setNoteTarget(item.supplierId);
          setNoteText('');
        }}
      >
        📝
      </button>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        title="Nueva actividad"
        disabled={!!busyId}
        onClick={() => setActivityModal({ supplierId: item.supplierId })}
      >
        + Act.
      </button>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        title="Abrir ficha"
        disabled={!!busyId}
        onClick={() => openSupplier(item.supplierId)}
      >
        Ficha
      </button>
      {showComplete && (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          title="Marcar realizado"
          disabled={busyId === item.id}
          onClick={() => handleComplete(item)}
        >
          ✓
        </button>
      )}
    </>
  );

  const renderFollowUpList = (items, opts = {}) => {
    if (!items.length) {
      return (
        <div className="empty-state empty-state--compact">
          <p>Sin tareas en esta sección.</p>
        </div>
      );
    }
    return items.map((item) => (
      <WorkCenterTaskCard
        key={item.id}
        title={item.supplierName}
        meta={<FollowUpMeta item={item} {...opts} />}
        badge={opts.showOverdue && item.overdueDays > 0 ? `Vencido hace ${item.overdueDays} días` : null}
        actions={actionButtons(item, { showComplete: opts.showComplete !== false })}
      />
    ));
  };

  if (loading) {
    return <div className="loading">Cargando centro de trabajo…</div>;
  }

  const { vencidos, todayGroups, proximos7, hotOpportunities, topSuppliers } = snapshot;

  return (
    <div className="work-center-page">
      {loadError && (
        <div className="alert alert--error" role="alert">
          {loadError}
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            Se muestran los datos disponibles. Revise la consola o las reglas de Firestore.
          </p>
        </div>
      )}

      <div className="page-header">
        <div>
          <h2>Hoy</h2>
          <p>Centro de trabajo — tareas comerciales del día</p>
        </div>
      </div>

      <div className="work-center-greeting">
        <strong>Centro de Trabajo</strong>
        <p>{greeting}</p>
      </div>

      <div className="work-center-stats">
        <div className="work-center-stat">
          <strong>{workProgress.completedCount ?? 0}</strong>
          <span>Tareas realizadas hoy</span>
        </div>
        <div className="work-center-stat">
          <strong>{snapshot.seguimientosCount}</strong>
          <span>Seguimientos pendientes</span>
        </div>
        <div className="work-center-stat">
          <strong>{snapshot.priorityOpportunities}</strong>
          <span>Oportunidades prioritarias</span>
        </div>
        {pendingPhotosCount > 0 && (
          <div className="work-center-stat">
            <strong>{pendingPhotosCount}</strong>
            <span>Fotos pendientes de asignar</span>
          </div>
        )}
      </div>

      {showGlobalEmpty && (
        <div className="empty-state work-center-empty">
          <p>No hay tareas pendientes para hoy</p>
          <p className="text-muted">
            Configure fechas de seguimiento en proveedores, actividades u oportunidades, o revise
            la bandeja de fotos si tiene capturas sin asignar.
          </p>
        </div>
      )}

      {noteTarget && (
        <div className="work-center-note-form">
          <h4>Nota rápida</h4>
          <textarea
            className="form-textarea"
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escriba la nota…"
            disabled={noteSaving}
          />
          <div className="work-center-actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleSaveNote}
              disabled={noteSaving}
            >
              {noteSaving ? 'Guardando…' : 'Guardar nota'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setNoteTarget(null)}
              disabled={noteSaving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Section variant="overdue" title="Vencidos" count={vencidos.length}>
        {renderFollowUpList(vencidos, { showOverdue: true, showLastActivity: true })}
      </Section>

      <Section variant="today" title="Hoy" count={snapshot.hoy.length}>
        {todayGroups.seguimientos.length > 0 && (
          <>
            <p className="work-center-subtitle">Seguimientos de hoy</p>
            {renderFollowUpList(todayGroups.seguimientos)}
          </>
        )}
        {todayGroups.llamadas.length > 0 && (
          <>
            <p className="work-center-subtitle">Llamadas</p>
            {renderFollowUpList(todayGroups.llamadas)}
          </>
        )}
        {todayGroups.reuniones.length > 0 && (
          <>
            <p className="work-center-subtitle">Reuniones</p>
            {renderFollowUpList(todayGroups.reuniones)}
          </>
        )}
        {todayGroups.visitas.length > 0 && (
          <>
            <p className="work-center-subtitle">Visitas</p>
            {renderFollowUpList(todayGroups.visitas)}
          </>
        )}
        {todayGroups.whatsapp.length > 0 && (
          <>
            <p className="work-center-subtitle">WhatsApp</p>
            {renderFollowUpList(todayGroups.whatsapp)}
          </>
        )}
        {snapshot.hoy.length === 0 && (
          <div className="empty-state empty-state--compact">
            <p>No hay seguimientos programados para hoy.</p>
          </div>
        )}
      </Section>

      <Section variant="week" title="Próximos 7 días" count={proximos7.length}>
        {renderFollowUpList(proximos7, { showComplete: true })}
      </Section>

      <Section variant="hot" title="Oportunidades calientes" count={hotOpportunities.length}>
        {hotOpportunities.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No hay oportunidades en Negociando con prioridad Alta sin actividad reciente.</p>
          </div>
        ) : (
          hotOpportunities.map((row) => (
            <WorkCenterTaskCard
              key={row.opportunity.id}
              title={row.supplierName}
              meta={`${row.material} · Negociando · Prioridad Alta${
                row.daysWithoutActivity != null
                  ? ` · Sin actividad ${row.daysWithoutActivity} días`
                  : ' · Sin actividad registrada'
              }`}
              actions={
                <>
                  <NegotiationBadge value={row.opportunity.negotiationStatus} />
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={!!busyId}
                    onClick={() =>
                      quickActivity(
                        row.supplier.id,
                        'Llamada',
                        `Seguimiento oportunidad ${row.material}`
                      )
                    }
                  >
                    📞
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => openSupplier(row.supplier.id)}
                  >
                    Ficha
                  </button>
                </>
              }
            />
          ))
        )}
      </Section>

      <Section variant="top" title="Top proveedores a contactar" count={topSuppliers.length}>
        {topSuppliers.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No hay proveedores priorizados por el momento.</p>
          </div>
        ) : (
          topSuppliers.map((row) => (
            <WorkCenterTaskCard
              key={row.supplier.id}
              title={row.supplier.companyName}
              score={row.score}
              meta={`Volumen: ${row.volumeKg || 0} kg/mes · ${
                row.openOpportunities
              } oportunidad(es) abierta(s)${
                row.daysSinceContact != null
                  ? ` · Último contacto hace ${row.daysSinceContact} días`
                  : ' · Sin actividad registrada'
              }`}
              actions={
                <>
                  <StatusBadge value={row.supplier.status} />
                  <StatusBadge value={row.supplier.priority} type="priority" />
                  {actionButtons(
                    {
                      id: `top-${row.supplier.id}`,
                      supplierId: row.supplier.id,
                      supplierName: row.supplier.companyName,
                    },
                    { showComplete: false }
                  )}
                </>
              }
            />
          ))
        )}
      </Section>

      <ActivityFormModal
        open={activityModal !== null}
        onClose={() => setActivityModal(null)}
        defaultSupplierId={activityModal?.supplierId || ''}
        suppliers={suppliers}
        contacts={contacts}
        lockSupplier={Boolean(activityModal?.supplierId)}
      />

      {detailSupplier && (
        <SupplierDetailPanel
          supplier={detailSupplier}
          contacts={contacts}
          activities={activities}
          opportunities={opportunities}
          suppliers={suppliers}
          allContacts={contacts}
          onClose={() => setDetailSupplier(null)}
          onEditSupplier={() => setDetailSupplier(null)}
        />
      )}
    </div>
  );
}

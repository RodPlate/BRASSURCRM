import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { subscribeSuppliers } from '../../services/suppliersService';
import { subscribeContacts } from '../../services/contactsService';
import { subscribeActivities } from '../../services/activitiesService';
import { subscribeOpportunities } from '../../services/opportunitiesService';
import { markFollowUpComplete, rescheduleFollowUp } from '../../services/followUpsService';
import {
  buildFollowUpItems,
  filterFollowUpItems,
  groupByBucket,
  computeFollowUpStats,
  bucketLabels,
  FOLLOW_UP_TYPES,
  DATE_BUCKETS,
} from '../../utils/followUps';
import { PRIORITIES } from '../../constants/enums';
import { formatDate } from '../../utils/format';
import StatusBadge from '../../components/common/StatusBadge';
import NegotiationBadge from '../../components/common/NegotiationBadge';
import RescheduleModal from '../../components/followups/RescheduleModal';
import ActivityFormModal from '../../components/activities/ActivityFormModal';
import SupplierDetailPanel from '../Suppliers/SupplierDetailPanel';
import { useMobileActions } from '../../context/MobileActionsContext';

const REQUIRED_SOURCES = ['suppliers', 'activities', 'opportunities'];

function FollowUpTable({ items, supplierMap, onComplete, onReschedule, onNewActivity, onOpenSupplier, busyId }) {
  if (items.length === 0) {
    return (
      <div className="empty-state empty-state--compact">
        <p>Sin seguimientos en esta sección.</p>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper followups-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Proveedor</th>
            <th>Detalle</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Acción rápida</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatDate(item.date)}</td>
              <td><span className={`followup-type followup-type--${item.sourceType.toLowerCase()}`}>{item.sourceType}</span></td>
              <td>{supplierMap[item.supplierId] || '—'}</td>
              <td>{item.detail}</td>
              <td>
                {item.sourceType === 'Oportunidad' ? (
                  <NegotiationBadge value={item.status} />
                ) : item.sourceType === 'Proveedor' ? (
                  <StatusBadge value={item.status} />
                ) : (
                  <span className="badge badge--contactado">{item.status}</span>
                )}
              </td>
              <td>
                {item.priority !== '—' ? (
                  <StatusBadge value={item.priority} type="priority" />
                ) : (
                  '—'
                )}
              </td>
              <td>
                <div className="followups-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={busyId === item.id}
                    onClick={() => onComplete(item)}
                    title="Marcar como realizado"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => onNewActivity(item)}
                    title="Nueva actividad"
                  >
                    + Act.
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => onReschedule(item)}
                    title="Cambiar fecha"
                  >
                    📅
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => onOpenSupplier(item.supplierId)}
                    title="Abrir ficha"
                  >
                    Ficha
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FollowUpsPage() {
  const { openEditSupplier } = useMobileActions();
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sourcesReady, setSourcesReady] = useState({
    suppliers: false,
    activities: false,
    opportunities: false,
  });

  const [bucketFilter, setBucketFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [activitySupplierId, setActivitySupplierId] = useState(null);
  const [detailSupplier, setDetailSupplier] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const markSourceReady = useCallback((source) => {
    setSourcesReady((prev) => ({ ...prev, [source]: true }));
  }, []);

  const handleSourceError = useCallback(
    (source, error) => {
      console.error('[Seguimientos] error:', error);
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
            console.log('[Seguimientos] suppliers cargados:', data.length);
            setSuppliers(data);
            markSourceReady('suppliers');
          },
          (err) => handleSourceError('suppliers', err)
        ),
        subscribeActivities(
          (data) => {
            console.log('[Seguimientos] activities cargadas:', data.length);
            setActivities(data);
            markSourceReady('activities');
          },
          (err) => handleSourceError('activities', err)
        ),
        subscribeOpportunities(
          (data) => {
            console.log('[Seguimientos] opportunities cargadas:', data.length);
            setOpportunities(data);
            markSourceReady('opportunities');
          },
          (err) => handleSourceError('opportunities', err)
        ),
        subscribeContacts(
          (data) => setContacts(data),
          (err) => console.error('[Seguimientos] error contacts (no bloquea):', err)
        ),
      ];
    } catch (err) {
      console.error('[Seguimientos] error:', err);
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

  const allItems = useMemo(
    () => buildFollowUpItems(suppliers, activities, opportunities),
    [suppliers, activities, opportunities]
  );

  const stats = useMemo(() => computeFollowUpStats(allItems), [allItems]);

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.companyName])),
    [suppliers]
  );

  const statusOptions = useMemo(() => {
    const set = new Set(allItems.map((i) => i.status).filter((s) => s && s !== '—'));
    return [...set].sort();
  }, [allItems]);

  const filtered = useMemo(
    () =>
      filterFollowUpItems(allItems, {
        bucket: bucketFilter,
        supplierId: supplierFilter,
        sourceType: typeFilter,
        status: statusFilter,
        priority: priorityFilter,
        dateFrom,
        dateTo,
      }),
    [allItems, bucketFilter, supplierFilter, typeFilter, statusFilter, priorityFilter, dateFrom, dateTo]
  );

  const grouped = useMemo(() => groupByBucket(filtered), [filtered]);

  const handleComplete = async (item) => {
    setBusyId(item.id);
    try {
      await markFollowUpComplete(item);
    } catch (err) {
      console.error('[Seguimientos] error:', err);
      alert(err.message || 'No se pudo marcar como realizado');
    } finally {
      setBusyId(null);
    }
  };

  const handleRescheduleSave = async (dateString) => {
    try {
      await rescheduleFollowUp(rescheduleItem, dateString);
    } catch (err) {
      console.error('[Seguimientos] error:', err);
      alert(err.message || 'No se pudo reprogramar');
      throw err;
    }
  };

  const openSupplier = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) setDetailSupplier(supplier);
  };

  const clearFilters = () => {
    setBucketFilter('');
    setSupplierFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setDateFrom('');
    setDateTo('');
  };

  if (loading) {
    return <div className="loading">Cargando seguimientos…</div>;
  }

  return (
    <div className="followups-page">
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
          <h2>Seguimientos</h2>
          <p>
            {filtered.length} de {allItems.length} seguimientos programados
          </p>
        </div>
        <Link to="/actividades" className="btn btn--primary">
          + Nueva actividad
        </Link>
      </div>

      {allItems.length === 0 ? (
        <div className="empty-state">
          <p>No hay seguimientos pendientes</p>
          <p className="text-muted">
            Configure fechas en proveedores (próximo seguimiento), actividades u oportunidades
            (fecha de compra estimada).
          </p>
        </div>
      ) : (
        <>
          <div className="card-grid followups-stats">
            {DATE_BUCKETS.map((key) => (
              <button
                key={key}
                type="button"
                className={`stat-card stat-card--clickable ${key === 'vencidos' ? 'stat-card--danger' : ''} ${bucketFilter === key ? 'stat-card--active' : ''}`}
                onClick={() => setBucketFilter(bucketFilter === key ? '' : key)}
              >
                <div className="stat-card__label">{bucketLabels[key]}</div>
                <div className="stat-card__value">{stats[key]}</div>
              </button>
            ))}
          </div>

          <div className="toolbar toolbar--wrap">
            <select className="filter-select" value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value)}>
              <option value="">Todas las fechas (grupos)</option>
              {DATE_BUCKETS.map((b) => (
                <option key={b} value={b}>{bucketLabels[b]}</option>
              ))}
            </select>
            <select className="filter-select" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
              <option value="">Todos los proveedores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.companyName}</option>
              ))}
            </select>
            <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Todos los tipos</option>
              {FOLLOW_UP_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">Todas las prioridades</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="date"
              className="filter-select"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Desde"
            />
            <input
              type="date"
              className="filter-select"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Hasta"
            />
            <button type="button" className="btn btn--secondary btn--sm" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>

          {DATE_BUCKETS.map((key) => (
            <section
              key={key}
              className={`followups-section followups-section--${key} ${grouped[key].length === 0 ? 'followups-section--empty' : ''}`}
            >
              <div className="followups-section__header">
                <h3>{bucketLabels[key]}</h3>
                <span className="followups-section__count">{grouped[key].length}</span>
              </div>
              <FollowUpTable
                items={grouped[key]}
                supplierMap={supplierMap}
                onComplete={handleComplete}
                onReschedule={setRescheduleItem}
                onNewActivity={(item) => setActivitySupplierId(item.supplierId)}
                onOpenSupplier={openSupplier}
                busyId={busyId}
              />
            </section>
          ))}
        </>
      )}

      <RescheduleModal
        open={rescheduleItem !== null}
        item={rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        onSave={handleRescheduleSave}
      />

      <ActivityFormModal
        open={activitySupplierId !== null}
        onClose={() => setActivitySupplierId(null)}
        defaultSupplierId={activitySupplierId || ''}
        suppliers={suppliers}
        contacts={contacts}
        lockSupplier
      />

      {detailSupplier && (
        <SupplierDetailPanel
          supplier={detailSupplier}
          activities={activities}
          opportunities={opportunities}
          onClose={() => setDetailSupplier(null)}
          onEditSupplier={(s) => {
            setDetailSupplier(null);
            openEditSupplier(s);
          }}
        />
      )}
    </div>
  );
}

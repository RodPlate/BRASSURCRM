import { useMemo, useState } from 'react';
import { deleteContact, setMainContact } from '../../services/contactsService';
import { deleteActivity } from '../../services/activitiesService';
import { deleteOpportunity } from '../../services/opportunitiesService';
import { formatDate, formatNumber, formatCurrency } from '../../utils/format';
import { sortByExpectedPurchaseDate, getOpportunityPotentialValue } from '../../utils/opportunities';
import StatusBadge from '../../components/common/StatusBadge';
import NegotiationBadge from '../../components/common/NegotiationBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ContactFormModal from '../../components/contacts/ContactFormModal';
import ActivityFormModal from '../../components/activities/ActivityFormModal';
import OpportunityFormModal from '../../components/opportunities/OpportunityFormModal';
import SupplierTimeline from '../../components/suppliers/SupplierTimeline';
import VisitPhotosSection from '../../components/suppliers/VisitPhotosSection';

export default function SupplierDetailPanel({
  supplier,
  contacts,
  activities,
  opportunities,
  suppliers,
  allContacts,
  onClose,
  onEditSupplier,
}) {
  const [contactModal, setContactModal] = useState(null);
  const [activityModal, setActivityModal] = useState(null);
  const [opportunityModal, setOpportunityModal] = useState(null);
  const [deleteContactTarget, setDeleteContactTarget] = useState(null);
  const [deleteActivityTarget, setDeleteActivityTarget] = useState(null);
  const [deleteOpportunityTarget, setDeleteOpportunityTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const supplierContacts = useMemo(
    () => contacts.filter((c) => c.supplierId === supplier.id),
    [contacts, supplier.id]
  );

  const supplierActivities = useMemo(
    () =>
      activities
        .filter((a) => a.supplierId === supplier.id)
        .sort((a, b) => {
          const da = a.date?.toDate?.() ?? new Date(a.date || 0);
          const db = b.date?.toDate?.() ?? new Date(b.date || 0);
          return db - da;
        }),
    [activities, supplier.id]
  );

  const supplierOpportunities = useMemo(
    () =>
      sortByExpectedPurchaseDate(
        opportunities.filter((o) => o.supplierId === supplier.id),
        'asc'
      ),
    [opportunities, supplier.id]
  );

  const contactMap = useMemo(
    () => Object.fromEntries(supplierContacts.map((c) => [c.id, c.name])),
    [supplierContacts]
  );

  const visitActivities = useMemo(
    () => supplierActivities.filter((a) => a.type === 'Visita'),
    [supplierActivities]
  );

  const handleDeleteContact = async () => {
    if (!deleteContactTarget) return;
    setDeleting(true);
    try {
      await deleteContact(deleteContactTarget.id);
      setDeleteContactTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!deleteActivityTarget) return;
    setDeleting(true);
    try {
      await deleteActivity(deleteActivityTarget.id);
      setDeleteActivityTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOpportunity = async () => {
    if (!deleteOpportunityTarget) return;
    setDeleting(true);
    try {
      await deleteOpportunity(deleteOpportunityTarget.id);
      setDeleteOpportunityTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetMain = async (contact) => {
    try {
      await setMainContact(contact);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose} role="presentation">
      <div className="detail-panel" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="detail-panel__header">
          <div>
            <h2>{supplier.companyName}</h2>
            <p>
              {supplier.ruc && `RUC ${supplier.ruc} · `}
              {supplier.city || 'Sin ciudad'}
              {supplier.department ? `, ${supplier.department}` : ''}
            </p>
            <div className="detail-panel__badges">
              <StatusBadge value={supplier.status} />
              <StatusBadge value={supplier.priority} type="priority" />
              <span className="badge badge--inactivo">{supplier.supplierType}</span>
            </div>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="detail-panel__summary">
          <div>
            <span className="detail-panel__label">Rubro</span>
            <strong>{supplier.industry || '—'}</strong>
          </div>
          <div>
            <span className="detail-panel__label">Materiales</span>
            <strong>
              {Array.isArray(supplier.generatedMaterials)
                ? supplier.generatedMaterials.join(', ')
                : supplier.generatedMaterials || '—'}
            </strong>
          </div>
          <div>
            <span className="detail-panel__label">Volumen est.</span>
            <strong>{formatNumber(supplier.estimatedMonthlyVolumeKg, ' kg/mes')}</strong>
          </div>
          <div>
            <span className="detail-panel__label">Seguimiento</span>
            <strong>{formatDate(supplier.nextFollowUpDate)}</strong>
          </div>
        </div>

        {supplier.notes && (
          <p className="detail-panel__notes">{supplier.notes}</p>
        )}

        <div className="detail-panel__actions-bar">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEditSupplier(supplier)}>
            Editar proveedor
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setContactModal('new')}>
            + Contacto
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpportunityModal('new')}>
            + Oportunidad
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setActivityModal('new')}>
            + Actividad
          </button>
        </div>

        <SupplierTimeline supplierId={supplier.id} />

        <VisitPhotosSection
          supplierId={supplier.id}
          supplierName={supplier.companyName}
          visitActivities={visitActivities}
        />

        <section className="detail-section">
          <div className="detail-section__header">
            <h3>Contactos ({supplierContacts.length})</h3>
          </div>
          {supplierContacts.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>Sin contactos registrados.</p>
            </div>
          ) : (
            <ul className="detail-list">
              {supplierContacts.map((c) => (
                <li key={c.id} className="detail-list__item">
                  <div className="detail-list__main">
                    <strong>
                      {c.name}
                      {c.isMainContact && <span className="badge badge--activo detail-list__main-badge">Principal</span>}
                    </strong>
                    <span>{c.role || 'Sin rol'} · {c.phone || c.whatsapp || c.email || 'Sin datos'}</span>
                  </div>
                  <div className="data-table__actions">
                    {!c.isMainContact && (
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => handleSetMain(c)}>
                        Principal
                      </button>
                    )}
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setContactModal(c)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteContactTarget(c)}>
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="detail-section">
          <div className="detail-section__header">
            <h3>Oportunidades de compra ({supplierOpportunities.length})</h3>
          </div>
          {supplierOpportunities.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>Sin oportunidades registradas.</p>
            </div>
          ) : (
            <ul className="detail-list">
              {supplierOpportunities.map((o) => (
                <li key={o.id} className="detail-list__item">
                  <div className="detail-list__main">
                    <strong>
                      {o.material}
                      <NegotiationBadge value={o.negotiationStatus} />
                    </strong>
                    <span>
                      {formatNumber(o.estimatedVolumeKg, ' kg')}
                      {' · '}
                      {formatCurrency(o.targetPrice, o.currency)}
                      {o.currentOfferPrice > 0 && ` → ${formatCurrency(o.currentOfferPrice, o.currency)}`}
                    </span>
                    <small>
                      Compra est.: {formatDate(o.expectedPurchaseDate)}
                      {' · '}
                      Valor pot.: {formatCurrency(getOpportunityPotentialValue(o), o.currency)}
                      {o.probability != null && ` · ${o.probability}% prob.`}
                    </small>
                  </div>
                  <div className="data-table__actions">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setOpportunityModal(o)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteOpportunityTarget(o)}>
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="detail-section">
          <div className="detail-section__header">
            <h3>Historial de actividades ({supplierActivities.length})</h3>
          </div>
          {supplierActivities.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>Sin actividades registradas.</p>
            </div>
          ) : (
            <ul className="detail-list detail-list--activities">
              {supplierActivities.map((a) => (
                <li key={a.id} className="detail-list__item detail-list__item--activity">
                  <div className="detail-list__main">
                    <strong>
                      <span className="activity-type">{a.type}</span>
                      {formatDate(a.date)}
                    </strong>
                    <span>{a.summary}</span>
                    {(a.nextAction || a.nextFollowUpDate) && (
                      <small>
                        {a.nextAction && `Acción: ${a.nextAction}`}
                        {a.nextAction && a.nextFollowUpDate && ' · '}
                        {a.nextFollowUpDate && `Seguimiento: ${formatDate(a.nextFollowUpDate)}`}
                      </small>
                    )}
                    {a.contactId && <small>Contacto: {contactMap[a.contactId]}</small>}
                  </div>
                  <div className="data-table__actions">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setActivityModal(a)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteActivityTarget(a)}>
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ContactFormModal
        open={contactModal !== null}
        onClose={() => setContactModal(null)}
        contact={contactModal === 'new' ? null : contactModal}
        defaultSupplierId={supplier.id}
        suppliers={suppliers}
        lockSupplier
      />

      <ActivityFormModal
        open={activityModal !== null}
        onClose={() => setActivityModal(null)}
        activity={activityModal === 'new' ? null : activityModal}
        defaultSupplierId={supplier.id}
        suppliers={suppliers}
        contacts={allContacts}
        lockSupplier
      />

      <OpportunityFormModal
        open={opportunityModal !== null}
        onClose={() => setOpportunityModal(null)}
        opportunity={opportunityModal === 'new' ? null : opportunityModal}
        defaultSupplierId={supplier.id}
        suppliers={suppliers}
        lockSupplier
      />

      {deleteContactTarget && (
        <ConfirmDialog
          title="Eliminar contacto"
          message={`¿Eliminar "${deleteContactTarget.name}"?`}
          onConfirm={handleDeleteContact}
          onCancel={() => setDeleteContactTarget(null)}
          loading={deleting}
        />
      )}

      {deleteActivityTarget && (
        <ConfirmDialog
          title="Eliminar actividad"
          message="¿Eliminar esta actividad del historial?"
          onConfirm={handleDeleteActivity}
          onCancel={() => setDeleteActivityTarget(null)}
          loading={deleting}
        />
      )}

      {deleteOpportunityTarget && (
        <ConfirmDialog
          title="Eliminar oportunidad"
          message={`¿Eliminar la oportunidad de "${deleteOpportunityTarget.material}"?`}
          onConfirm={handleDeleteOpportunity}
          onCancel={() => setDeleteOpportunityTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

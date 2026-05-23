import { useMemo, useState } from 'react';
import { deleteOpportunity } from '../../services/opportunitiesService';
import StatusBadge from '../../components/common/StatusBadge';
import NegotiationBadge from '../../components/common/NegotiationBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SupplierTimeline from '../../components/suppliers/SupplierTimeline';
import VisitPhotosSection from '../../components/suppliers/VisitPhotosSection';
import QuickActivityBar from '../../components/activities/QuickActivityBar';
import { useMobileActions } from '../../context/MobileActionsContext';
import { formatDate } from '../../utils/format';
import { setLastSupplierId } from '../../utils/mobilePrefs';

export default function SupplierDetailPanel({
  supplier,
  activities,
  opportunities,
  onClose,
  onEditSupplier,
}) {
  const { openQuickActivity, openQuickOpportunity, openQuickPhoto } = useMobileActions();
  const [deleteOpportunityTarget, setDeleteOpportunityTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
    () => opportunities.filter((o) => o.supplierId === supplier.id),
    [opportunities, supplier.id]
  );

  const lastActivity = supplierActivities[0];
  const visitActivities = useMemo(
    () => supplierActivities.filter((a) => a.type === 'Visita'),
    [supplierActivities]
  );

  const openWithSupplier = (fn) => {
    setLastSupplierId(supplier.id);
    fn(supplier.id);
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

  return (
    <div className="detail-overlay" onClick={onClose} role="presentation">
      <div
        className="detail-panel detail-panel--simple detail-panel--mobile"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <header className="detail-panel__header detail-panel__header--mobile">
          <div>
            <h2>{supplier.companyName}</h2>
            <p className="detail-panel__city">
              {[supplier.city, supplier.department].filter(Boolean).join(', ') || 'Sin ciudad'}
            </p>
            <StatusBadge value={supplier.status} />
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="mobile-quick-actions">
          <button
            type="button"
            className="mobile-quick-actions__btn"
            onClick={() => openWithSupplier(openQuickActivity)}
          >
            📞 Actividad
          </button>
          <button
            type="button"
            className="mobile-quick-actions__btn"
            onClick={() => openWithSupplier(openQuickOpportunity)}
          >
            🎯 Oportunidad
          </button>
          <button
            type="button"
            className="mobile-quick-actions__btn"
            onClick={() => openWithSupplier(openQuickPhoto)}
          >
            📷 Foto
          </button>
        </div>

        <button
          type="button"
          className="btn btn--secondary btn--sm detail-panel__edit-link"
          onClick={() => onEditSupplier(supplier)}
        >
          Editar proveedor
        </button>

        <section className="detail-section detail-section--highlight show-desktop-only">
          <QuickActivityBar supplierId={supplier.id} />
        </section>

        <section className="detail-section detail-section--compact show-mobile-only">
          <h3 className="detail-section__mini-title">Última actividad</h3>
          {lastActivity ? (
            <div className="last-activity-card">
              <strong>{lastActivity.type}</strong>
              <span>{formatDate(lastActivity.date)}</span>
              <p>{lastActivity.summary}</p>
            </div>
          ) : (
            <p className="text-muted">Sin actividades registradas.</p>
          )}
        </section>

        <section className="detail-section">
          <div className="detail-section__header">
            <h3>Oportunidades ({supplierOpportunities.length})</h3>
          </div>
          {supplierOpportunities.length === 0 ? (
            <p className="text-muted">Sin oportunidades.</p>
          ) : (
            <ul className="detail-list">
              {supplierOpportunities.map((o) => (
                <li key={o.id} className="detail-list__item">
                  <div className="detail-list__main">
                    <strong>
                      {o.material}
                      <NegotiationBadge value={o.negotiationStatus} />
                    </strong>
                    {o.notes && <span>{o.notes}</span>}
                  </div>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => setDeleteOpportunityTarget(o)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <VisitPhotosSection
          supplierId={supplier.id}
          supplierName={supplier.companyName}
          visitActivities={visitActivities}
        />

        <SupplierTimeline supplierId={supplier.id} />

      </div>

      {deleteOpportunityTarget && (
        <ConfirmDialog
          title="Eliminar oportunidad"
          message={`¿Eliminar "${deleteOpportunityTarget.material}"?`}
          onConfirm={handleDeleteOpportunity}
          onCancel={() => setDeleteOpportunityTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

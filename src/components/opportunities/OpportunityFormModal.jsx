import { useEffect, useState } from 'react';
import { createOpportunity, updateOpportunity } from '../../services/opportunitiesService';
import Modal from '../common/Modal';
import OpportunityForm, { getEmptyOpportunity, opportunityToForm } from '../../pages/Opportunities/OpportunityForm';

export default function OpportunityFormModal({
  open,
  onClose,
  opportunity = null,
  defaultSupplierId = '',
  suppliers = [],
  lockSupplier = false,
}) {
  const [form, setForm] = useState(getEmptyOpportunity(defaultSupplierId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(opportunity ? opportunityToForm(opportunity) : getEmptyOpportunity(defaultSupplierId));
    setError('');
  }, [open, opportunity, defaultSupplierId]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierId || !form.material.trim()) {
      setError('Proveedor y material son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        expectedPurchaseDate: form.expectedPurchaseDate || null,
      };
      if (opportunity?.id) {
        await updateOpportunity(opportunity.id, payload, { previous: opportunity });
      } else {
        await createOpportunity(payload);
      }
      onClose(true);
    } catch (err) {
      setError(err.message || 'Error al guardar la oportunidad.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={opportunity?.id ? 'Editar oportunidad' : 'Nueva oportunidad de compra'}
      onClose={() => onClose(false)}
      wide
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => onClose(false)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="opportunity-form-modal" className="btn btn--primary" disabled={saving}>
            {saving ? 'Guardando…' : opportunity?.id ? 'Actualizar' : 'Crear'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert--error">{error}</div>}
      <form id="opportunity-form-modal" onSubmit={handleSubmit}>
        <OpportunityForm
          form={form}
          onChange={setForm}
          suppliers={suppliers}
          lockSupplier={lockSupplier}
        />
      </form>
    </Modal>
  );
}

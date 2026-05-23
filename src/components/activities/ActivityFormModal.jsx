import { useEffect, useState } from 'react';
import { createActivity, updateActivity } from '../../services/activitiesService';
import Modal from '../common/Modal';
import ActivityForm, { getEmptyActivity, activityToForm } from '../../pages/Activities/ActivityForm';

export default function ActivityFormModal({
  open,
  onClose,
  activity = null,
  defaultSupplierId = '',
  suppliers = [],
  contacts = [],
  lockSupplier = false,
}) {
  const [form, setForm] = useState(getEmptyActivity(defaultSupplierId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(activity ? activityToForm(activity) : getEmptyActivity(defaultSupplierId));
    setError('');
  }, [open, activity, defaultSupplierId]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierId || !form.summary.trim()) {
      setError('Proveedor y comentario son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        ...form,
        date: form.date || today,
        contactId: form.contactId || null,
        nextAction: form.nextAction || '',
        nextFollowUpDate: form.nextFollowUpDate || null,
      };
      if (activity?.id) {
        await updateActivity(activity.id, payload);
      } else {
        await createActivity(payload);
      }
      onClose(true);
    } catch (err) {
      setError(err.message || 'Error al guardar la actividad.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={activity?.id ? 'Editar actividad' : 'Registrar actividad'}
      onClose={() => onClose(false)}
      wide
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => onClose(false)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="activity-form-modal" className="btn btn--primary" disabled={saving}>
            {saving ? 'Guardando…' : activity?.id ? 'Actualizar' : 'Crear'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert--error">{error}</div>}
      <form id="activity-form-modal" onSubmit={handleSubmit}>
        <ActivityForm
          form={form}
          onChange={setForm}
          suppliers={suppliers}
          contacts={contacts}
          lockSupplier={lockSupplier}
        />
      </form>
    </Modal>
  );
}

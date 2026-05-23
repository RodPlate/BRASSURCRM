import { useEffect, useState } from 'react';
import { createSupplier, updateSupplier } from '../../services/suppliersService';
import Modal from '../common/Modal';
import SupplierForm, { getEmptySupplier, supplierToForm } from '../../pages/Suppliers/SupplierForm';

export default function SupplierCreateModal({ open, onClose, supplier = null, suppliers = [] }) {
  const [form, setForm] = useState(getEmptySupplier());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editingId = supplier?.id || null;

  useEffect(() => {
    if (!open) return;
    setForm(supplier ? supplierToForm(supplier) : getEmptySupplier());
    setError('');
  }, [open, supplier]);

  if (!open) return null;

  const save = async () => {
    if (!form.companyName.trim()) {
      setError('La razón social es obligatoria.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, nextFollowUpDate: form.nextFollowUpDate || null };
      if (editingId) {
        const previous = suppliers.find((s) => s.id === editingId);
        await updateSupplier(editingId, payload, { previous });
      } else {
        await createSupplier(payload);
      }
      onClose(true);
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
      onClose={() => onClose(false)}
      wide
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => onClose(false)} disabled={saving}>
            Cancelar
          </button>
          {!editingId && (
            <button type="button" className="btn btn--accent" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar rápido'}
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert--error">{error}</div>}
      <SupplierForm form={form} onChange={setForm} />
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { createContact, updateContact } from '../../services/contactsService';
import Modal from '../common/Modal';
import ContactForm, { getEmptyContact, contactToForm } from '../../pages/Contacts/ContactForm';

export default function ContactFormModal({
  open,
  onClose,
  contact = null,
  defaultSupplierId = '',
  suppliers = [],
  lockSupplier = false,
}) {
  const [form, setForm] = useState(getEmptyContact(defaultSupplierId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(contact ? contactToForm(contact) : getEmptyContact(defaultSupplierId));
    setError('');
  }, [open, contact, defaultSupplierId]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierId || !form.name.trim()) {
      setError('Proveedor y nombre son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (contact?.id) {
        await updateContact(contact.id, form);
      } else {
        await createContact(form);
      }
      onClose(true);
    } catch (err) {
      setError(err.message || 'Error al guardar el contacto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={contact?.id ? 'Editar contacto' : 'Nuevo contacto'}
      onClose={() => onClose(false)}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => onClose(false)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="contact-form-modal" className="btn btn--primary" disabled={saving}>
            {saving ? 'Guardando…' : contact?.id ? 'Actualizar' : 'Crear'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert--error">{error}</div>}
      <form id="contact-form-modal" onSubmit={handleSubmit}>
        <ContactForm
          form={form}
          onChange={setForm}
          suppliers={suppliers}
          lockSupplier={lockSupplier}
        />
      </form>
    </Modal>
  );
}

const emptyContact = {
  supplierId: '',
  name: '',
  role: '',
  phone: '',
  whatsapp: '',
  email: '',
  isMainContact: false,
  notes: '',
};

export function getEmptyContact(supplierId = '') {
  return { ...emptyContact, supplierId };
}

export function contactToForm(contact) {
  if (!contact) return getEmptyContact();
  return {
    supplierId: contact.supplierId || '',
    name: contact.name || '',
    role: contact.role || '',
    phone: contact.phone || '',
    whatsapp: contact.whatsapp || '',
    email: contact.email || '',
    isMainContact: Boolean(contact.isMainContact),
    notes: contact.notes || '',
  };
}

export default function ContactForm({ form, onChange, suppliers, lockSupplier = false }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <div className="form-grid">
      {!lockSupplier && (
        <div className="form-field form-grid--full">
          <label htmlFor="supplierId">Proveedor *</label>
          <select
            id="supplierId"
            name="supplierId"
            value={form.supplierId}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar proveedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.companyName}</option>
            ))}
          </select>
        </div>
      )}
      {lockSupplier && form.supplierId && (
        <div className="form-field form-grid--full">
          <label>Proveedor</label>
          <p className="form-field__locked">
            {suppliers.find((s) => s.id === form.supplierId)?.companyName || '—'}
          </p>
        </div>
      )}
      <div className="form-field">
        <label htmlFor="name">Nombre *</label>
        <input id="name" name="name" value={form.name} onChange={handleChange} required />
      </div>
      <div className="form-field">
        <label htmlFor="role">Cargo / Rol</label>
        <input id="role" name="role" value={form.role} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label htmlFor="phone">Teléfono</label>
        <input id="phone" name="phone" value={form.phone} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label htmlFor="whatsapp">WhatsApp</label>
        <input id="whatsapp" name="whatsapp" value={form.whatsapp} onChange={handleChange} />
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
      </div>
      <div className="form-field form-field--checkbox form-grid--full">
        <input
          id="isMainContact"
          name="isMainContact"
          type="checkbox"
          checked={form.isMainContact}
          onChange={handleChange}
        />
        <label htmlFor="isMainContact">Contacto principal</label>
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={3} />
      </div>
    </div>
  );
}

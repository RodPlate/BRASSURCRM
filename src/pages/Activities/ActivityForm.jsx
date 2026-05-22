import { ACTIVITY_TYPES } from '../../constants/enums';
import { toInputDate } from '../../utils/format';

const emptyActivity = {
  supplierId: '',
  contactId: '',
  type: 'Llamada',
  date: new Date().toISOString().split('T')[0],
  summary: '',
  nextAction: '',
  nextFollowUpDate: '',
};

export function getEmptyActivity(supplierId = '') {
  return { ...emptyActivity, supplierId };
}

export function activityToForm(activity) {
  if (!activity) return getEmptyActivity();
  return {
    supplierId: activity.supplierId || '',
    contactId: activity.contactId || '',
    type: activity.type || 'Llamada',
    date: toInputDate(activity.date) || new Date().toISOString().split('T')[0],
    summary: activity.summary || '',
    nextAction: activity.nextAction || '',
    nextFollowUpDate: toInputDate(activity.nextFollowUpDate),
  };
}

export default function ActivityForm({
  form,
  onChange,
  suppliers,
  contacts,
  lockSupplier = false,
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    if (name === 'supplierId') {
      updated.contactId = '';
    }
    onChange(updated);
  };

  const supplierContacts = contacts.filter((c) => c.supplierId === form.supplierId);

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
      <div className="form-field form-grid--full">
        <label htmlFor="contactId">Contacto (opcional)</label>
        <select
          id="contactId"
          name="contactId"
          value={form.contactId}
          onChange={handleChange}
          disabled={!form.supplierId}
        >
          <option value="">Sin contacto específico</option>
          {supplierContacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="type">Tipo de actividad</label>
        <select id="type" name="type" value={form.type} onChange={handleChange}>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="date">Fecha *</label>
        <input id="date" name="date" type="date" value={form.date} onChange={handleChange} required />
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="summary">Resumen *</label>
        <textarea id="summary" name="summary" value={form.summary} onChange={handleChange} required rows={3} />
      </div>
      <div className="form-field">
        <label htmlFor="nextAction">Próxima acción</label>
        <input id="nextAction" name="nextAction" value={form.nextAction} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label htmlFor="nextFollowUpDate">Próximo seguimiento</label>
        <input
          id="nextFollowUpDate"
          name="nextFollowUpDate"
          type="date"
          value={form.nextFollowUpDate}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

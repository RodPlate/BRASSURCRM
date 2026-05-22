import {
  SUPPLIER_TYPES,
  SUPPLIER_STATUSES,
  PRIORITIES,
  SOURCES,
} from '../../constants/enums';
import { toInputDate } from '../../utils/format';

const emptySupplier = {
  companyName: '',
  ruc: '',
  industry: '',
  city: '',
  department: '',
  supplierType: 'Empresa',
  generatedMaterials: '',
  estimatedMonthlyVolumeKg: '',
  status: 'Nuevo',
  priority: 'Media',
  source: 'Web',
  nextFollowUpDate: '',
  notes: '',
};

export function getEmptySupplier() {
  return { ...emptySupplier };
}

export function supplierToForm(supplier) {
  if (!supplier) return getEmptySupplier();
  return {
    companyName: supplier.companyName || '',
    ruc: supplier.ruc || '',
    industry: supplier.industry || '',
    city: supplier.city || '',
    department: supplier.department || '',
    supplierType: supplier.supplierType || 'Empresa',
    generatedMaterials: Array.isArray(supplier.generatedMaterials)
      ? supplier.generatedMaterials.join(', ')
      : supplier.generatedMaterials || '',
    estimatedMonthlyVolumeKg: supplier.estimatedMonthlyVolumeKg ?? '',
    status: supplier.status || 'Nuevo',
    priority: supplier.priority || 'Media',
    source: supplier.source || 'Web',
    nextFollowUpDate: toInputDate(supplier.nextFollowUpDate),
    notes: supplier.notes || '',
  };
}

export default function SupplierForm({ form, onChange }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...form, [name]: value });
  };

  return (
    <div className="form-grid">
      <div className="form-field form-grid--full">
        <label htmlFor="companyName">Razón social / Nombre *</label>
        <input
          id="companyName"
          name="companyName"
          value={form.companyName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="ruc">RUC</label>
        <input id="ruc" name="ruc" value={form.ruc} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label htmlFor="supplierType">Tipo de proveedor</label>
        <select id="supplierType" name="supplierType" value={form.supplierType} onChange={handleChange}>
          {SUPPLIER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="industry">Rubro / Industria</label>
        <input id="industry" name="industry" value={form.industry} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label htmlFor="city">Ciudad</label>
        <input id="city" name="city" value={form.city} onChange={handleChange} />
      </div>
      <div className="form-field">
        <label htmlFor="department">Departamento</label>
        <input id="department" name="department" value={form.department} onChange={handleChange} />
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="generatedMaterials">Materiales que genera</label>
        <input
          id="generatedMaterials"
          name="generatedMaterials"
          value={form.generatedMaterials}
          onChange={handleChange}
          placeholder="Ej: chatarra, aluminio, cobre..."
        />
      </div>
      <div className="form-field">
        <label htmlFor="estimatedMonthlyVolumeKg">Volumen mensual est. (kg)</label>
        <input
          id="estimatedMonthlyVolumeKg"
          name="estimatedMonthlyVolumeKg"
          type="number"
          min="0"
          value={form.estimatedMonthlyVolumeKg}
          onChange={handleChange}
        />
      </div>
      <div className="form-field">
        <label htmlFor="status">Estado</label>
        <select id="status" name="status" value={form.status} onChange={handleChange}>
          {SUPPLIER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="priority">Prioridad</label>
        <select id="priority" name="priority" value={form.priority} onChange={handleChange}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="source">Origen</label>
        <select id="source" name="source" value={form.source} onChange={handleChange}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
      <div className="form-field form-grid--full">
        <label htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={3} />
      </div>
    </div>
  );
}

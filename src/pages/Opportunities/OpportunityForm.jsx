import { NEGOTIATION_STATUSES, CURRENCIES } from '../../constants/enums';
import { toInputDate } from '../../utils/format';

const emptyOpportunity = {
  supplierId: '',
  material: '',
  estimatedVolumeKg: '',
  targetPrice: '',
  currentOfferPrice: '',
  currency: 'PEN',
  negotiationStatus: 'Nueva',
  expectedPurchaseDate: '',
  probability: '',
  notes: '',
};

export function getEmptyOpportunity(supplierId = '') {
  return { ...emptyOpportunity, supplierId };
}

export function opportunityToForm(opp) {
  if (!opp) return getEmptyOpportunity();
  return {
    supplierId: opp.supplierId || '',
    material: opp.material || '',
    estimatedVolumeKg: opp.estimatedVolumeKg ?? '',
    targetPrice: opp.targetPrice ?? '',
    currentOfferPrice: opp.currentOfferPrice ?? '',
    currency: opp.currency || 'PEN',
    negotiationStatus: opp.negotiationStatus || 'Nueva',
    expectedPurchaseDate: toInputDate(opp.expectedPurchaseDate),
    probability: opp.probability ?? '',
    notes: opp.notes || '',
  };
}

export default function OpportunityForm({ form, onChange, suppliers, lockSupplier = false }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...form, [name]: value });
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
      <div className="form-field form-grid--full">
        <label htmlFor="material">Material *</label>
        <input
          id="material"
          name="material"
          value={form.material}
          onChange={handleChange}
          required
          placeholder="Ej: chatarra ferrosa, aluminio, cobre..."
        />
      </div>
      <div className="form-field">
        <label htmlFor="estimatedVolumeKg">Volumen estimado (kg)</label>
        <input
          id="estimatedVolumeKg"
          name="estimatedVolumeKg"
          type="number"
          min="0"
          step="0.01"
          value={form.estimatedVolumeKg}
          onChange={handleChange}
        />
      </div>
      <div className="form-field">
        <label htmlFor="probability">Probabilidad (%)</label>
        <input
          id="probability"
          name="probability"
          type="number"
          min="0"
          max="100"
          value={form.probability}
          onChange={handleChange}
        />
      </div>
      <div className="form-field">
        <label htmlFor="targetPrice">Precio objetivo</label>
        <input
          id="targetPrice"
          name="targetPrice"
          type="number"
          min="0"
          step="0.01"
          value={form.targetPrice}
          onChange={handleChange}
        />
      </div>
      <div className="form-field">
        <label htmlFor="currentOfferPrice">Oferta actual</label>
        <input
          id="currentOfferPrice"
          name="currentOfferPrice"
          type="number"
          min="0"
          step="0.01"
          value={form.currentOfferPrice}
          onChange={handleChange}
        />
      </div>
      <div className="form-field">
        <label htmlFor="currency">Moneda</label>
        <select id="currency" name="currency" value={form.currency} onChange={handleChange}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="negotiationStatus">Estado de negociación</label>
        <select
          id="negotiationStatus"
          name="negotiationStatus"
          value={form.negotiationStatus}
          onChange={handleChange}
        >
          {NEGOTIATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="expectedPurchaseDate">Fecha compra estimada</label>
        <input
          id="expectedPurchaseDate"
          name="expectedPurchaseDate"
          type="date"
          value={form.expectedPurchaseDate}
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

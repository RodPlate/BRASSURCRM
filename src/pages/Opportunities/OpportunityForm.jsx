import { useState, useMemo } from 'react';
import {
  NEGOTIATION_STATUSES,
  SIMPLIFIED_NEGOTIATION_STATUSES,
  CURRENCIES,
  CURRENCY_LABELS,
} from '../../constants/enums';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../../utils/currency';

const emptyOpportunity = {
  supplierId: '',
  material: '',
  estimatedVolumeKg: '',
  targetPrice: '',
  currentOfferPrice: '',
  currency: DEFAULT_CURRENCY,
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
  const purchaseVal = opp.expectedPurchaseDate?.toDate?.() ?? opp.expectedPurchaseDate;
  return {
    supplierId: opp.supplierId || '',
    material: opp.material || '',
    estimatedVolumeKg: opp.estimatedVolumeKg ?? '',
    targetPrice: opp.targetPrice ?? '',
    currentOfferPrice: opp.currentOfferPrice ?? '',
    currency: normalizeCurrency(opp.currency),
    negotiationStatus: opp.negotiationStatus || 'Nueva',
    expectedPurchaseDate: purchaseVal
      ? new Date(purchaseVal).toISOString().split('T')[0]
      : '',
    probability: opp.probability ?? '',
    notes: opp.notes || '',
  };
}

export default function OpportunityForm({
  form,
  onChange,
  suppliers,
  lockSupplier = false,
  simplified = true,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...form, [name]: value });
  };

  const statusOptions = useMemo(() => {
    if (!simplified || showAdvanced) return NEGOTIATION_STATUSES;
    const base = [...SIMPLIFIED_NEGOTIATION_STATUSES];
    if (form.negotiationStatus && !base.includes(form.negotiationStatus)) {
      base.push(form.negotiationStatus);
    }
    return base;
  }, [simplified, showAdvanced, form.negotiationStatus]);

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
          placeholder="Ej: chatarra, aluminio, cobre..."
          autoFocus={lockSupplier}
        />
      </div>
      <div className="form-field">
        <label htmlFor="negotiationStatus">Estado *</label>
        <select
          id="negotiationStatus"
          name="negotiationStatus"
          value={form.negotiationStatus}
          onChange={handleChange}
          required
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={2} />
      </div>

      {(!simplified || showAdvanced) && (
        <>
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
                <option key={c} value={c}>{CURRENCY_LABELS[c] || c}</option>
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
        </>
      )}

      {simplified && (
        <div className="form-grid--full form-advanced-toggle">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? '▲ Ocultar avanzado' : '▼ Modo avanzado (precio, volumen, fechas)'}
          </button>
        </div>
      )}
    </div>
  );
}

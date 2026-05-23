import { useEffect, useState } from 'react';
import { createActivity } from '../../services/activitiesService';
import { QUICK_ACTIVITY_ACTIONS } from '../../constants/enums';
import {
  getLastSupplierId,
  getLastActivityType,
  setLastSupplierId,
  setLastActivityType,
} from '../../utils/mobilePrefs';
import Modal from '../common/Modal';

export default function QuickActivityModal({ open, onClose, suppliers = [] }) {
  const [supplierId, setSupplierId] = useState('');
  const [type, setType] = useState('Llamada');
  const [summary, setSummary] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const lastId = getLastSupplierId();
    const lastType = getLastActivityType();
    const validSupplier = suppliers.some((s) => s.id === lastId);
    setSupplierId(validSupplier ? lastId : suppliers[0]?.id || '');
    setType(lastType);
    setSummary('');
    setNextFollowUpDate('');
    setError('');
  }, [open, suppliers]);

  const applyPreset = (action) => {
    setType(action.type);
    setSummary(action.summary);
    setLastActivityType(action.type);
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!supplierId) {
      setError('Seleccione un proveedor.');
      return;
    }
    if (!summary.trim()) {
      setError('Escriba un comentario breve.');
      return;
    }
    setSaving(true);
    setError('');
    const today = new Date().toISOString().split('T')[0];
    try {
      await createActivity({
        supplierId,
        type,
        summary: summary.trim(),
        date: today,
        contactId: null,
        nextAction: '',
        nextFollowUpDate: nextFollowUpDate || null,
      });
      setLastSupplierId(supplierId);
      setLastActivityType(type);
      onClose(true);
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      title="Actividad rápida"
      onClose={() => onClose(false)}
      wide
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => onClose(false)} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      {error && <div className="alert alert--error">{error}</div>}
      <form className="quick-activity-form" onSubmit={handleSave}>
        <div className="form-field">
          <label htmlFor="qa-supplier">Proveedor</label>
          <select
            id="qa-supplier"
            className="filter-select"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
          >
            <option value="">Seleccionar…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.companyName}</option>
            ))}
          </select>
        </div>

        <p className="quick-activity-form__label">Tipo</p>
        <div className="quick-type-grid">
          {QUICK_ACTIVITY_ACTIONS.map((action) => (
            <button
              key={action.type}
              type="button"
              className={`quick-type-btn ${type === action.type ? 'quick-type-btn--active' : ''}`}
              onClick={() => applyPreset(action)}
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="form-field">
          <label htmlFor="qa-summary">Comentario</label>
          <textarea
            id="qa-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="¿Qué pasó?"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="qa-follow">Próxima fecha (opcional)</label>
          <input
            id="qa-follow"
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

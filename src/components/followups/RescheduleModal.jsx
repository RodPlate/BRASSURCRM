import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { formatDate } from '../../utils/format';

export default function RescheduleModal({ open, item, onClose, onSave }) {
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setDate(item.date.toISOString().split('T')[0]);
    setError('');
  }, [open, item]);

  if (!open || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('Selecciona una fecha.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(date);
      onClose(true);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la fecha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Cambiar fecha de seguimiento"
      onClose={() => onClose(false)}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => onClose(false)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="reschedule-form" className="btn btn--primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <p style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        {item.sourceType}: {item.detail}
        <br />
        Fecha actual: {formatDate(item.date)}
      </p>
      {error && <div className="alert alert--error">{error}</div>}
      <form id="reschedule-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="newFollowUpDate">Nueva fecha</label>
          <input
            id="newFollowUpDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import { createActivity } from '../../services/activitiesService';
import { QUICK_ACTIVITY_ACTIONS } from '../../constants/enums';

/**
 * Registra actividad con un clic (tipo + resumen predefinido).
 */
export default function QuickActivityBar({ supplierId, onCreated }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const handleQuick = async (action) => {
    if (!supplierId || busy) return;
    setBusy(action.type);
    setError('');
    const today = new Date().toISOString().split('T')[0];
    try {
      await createActivity({
        supplierId,
        type: action.type,
        summary: action.summary,
        date: today,
        contactId: null,
        nextAction: '',
        nextFollowUpDate: null,
      });
      onCreated?.(action);
    } catch (err) {
      console.error('[Actividad rápida]', err);
      setError(err.message || 'No se pudo registrar la actividad.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="quick-activity-bar">
      <p className="quick-activity-bar__label">Actividad rápida</p>
      <div className="quick-activity-bar__actions">
        {QUICK_ACTIVITY_ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            className="btn btn--secondary btn--sm quick-activity-bar__btn"
            disabled={!!busy}
            onClick={() => handleQuick(action)}
          >
            {busy === action.type ? '…' : action.label}
          </button>
        ))}
      </div>
      {error && <p className="quick-activity-bar__error">{error}</p>}
    </div>
  );
}

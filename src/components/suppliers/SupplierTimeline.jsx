import { useEffect, useMemo, useState } from 'react';
import {
  subscribeTimelineForSupplier,
  addQuickNote,
} from '../../services/timelineService';
import {
  TIMELINE_TYPE_ICONS,
  TIMELINE_FILTER_GROUPS,
} from '../../constants/timelineTypes';
import {
  filterTimelineEvents,
  formatTimelineDay,
  collectTimelineUsers,
} from '../../utils/timelineHelpers';
import '../../styles/timeline.css';

export default function SupplierTimeline({ supplierId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('');
  const [typeGroup, setTypeGroup] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    if (!supplierId) return undefined;
    setLoading(true);
    const unsub = subscribeTimelineForSupplier(
      supplierId,
      (data) => {
        setEvents(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [supplierId]);

  const users = useMemo(() => collectTimelineUsers(events), [events]);

  const filtered = useMemo(
    () => filterTimelineEvents(events, { period, typeGroup, user: userFilter }),
    [events, period, typeGroup, userFilter]
  );

  const handleAddNote = async (e) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text) {
      setNoteError('Escriba la nota.');
      return;
    }
    setSavingNote(true);
    setNoteError('');
    try {
      await addQuickNote(supplierId, text);
      setNoteText('');
      setNoteOpen(false);
    } catch (err) {
      setNoteError(err.message || 'No se pudo guardar la nota.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <section className="detail-section timeline-section">
      <div className="detail-section__header timeline-section__header">
        <h3>Timeline ({filtered.length})</h3>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setNoteOpen((v) => !v)}
        >
          Agregar nota rápida
        </button>
      </div>

      {noteOpen && (
        <form className="timeline-quick-note" onSubmit={handleAddNote}>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Ej.: Llamada realizada, acordaron enviar cotización…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={savingNote}
          />
          {noteError && <div className="alert alert--error">{noteError}</div>}
          <div className="timeline-quick-note__actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={savingNote}>
              {savingNote ? 'Guardando…' : 'Guardar nota'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setNoteOpen(false);
                setNoteError('');
              }}
              disabled={savingNote}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="timeline-filters toolbar">
        <select
          className="filter-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Filtrar por período"
        >
          <option value="">Todo el historial</option>
          <option value="today">Hoy</option>
          <option value="week">Semana</option>
          <option value="month">Mes</option>
        </select>
        <select
          className="filter-select"
          value={typeGroup}
          onChange={(e) => setTypeGroup(e.target.value)}
          aria-label="Filtrar por tipo"
        >
          {TIMELINE_FILTER_GROUPS.map((g) => (
            <option key={g.value || 'all'} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          aria-label="Filtrar por usuario"
        >
          <option value="">Todos los usuarios</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading loading--compact">Cargando timeline…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <p>Sin eventos en este período.</p>
        </div>
      ) : (
        <ul className="timeline-list">
          {filtered.map((ev) => (
            <li key={ev.id} className="timeline-item">
              <span className="timeline-item__icon" aria-hidden="true">
                {TIMELINE_TYPE_ICONS[ev.type] || '•'}
              </span>
              <div className="timeline-item__body">
                <time className="timeline-item__date" dateTime={formatTimelineDay(ev.date)}>
                  {formatTimelineDay(ev.date)}
                </time>
                <span className="timeline-item__user">{ev.user || '—'}</span>
                <p className="timeline-item__title">{ev.title}</p>
                {ev.description && ev.description !== ev.title && (
                  <p className="timeline-item__desc">{ev.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

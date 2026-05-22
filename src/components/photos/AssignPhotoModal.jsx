import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import '../../styles/photoInbox.css';

export default function AssignPhotoModal({
  photo,
  suppliers = [],
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 50);
    return suppliers
      .filter((s) => {
        const hay = [s.companyName, s.city, s.department, s.industry]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [suppliers, query]);

  const handleConfirm = () => {
    if (!selectedId) return;
    const supplier = suppliers.find((s) => s.id === selectedId);
    onConfirm(selectedId, supplier?.companyName || '');
  };

  return (
    <Modal
      title="Asignar proveedor"
      onClose={() => {
        if (!loading) onCancel();
      }}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!selectedId || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Asignando…' : 'Confirmar asignación'}
          </button>
        </>
      }
    >
      <div className="assign-photo-modal">
        {photo?.url && (
          <img
            className="assign-photo-modal__thumb"
            src={photo.url}
            alt={photo.caption || 'Vista previa'}
          />
        )}

        <div className="form-field">
          <label htmlFor="assign-supplier-search">Buscar proveedor</label>
          <input
            id="assign-supplier-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Razón social, ciudad, departamento, rubro…"
            autoComplete="off"
            disabled={loading}
          />
        </div>

        <ul className="assign-photo-modal__list">
          {filtered.length === 0 ? (
            <li className="assign-photo-modal__empty">Sin resultados</li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`assign-photo-modal__option ${selectedId === s.id ? 'assign-photo-modal__option--active' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                  disabled={loading}
                >
                  <strong>{s.companyName}</strong>
                  <span>
                    {[s.city, s.department, s.industry].filter(Boolean).join(' · ') || '—'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </Modal>
  );
}

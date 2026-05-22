import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { subscribeSuppliers } from '../../services/suppliersService';
import { subscribeContacts } from '../../services/contactsService';
import { subscribeActivities } from '../../services/activitiesService';
import { confirmQualityChanges } from '../../services/dataQualityService';
import {
  buildSupplierQualityReports,
  findDuplicateGroups,
  TIER_LABELS,
  getTierClass,
  materialsToLabel,
} from '../../utils/dataQuality';
import { safeArray } from '../../utils/safeData';
import { formatDate } from '../../utils/format';
import { ROUTES } from '../../constants/routes';
import '../../styles/dataQuality.css';

const REQUIRED_SOURCES = ['suppliers', 'contacts', 'activities'];

export default function DataQualityPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [sourcesReady, setSourcesReady] = useState({
    suppliers: false,
    contacts: false,
    activities: false,
  });
  const [tab, setTab] = useState('proveedores');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pending, setPending] = useState([]);
  const [tierFilter, setTierFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  const markSourceReady = useCallback((source) => {
    setSourcesReady((prev) => ({ ...prev, [source]: true }));
  }, []);

  const handleSourceError = useCallback(
    (source, error) => {
      console.error('[Calidad]', error);
      setLoadError((prev) => prev || `Error al cargar ${source}`);
      markSourceReady(source);
    },
    [markSourceReady]
  );

  useEffect(() => {
    setLoading(true);
    setLoaded(false);
    setLoadError('');
    setSourcesReady({
      suppliers: false,
      contacts: false,
      activities: false,
    });

    let unsubs = [];

    try {
      unsubs = [
        subscribeSuppliers(
          (data) => {
            const list = safeArray(data);
            console.log('[Calidad] proveedores', list.length);
            setSuppliers(list);
            markSourceReady('suppliers');
          },
          (err) => handleSourceError('suppliers', err)
        ),
        subscribeContacts(
          (data) => {
            setContacts(safeArray(data));
            markSourceReady('contacts');
          },
          (err) => handleSourceError('contacts', err)
        ),
        subscribeActivities(
          (data) => {
            setActivities(safeArray(data));
            markSourceReady('activities');
          },
          (err) => handleSourceError('activities', err)
        ),
      ];
    } catch (err) {
      console.error('[Calidad]', err);
      setLoadError('Error al cargar Calidad de Datos');
      REQUIRED_SOURCES.forEach((s) => markSourceReady(s));
    }

    return () => unsubs.forEach((u) => u?.());
  }, [markSourceReady, handleSourceError]);

  useEffect(() => {
    const allReady = REQUIRED_SOURCES.every((key) => sourcesReady[key]);
    if (allReady) {
      setLoading(false);
      setLoaded(true);
    }
  }, [sourcesReady]);

  const reports = useMemo(() => {
    try {
      return buildSupplierQualityReports(suppliers, contacts, activities);
    } catch (err) {
      console.error('[Calidad]', err);
      return [];
    }
  }, [suppliers, contacts, activities]);

  const duplicateGroups = useMemo(() => {
    try {
      return findDuplicateGroups(suppliers, contacts);
    } catch (err) {
      console.error('[Calidad]', err);
      return [];
    }
  }, [suppliers, contacts]);

  const filteredReports = useMemo(() => {
    if (!tierFilter) return reports;
    return reports.filter((r) => r.tier === tierFilter);
  }, [reports, tierFilter]);

  const stats = useMemo(() => {
    const avgCompleteness =
      reports.length > 0
        ? Math.round(reports.reduce((s, r) => s + r.completeness, 0) / reports.length)
        : 0;
    return {
      total: reports.length,
      duplicates: duplicateGroups.length,
      incomplete: reports.filter((r) => r.completeness < 70).length,
      avgCompleteness,
      tierA: reports.filter((r) => r.tier === 'A').length,
    };
  }, [reports, duplicateGroups]);

  const hasAnyData = suppliers.length > 0;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredReports.map((r) => r.supplier.id)));
  };

  const handleApplyImprovements = () => {
    const targets =
      selectedIds.size > 0
        ? reports.filter((r) => selectedIds.has(r.supplier.id))
        : reports.filter((r) => r.suggestion.hasFieldChanges);

    const nextPending = targets
      .map((r) => r.suggestion)
      .filter((s) => s.hasFieldChanges || s.changes.dataQualityScore != null);

    setPending(nextPending);
    setSaveResult(null);
  };

  const handleConfirmChanges = async () => {
    if (!pending.length) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await confirmQualityChanges(pending);
      setSaveResult(result);
      if (result.errors.length === 0) {
        setPending([]);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('[Calidad]', err);
      alert(err.message || 'Error al confirmar cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando calidad de datos…</div>;
  }

  if (loadError && !hasAnyData) {
    return (
      <div className="data-quality-page">
        <div className="alert alert--error" role="alert">
          <strong>Error al cargar Calidad de Datos</strong>
          <p style={{ margin: '0.5rem 0 0' }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="data-quality-page">
        <div className="page-header">
          <div>
            <h2>Calidad de Datos</h2>
            <p>Limpieza, enriquecimiento y scoring de proveedores</p>
          </div>
        </div>
        <div className="empty-state">
          <p>No hay datos para analizar</p>
          <p className="text-muted">
            Importe o registre proveedores para ver duplicados, completitud y scoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-quality-page">
      {loadError && (
        <div className="alert alert--error" role="alert">
          <strong>Error al cargar Calidad de Datos</strong>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            {loadError} — Se muestran los datos disponibles.
          </p>
        </div>
      )}

      {loaded && !loadError && (
        <p className="dq-status dq-status--ok" aria-live="polite">
          Resultados cargados
        </p>
      )}

      <div className="page-header">
        <div>
          <h2>Calidad de Datos</h2>
          <p>Limpieza, enriquecimiento y scoring de proveedores</p>
        </div>
        <Link to={ROUTES.suppliers} className="btn btn--secondary">
          Ver proveedores
        </Link>
      </div>

      <div className="card-grid dq-summary">
        <div className="stat-card">
          <div className="stat-card__label">Proveedores</div>
          <div className="stat-card__value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Completitud media</div>
          <div className="stat-card__value">{stats.avgCompleteness}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Grupos duplicados</div>
          <div className="stat-card__value">{stats.duplicates}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Datos incompletos</div>
          <div className="stat-card__value">{stats.incomplete}</div>
        </div>
        <div className="stat-card stat-card--accent">
          <div className="stat-card__label">Tier A</div>
          <div className="stat-card__value">{stats.tierA}</div>
        </div>
      </div>

      <div className="dq-actions">
        <button type="button" className="btn btn--secondary" onClick={selectAllVisible}>
          Seleccionar visibles
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleApplyImprovements}
        >
          Aplicar mejoras
          {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleConfirmChanges}
          disabled={saving || pending.length === 0}
        >
          {saving ? 'Guardando…' : `Confirmar cambios (${pending.length})`}
        </button>
      </div>

      {pending.length > 0 && (
        <div className="dq-pending-panel">
          <h4>Cambios pendientes ({pending.length})</h4>
          <ul className="dq-pending-list">
            {pending.slice(0, 30).map((p) => (
              <li key={p.supplierId}>
                <strong>{p.companyName}</strong>
                {p.notes.length > 0 ? ` — ${p.notes.join('; ')}` : ''}
              </li>
            ))}
          </ul>
          {pending.length > 30 && (
            <p className="import-card__hint">… y {pending.length - 30} más.</p>
          )}
        </div>
      )}

      {saveResult && (
        <div className={`alert ${saveResult.errors.length ? 'alert--error' : 'alert--success'}`}>
          Actualizados en Firestore: {saveResult.updated}
          {saveResult.errors.length > 0 && ` · Errores: ${saveResult.errors.length}`}
        </div>
      )}

      <div className="dq-section-tabs">
        <button
          type="button"
          className={`dq-tab ${tab === 'proveedores' ? 'dq-tab--active' : ''}`}
          onClick={() => setTab('proveedores')}
        >
          Proveedores
        </button>
        <button
          type="button"
          className={`dq-tab ${tab === 'duplicados' ? 'dq-tab--active' : ''}`}
          onClick={() => setTab('duplicados')}
        >
          Duplicados ({duplicateGroups.length})
        </button>
      </div>

      {tab === 'duplicados' && (
        <section>
          {duplicateGroups.length === 0 ? (
            <div className="empty-state">
              <p>No se detectaron duplicados.</p>
            </div>
          ) : (
            duplicateGroups.map((g) => (
              <div key={g.id} className="dq-dupes-card">
                <h4>
                  {g.reason === 'nombre_similar' && 'Nombre similar'}
                  {g.reason === 'mismo_telefono' && 'Mismo teléfono'}
                  {g.reason === 'mismo_contacto' && 'Mismo contacto'}
                  <span className="import-card__hint"> — {g.detail}</span>
                </h4>
                <ul>
                  {g.suppliers.map((s) => (
                    <li key={s.id}>
                      <Link to={ROUTES.suppliers}>{s.companyName}</Link>
                      {s.city ? ` · ${s.city}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'proveedores' && (
        <>
          <div className="toolbar">
            <select
              className="filter-select"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="">Todos los tiers</option>
              <option value="A">A — {TIER_LABELS.A}</option>
              <option value="B">B — {TIER_LABELS.B}</option>
              <option value="C">C — {TIER_LABELS.C}</option>
              <option value="D">D — {TIER_LABELS.D}</option>
            </select>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        filteredReports.length > 0 &&
                        filteredReports.every((r) => selectedIds.has(r.supplier.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) selectAllVisible();
                        else setSelectedIds(new Set());
                      }}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th>Proveedor</th>
                  <th>Completitud</th>
                  <th>Score</th>
                  <th>Clasificación</th>
                  <th>Última actividad</th>
                  <th>Potencial</th>
                  <th>Mejoras</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr
                    key={r.supplier.id}
                    className={selectedIds.has(r.supplier.id) ? 'row--selected' : ''}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.supplier.id)}
                        onChange={() => toggleSelect(r.supplier.id)}
                        aria-label={`Seleccionar ${r.supplier.companyName}`}
                      />
                    </td>
                    <td>
                      <strong>{r.supplier.companyName}</strong>
                      {r.isDuplicate && (
                        <div className="dq-duplicate-flag">Posible duplicado</div>
                      )}
                    </td>
                    <td>
                      <div
                        className={`dq-completeness ${r.completeness < 70 ? 'dq-completeness--low' : ''}`}
                      >
                        <div className="dq-completeness__bar">
                          <div
                            className="dq-completeness__fill"
                            style={{ width: `${r.completeness}%` }}
                          />
                        </div>
                        <span>{r.completeness}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="dq-score">{r.score}</span>
                    </td>
                    <td>
                      <span className={getTierClass(r.tier)} title={r.tierLabel}>
                        {r.tier} — {r.tierLabel}
                      </span>
                    </td>
                    <td>{formatDate(r.lastActivity)}</td>
                    <td>{r.potential}</td>
                    <td>
                      {r.suggestion.hasFieldChanges ? (
                        <span className="badge badge--activo">Sugeridas</span>
                      ) : (
                        '—'
                      )}
                      {materialsToLabel(r.supplier.generatedMaterials) && (
                        <div className="import-card__hint" style={{ marginTop: '0.25rem' }}>
                          {materialsToLabel(r.supplier.generatedMaterials)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReports.length === 0 && reports.length > 0 && (
            <div className="empty-state">
              <p>No hay proveedores con ese filtro.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

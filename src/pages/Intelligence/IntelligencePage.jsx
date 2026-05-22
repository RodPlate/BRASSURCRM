import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { subscribeSuppliers } from '../../services/suppliersService';
import { subscribeContacts } from '../../services/contactsService';
import { subscribeActivities } from '../../services/activitiesService';
import { subscribeOpportunities } from '../../services/opportunitiesService';
import { buildIntelligenceSnapshot, emptyIntelligenceSnapshot } from '../../utils/intelligence';
import { safeArray } from '../../utils/safeData';
import {
  exportSuppliersExcel,
  exportOpportunitiesExcel,
  exportActivitiesExcel,
  exportDashboardExcel,
  exportFullReportExcel,
} from '../../utils/exportExcel';
import { formatDate, formatNumber } from '../../utils/format';
import BarChart from '../../components/intelligence/BarChart';
import StatusBadge from '../../components/common/StatusBadge';
import '../../styles/intelligence.css';

const REQUIRED_SOURCES = ['suppliers', 'contacts', 'activities', 'opportunities'];

export default function IntelligencePage() {
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [sourcesReady, setSourcesReady] = useState({
    suppliers: false,
    contacts: false,
    activities: false,
    opportunities: false,
  });
  const [exportOpen, setExportOpen] = useState(false);

  const markSourceReady = useCallback((source) => {
    setSourcesReady((prev) => ({ ...prev, [source]: true }));
  }, []);

  const handleSourceError = useCallback(
    (source, error) => {
      console.error('[Inteligencia]', error);
      const msg = error?.message || String(error);
      setLoadError((prev) => prev || `Error cargando Inteligencia Comercial (${source})`);
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
      opportunities: false,
    });

    let unsubs = [];

    try {
      unsubs = [
        subscribeSuppliers(
          (data) => {
            const list = safeArray(data);
            console.log('[Inteligencia] suppliers', list.length);
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
        subscribeOpportunities(
          (data) => {
            setOpportunities(safeArray(data));
            markSourceReady('opportunities');
          },
          (err) => handleSourceError('opportunities', err)
        ),
      ];
    } catch (err) {
      console.error('[Inteligencia]', err);
      setLoadError('Error cargando Inteligencia Comercial');
      REQUIRED_SOURCES.forEach((s) => markSourceReady(s));
    }

    return () => unsubs.forEach((u) => u?.());
  }, [markSourceReady, handleSourceError]);

  useEffect(() => {
    const allReady = REQUIRED_SOURCES.every((key) => sourcesReady[key]);
    if (allReady) {
      setLoading(false);
      setLoaded(true);
      console.log('[Inteligencia] loaded');
    }
  }, [sourcesReady]);

  const supplierMap = useMemo(
    () => Object.fromEntries(safeArray(suppliers).map((s) => [s.id, s.companyName])),
    [suppliers]
  );

  const contactMap = useMemo(
    () => Object.fromEntries(safeArray(contacts).map((c) => [c.id, c.name])),
    [contacts]
  );

  const snapshot = useMemo(() => {
    try {
      return buildIntelligenceSnapshot(suppliers, activities, opportunities);
    } catch (err) {
      console.error('[Inteligencia]', err);
      return emptyIntelligenceSnapshot();
    }
  }, [suppliers, activities, opportunities]);

  const { kpis, ranking, byMaterial, byDepartment, recommendedActions } = snapshot;

  const topMaterials = useMemo(() => safeArray(byMaterial).slice(0, 8), [byMaterial]);

  const hasAnyData =
    suppliers.length > 0 ||
    activities.length > 0 ||
    opportunities.length > 0 ||
    contacts.length > 0;

  const handleExport = (type) => {
    setExportOpen(false);
    const jobs = {
      suppliers: () => exportSuppliersExcel(suppliers),
      opportunities: () => exportOpportunitiesExcel(opportunities, supplierMap),
      activities: () => exportActivitiesExcel(activities, supplierMap, contactMap),
      dashboard: () => exportDashboardExcel(snapshot),
      full: () =>
        exportFullReportExcel(
          suppliers,
          opportunities,
          activities,
          snapshot,
          supplierMap,
          contactMap
        ),
    };
    const run = jobs[type];
    if (!run) return;
    Promise.allSettled([Promise.resolve().then(run)]).then((results) => {
      const failed = results.find((r) => r.status === 'rejected');
      if (failed) {
        console.error('[Inteligencia]', failed.reason);
        alert(failed.reason?.message || 'Error al exportar');
      }
    });
  };

  if (loading) {
    return <div className="loading">Cargando inteligencia comercial…</div>;
  }

  if (loadError && !hasAnyData) {
    return (
      <div className="intelligence-page">
        <div className="alert alert--error" role="alert">
          <strong>Error cargando Inteligencia Comercial</strong>
          <p style={{ margin: '0.5rem 0 0' }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="intelligence-page">
        <div className="page-header">
          <div>
            <h2>Inteligencia Comercial</h2>
            <p>Análisis en tiempo real para priorizar compras</p>
          </div>
        </div>
        <div className="empty-state">
          <p>Sin datos para analizar</p>
          <p className="text-muted">
            Importe proveedores o registre actividades y oportunidades para ver KPIs y rankings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      {loadError && (
        <div className="alert alert--error" role="alert">
          <strong>Error cargando Inteligencia Comercial</strong>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            {loadError} — Se muestran los datos disponibles.
          </p>
        </div>
      )}

      {loaded && !loadError && (
        <p className="intel-status intel-status--ok" aria-live="polite">
          Datos cargados
        </p>
      )}

      <div className="page-header">
        <div>
          <h2>Inteligencia Comercial</h2>
          <p>Análisis en tiempo real para priorizar compras</p>
        </div>
        <div className="export-dropdown">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setExportOpen((v) => !v)}
          >
            Exportar Excel ▾
          </button>
          {exportOpen && (
            <ul className="export-dropdown__menu">
              <li><button type="button" onClick={() => handleExport('suppliers')}>Proveedores</button></li>
              <li><button type="button" onClick={() => handleExport('opportunities')}>Oportunidades</button></li>
              <li><button type="button" onClick={() => handleExport('activities')}>Actividades</button></li>
              <li><button type="button" onClick={() => handleExport('dashboard')}>Dashboard analítico</button></li>
              <li><button type="button" onClick={() => handleExport('full')}>Reporte completo</button></li>
            </ul>
          )}
        </div>
      </div>

      <section className="intel-section">
        <h3 className="intel-section__title">KPIs generales</h3>
        <div className="card-grid">
          <div className="stat-card">
            <div className="stat-card__label">Proveedores totales</div>
            <div className="stat-card__value">{kpis.totalSuppliers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Proveedores activos</div>
            <div className="stat-card__value">{kpis.activeSuppliers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Nuevos este mes</div>
            <div className="stat-card__value">{kpis.newThisMonth}</div>
          </div>
          <div className="stat-card stat-card--accent">
            <div className="stat-card__label">Oportunidades abiertas</div>
            <div className="stat-card__value">{kpis.openOpportunities}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Oportunidades ganadas</div>
            <div className="stat-card__value">{kpis.wonOpportunities}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Volumen potencial</div>
            <div className="stat-card__value stat-card__value--sm">
              {formatNumber(kpis.potentialVolumeKg, ' kg')}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Volumen ganado</div>
            <div className="stat-card__value stat-card__value--sm">
              {formatNumber(kpis.wonVolumeKg, ' kg')}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Tasa de conversión</div>
            <div className="stat-card__value">{kpis.conversionRate}%</div>
            <div className="stat-card__hint">Ganadas / (ganadas + perdidas)</div>
          </div>
        </div>
      </section>

      <section className="intel-section">
        <h3 className="intel-section__title">Ranking de proveedores</h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th>Ciudad</th>
                <th>Material principal</th>
                <th>Volumen est.</th>
                <th>Actividades</th>
                <th>Último contacto</th>
                <th>Estado</th>
                <th>Score</th>
                <th>Clasificación</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>
                    <Link to="/proveedores" className="intel-link">
                      <strong>{row.companyName}</strong>
                    </Link>
                  </td>
                  <td>{row.city}</td>
                  <td>{row.mainMaterial}</td>
                  <td>{formatNumber(row.estimatedVolume, ' kg')}</td>
                  <td>{row.activityCount}</td>
                  <td>{row.lastContact ? formatDate(row.lastContact) : '—'}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td>
                    <span className={`score-pill ${row.scoreClass}`}>{row.score}</span>
                  </td>
                  <td><span className={`score-label ${row.scoreClass}`}>{row.classification}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ranking.length === 0 && (
          <div className="empty-state"><p>No hay proveedores para analizar.</p></div>
        )}
      </section>

      <section className="intel-section intel-charts-grid">
        <h3 className="intel-section__title intel-section__title--full">Análisis por material</h3>
        <div className="intel-chart-card">
          <h4>Volumen estimado (kg)</h4>
          <BarChart
            data={topMaterials}
            labelKey="material"
            valueKey="volumeKg"
            unit=" kg"
          />
        </div>
        <div className="intel-chart-card">
          <h4>Proveedores por material</h4>
          <BarChart
            data={topMaterials}
            labelKey="material"
            valueKey="supplierCount"
            color="var(--color-primary-light)"
          />
        </div>
        <div className="intel-chart-card">
          <h4>Oportunidades por material</h4>
          <BarChart
            data={topMaterials}
            labelKey="material"
            valueKey="opportunities"
            color="var(--color-accent)"
          />
        </div>
        {topMaterials.length === 0 && (
          <div className="empty-state empty-state--compact">
            <p>Sin datos de materiales.</p>
          </div>
        )}
      </section>

      <section className="intel-section">
        <h3 className="intel-section__title">Análisis geográfico</h3>
        <div className="data-table-wrapper geo-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Cantidad proveedores</th>
                <th>Volumen potencial (kg)</th>
                <th>Distribución</th>
              </tr>
            </thead>
            <tbody>
              {byDepartment.map((row) => {
                const maxVol = byDepartment[0]?.volumeKg || 1;
                const pct = Math.round((row.volumeKg / maxVol) * 100);
                return (
                  <tr key={row.department}>
                    <td><strong>{row.department}</strong></td>
                    <td>{row.suppliers}</td>
                    <td>{formatNumber(row.volumeKg, ' kg')}</td>
                    <td>
                      <div className="geo-bar">
                        <div className="geo-bar__fill" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {byDepartment.length === 0 && (
          <div className="empty-state empty-state--compact">
            <p>Sin datos geográficos.</p>
          </div>
        )}
      </section>

      <section className="intel-section">
        <h3 className="intel-section__title">Próximas acciones recomendadas</h3>
        {recommendedActions.length === 0 ? (
          <div className="empty-state">
            <p>No hay acciones recomendadas en este momento.</p>
          </div>
        ) : (
          <ul className="action-recommendations">
            {recommendedActions.map((item) => (
              <li key={item.id} className={`action-recommendations__item action-recommendations__item--${item.priority}`}>
                <div className="action-recommendations__main">
                  <span className={`action-priority action-priority--${item.priority}`}>{item.priority}</span>
                  <strong>{item.action}</strong>
                  <span>{item.supplierName}</span>
                </div>
                <p className="action-recommendations__reason">{item.reason}</p>
                <Link to="/proveedores" className="btn btn--secondary btn--sm">
                  Ver proveedor
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

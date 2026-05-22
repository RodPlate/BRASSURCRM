import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeSuppliers, fetchAllSuppliers } from '../services/suppliersService';
import { importSupplierRows } from '../services/importSuppliersService';
import {
  parseSuppliersExcel,
  markDuplicates,
  summarizeImportRows,
  buildExistingCompanyKeySet,
  materialsLabel,
  SHEET_NAME,
} from '../utils/importSuppliers';
import { formatNumber } from '../utils/format';
import StatusBadge from '../components/common/StatusBadge';
import { ROUTES } from '../constants/routes';

const PHASE = {
  idle: 'idle',
  reading: 'reading',
  validating: 'validating',
  importing: 'importing',
  completed: 'completed',
  error: 'error',
};

const PHASE_LABELS = {
  [PHASE.idle]: '',
  [PHASE.reading]: 'Leyendo archivo…',
  [PHASE.validating]: 'Validando datos…',
  [PHASE.importing]: 'Importando…',
  [PHASE.completed]: 'Completado',
  [PHASE.error]: 'Error',
};

/**
 * Pantalla: Importar Proveedores (base Excel PROVEEDORES POT.)
 */
export default function ImportarProveedores() {
  const [existingSuppliers, setExistingSuppliers] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [onlyNew, setOnlyNew] = useState(true);
  const [phase, setPhase] = useState(PHASE.idle);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [result, setResult] = useState(null);

  useEffect(() => {
    return subscribeSuppliers(setExistingSuppliers);
  }, []);

  const rowsWithDupes = useMemo(
    () => (parsedRows.length ? markDuplicates(parsedRows, existingSuppliers) : []),
    [parsedRows, existingSuppliers]
  );

  const summary = useMemo(
    () => (rowsWithDupes.length ? summarizeImportRows(rowsWithDupes, onlyNew) : null),
    [rowsWithDupes, onlyNew]
  );

  const previewRows = useMemo(() => rowsWithDupes.slice(0, 25), [rowsWithDupes]);

  const isBusy = phase === PHASE.reading || phase === PHASE.validating || phase === PHASE.importing;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    setParseError('');
    setResult(null);
    setParsedRows([]);
    setPhase(PHASE.idle);

    if (!file) {
      setFileName('');
      return;
    }

    setFileName(file.name);
    setPhase(PHASE.reading);

    try {
      const buffer = await file.arrayBuffer();
      setPhase(PHASE.validating);
      const { rows } = parseSuppliersExcel(buffer);
      console.log('[import UI] Filas leídas del Excel:', rows.length);
      setParsedRows(rows);
      setPhase(PHASE.idle);
    } catch (err) {
      console.error('[import UI] Error al leer Excel:', err);
      setParseError(err.message || 'No se pudo leer el archivo Excel.');
      setParsedRows([]);
      setPhase(PHASE.error);
    }

    e.target.value = '';
  };

  const handleImport = async () => {
    if (!rowsWithDupes.length || !summary?.toImport) return;

    setPhase(PHASE.importing);
    setResult(null);
    setProgress({ current: 0, total: summary.toImport, label: 'Preparando…' });

    const { keys: existingKeys } = buildExistingCompanyKeySet(existingSuppliers);
    console.log('[import UI] Proveedores existentes en CRM:', existingKeys.size);
    console.log('[import UI] Duplicados detectados:', summary.duplicates);

    try {
      const importResult = await importSupplierRows(rowsWithDupes, {
        onlyNew,
        existingKeys,
        onProgress: (current, total, label) => {
          setProgress({ current, total, label });
        },
      });

      let refreshed = [];
      try {
        refreshed = await fetchAllSuppliers();
        setExistingSuppliers(refreshed);
        console.log('[import UI] Lista proveedores refrescada:', refreshed.length);
      } catch (refreshErr) {
        console.error('[import UI] Error al refrescar proveedores:', refreshErr);
        alert(refreshErr.message || 'No se pudo refrescar la lista de proveedores');
      }

      setResult({
        ...importResult,
        skipped: importResult.skippedDuplicates,
        verifiedInFirestore: importResult.verifiedInFirestore ?? refreshed.length,
      });
      setPhase(PHASE.completed);

      if (importResult.imported > 0 && importResult.documentsWritten === 0) {
        alert('La importación terminó pero no se registraron escrituras en Firestore.');
      }
    } catch (err) {
      console.error('[import UI] Error fatal importación:', err);
      console.error('Error guardando en Firestore:', err);
      alert(err.message || 'Error en importación');
      setPhase(PHASE.error);
      setResult({
        totalRead: rowsWithDupes.length,
        imported: 0,
        skippedDuplicates: summary.skipped,
        contactsCreated: 0,
        activitiesCreated: 0,
        documentsWritten: 0,
        commitsExecuted: 0,
        batchesSent: 0,
        verifiedInFirestore: 0,
        firebaseErrors: [{ code: err.code, message: err.message }],
        skipped: summary.skipped,
        errors: [
          {
            row: '-',
            companyName: '-',
            message: err.message || 'Error en importación',
          },
        ],
      });
    }
  };

  const statusBanner = phase !== PHASE.idle && (
    <div
      className={`import-status import-status--${phase}`}
      role="status"
      aria-live="polite"
    >
      <strong>{PHASE_LABELS[phase]}</strong>
      {phase === PHASE.importing && progress.total > 0 && (
        <span>
          {' '}
          — {progress.current} / {progress.total}
          {progress.label ? ` (${progress.label})` : ''}
        </span>
      )}
    </div>
  );

  return (
    <div className="import-page">
      <div className="page-header">
        <div>
          <h2>Importar Proveedores</h2>
          <p>Base inicial desde Excel — hoja &quot;{SHEET_NAME}&quot;</p>
        </div>
        <Link to={ROUTES.suppliers} className="btn btn--secondary">
          Ver proveedores
        </Link>
      </div>

      {statusBanner}

      <section className="import-card">
        <h3>1. Seleccionar archivo Excel</h3>
        <p className="import-card__hint">
          Archivo .xlsx o .xls con la hoja <strong>{SHEET_NAME}</strong>.
        </p>
        <label className="import-file">
          <input
            type="file"
            accept=".xlsx,.xls,.xlsm"
            onChange={handleFileChange}
            disabled={isBusy}
          />
          <span className="btn btn--primary">Seleccionar archivo Excel</span>
          {fileName && <span className="import-file__name">{fileName}</span>}
        </label>
        {parseError && <div className="alert alert--error">{parseError}</div>}
      </section>

      {summary && (
        <>
          <section className="import-card">
            <h3>2. Resumen</h3>
            <div className="card-grid import-stats">
              <div className="stat-card">
                <div className="stat-card__label">Filas válidas</div>
                <div className="stat-card__value">{summary.total}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Duplicadas</div>
                <div className="stat-card__value">{summary.duplicates}</div>
              </div>
              <div className="stat-card stat-card--accent">
                <div className="stat-card__label">A importar</div>
                <div className="stat-card__value">{summary.toImport}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Se omitirán</div>
                <div className="stat-card__value">{onlyNew ? summary.skipped : 0}</div>
              </div>
            </div>
            <label className="form-field form-field--checkbox import-option">
              <input
                type="checkbox"
                checked={onlyNew}
                onChange={(e) => setOnlyNew(e.target.checked)}
                disabled={isBusy}
              />
              <span>Importar solo proveedores nuevos (omitir duplicados)</span>
            </label>
          </section>

          <section className="import-card">
            <h3>3. Vista previa ({Math.min(25, rowsWithDupes.length)} de {rowsWithDupes.length})</h3>
            <div className="data-table-wrapper">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Empresa</th>
                    <th>Rubro</th>
                    <th>Ciudad</th>
                    <th>Materiales</th>
                    <th>Volumen</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th>Duplicado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr
                      key={`${row.rowNumber}-${row.companyName}`}
                      className={row.isDuplicate ? 'row--duplicate' : ''}
                    >
                      <td>{row.rowNumber}</td>
                      <td><strong>{row.companyName}</strong></td>
                      <td>{row.industry || '—'}</td>
                      <td>{row.city || '—'}</td>
                      <td>{materialsLabel(row.generatedMaterials) || '—'}</td>
                      <td>{formatNumber(row.estimatedMonthlyVolumeKg, ' kg')}</td>
                      <td>{row.contactName || '—'}</td>
                      <td><StatusBadge value={row.status} /></td>
                      <td>{row.isDuplicate ? <span className="badge badge--descartado">Sí</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="import-card import-actions">
            <h3>4. Confirmar importación</h3>
            {phase === PHASE.importing && (
              <div className="import-progress">
                <div className="import-progress__bar">
                  <div
                    className="import-progress__fill"
                    style={{
                      width: progress.total
                        ? `${Math.min(100, (progress.current / progress.total) * 100)}%`
                        : '5%',
                    }}
                  />
                </div>
                <span>
                  {progress.current} / {progress.total}
                  {progress.label ? ` — ${progress.label}` : ''}
                </span>
              </div>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleImport}
              disabled={isBusy || summary.toImport === 0}
            >
              {phase === PHASE.importing
                ? 'Importando…'
                : `Confirmar importación (${summary.toImport})`}
            </button>
          </section>
        </>
      )}

      {result && (
        <section className="import-card import-result">
          <h3>Resumen de importación</h3>
          <div className="card-grid import-stats">
            <div className="stat-card">
              <div className="stat-card__label">Total leídas</div>
              <div className="stat-card__value">{result.totalRead ?? summary?.total ?? 0}</div>
            </div>
            <div className="stat-card stat-card--accent">
              <div className="stat-card__label">Importadas</div>
              <div className="stat-card__value">{result.imported}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Omitidas (duplicado)</div>
              <div className="stat-card__value">
                {result.skippedDuplicates ?? result.skipped ?? 0}
              </div>
            </div>
            <div className="stat-card stat-card--danger">
              <div className="stat-card__label">Errores</div>
              <div className="stat-card__value">{result.errors.length}</div>
            </div>
          </div>
          <p className="import-card__hint">
            Firestore: {result.documentsWritten ?? 0} documento(s) en &quot;suppliers&quot; ·{' '}
            {result.commitsExecuted ?? 0} commit(s) · Verificados en base:{' '}
            {result.verifiedInFirestore ?? '—'}
            {(result.contactsCreated > 0 || result.activitiesCreated > 0) &&
              ` · Contactos: ${result.contactsCreated} · Actividades: ${result.activitiesCreated}`}
          </p>
          {(result.firebaseErrors?.length > 0 || result.errors.length > 0) && (
            <div className="import-errors">
              <h4>Errores</h4>
              {result.firebaseErrors?.length > 0 && (
                <ul>
                  {result.firebaseErrors.slice(0, 20).map((err, i) => (
                    <li key={`fb-${i}`}>
                      <strong>{err.context || 'Firebase'}</strong>: [{err.code}] {err.message}
                    </li>
                  ))}
                </ul>
              )}
              <ul>
                {result.errors.slice(0, 50).map((err, i) => (
                  <li key={`${err.row}-${i}`}>
                    Fila {err.row} — <strong>{err.companyName}</strong>: {err.message}
                  </li>
                ))}
              </ul>
              {result.errors.length > 50 && (
                <p className="import-card__hint">… y {result.errors.length - 50} errores más.</p>
              )}
            </div>
          )}
          <div className="import-result__actions">
            <Link to={ROUTES.suppliers} className="btn btn--primary">Ir a proveedores</Link>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setResult(null);
                setParsedRows([]);
                setFileName('');
                setPhase(PHASE.idle);
                setProgress({ current: 0, total: 0, label: '' });
              }}
            >
              Importar otro archivo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

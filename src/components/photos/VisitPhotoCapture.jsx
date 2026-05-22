import { useRef } from 'react';
import { formatFileSize, calcReductionPercent } from '../../utils/imageCompression';

/**
 * Botones cámara/galería, preview y progreso de subida.
 */
export default function VisitPhotoCapture({
  caption = '',
  onCaptionChange,
  showCaption = true,
  busy = false,
  preparingPreview = false,
  pendingItems = [],
  pendingTotals = { original: 0, compressed: 0 },
  onFilesSelected,
  onRemovePending,
  onClearPending,
  onConfirmUpload,
  uploadQueue = [],
  uploading = false,
  uploadSummary = null,
  error = '',
  confirmLabel,
}) {
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetInputs = () => {
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleGallery = async (e) => {
    if (e.target.files?.length) {
      await onFilesSelected(e.target.files);
      resetInputs();
    }
  };

  const handleCamera = async (e) => {
    if (e.target.files?.length) {
      await onFilesSelected(e.target.files);
      resetInputs();
    }
  };

  const pendingSavings = calcReductionPercent(
    pendingTotals.original,
    pendingTotals.compressed
  );

  const hasPending = pendingItems.length > 0;
  const label =
    confirmLabel ||
    `Guardar ${pendingItems.length} foto${pendingItems.length !== 1 ? 's' : ''}`;

  return (
    <div className="visit-photo-capture">
      {showCaption && onCaptionChange && (
        <div className="form-field visit-photo-capture__caption">
          <label htmlFor="visit-photo-capture-caption">Descripción</label>
          <input
            id="visit-photo-capture-caption"
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Ej.: Fachada, patio de chatarra…"
            disabled={busy}
          />
        </div>
      )}

      <div className="visit-photo-capture__actions visit-photo-capture__actions--large">
        <label
          className={`visit-photos-file-label btn btn--primary btn--capture ${busy ? 'btn--disabled' : ''}`}
          htmlFor="visit-photo-capture-camera"
        >
          <input
            id="visit-photo-capture-camera"
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={handleCamera}
          />
          📷 Tomar foto
        </label>

        <label
          className={`visit-photos-file-label btn btn--secondary btn--capture ${busy ? 'btn--disabled' : ''}`}
          htmlFor="visit-photo-capture-gallery"
        >
          <input
            id="visit-photo-capture-gallery"
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={handleGallery}
          />
          🖼️ Subir desde galería
        </label>
      </div>

      {preparingPreview && (
        <p className="visit-photos-progress">Comprimiendo imágenes para vista previa…</p>
      )}

      {hasPending && !uploading && (
        <div className="visit-photos-preview">
          <div className="visit-photos-preview__header">
            <h4>Vista previa ({pendingItems.length})</h4>
            <p className="visit-photos-preview__totals">
              {formatFileSize(pendingTotals.original)} →{' '}
              {formatFileSize(pendingTotals.compressed)}
              {pendingSavings > 0 && ` (−${pendingSavings}% ahorro)`}
            </p>
          </div>
          <div className="visit-photos-preview__grid">
            {pendingItems.map((item) => (
              <div key={item.id} className="visit-photos-preview__card">
                <img src={item.previewUrl} alt={item.name} />
                <div className="visit-photos-preview__card-meta">
                  <span className="visit-photos-preview__card-name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="visit-photos-preview__card-size">
                    {formatFileSize(item.compression.originalSize)} →{' '}
                    {formatFileSize(item.compression.compressedSize)}
                    {item.compression.wasSkipped ? ' (sin compresión)' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="visit-photos-preview__remove"
                  title="Quitar"
                  aria-label={`Quitar ${item.name}`}
                  onClick={() => onRemovePending(item.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="visit-photos-preview__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => onConfirmUpload(caption)}
            >
              {label}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={busy}
              onClick={onClearPending}
            >
              Cancelar
            </button>
            <p className="visit-photos-preview__hint">
              Puede tomar más fotos o añadir desde galería antes de guardar.
            </p>
          </div>
        </div>
      )}

      {uploading && uploadQueue.length > 0 && (
        <ul className="visit-photos-upload-queue">
          {uploadQueue.map((item) => (
            <li
              key={item.id}
              className={`visit-photos-upload-item visit-photos-upload-item--${item.status}`}
            >
              <div className="visit-photos-upload-item__head">
                <span className="visit-photos-upload-item__name">{item.name}</span>
                <span className="visit-photos-upload-item__status">
                  {item.status === 'uploading' && `${item.percent}%`}
                  {item.status === 'done' && '✓ Subida'}
                  {item.status === 'error' && 'Error'}
                  {item.status === 'pending' && 'En cola…'}
                </span>
              </div>
              {(item.status === 'uploading' || item.status === 'done') && (
                <div className="visit-photos-upload-item__bar">
                  <div
                    className="visit-photos-upload-item__fill"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              )}
              {item.error && (
                <span className="visit-photos-upload-item__error">{item.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {uploadSummary && !uploading && (
        <div className="visit-photos-summary">
          <h4>Resumen de subida</h4>
          <ul>
            <li>
              <strong>Total:</strong> {uploadSummary.selected}
            </li>
            <li>
              <strong>Subidas:</strong> {uploadSummary.success}
            </li>
            <li>
              <strong>Errores:</strong> {uploadSummary.errors.length}
            </li>
            <li>
              <strong>Ahorro:</strong> {uploadSummary.savingsMB}
              {uploadSummary.savingsPercent > 0 && ` (${uploadSummary.savingsPercent}%)`}
            </li>
          </ul>
          {uploadSummary.errors.length > 0 && (
            <ul className="visit-photos-summary__errors">
              {uploadSummary.errors.map((err, idx) => (
                <li key={`${err.name}-${idx}`}>
                  <strong>{err.name}</strong>: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <div className="alert alert--error">{error}</div>}
    </div>
  );
}

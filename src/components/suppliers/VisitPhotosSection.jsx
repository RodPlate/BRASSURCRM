import { useEffect, useState } from 'react';
import {
  subscribeAssignedVisitPhotos,
  uploadVisitPhoto,
  deleteVisitPhoto,
} from '../../services/visitPhotosService';
import { usePhotoCaptureFlow } from '../../hooks/usePhotoCaptureFlow';
import VisitPhotoCapture from '../photos/VisitPhotoCapture';
import { formatDate } from '../../utils/format';
import { formatFileSize, calcReductionPercent } from '../../utils/imageCompression';
import ConfirmDialog from '../common/ConfirmDialog';
import '../../styles/visitPhotos.css';

export default function VisitPhotosSection({
  supplierId,
  supplierName = '',
  visitActivities = [],
}) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [activityId, setActivityId] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const capture = usePhotoCaptureFlow({
    uploadOne: ({ file, compression, caption, onProgress }) =>
      uploadVisitPhoto({
        supplierId,
        file,
        compression,
        caption,
        activityId: activityId || null,
        onProgress,
      }),
    onBatchComplete: async () => {
      setCaption('');
    },
  });

  useEffect(() => {
    if (!supplierId) return undefined;
    setLoading(true);
    const unsub = subscribeAssignedVisitPhotos(supplierId, (data) => {
      setPhotos(data);
      setLoading(false);
    });
    return unsub;
  }, [supplierId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVisitPhoto(deleteTarget, { supplierName });
      setDeleteTarget(null);
      if (lightbox?.id === deleteTarget.id) setLightbox(null);
    } catch (err) {
      alert(err.message || 'No se pudo eliminar la foto');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = (photo) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.fileName || `foto-${photo.id}.jpg`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parsePhotoDate = (photo) => {
    const v = photo.takenAt || photo.uploadedAt;
    return formatDate(v);
  };

  const getCompressionRatio = (photo) =>
    photo.compressionRatio ??
    photo.compressionPercent ??
    calcReductionPercent(photo.originalSize, photo.compressedSize);

  return (
    <section className="detail-section visit-photos-section">
      <div className="detail-section__header">
        <h3>Fotos de visita ({photos.length})</h3>
      </div>

      <div className="visit-photos-upload">
        {visitActivities.length > 0 && (
          <div className="form-field">
            <label htmlFor="visit-photo-activity">Vincular a actividad (opcional)</label>
            <select
              id="visit-photo-activity"
              className="filter-select"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              disabled={capture.busy}
            >
              <option value="">Sin vincular</option>
              {visitActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type} — {formatDate(a.date)}
                </option>
              ))}
            </select>
          </div>
        )}

        <VisitPhotoCapture
          caption={caption}
          onCaptionChange={setCaption}
          busy={capture.busy}
          preparingPreview={capture.preparingPreview}
          pendingItems={capture.pendingItems}
          pendingTotals={capture.pendingTotals}
          onFilesSelected={capture.handleFilesSelected}
          onRemovePending={capture.removePendingItem}
          onClearPending={capture.clearPending}
          onConfirmUpload={capture.confirmUpload}
          uploadQueue={capture.uploadQueue}
          uploading={capture.uploading}
          uploadSummary={capture.uploadSummary}
          error={capture.error}
        />
      </div>

      {loading ? (
        <div className="loading loading--compact">Cargando fotos…</div>
      ) : photos.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <p>Aún no hay fotos asignadas para este proveedor.</p>
          <p className="text-muted">
            También puede subir fotos desde la bandeja 📷 Fotos y asignarlas después.
          </p>
        </div>
      ) : (
        <div className="visit-photos-gallery">
          {photos.map((photo) => (
            <div key={photo.id} className="visit-photo-card">
              <button
                type="button"
                className="visit-photo-card__thumb"
                onClick={() => setLightbox(photo)}
                aria-label="Ver imagen grande"
                disabled={capture.busy}
              >
                <img src={photo.url} alt={photo.caption || 'Foto de visita'} loading="lazy" />
                {photo.caption && (
                  <span className="visit-photo-card__caption">{photo.caption}</span>
                )}
              </button>
              <div className="visit-photo-card__toolbar">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  title="Descargar"
                  disabled={capture.busy}
                  onClick={() => handleDownload(photo)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  title="Eliminar"
                  disabled={capture.busy}
                  onClick={() => setDeleteTarget(photo)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="visit-photo-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="visit-photo-lightbox__close"
            onClick={() => setLightbox(null)}
            aria-label="Cerrar"
          >
            ×
          </button>
          <img
            className="visit-photo-lightbox__img"
            src={lightbox.url}
            alt={lightbox.caption || 'Foto de visita'}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="visit-photo-lightbox__meta" onClick={(e) => e.stopPropagation()}>
            {lightbox.caption && <p><strong>{lightbox.caption}</strong></p>}
            <p>
              {parsePhotoDate(lightbox)}
              {lightbox.uploadedBy ? ` · ${lightbox.uploadedBy}` : ''}
            </p>
            {lightbox.originalSize != null && (
              <p className="visit-photos-size-meta">
                {formatFileSize(lightbox.originalSize)}
                {lightbox.compressedSize != null && (
                  <>
                    {' → '}
                    {formatFileSize(lightbox.compressedSize)}
                    {' '}
                    (−{getCompressionRatio(lightbox)}%)
                  </>
                )}
              </p>
            )}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => handleDownload(lightbox)}
            >
              Descargar
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar foto"
          message="¿Eliminar esta foto de visita? Se borrará del almacenamiento y no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </section>
  );
}

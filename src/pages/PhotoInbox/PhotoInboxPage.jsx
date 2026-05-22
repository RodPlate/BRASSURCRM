import { useEffect, useState } from 'react';
import {
  subscribePendingVisitPhotos,
  uploadPendingVisitPhoto,
  assignVisitPhotoToSupplier,
  deleteVisitPhoto,
  logPendingPhotosUploaded,
} from '../../services/visitPhotosService';
import { subscribeSuppliers } from '../../services/suppliersService';
import { usePhotoCaptureFlow } from '../../hooks/usePhotoCaptureFlow';
import VisitPhotoCapture from '../../components/photos/VisitPhotoCapture';
import AssignPhotoModal from '../../components/photos/AssignPhotoModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/format';
import { formatFileSize } from '../../utils/imageCompression';
import '../../styles/visitPhotos.css';
import '../../styles/photoInbox.css';

export default function PhotoInboxPage() {
  const [photos, setPhotos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [caption, setCaption] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  const capture = usePhotoCaptureFlow({
    uploadOne: async ({ file, compression, caption, onProgress }) => {
      try {
        return await uploadPendingVisitPhoto({ file, compression, caption, onProgress });
      } catch (err) {
        console.error('[Fotos]', err);
        throw err;
      }
    },
    onBatchComplete: async (summary) => {
      try {
        if (summary.success > 0) {
          await logPendingPhotosUploaded(summary.success);
          setCaption('');
        }
      } catch (err) {
        console.warn('[Fotos] Timeline bandeja:', err);
      }
    },
  });

  useEffect(() => {
    setLoading(true);
    setLoadError('');

    const unsubPhotos = subscribePendingVisitPhotos(
      (data) => {
        setPhotos(data);
        setLoading(false);
      },
      (error) => {
        console.error('[Fotos] Error cargando bandeja:', error);
        setLoadError(error?.message || 'Error cargando la bandeja de fotos');
        setPhotos([]);
        setLoading(false);
      }
    );

    const unsubSuppliers = subscribeSuppliers(
      setSuppliers,
      (err) => console.error('[Fotos] Error cargando proveedores:', err)
    );

    return () => {
      unsubPhotos();
      unsubSuppliers();
    };
  }, []);

  const handleAssign = async (supplierId, supplierName) => {
    if (!assignTarget) return;

    setAssigningId(assignTarget.id);
    setActionError('');
    setAssignSuccess('');

    try {
      await assignVisitPhotoToSupplier(assignTarget, supplierId, supplierName);
      setAssignSuccess(
        `Foto asignada a ${supplierName || 'proveedor'}. Ya no aparecerá en la bandeja.`
      );
      setAssignTarget(null);
    } catch (err) {
      console.error('[Fotos] Error asignando foto:', err);
      const msg = err?.message || 'No se pudo asignar la foto';
      setActionError(msg);
      alert(msg);
    } finally {
      setAssigningId(null);
    }
  };

  const handleDelete = async (forceDocOnly = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      const { storageWarning } = await deleteVisitPhoto(deleteTarget, { forceDocOnly });
      setDeleteTarget(null);
      if (lightbox?.id === deleteTarget.id) setLightbox(null);
      if (storageWarning) {
        alert(`Registro eliminado. ${storageWarning}`);
      }
    } catch (err) {
      console.error('[Fotos]', err);
      alert(err.message || 'No se pudo eliminar la foto');
    } finally {
      setDeleting(false);
    }
  };

  const parseUploadedAt = (photo) => formatDate(photo.uploadedAt || photo.takenAt);

  const busy = capture.busy || Boolean(assigningId);

  return (
    <div className="photo-inbox-page">
      <p className="photo-inbox-page__intro">
        Tome o suba fotos desde aquí y asígnelas después al proveedor. Las fotos ya asignadas solo
        aparecen en la ficha del proveedor.
      </p>

      {loadError && (
        <div className="alert alert--error" role="alert">
          {loadError}
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            Si el error menciona un índice, ejecute: firebase deploy --only firestore:indexes
          </p>
        </div>
      )}

      {assignSuccess && (
        <div className="alert alert--success" role="status">
          {assignSuccess}
        </div>
      )}

      <section className="visit-photos-upload photo-inbox-page__capture">
        <VisitPhotoCapture
          caption={caption}
          onCaptionChange={setCaption}
          busy={busy}
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
          error={capture.error || actionError}
          confirmLabel={
            capture.pendingItems.length
              ? `Subir ${capture.pendingItems.length} foto${capture.pendingItems.length !== 1 ? 's' : ''} a bandeja`
              : undefined
          }
        />
      </section>

      {loading ? (
        <div className="loading loading--compact">Cargando bandeja…</div>
      ) : photos.length === 0 && !loadError ? (
        <div className="empty-state">
          <p>No hay fotos pendientes de asignar.</p>
          <p className="text-muted">Use los botones de arriba para tomar o subir imágenes.</p>
        </div>
      ) : (
        <>
          <h3 className="photo-inbox-page__list-title">
            Pendientes ({photos.length})
          </h3>
          <div className="photo-inbox-grid">
            {photos.map((photo) => (
              <article
                key={photo.id}
                className={`photo-inbox-card ${photo.isIncomplete ? 'photo-inbox-card--incomplete' : ''}`}
              >
                {photo.isIncomplete ? (
                  <div className="photo-inbox-card__broken">
                    <p>Foto incompleta o subida fallida</p>
                    <p className="text-muted">{photo.fileName}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="photo-inbox-card__thumb"
                    onClick={() => setLightbox(photo)}
                    aria-label="Ver imagen grande"
                    disabled={busy}
                  >
                    <img src={photo.url} alt={photo.caption || 'Foto pendiente'} loading="lazy" />
                  </button>
                )}
                <div className="photo-inbox-card__body">
                  <p className="photo-inbox-card__date">{parseUploadedAt(photo)}</p>
                  {photo.caption && (
                    <p className="photo-inbox-card__caption">{photo.caption}</p>
                  )}
                  <p className="photo-inbox-card__meta">
                    {formatFileSize(photo.compressedSize ?? photo.originalSize)}
                    {photo.uploadedBy ? ` · ${photo.uploadedBy}` : ''}
                  </p>
                  <p className="photo-inbox-card__file">{photo.fileName}</p>
                  <div className="photo-inbox-card__actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={busy || photo.isIncomplete}
                      onClick={() => {
                        setActionError('');
                        setAssignSuccess('');
                        setAssignTarget(photo);
                      }}
                    >
                      {assigningId === photo.id ? 'Asignando…' : 'Asignar proveedor'}
                    </button>
                    {!photo.isIncomplete && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={busy}
                        onClick={() => setLightbox(photo)}
                      >
                        Ver grande
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={busy}
                      onClick={() => setDeleteTarget(photo)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {lightbox && lightbox.url && (
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
            alt={lightbox.caption || 'Foto'}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="visit-photo-lightbox__meta" onClick={(e) => e.stopPropagation()}>
            {lightbox.caption && <p><strong>{lightbox.caption}</strong></p>}
            <p>
              {parseUploadedAt(lightbox)}
              {lightbox.uploadedBy ? ` · ${lightbox.uploadedBy}` : ''}
            </p>
            {lightbox.compressedSize != null && (
              <p>{formatFileSize(lightbox.compressedSize)}</p>
            )}
          </div>
        </div>
      )}

      {assignTarget && (
        <AssignPhotoModal
          photo={assignTarget}
          suppliers={suppliers}
          loading={assigningId === assignTarget.id}
          onConfirm={handleAssign}
          onCancel={() => {
            if (!assigningId) setAssignTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar foto"
          message={
            deleteTarget.isIncomplete
              ? '¿Eliminar este registro incompleto de la bandeja?'
              : '¿Eliminar esta foto de la bandeja? Se intentará borrar del almacenamiento.'
          }
          onConfirm={() => handleDelete(deleteTarget.isIncomplete)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

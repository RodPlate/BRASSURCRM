import { useState } from 'react';
import Modal from '../common/Modal';
import VisitPhotoCapture from './VisitPhotoCapture';
import { usePhotoCaptureFlow } from '../../hooks/usePhotoCaptureFlow';
import { uploadVisitPhoto } from '../../services/visitPhotosService';

export default function QuickPhotoModal({ open, supplier, onClose }) {
  const [caption, setCaption] = useState('');

  const capture = usePhotoCaptureFlow({
    uploadOne: ({ file, compression, caption: cap, onProgress }) =>
      uploadVisitPhoto({
        supplierId: supplier.id,
        file,
        compression,
        caption: cap,
        activityId: null,
        onProgress,
      }),
    onBatchComplete: () => {
      setCaption('');
      onClose(true);
    },
  });

  if (!open || !supplier) return null;

  return (
    <Modal
      title={`📷 Foto — ${supplier.companyName}`}
      onClose={() => onClose(false)}
      wide
      footer={
        <button type="button" className="btn btn--secondary" onClick={() => onClose(false)}>
          Cerrar
        </button>
      }
    >
      <VisitPhotoCapture
        caption={caption}
        onCaptionChange={setCaption}
        busy={capture.busy}
        preparingPreview={capture.preparingPreview}
        pendingItems={capture.pendingItems}
        pendingTotals={capture.pendingTotals}
        onFilesSelected={capture.onFilesSelected}
        onRemovePending={capture.removePendingItem}
        onClearPending={capture.clearPending}
        onConfirmUpload={capture.confirmUpload}
        uploadQueue={capture.uploadQueue}
        uploading={capture.uploading}
        uploadSummary={capture.uploadSummary}
        error={capture.error}
        confirmLabel={
          capture.pendingItems.length
            ? `Subir ${capture.pendingItems.length} foto${capture.pendingItems.length !== 1 ? 's' : ''}`
            : 'Subir foto'
        }
      />
    </Modal>
  );
}

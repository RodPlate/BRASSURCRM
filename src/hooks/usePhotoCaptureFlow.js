import { useCallback, useEffect, useRef, useState } from 'react';
import { compressImage } from '../utils/imageCompression';
import { calcTotalSavingsPercent, calcTotalSavingsBytes } from '../services/visitPhotosService';
import { formatFileSize } from '../utils/imageCompression';

const emptySummary = () => ({
  selected: 0,
  success: 0,
  errors: [],
  totalOriginal: 0,
  totalCompressed: 0,
  savingsPercent: 0,
  savingsBytes: 0,
  savingsMB: '0 B',
});

const revokePreviewUrl = (item) => {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
};

/**
 * Flujo: seleccionar → comprimir → preview → subir (múltiples, continúa si falla).
 * @param {(args: { file, compression, caption, onProgress }) => Promise} uploadOne
 * @param {() => Promise<void>} [onBatchComplete] tras subidas exitosas
 */
export function usePhotoCaptureFlow({ uploadOne, onBatchComplete }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [preparingPreview, setPreparingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [error, setError] = useState('');
  const pendingRef = useRef(pendingItems);
  pendingRef.current = pendingItems;

  const busy = preparingPreview || uploading;

  const clearPending = useCallback(() => {
    setPendingItems((prev) => {
      prev.forEach(revokePreviewUrl);
      return [];
    });
  }, []);

  useEffect(
    () => () => {
      pendingRef.current.forEach(revokePreviewUrl);
    },
    []
  );

  const updateQueueItem = (id, patch) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleFilesSelected = async (fileList) => {
    const files = [...fileList].filter((f) => f.type?.startsWith('image/'));
    if (!files.length) {
      setError('Seleccione archivos de imagen válidos.');
      return false;
    }

    setPreparingPreview(true);
    setError('');
    setUploadSummary(null);

    const newItems = [];
    try {
      for (const file of files) {
        const compression = await compressImage(file);
        newItems.push({
          id: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          previewUrl: URL.createObjectURL(compression.file),
          compression,
        });
      }
      setPendingItems((prev) => [...prev, ...newItems]);
      return true;
    } catch (err) {
      console.error('[photoCapture] compress:', err);
      newItems.forEach(revokePreviewUrl);
      setError(err.message || 'No se pudo preparar la imagen');
      return false;
    } finally {
      setPreparingPreview(false);
    }
  };

  const removePendingItem = (id) => {
    setPendingItems((prev) => {
      const item = prev.find((p) => p.id === id);
      revokePreviewUrl(item);
      return prev.filter((p) => p.id !== id);
    });
  };

  const confirmUpload = async (caption = '') => {
    if (!pendingItems.length || uploading) return;

    const items = [...pendingItems];
    const queue = items.map((item, index) => ({
      id: `upload-${index}-${Date.now()}`,
      name: item.name,
      percent: 0,
      status: 'pending',
      error: null,
    }));

    setUploading(true);
    setError('');
    setUploadQueue(queue);
    clearPending();

    const summary = emptySummary();
    summary.selected = items.length;

    for (let i = 0; i < items.length; i++) {
      const { compression, name } = items[i];
      const itemId = queue[i].id;

      updateQueueItem(itemId, { status: 'uploading', percent: 0 });

      try {
        const result = await uploadOne({
          file: compression.file,
          compression,
          caption,
          onProgress: (percent) => {
            updateQueueItem(itemId, { status: 'uploading', percent });
          },
        });

        const c = result.compression || compression;
        summary.success += 1;
        summary.totalOriginal += c.originalSize;
        summary.totalCompressed += c.compressedSize;

        updateQueueItem(itemId, {
          status: 'done',
          percent: 100,
          originalSize: c.originalSize,
          compressedSize: c.compressedSize,
          reductionPercent: c.reductionPercent ?? c.compressionRatio,
        });
      } catch (err) {
        console.error('[photoCapture] upload:', err);
        summary.errors.push({
          name,
          message: err?.message || 'Error al subir',
        });
        updateQueueItem(itemId, {
          status: 'error',
          percent: 0,
          error: err?.message || 'Error al subir',
        });
      }
    }

    summary.savingsPercent = calcTotalSavingsPercent(
      summary.totalOriginal,
      summary.totalCompressed
    );
    summary.savingsBytes = calcTotalSavingsBytes(
      summary.totalOriginal,
      summary.totalCompressed
    );
    summary.savingsMB = formatFileSize(summary.savingsBytes);

    setUploadSummary(summary);
    setUploading(false);

    if (summary.success > 0 && onBatchComplete) {
      await onBatchComplete(summary);
    }
  };

  const pendingTotals = pendingItems.reduce(
    (acc, item) => {
      const c = item.compression;
      acc.original += c.originalSize;
      acc.compressed += c.compressedSize;
      return acc;
    },
    { original: 0, compressed: 0 }
  );

  return {
    pendingItems,
    preparingPreview,
    uploading,
    uploadQueue,
    uploadSummary,
    error,
    busy,
    hasPending: pendingItems.length > 0,
    pendingTotals,
    setError,
    clearPending,
    handleFilesSelected,
    removePendingItem,
    confirmUpload,
  };
}

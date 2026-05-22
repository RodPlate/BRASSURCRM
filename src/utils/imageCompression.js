const MAX_LONG_EDGE = 1920;
const JPEG_QUALITY = 0.8;
const SMALL_FILE_BYTES = 500 * 1024;

const JPEG_MIME = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg']);

const isImageFile = (file) =>
  Boolean(file?.type?.startsWith('image/')) ||
  /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file?.name || '');

const isJpegFile = (file) =>
  JPEG_MIME.has((file.type || '').toLowerCase()) ||
  /\.jpe?g$/i.test(file.name || '');

/** Nombre seguro para Storage y Firestore (nunca undefined). */
export const safeFileName = (file, fallbackName) => {
  const originalName = file?.name || fallbackName || `foto_${Date.now()}.jpg`;
  let cleanName = String(originalName)
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '');
  if (!cleanName || cleanName === '.' || cleanName === '..') {
    cleanName = `foto_${Date.now()}`;
  }
  const lower = cleanName.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return cleanName.slice(0, 120);
  }
  const base = cleanName.replace(/\.[^.]+$/i, '').slice(0, 100) || 'foto';
  return `${base}.jpg`;
};

const buildJpegFileName = (originalName) => safeFileName({ name: originalName });

const fileWithSafeName = (source, name) =>
  new File([source], name, {
    type: 'image/jpeg',
    lastModified: source?.lastModified || Date.now(),
  });

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });

const canvasToJpegBlob = (canvas, quality = JPEG_QUALITY) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Error al generar JPEG'))),
      'image/jpeg',
      quality
    );
  });

const drawImageToCanvas = (img) => {
  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > MAX_LONG_EDGE) {
    const scale = MAX_LONG_EDGE / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
};

export const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const calcReductionPercent = (originalSize, compressedSize) => {
  if (!originalSize || originalSize <= 0) return 0;
  const saved = originalSize - compressedSize;
  return Math.max(0, Math.round((saved / originalSize) * 100));
};

/**
 * Comprime una imagen para subida (Canvas → JPEG, sin metadata EXIF).
 * @param {File} file
 * @returns {Promise<{
 *   file: File,
 *   fileName: string,
 *   originalSize: number,
 *   compressedSize: number,
 *   reductionPercent: number,
 *   wasSkipped: boolean,
 * }>}
 */
export const compressImage = async (file) => {
  if (!isImageFile(file)) {
    throw new Error('Solo se aceptan archivos de imagen');
  }

  const originalSize = file.size;
  const fileName = safeFileName(file);

  if (isJpegFile(file) && originalSize < SMALL_FILE_BYTES) {
    const outFile = fileWithSafeName(file, fileName);
    return {
      file: outFile,
      fileName,
      originalSize,
      compressedSize: originalSize,
      reductionPercent: 0,
      wasSkipped: true,
    };
  }

  const img = await loadImageFromFile(file);
  const canvas = drawImageToCanvas(img);
  const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
  const compressedFile = fileWithSafeName(blob, fileName);

  const compressedSize = compressedFile.size;
  const reductionPercent = calcReductionPercent(originalSize, compressedSize);

  const useOriginal =
    isJpegFile(file) &&
    originalSize < SMALL_FILE_BYTES &&
    compressedSize >= originalSize;

  if (useOriginal) {
    const outFile = fileWithSafeName(file, fileName);
    return {
      file: outFile,
      fileName,
      originalSize,
      compressedSize: originalSize,
      reductionPercent: 0,
      wasSkipped: true,
    };
  }

  return {
    file: compressedFile,
    fileName,
    originalSize,
    compressedSize,
    reductionPercent,
    wasSkipped: false,
  };
};

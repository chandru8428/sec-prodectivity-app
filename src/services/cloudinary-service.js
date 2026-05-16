/**
 * cloudinary-service.js
 *
 * Both images AND PDFs go to Cloudinary:
 *   Images → /image/upload  (canvas-compressed)
 *   PDFs   → /image/upload  (Cloudinary supports PDF as image type)
 *             URL gets fl_inline flag so it opens in browser, not as download
 *
 * IMPORTANT — one-time Cloudinary setting:
 *   Console → Settings → Security → uncheck "Restrict PDF and ZIP delivery"
 *
 * ENV keys needed (.env):
 *   VITE_CLOUDINARY_CLOUD_NAME    = your-cloud-name
 *   VITE_CLOUDINARY_UPLOAD_PRESET = edusync_qa_unsigned  (unsigned, delivery=upload)
 */

const CLOUD_NAME     = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    || 'edusync-qa';
const UPLOAD_PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'edusync_qa_unsigned';
const UPLOAD_URL     = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Add fl_inline to a Cloudinary URL so PDFs open in the browser viewer
 * instead of being forced as a file download.
 * e.g. /image/upload/v1/folder/file.pdf  →  /image/upload/fl_inline/v1/folder/file.pdf
 */
function makeInlineUrl(url) {
  return url.replace('/image/upload/', '/image/upload/fl_inline/');
}

// ── Image compression ─────────────────────────────────────────────────────────

/**
 * Compress an image File via off-screen canvas before uploading.
 */
export async function compressImage(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.78 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ── Cloudinary upload (images + PDFs) ────────────────────────────────────────

function uploadToCloudinaryRaw(file, { isPDF = false, folder = 'qa-attachments', onProgress } = {}) {
  return new Promise(async (resolve, reject) => {
    let blob = file;
    // Compress only real images (not PDFs)
    if (!isPDF) {
      try { blob = await compressImage(file); }
      catch { blob = file; }
    }

    const form = new FormData();
    form.append('file',          blob, file.name);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder',        folder);

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        // For PDFs: add fl_inline so browsers open them directly
        const url = isPDF ? makeInlineUrl(data.secure_url) : data.secure_url;
        resolve({
          url,
          publicId: data.public_id,
          type:     isPDF ? 'pdf' : 'image',
          bytes:    data.bytes,
          filename: file.name,
        });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || 'Cloudinary upload failed'));
        } catch {
          reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    // Both images and PDFs use the /image/upload endpoint
    xhr.open('POST', UPLOAD_URL);
    xhr.send(form);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a file to Cloudinary (/image/upload endpoint for both images and PDFs).
 * PDFs get an fl_inline URL so they open in the browser viewer.
 *
 * @param {File}   file
 * @param {Object} opts
 * @param {string}   opts.folder      - Cloudinary folder (default 'qa-attachments')
 * @param {Function} opts.onProgress  - Progress callback (0–100)
 * @returns {Promise<{url, publicId, type, bytes, filename}>}
 */
export async function uploadToCloudinary(file, opts = {}) {
  const isImage = file.type.startsWith('image/');
  const isPDF   = file.type === 'application/pdf';

  if (!isImage && !isPDF) {
    throw new Error('Only images (JPEG, PNG, WebP, GIF) and PDF files are supported.');
  }

  return uploadToCloudinaryRaw(file, { isPDF, folder: 'qa-attachments', ...opts });
}

/** Human-readable file size */
export function formatBytes(bytes) {
  if (!bytes)               return '';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * image.js — browser-side image processing for uploads.
 *
 * Course thumbnails come in every size and shape. Before upload we redraw
 * them onto a fixed canvas (default 1280×720, 16:9) so every card, detail
 * page and checkout shows a sharp image with the same proportions — and the
 * file is small (WebP/JPEG ~100–300 KB instead of multi-MB photos).
 *
 *   fit "cover"   → fill the frame, cropping the overflow around the centre
 *   fit "contain" → keep the whole image, padded with a blurred backdrop
 */

const loadImage = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("This image could not be read"));
        };
        img.src = url;
    });

const canvasToBlob = (canvas, type, quality) =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

/** Types we can safely redraw (SVG/GIF keep their own format: vector / animation). */
export const isResizableImage = (file) => /^image\/(jpeg|png|webp)$/.test(file?.type || "");

/**
 * @param {File} file
 * @param {{ width?: number, height?: number, fit?: "cover"|"contain", quality?: number }} opts
 * @returns {Promise<File>} processed image (WebP when supported, JPEG otherwise)
 */
export async function resizeImage(file, { width = 1280, height = 720, fit = "cover", quality = 0.86 } = {}) {
    if (!isResizableImage(file)) return file;

    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";

    const srcRatio = img.naturalWidth / img.naturalHeight;
    const dstRatio = width / height;

    if (fit === "contain") {
        // Blurred, darkened cover copy as backdrop, then the full image centred on top
        ctx.filter = "blur(24px) brightness(0.85)";
        drawCover(ctx, img, srcRatio, dstRatio, width, height, 1.1);
        ctx.filter = "none";
        const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    } else {
        drawCover(ctx, img, srcRatio, dstRatio, width, height, 1);
    }

    let type = "image/webp";
    let blob = await canvasToBlob(canvas, type, quality);
    if (!blob || blob.type !== "image/webp") {
        type = "image/jpeg";
        blob = await canvasToBlob(canvas, type, quality);
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}-${width}x${height}.${type === "image/webp" ? "webp" : "jpg"}`, { type });
}

function drawCover(ctx, img, srcRatio, dstRatio, width, height, zoom) {
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (srcRatio > dstRatio)
        sw = sh * dstRatio; // too wide → crop sides
    else sh = sw / dstRatio; // too tall → crop top/bottom
    sw /= zoom;
    sh /= zoom;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
}

/** Read natural size (for showing "uploaded image is 600×900" hints). */
export async function getImageSize(file) {
    const img = await loadImage(file);
    return { width: img.naturalWidth, height: img.naturalHeight };
}

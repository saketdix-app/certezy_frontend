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

/* ------------------------------------------------------------------ */
/* Manual adjust (ThumbnailAdjuster): zoom + drag inside a fixed frame */
/* ------------------------------------------------------------------ */

/** Load an already-uploaded image by URL. Needs CORS on the bucket to export it again. */
export const loadImageUrl = (url) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("This image could not be loaded for editing"));
        img.src = url;
    });

/**
 * Where the image sits inside a width×height frame, as fractions of the frame
 * (so the same numbers drive the CSS preview and the final canvas).
 *
 *   zoom ≥ 1, x/y = offset of the image centre from the frame centre
 *   (−0.5…0.5 of the frame). Offsets are clamped so a "cover" image never
 *   shows empty edges.
 */
export function placeImage(img, { width, height, fit = "cover", zoom = 1, x = 0, y = 0 }) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const base = fit === "contain" ? Math.min(width / iw, height / ih) : Math.max(width / iw, height / ih);
    const w = (iw * base * zoom) / width; // fraction of frame width
    const h = (ih * base * zoom) / height;
    const maxX = Math.abs(w - 1) / 2;
    const maxY = Math.abs(h - 1) / 2;
    const cx = Math.max(-maxX, Math.min(maxX, x));
    const cy = Math.max(-maxY, Math.min(maxY, y));
    return { w, h, x: cx, y: cy, left: 0.5 + cx - w / 2, top: 0.5 + cy - h / 2 };
}

/**
 * Pick a starting position automatically (ThumbnailAdjuster opens with this).
 *
 *  - If cropping to the frame would throw away over 40% of the picture
 *    (square logos, tall posters) → "contain" with a blurred backdrop.
 *  - Otherwise "cover", sliding the crop window to the part of the image with
 *    the most detail (edge energy), with a light pull towards the centre so
 *    plain photos stay centred.
 *
 * @returns {{ fit: "cover"|"contain", zoom: number, x: number, y: number }}
 */
export function autoPlace(img, { width, height }) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const frameRatio = width / height;
    const imgRatio = iw / ih;
    const kept = Math.min(imgRatio / frameRatio, frameRatio / imgRatio);
    if (kept < 0.6) return { fit: "contain", zoom: 1, x: 0, y: 0 };
    if (kept > 0.97) return { fit: "cover", zoom: 1, x: 0, y: 0 };

    // Small grayscale copy → per-pixel edge energy
    const scale = 160 / Math.max(iw, ih);
    const sw = Math.max(1, Math.round(iw * scale));
    const sh = Math.max(1, Math.round(ih * scale));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, sw, sh);
    let data;
    try {
        data = ctx.getImageData(0, 0, sw, sh).data;
    } catch {
        return { fit: "cover", zoom: 1, x: 0, y: 0 }; // cross-origin image without CORS
    }
    const gray = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
        gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }

    // Energy summed along the axis the crop window can slide on
    const horizontal = imgRatio > frameRatio;
    const len = horizontal ? sw : sh;
    const line = new Float32Array(len);
    for (let yy = 1; yy < sh - 1; yy++) {
        for (let xx = 1; xx < sw - 1; xx++) {
            const i = yy * sw + xx;
            const e = Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + sw] - gray[i - sw]);
            line[horizontal ? xx : yy] += e;
        }
    }

    const win = Math.round(horizontal ? sh * frameRatio : sw / frameRatio);
    const span = len - win;
    if (span <= 0) return { fit: "cover", zoom: 1, x: 0, y: 0 };

    let sum = 0;
    for (let i = 0; i < win; i++) sum += line[i];
    let best = -1;
    let bestStart = span / 2;
    for (let start = 0; start <= span; start++) {
        if (start > 0) sum += line[start + win - 1] - line[start - 1];
        const offCentre = Math.abs(start - span / 2) / span; // 0 centre … 0.5 edge
        const score = sum * (1 - 0.35 * offCentre);
        if (score > best) {
            best = score;
            bestStart = start;
        }
    }

    // Window centre → offset of the image centre from the frame centre (frame fractions)
    const offset = (len / 2 - (bestStart + win / 2)) / win;
    const p = placeImage(img, {
        width,
        height,
        fit: "cover",
        zoom: 1,
        x: horizontal ? offset : 0,
        y: horizontal ? 0 : offset,
    });
    return { fit: "cover", zoom: 1, x: p.x, y: p.y };
}

/**
 * Draw the adjusted image onto a width×height canvas and return a WebP/JPEG File.
 * "contain" fills the empty space with a blurred copy so no bars show on any screen.
 */
export async function renderAdjusted(
    img,
    {
        width = 1280,
        height = 720,
        fit = "cover",
        zoom = 1,
        x = 0,
        y = 0,
        quality = 0.86,
        name = "thumbnail",
    } = {}
) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";

    if (fit === "contain") {
        ctx.filter = "blur(24px) brightness(0.85)";
        drawCover(ctx, img, img.naturalWidth / img.naturalHeight, width / height, width, height, 1.1);
        ctx.filter = "none";
    }
    const p = placeImage(img, { width, height, fit, zoom, x, y });
    ctx.drawImage(img, p.left * width, p.top * height, p.w * width, p.h * height);

    let type = "image/webp";
    let blob = await canvasToBlob(canvas, type, quality);
    if (!blob || blob.type !== "image/webp") {
        type = "image/jpeg";
        blob = await canvasToBlob(canvas, type, quality);
    }
    if (!blob) throw new Error("Could not export this image");
    const base = name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}-${width}x${height}.${type === "image/webp" ? "webp" : "jpg"}`, { type });
}

/** Read natural size (for showing "uploaded image is 600×900" hints). */
export async function getImageSize(file) {
    const img = await loadImage(file);
    return { width: img.naturalWidth, height: img.naturalHeight };
}

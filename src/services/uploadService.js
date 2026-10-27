import axios from "axios";
import api from "./api";

/**
 * uploadService.js — admin file uploads to AWS S3
 *
 *   POST /upload/presigned-url  { fileName, fileType, fileSize, kind } → { uploadUrl, fileUrl, headers }
 *   GET  /upload/status          storage health + allowed types/sizes
 *
 * Files go straight from the browser to S3 (the API never handles the bytes),
 * then the returned public `fileUrl` is saved on the course / lesson.
 */

export const UPLOAD_KINDS = {
    image: {
        accept: "image/jpeg,image/png,image/webp,image/gif,image/svg+xml",
        maxSize: 10 * 1024 * 1024,
        label: "JPG, PNG, WebP, GIF or SVG · up to 10 MB",
    },
    video: {
        accept: "video/mp4,video/webm,video/quicktime",
        maxSize: 5 * 1024 * 1024 * 1024,
        label: "MP4, WebM or MOV · up to 5 GB",
    },
    document: {
        accept: "application/pdf,application/zip,text/plain",
        maxSize: 50 * 1024 * 1024,
        label: "PDF, ZIP or TXT · up to 50 MB",
    },
    // PDF-only picker (e.g. PDF lessons); stored with the backend's document rules
    pdf: {
        accept: "application/pdf",
        maxSize: 50 * 1024 * 1024,
        label: "PDF · up to 50 MB",
        noun: "PDF",
        apiKind: "document",
    },
};

const formatSize = (bytes) =>
    bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(0)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;

/** Returns an error message, or null when the file is acceptable for `kind`. */
export const validateUpload = (file, kind) => {
    const rules = UPLOAD_KINDS[kind];
    if (!rules) return "Unknown upload type";
    if (!rules.accept.split(",").includes(file.type)) return `Unsupported file type. Allowed: ${rules.label}`;
    if (file.size > rules.maxSize) return `File is too large (max ${formatSize(rules.maxSize)})`;
    return null;
};

const uploadService = {
    getPresignedUrl: (data) => api.post("/upload/presigned-url", data),
    getStatus: () => api.get("/upload/status"),

    /**
     * Upload a file to S3 and resolve with its public URL.
     * @param {File} file
     * @param {{ kind: "image"|"video"|"document"|"pdf", onProgress?: (pct:number)=>void, signal?: AbortSignal }} options
     */
    async uploadFile(file, { kind, onProgress, signal } = {}) {
        const { data } = await uploadService.getPresignedUrl({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            kind: UPLOAD_KINDS[kind]?.apiKind || kind,
        });
        const { uploadUrl, signedUrl, fileUrl, headers } = data.data;

        try {
            // Plain axios: S3 must not receive our API auth header or cookies.
            await axios.put(uploadUrl || signedUrl, file, {
                headers: headers || { "Content-Type": file.type },
                signal,
                onUploadProgress: (e) => {
                    if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
                },
            });
        } catch (err) {
            if (axios.isCancel(err)) throw err;
            // A network error here almost always means the bucket's CORS rules
            // don't allow this site — surface that instead of a generic failure.
            const reason = err.response
                ? `S3 rejected the upload (HTTP ${err.response.status})`
                : "Could not reach S3 — check the bucket CORS settings";
            const wrapped = new Error(reason);
            wrapped.cause = err;
            throw wrapped;
        }

        return fileUrl;
    },
};

export default uploadService;

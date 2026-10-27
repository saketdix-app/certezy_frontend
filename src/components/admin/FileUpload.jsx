import { useId, useRef, useState } from "react";
import { Upload, X, Loader2, FileText, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import uploadService, { UPLOAD_KINDS, validateUpload } from "@/services/uploadService";

const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 outline-none focus:border-primary focus:bg-white transition-colors";

function Preview({ kind, url }) {
    if (kind === "image") {
        return <img src={url} alt="" className="w-full h-36 object-cover rounded-lg bg-slate-100" />;
    }
    if (kind === "video") {
        return (
            <video src={url} controls preload="metadata" className="w-full max-h-48 rounded-lg bg-black" />
        );
    }
    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-[13px] font-semibold text-primary break-all"
        >
            <FileText size={16} className="shrink-0" /> {decodeURIComponent(url.split("/").pop())}
        </a>
    );
}

/**
 * Admin uploader backed by S3.
 *
 * <FileUpload kind="image" value={form.thumbnail} onChange={(url) => setF("thumbnail", url)} />
 *
 * - kind: "image" | "video" | "document" | "pdf"
 * - value: current URL (shown as a preview)
 * - onChange(url | ""): called after a successful upload, URL paste, or removal
 * - allowUrl: also allow pasting an external URL (default true)
 */
export default function FileUpload({
    kind = "image",
    value = "",
    onChange,
    allowUrl = true,
    disabled = false,
}) {
    const inputId = useId();
    const abortRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showUrl, setShowUrl] = useState(false);
    const rules = UPLOAD_KINDS[kind];

    const handleFile = async (file) => {
        if (!file) return;
        const problem = validateUpload(file, kind);
        if (problem) {
            toast.error(problem);
            return;
        }

        abortRef.current = new AbortController();
        setUploading(true);
        setProgress(0);
        try {
            const url = await uploadService.uploadFile(file, {
                kind,
                onProgress: setProgress,
                signal: abortRef.current.signal,
            });
            onChange?.(url);
            toast.success("File uploaded");
        } catch (err) {
            if (err?.name !== "CanceledError") {
                toast.error(err.response?.data?.message || err.message || "Upload failed");
            }
        } finally {
            setUploading(false);
            abortRef.current = null;
        }
    };

    const onInputChange = (e) => {
        handleFile(e.target.files?.[0]);
        e.target.value = ""; // allow re-selecting the same file
    };

    const onDrop = (e) => {
        e.preventDefault();
        if (!uploading && !disabled) handleFile(e.dataTransfer.files?.[0]);
    };

    return (
        <div className="space-y-2">
            {value && !uploading ? (
                <div className="relative border border-slate-200 rounded-xl p-2 bg-white">
                    <Preview kind={kind} url={value} />
                    <div className="flex items-center justify-between gap-2 mt-2 px-1">
                        <label
                            htmlFor={inputId}
                            className="text-[12px] font-semibold text-primary cursor-pointer hover:underline"
                        >
                            Replace
                        </label>
                        <button
                            type="button"
                            onClick={() => onChange?.("")}
                            className="flex items-center gap-1 text-[12px] font-semibold text-red-500 hover:underline"
                        >
                            <X size={13} /> Remove
                        </button>
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={inputId}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
                        uploading || disabled
                            ? "border-slate-200 pointer-events-none"
                            : "border-slate-300 hover:border-primary cursor-pointer"
                    }`}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <span className="text-[13px] font-semibold text-slate-700">
                                Uploading… {progress}%
                            </span>
                            <div className="w-full max-w-[220px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => abortRef.current?.abort()}
                                className="pointer-events-auto text-[12px] font-semibold text-slate-500 hover:text-red-500"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <Upload className="w-6 h-6 text-slate-400" />
                            <span className="text-[13px] font-semibold text-slate-700">
                                Click or drop a {rules?.noun || kind} to upload
                            </span>
                            <span className="text-[11.5px] text-slate-500">{rules?.label}</span>
                        </>
                    )}
                </label>
            )}

            <input
                id={inputId}
                type="file"
                accept={rules?.accept}
                onChange={onInputChange}
                disabled={uploading || disabled}
                className="hidden"
            />

            {allowUrl && (
                <div>
                    {showUrl ? (
                        <input
                            type="url"
                            value={value}
                            onChange={(e) => onChange?.(e.target.value)}
                            className={inputCls}
                            placeholder="https://…"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowUrl(true)}
                            className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-primary"
                        >
                            <Link2 size={13} /> or paste a URL
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

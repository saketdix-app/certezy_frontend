import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Loader2, Move, Wand2 } from "lucide-react";
import { autoPlace, placeImage } from "@/lib/image";

/**
 * ThumbnailAdjuster — lets the admin position an image inside the 16:9 frame
 * before it is saved, and shows how it will look on the card, phone and
 * checkout screens (every screen uses the same 16:9 box, so what you see here
 * is what students see). It opens already auto-adjusted (best crop or fit);
 * the admin can fine-tune or hit "Auto" again.
 *
 * <ThumbnailAdjuster image={htmlImageElement} width={1280} height={720}
 *                    onApply={(settings) => …} onCancel={() => …} busy={false} />
 *
 * settings = { fit: "cover" | "contain", zoom, x, y } → pass to renderAdjusted()
 */

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function Framed({ img, src, settings, width, height, className, rounded = "rounded-lg" }) {
    const p = placeImage(img, { width, height, ...settings });
    return (
        <div
            className={`relative overflow-hidden bg-slate-900 ${rounded} ${className || ""}`}
            style={{ aspectRatio: `${width}/${height}` }}
        >
            {settings.fit === "contain" && (
                <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-80"
                />
            )}
            <img
                src={src}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none pointer-events-none"
                style={{
                    left: `${p.left * 100}%`,
                    top: `${p.top * 100}%`,
                    width: `${p.w * 100}%`,
                    height: `${p.h * 100}%`,
                }}
            />
        </div>
    );
}

export default function ThumbnailAdjuster({
    image,
    width = 1280,
    height = 720,
    onApply,
    onCancel,
    busy = false,
}) {
    const [settings, setSettings] = useState(() => autoPlace(image, { width, height }));
    const frameRef = useRef(null);
    const dragRef = useRef(null);
    const src = image.src;

    // Keep stored offsets inside the allowed range after zoom / fit changes
    const update = (patch) =>
        setSettings((s) => {
            const next = { ...s, ...patch };
            const p = placeImage(image, { width, height, ...next });
            return { ...next, x: p.x, y: p.y };
        });

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && !busy && onCancel?.();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [busy, onCancel]);

    const onPointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { px: e.clientX, py: e.clientY, x: settings.x, y: settings.y };
    };
    const onPointerMove = (e) => {
        const d = dragRef.current;
        const box = frameRef.current?.getBoundingClientRect();
        if (!d || !box) return;
        update({ x: d.x + (e.clientX - d.px) / box.width, y: d.y + (e.clientY - d.py) / box.height });
    };
    const onPointerUp = () => {
        dragRef.current = null;
    };
    const onWheel = (e) => {
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, settings.zoom - e.deltaY * 0.0015));
        update({ zoom });
    };

    const lowRes = image.naturalWidth < width * 0.75 || image.naturalHeight < height * 0.75;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Adjust thumbnail"
                className="w-full sm:max-w-4xl max-h-[100dvh] sm:max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-[15px] font-bold text-slate-900">Adjust thumbnail</h3>
                        <p className="text-[12px] text-slate-500">
                            Auto-adjusted — drag to reposition, zoom to crop. Saved as {width}×{height} (16:9)
                            for every screen.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 p-5">
                    {/* Editor */}
                    <div className="space-y-3 min-w-0">
                        <div
                            ref={frameRef}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onWheel={onWheel}
                            className="relative cursor-grab active:cursor-grabbing touch-none"
                        >
                            <Framed
                                img={image}
                                src={src}
                                settings={settings}
                                width={width}
                                height={height}
                                rounded="rounded-xl"
                            />
                            {/* rule-of-thirds guide */}
                            <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary/70">
                                <div className="absolute inset-y-0 left-1/3 border-l border-white/40" />
                                <div className="absolute inset-y-0 left-2/3 border-l border-white/40" />
                                <div className="absolute inset-x-0 top-1/3 border-t border-white/40" />
                                <div className="absolute inset-x-0 top-2/3 border-t border-white/40" />
                            </div>
                            <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
                                <Move size={12} /> Drag to move
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                            <div className="flex items-center gap-1.5 text-[12px]">
                                {[
                                    ["cover", "Crop to fill"],
                                    ["contain", "Fit whole image"],
                                ].map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => update({ fit: mode, zoom: 1, x: 0, y: 0 })}
                                        className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                                            settings.fit === mode
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <label className="flex flex-1 min-w-[200px] items-center gap-2 text-slate-500">
                                <ZoomOut size={15} className="shrink-0" />
                                <input
                                    type="range"
                                    min={MIN_ZOOM}
                                    max={MAX_ZOOM}
                                    step={0.01}
                                    value={settings.zoom}
                                    onChange={(e) => update({ zoom: Number(e.target.value) })}
                                    className="w-full accent-primary"
                                    aria-label="Zoom"
                                />
                                <ZoomIn size={15} className="shrink-0" />
                            </label>

                            <button
                                type="button"
                                onClick={() => setSettings(autoPlace(image, { width, height }))}
                                className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                            >
                                <Wand2 size={13} /> Auto
                            </button>
                            <button
                                type="button"
                                onClick={() => update({ zoom: 1, x: 0, y: 0 })}
                                className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-primary"
                            >
                                <RotateCcw size={13} /> Reset
                            </button>
                        </div>

                        {lowRes && (
                            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                This image is {image.naturalWidth}×{image.naturalHeight}. It may look soft on
                                large screens — {width}×{height} or bigger works best.
                            </p>
                        )}
                    </div>

                    {/* Screen previews */}
                    <div className="space-y-4">
                        <p className="text-[11px] font-bold tracking-[0.08em] text-slate-400">
                            PREVIEW ON SCREENS
                        </p>
                        <div>
                            <Framed img={image} src={src} settings={settings} width={width} height={height} />
                            <p className="mt-1.5 text-[11.5px] font-semibold text-slate-500">
                                Course card · desktop
                            </p>
                        </div>
                        <div className="flex items-end gap-4">
                            <div className="w-[120px] rounded-[14px] border-[3px] border-slate-800 p-1 bg-white">
                                <Framed
                                    img={image}
                                    src={src}
                                    settings={settings}
                                    width={width}
                                    height={height}
                                    rounded="rounded-md"
                                />
                                <div className="mt-1.5 space-y-1 px-0.5 pb-1">
                                    <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                                    <div className="h-1.5 w-1/2 rounded bg-slate-200" />
                                </div>
                                <p className="sr-only">Mobile</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Framed
                                    img={image}
                                    src={src}
                                    settings={settings}
                                    width={width}
                                    height={height}
                                    className="w-16"
                                    rounded="rounded"
                                />
                                <div className="space-y-1">
                                    <div className="h-1.5 w-14 rounded bg-slate-200" />
                                    <div className="h-1.5 w-9 rounded bg-slate-200" />
                                </div>
                            </div>
                        </div>
                        <p className="text-[11.5px] font-semibold text-slate-500 -mt-2">
                            Mobile · Checkout &amp; tables
                        </p>
                    </div>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-white">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onApply?.(settings)}
                        disabled={busy}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-60"
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />} Save thumbnail
                    </button>
                </div>
            </div>
        </div>
    );
}

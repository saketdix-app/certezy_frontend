// src/pages/admin/BulkImportPage.jsx
//
// Admin → Bulk Import
//   1. Pick what to import (Courses · Sections & Lessons · Quizzes & Questions)
//   2. Download the sample CSV, fill it in Excel / Google Sheets
//   3. Upload → "Check file" runs a dry run (nothing saved) and lists every
//      problem by row/column → "Import" writes everything in one transaction
//   4. Or load a ready-made AWS / Azure certification course pack

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    FileUp,
    Download,
    BookOpen,
    ListTree,
    ClipboardList,
    Upload,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    X,
    Cloud,
    Info,
    ChevronDown,
    Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import importService from "@/services/importService";

const TYPES = [
    {
        type: "courses",
        label: "Courses",
        icon: BookOpen,
        hint: "Title, category, free/paid/discounted price, level, thumbnail…",
    },
    {
        type: "curriculum",
        label: "Sections & Lessons",
        icon: ListTree,
        hint: "Video, text, PDF, link, embed, audio and quiz lessons",
    },
    {
        type: "quizzes",
        label: "Quizzes & Questions",
        icon: ClipboardList,
        hint: "Single-choice, multiple-choice (MCQ) and true/false",
    },
    {
        type: "reviews",
        label: "Reviews",
        icon: Star,
        hint: "Genuine reviews from classroom batches, corporate training or other platforms",
    },
];

const MAX_FILE_MB = 5;
const ENTITY_LABELS = {
    categories: "categories",
    courses: "courses",
    sections: "sections",
    lessons: "lessons",
    quizzes: "quizzes",
    questions: "questions",
    reviews: "reviews",
};

const apiError = (err, fallback) => err.response?.data?.message || err.message || fallback;

function Card({ className, children }) {
    return (
        <div className={cn("bg-white rounded-2xl border border-slate-200/80 shadow-sm", className)}>
            {children}
        </div>
    );
}

export default function BulkImportPage() {
    const [type, setType] = useState("courses");
    const [templates, setTemplates] = useState([]);
    const [showColumns, setShowColumns] = useState(false);

    const [file, setFile] = useState(null);
    const [csv, setCsv] = useState("");
    const [createCategories, setCreateCategories] = useState(true);
    const [confirmGenuine, setConfirmGenuine] = useState(false);

    const [busy, setBusy] = useState(null); // "check" | "import" | null
    const [result, setResult] = useState(null); // { ok, dryRun, summary, rows } | { ok:false, message, errors }
    const fileInput = useRef(null);

    useEffect(() => {
        importService
            .getTemplates()
            .then(({ data }) => setTemplates(data?.data || []))
            .catch(() => {});
    }, []);

    const current = TYPES.find((t) => t.type === type);
    const columns = templates.find((t) => t.type === type)?.columns || [];

    const reset = () => {
        setFile(null);
        setCsv("");
        setResult(null);
        setConfirmGenuine(false);
        if (fileInput.current) fileInput.current.value = "";
    };

    const chooseType = (t) => {
        setType(t);
        reset();
    };

    const onFile = async (f) => {
        if (!f) return;
        if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
            toast.error("Please choose a .csv file (in Excel: File → Save As → CSV UTF-8)");
            return;
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
            toast.error(`File is larger than ${MAX_FILE_MB} MB — split it into smaller files`);
            return;
        }
        setFile(f);
        setResult(null);
        setCsv(await f.text());
    };

    const run = async (dryRun) => {
        if (!csv) return;
        setBusy(dryRun ? "check" : "import");
        setResult(null);
        try {
            const { data } = await importService.runImport(type, {
                csv,
                dryRun,
                createMissingCategories: createCategories,
                confirmGenuine,
            });
            setResult({ ok: true, dryRun, ...data.data });
            if (!dryRun) toast.success("Import completed");
        } catch (err) {
            const errors = err.response?.data?.errors;
            setResult({
                ok: false,
                message: apiError(err, "Import failed"),
                errors: Array.isArray(errors) ? errors : [],
            });
        } finally {
            setBusy(null);
        }
    };

    const download = async (t) => {
        try {
            await importService.downloadTemplate(t);
        } catch (err) {
            toast.error(apiError(err, "Could not download the sample"));
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileUp size={18} className="text-primary" />
                    </div>
                    <h1 className="text-[20px] sm:text-[22px] font-extrabold text-slate-900">Bulk Import</h1>
                </div>
                <p className="text-[13px] text-slate-500 mt-2">
                    Create or update courses, curriculum and quizzes from a CSV. Import <b>Courses</b> first,
                    then <b>Sections &amp; Lessons</b>, then <b>Quizzes</b> (and <b>Reviews</b> any time).
                    Re-importing a file updates matching records instead of duplicating them.
                </p>
            </div>

            {/* Step 1 — type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TYPES.map(({ type: t, label, icon: Icon, hint }) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => chooseType(t)}
                        aria-pressed={type === t}
                        className={cn(
                            "text-left rounded-2xl border p-4 transition-all",
                            type === t
                                ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                                : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                    >
                        <div className="flex items-center gap-2 mb-1.5">
                            <Icon size={16} className={type === t ? "text-primary" : "text-slate-400"} />
                            <span className="text-[14px] font-bold text-slate-900">{label}</span>
                        </div>
                        <p className="text-[12px] text-slate-500 leading-snug">{hint}</p>
                    </button>
                ))}
            </div>

            {/* Step 2 — template + upload */}
            <Card className="p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                        <h2 className="text-[15px] font-extrabold text-slate-900">{current.label} CSV</h2>
                        <p className="text-[12.5px] text-slate-500">
                            Start from the sample — it has every column and example rows.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => download(type)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
                    >
                        <Download size={15} /> Download sample CSV
                    </button>
                </div>

                {columns.length > 0 && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowColumns((v) => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-slate-700"
                        >
                            <span className="inline-flex items-center gap-2">
                                <Info size={14} className="text-primary" /> Column guide ({columns.length}{" "}
                                columns)
                            </span>
                            <ChevronDown
                                size={16}
                                className={cn("transition-transform", showColumns && "rotate-180")}
                            />
                        </button>
                        {showColumns && (
                            <div className="px-4 pb-4 overflow-x-auto">
                                <table className="w-full text-[12.5px]">
                                    <tbody className="divide-y divide-slate-100">
                                        {columns.map((c) => (
                                            <tr key={c.name}>
                                                <td className="py-2 pr-4 font-mono text-slate-800 whitespace-nowrap align-top">
                                                    {c.name}
                                                    {c.required && <span className="text-rose-500"> *</span>}
                                                </td>
                                                <td className="py-2 text-slate-500">{c.help}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Dropzone */}
                {!file ? (
                    <label
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            onFile(e.dataTransfer.files?.[0]);
                        }}
                        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl p-8 text-center cursor-pointer transition-colors"
                    >
                        <Upload className="w-7 h-7 text-slate-400" />
                        <span className="text-[14px] font-semibold text-slate-700">
                            Click or drop your CSV here
                        </span>
                        <span className="text-[12px] text-slate-500">
                            CSV (UTF-8) · up to {MAX_FILE_MB} MB · 5,000 rows
                        </span>
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => onFile(e.target.files?.[0])}
                        />
                    </label>
                ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                        <FileUp size={18} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[12px] text-slate-500">
                                {Math.max(csv.split(/\r?\n/).filter((l) => l.trim()).length - 1, 0)} data rows
                                · {(file.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={reset}
                            aria-label="Remove file"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {type === "courses" && (
                    <label className="flex items-center gap-2 text-[13px] text-slate-600">
                        <input
                            type="checkbox"
                            checked={createCategories}
                            onChange={(e) => setCreateCategories(e.target.checked)}
                            className="w-4 h-4 accent-[#3282B8]"
                        />
                        Create categories that don&apos;t exist yet
                    </label>
                )}

                {type === "reviews" && (
                    <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900">
                        <input
                            type="checkbox"
                            checked={confirmGenuine}
                            onChange={(e) => setConfirmGenuine(e.target.checked)}
                            className="w-4 h-4 mt-0.5 accent-[#3282B8] shrink-0"
                        />
                        <span>
                            I confirm every row is a genuine review given by a real learner, with their rating
                            and words unchanged. These reviews are shown publicly with their source (e.g.
                            “Classroom batch”).
                        </span>
                    </label>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <button
                        type="button"
                        disabled={!csv || !!busy}
                        onClick={() => run(true)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {busy === "check" && <Loader2 size={14} className="animate-spin" />}
                        Check file (preview)
                    </button>
                    <button
                        type="button"
                        disabled={!csv || !!busy || (type === "reviews" && !confirmGenuine)}
                        onClick={() => run(false)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {busy === "import" && <Loader2 size={14} className="animate-spin" />}
                        Import
                    </button>
                </div>

                {result && <ImportResult result={result} />}
            </Card>

            <StandardPacks />
        </div>
    );
}

// ─── Result panel ────────────────────────────────────────────────────────────
function SummaryLine({ summary }) {
    const parts = [];
    for (const [kind, verb] of [
        ["created", "new"],
        ["updated", "updated"],
    ]) {
        for (const [entity, n] of Object.entries(summary?.[kind] || {})) {
            parts.push(`${n} ${verb} ${ENTITY_LABELS[entity] || entity}`);
        }
    }
    return <>{parts.length ? parts.join(" · ") : "No changes"}</>;
}

function ImportResult({ result }) {
    if (result.ok) {
        return (
            <div
                className={cn(
                    "rounded-xl border px-4 py-3 flex items-start gap-3",
                    result.dryRun ? "border-sky-200 bg-sky-50" : "border-emerald-200 bg-emerald-50"
                )}
            >
                <CheckCircle2
                    size={18}
                    className={cn("mt-0.5 shrink-0", result.dryRun ? "text-sky-600" : "text-emerald-600")}
                />
                <div className="text-[13px]">
                    <p className="font-bold text-slate-800">
                        {result.dryRun ? "Looks good — nothing saved yet" : "Import completed"}
                    </p>
                    <p className="text-slate-600 mt-0.5">
                        {result.rows} rows · <SummaryLine summary={result.summary} />
                    </p>
                    {result.dryRun && (
                        <p className="text-slate-500 mt-1">Click Import to save these changes.</p>
                    )}
                    {!result.dryRun && (
                        <Link
                            to="/admin/courses"
                            className="inline-block mt-1.5 font-semibold text-primary hover:underline"
                        >
                            Go to Courses →
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-rose-200 bg-rose-50">
            <div className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                <div className="text-[13px]">
                    <p className="font-bold text-rose-800">{result.message}</p>
                    {result.errors.length > 0 && (
                        <p className="text-rose-700/80 mt-0.5">
                            Fix these rows in your sheet and upload again.
                        </p>
                    )}
                </div>
            </div>
            {result.errors.length > 0 && (
                <div className="max-h-80 overflow-auto border-t border-rose-200 bg-white rounded-b-xl">
                    <table className="w-full text-[12.5px]">
                        <thead className="sticky top-0 bg-white">
                            <tr className="text-left text-slate-400 uppercase tracking-wider text-[10.5px]">
                                <th className="py-2 px-4 font-bold">Row</th>
                                <th className="py-2 px-4 font-bold">Column</th>
                                <th className="py-2 px-4 font-bold">Problem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {result.errors.slice(0, 500).map((e, i) => (
                                <tr key={i}>
                                    <td className="py-2 px-4 font-semibold text-slate-700">{e.row ?? "—"}</td>
                                    <td className="py-2 px-4 font-mono text-slate-600 whitespace-nowrap">
                                        {e.column ?? "—"}
                                    </td>
                                    <td className="py-2 px-4 text-slate-600">{e.message ?? String(e)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Standard AWS / Azure packs ──────────────────────────────────────────────
function StandardPacks() {
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(null);
    const [done, setDone] = useState({});

    useEffect(() => {
        importService
            .getStandardPacks()
            .then(({ data }) => setPacks(data?.data || []))
            .catch(() => setPacks([]))
            .finally(() => setLoading(false));
    }, []);

    const importPack = async (pack) => {
        setImporting(pack.id);
        try {
            await importService.importStandardPack(pack.id);
            setDone((d) => ({ ...d, [pack.id]: true }));
            toast.success(`${pack.exam} imported as a draft course`);
        } catch (err) {
            toast.error(apiError(err, "Could not import this pack"));
        } finally {
            setImporting(null);
        }
    };

    if (!loading && !packs.length) return null;

    return (
        <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
                <Cloud size={17} className="text-primary" />
                <h2 className="text-[15px] font-extrabold text-slate-900">Standard certification courses</h2>
            </div>
            <p className="text-[12.5px] text-slate-500 mb-4">
                Ready-made AWS and Azure courses with study notes, official links and a practice quiz. They
                import as <b>draft, free</b> courses — add a thumbnail, set the price and publish when ready.
                Importing again updates the content.
            </p>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {packs.map((p) => (
                        <div
                            key={p.id}
                            className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3"
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={cn(
                                        "text-[11px] font-extrabold px-2 py-1 rounded-lg shrink-0",
                                        p.provider === "AWS"
                                            ? "bg-amber-50 text-amber-700"
                                            : "bg-sky-50 text-sky-700"
                                    )}
                                >
                                    {p.exam}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                                        {p.title}
                                    </p>
                                    <p className="text-[12px] text-slate-500 mt-0.5">
                                        {p.level?.charAt(0).toUpperCase() + p.level?.slice(1)} · {p.sections}{" "}
                                        sections · {p.lessons} lessons · {p.questions} questions
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={!!importing}
                                onClick={() => importPack(p)}
                                className={cn(
                                    "self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-colors disabled:opacity-60",
                                    done[p.id]
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-primary text-white hover:bg-primary-hover"
                                )}
                            >
                                {importing === p.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : done[p.id] ? (
                                    <CheckCircle2 size={14} />
                                ) : (
                                    <Download size={14} />
                                )}
                                {done[p.id] ? "Imported — import again" : "Import course"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

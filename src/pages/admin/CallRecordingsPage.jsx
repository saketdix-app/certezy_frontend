import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, Loader2, Lock, PhoneIncoming, PhoneOutgoing, Play, Search, Trash2 } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { apiMessage, inputCls } from "@/lib/crm";
import { Kpi, ReportFilters } from "@/components/crm/reports/reportShared";
import { defaultFilters, fmtDur, useReport } from "@/components/crm/reports/reportUtils";

const IST = "Asia/Kolkata";
const fmtWhen = (iso) =>
    new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: IST });
const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const DURATIONS = [
    ["", "Any length"],
    ["30", "30 sec or more"],
    ["60", "1 min or more"],
    ["120", "2 min or more"],
    ["300", "5 min or more"],
];

/** One recording: play inline (a 10-minute private link, fetched on demand) and download. */
function RecordingRow({ r, onDeleted }) {
    const [src, setSrc] = useState(null);
    const [busy, setBusy] = useState("");
    const audio = useRef(null);
    useEffect(() => {
        if (src) audio.current?.play().catch(() => {});
    }, [src]);

    const play = async () => {
        setBusy("play");
        try {
            const { data: res } = await crmService.recordingLink(r.id);
            setSrc(res.data.url);
        } catch (err) {
            toast.error(apiMessage(err, "Could not open the recording"));
        } finally {
            setBusy("");
        }
    };
    const download = async () => {
        setBusy("download");
        try {
            const { data: res } = await crmService.recordingLink(r.id, { download: 1 });
            const a = document.createElement("a");
            a.href = res.data.url;
            a.rel = "noopener";
            a.click();
        } catch (err) {
            toast.error(apiMessage(err, "Could not download the recording"));
        } finally {
            setBusy("");
        }
    };
    const remove = async () => {
        if (!window.confirm(`Delete this recording of ${r.lead_name}? It is removed from storage and can't be recovered.`)) return;
        setBusy("delete");
        try {
            await crmService.deleteRecording(r.id);
            toast.success("Recording deleted");
            onDeleted();
        } catch (err) {
            toast.error(apiMessage(err, "Could not delete the recording"));
            setBusy("");
        }
    };

    const Dir = r.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
    return (
        <tr className="border-b border-slate-100 align-top last:border-0">
            <td className="whitespace-nowrap px-3 py-3 text-slate-700">{fmtWhen(r.call_at)}</td>
            <td className="px-3 py-3">
                <Link to={`/admin/leads?lead=${r.lead_id}`} className="font-semibold text-slate-900 hover:text-action">
                    {r.lead_name}
                </Link>
                {r.lead_phone && <span className="block text-small text-slate-500">{r.lead_phone}</span>}
            </td>
            <td className="px-3 py-3 text-slate-700">{r.user_name ?? "—"}</td>
            <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                    <Dir size={14} className={r.direction === "incoming" ? "text-emerald-600" : "text-action"} aria-hidden="true" />
                    {r.direction === "incoming" ? "Incoming" : "Outgoing"}
                </span>
            </td>
            <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">{fmtDur(r.duration_sec)}</td>
            <td className="min-w-[260px] px-3 py-3">
                {src ? (
                    <audio ref={audio} src={src} controls preload="none" className="h-9 w-full" aria-label={`Recording of the call with ${r.lead_name}`} />
                ) : (
                    <button type="button" onClick={play} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-small font-semibold text-slate-700 hover:border-action disabled:opacity-50">
                        {busy === "play" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} aria-hidden="true" />} Play
                    </button>
                )}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right">
                <span className="mr-2 text-small text-slate-500">{fmtSize(r.size_bytes)}</span>
                <button type="button" onClick={download} disabled={!!busy} title="Download" aria-label={`Download the recording of ${r.lead_name}`} className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:border-action disabled:opacity-50">
                    {busy === "download" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                </button>
                <button type="button" onClick={remove} disabled={!!busy} title="Delete" aria-label={`Delete the recording of ${r.lead_name}`} className="ml-1 rounded-lg border border-slate-200 p-1.5 text-red-600 hover:border-red-300 disabled:opacity-50">
                    {busy === "delete" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
            </td>
        </tr>
    );
}

/**
 * Super Admin → Call recordings: recordings of lead calls uploaded by the
 * CERTEZY Team app (from the phone's own call recorder). Stored privately;
 * every play, download and delete is written to the audit log.
 */
export default function CallRecordingsPage() {
    const [f, setF] = useState(defaultFilters("7d"));
    const [direction, setDirection] = useState("");
    const [minDuration, setMinDuration] = useState("");
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);
    const { data, loading } = useReport(crmService.listRecordings, { ...f, direction, min_duration: minDuration, search: query, page, reload });
    const rows = data?.recordings ?? [];
    const t = data?.totals;
    const pages = data?.pagination?.totalPages ?? 1;
    const reset = (fn) => (v) => {
        fn(v);
        setPage(1);
    };

    return (
        <div className="mx-auto max-w-[1400px] space-y-4">
            <div>
                <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Call recordings</h1>
                <p className="mt-1 inline-flex items-center gap-1.5 text-ui text-slate-500">
                    <Lock size={14} aria-hidden="true" /> Only Super Admins can see these. Every play, download and delete is logged. Times are IST.
                </p>
            </div>

            <ReportFilters value={f} onChange={reset(setF)}>
                <span className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <input value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder="Lead name or phone" aria-label="Search lead" className={cn(inputCls, "w-48 py-1.5 pl-8")} />
                </span>
                <select value={direction} onChange={(e) => reset(setDirection)(e.target.value)} className={cn(inputCls, "w-auto py-1.5")} aria-label="Call type">
                    <option value="">Incoming and outgoing</option>
                    <option value="outgoing">Outgoing</option>
                    <option value="incoming">Incoming</option>
                </select>
                <select value={minDuration} onChange={(e) => reset(setMinDuration)(e.target.value)} className={cn(inputCls, "w-auto py-1.5")} aria-label="Length">
                    {DURATIONS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>
            </ReportFilters>

            {t && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <Kpi label="Recordings" value={t.recordings} />
                    <Kpi label="Total length" value={fmtDur(t.seconds)} />
                    <Kpi label="Storage" value={fmtSize(t.bytes || 0)} />
                </div>
            )}

            <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-surface">
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center bg-surface/60 pt-10">
                        <Loader2 className="animate-spin text-action" aria-label="Loading" />
                    </div>
                )}
                <table className="w-full min-w-max text-ui">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-small text-slate-600">
                            {["Call time", "Lead", "Consultant", "Type", "Length", "Recording", ""].map((h) => (
                                <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <RecordingRow key={r.id} r={r} onDeleted={() => setReload((n) => n + 1)} />
                        ))}
                        {!rows.length && !loading && (
                            <tr>
                                <td colSpan={7} className="px-3 py-12 text-center text-slate-500">
                                    No recordings in this period. Recordings arrive from the CERTEZY Team app (v1.9.0 or later) on phones that record calls.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {pages > 1 && (
                <div className="flex items-center justify-end gap-2 text-ui">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">
                        Previous
                    </button>
                    <span className="text-slate-500">Page {page} of {pages}</span>
                    <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

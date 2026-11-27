import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, Loader2, Lock, RefreshCw } from "lucide-react";

import backupService from "@/services/backupService";

const IST = "Asia/Kolkata";
const when = (iso) =>
    iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: IST }) : "—";
const size = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const secs = (ms) => (ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${Math.max(1, Math.round(ms / 1000))}s`);
const apiMessage = (err, fallback) => err?.response?.data?.message || fallback;

/**
 * Super Admin → Backups: daily database backups in private S3 storage (newest
 * 7 kept), back up now, and download. Restoring is done on the server — see
 * docs/BACKUPS.md in the backend.
 */
export default function BackupsPage() {
    const [data, setData] = useState(null);
    const [starting, setStarting] = useState(false);
    const [downloading, setDownloading] = useState(null);

    const load = useCallback(() => {
        backupService
            .overview()
            .then(({ data: res }) => setData(res.data))
            .catch((err) => toast.error(apiMessage(err, "Could not load backups")));
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    // While a backup runs, check every few seconds
    useEffect(() => {
        if (!data?.running) return;
        const t = setInterval(load, 4000);
        return () => clearInterval(t);
    }, [data?.running, load]);

    const runNow = async () => {
        setStarting(true);
        try {
            await backupService.runNow();
            toast.success("Backup started");
            load();
        } catch (err) {
            toast.error(apiMessage(err, "Could not start the backup"));
        } finally {
            setStarting(false);
        }
    };
    const download = async (b) => {
        setDownloading(b.id);
        try {
            const { data: res } = await backupService.downloadLink(b.id);
            const a = document.createElement("a");
            a.href = res.data.url;
            a.rel = "noopener";
            a.click();
        } catch (err) {
            toast.error(apiMessage(err, "Could not download the backup"));
        } finally {
            setDownloading(null);
        }
    };

    const latest = data?.available?.[0];
    const lastFailed = data?.history?.find((h) => h.status === "failed");

    return (
        <div className="mx-auto max-w-[1100px] space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Database backups</h1>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-ui text-slate-500">
                        <Lock size={14} aria-hidden="true" /> Super Admins only. Stored privately in S3; every backup and download is logged.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={runNow}
                    disabled={!data || data.running || starting || !data.storage_ready}
                    className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-50"
                >
                    {data?.running || starting ? <Loader2 size={16} className="animate-spin" /> : <DatabaseBackup size={16} aria-hidden="true" />}
                    {data?.running ? "Backing up…" : "Back up now"}
                </button>
            </div>

            {data && !data.storage_ready && (
                <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-ui text-amber-900">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> File storage (S3) isn't set up on the server, so backups can't run. Set AWS_BUCKET_NAME in the backend .env.
                </div>
            )}

            {data && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
                        <p className="text-small font-semibold text-slate-500">Last backup</p>
                        <p className="mt-1 text-body font-bold text-slate-900">{latest ? when(latest.finished_at) : "None yet"}</p>
                        {latest && (
                            <p className="text-small text-slate-500">
                                {size(latest.size_bytes)} · {latest.rows.toLocaleString("en-IN")} rows · took {secs(latest.duration_ms)}
                            </p>
                        )}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
                        <p className="text-small font-semibold text-slate-500">Next automatic backup</p>
                        <p className="mt-1 text-body font-bold text-slate-900">{when(data.next_run)}</p>
                        <p className="text-small text-slate-500">Every day at {data.time_ist} IST</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
                        <p className="text-small font-semibold text-slate-500">Kept</p>
                        <p className="mt-1 text-body font-bold text-slate-900">
                            {data.available.length} of {data.keep}
                        </p>
                        <p className="text-small text-slate-500">Older backups are deleted automatically</p>
                    </div>
                </div>
            )}

            {lastFailed && (!latest || new Date(lastFailed.started_at) > new Date(latest.started_at)) && (
                <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-ui text-red-800">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                        The last backup ({when(lastFailed.started_at)}) failed: {lastFailed.error || "unknown error"}
                    </span>
                </div>
            )}

            <section className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
                <table className="w-full min-w-max text-ui">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-small text-slate-600">
                            {["Backup", "Made", "Size", "Rows", "How", ""].map((h) => (
                                <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {!data && (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center">
                                    <Loader2 className="mx-auto animate-spin text-action" aria-label="Loading" />
                                </td>
                            </tr>
                        )}
                        {data?.running && (
                            <tr className="border-b border-slate-100 bg-action-soft/40">
                                <td colSpan={6} className="px-4 py-3 text-action-soft-ink">
                                    <span className="inline-flex items-center gap-2 font-semibold">
                                        <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> A backup is being made…
                                    </span>
                                </td>
                            </tr>
                        )}
                        {data?.available.map((b) => (
                            <tr key={b.id} className="border-b border-slate-100 last:border-0">
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                                        <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" /> {b.file_name}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{when(b.finished_at)}</td>
                                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">{size(b.size_bytes)}</td>
                                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                                    {b.rows.toLocaleString("en-IN")} <span className="text-slate-500">in {b.tables} tables</span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{b.trigger === "manual" ? `By ${b.triggered_by ?? "a Super Admin"}` : "Daily"}</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => download(b)}
                                        disabled={downloading === b.id}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-small font-semibold text-slate-700 hover:border-action disabled:opacity-50"
                                    >
                                        {downloading === b.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} aria-hidden="true" />} Download
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data && !data.running && !data.available.length && (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                                    No backups yet. The first one runs tonight at {data.time_ist} IST, or click Back up now.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            <details className="rounded-xl border border-slate-200 bg-surface px-4 py-3 text-ui text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-800">How to restore a backup</summary>
                <p className="mt-2">
                    Restoring replaces the database, so it's done on the server, not here. Download the backup, then run (try it on a new, empty database first):
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-small text-slate-100">gunzip -c FILE.sql.gz | mysql -h DB_HOST -u DB_USER -p DB_NAME</pre>
                <p className="mt-2 text-small text-slate-500">Full steps: docs/BACKUPS.md in the backend.</p>
            </details>
        </div>
    );
}

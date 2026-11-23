import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { SOURCES, STAGE_LABEL, apiMessage, inputCls } from "@/lib/crm";
import { CrmModal } from "./crmShared";

const SAMPLE = [
    ["Name", "Phone", "Email", "Course", "Source", "Campaign", "Status", "Notes", "City"],
    ["Asha Rao", "+91 98765 43210", "asha@example.com", "PMP", "Facebook", "PMP November", "New", "Wants weekend batch", "Indore"],
    ["Vikram Shah", "9123456789", "", "", "LinkedIn", "", "In Conversation", "Call after 6 pm", "Pune"],
];
const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

const STATUS = {
    ready: ["Ready", "bg-emerald-50 text-emerald-700"],
    duplicate: ["Already a lead", "bg-amber-50 text-amber-800"],
    error: ["Can't import", "bg-red-50 text-red-700"],
};
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload leads from a CSV. "Check file" shows which columns were recognised and
 * what will happen to each row; "Import" creates the ready ones.
 * Managers choose who gets the leads; consultants always import for themselves.
 */
export default function ImportLeadsModal({ isManager, canAssign, owners = [], courses = [], onClose, onDone }) {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null); // { name, text }
    const [opts, setOpts] = useState({ default_source: "manual", course_id: "", owner_mode: isManager ? "unassigned" : "me", owner_id: "" });
    const [check, setCheck] = useState(null);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => {
        setOpts((o) => ({ ...o, [k]: e.target.value }));
        setCheck(null); // options change the outcome: check again
    };

    const pick = (f) => {
        if (!f) return;
        if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") return toast.error("Choose a .csv file (in Excel: File → Save as → CSV)");
        if (f.size > MAX_BYTES) return toast.error("The file is too big (5 MB max) — split it");
        const reader = new FileReader();
        reader.onload = () => {
            setFile({ name: f.name, text: String(reader.result ?? "") });
            setCheck(null);
            setResult(null);
        };
        reader.onerror = () => toast.error("Couldn't read the file");
        reader.readAsText(f);
    };

    const body = (dry) => ({
        csv: file.text,
        dry_run: dry,
        default_source: opts.default_source,
        course_id: opts.course_id ? Number(opts.course_id) : null,
        owner_mode: isManager ? opts.owner_mode : "me",
        owner_id: opts.owner_mode === "owner" && opts.owner_id ? Number(opts.owner_id) : null,
    });

    const run = async (dry) => {
        if (!file) return toast.error("Choose a CSV file first");
        if (isManager && opts.owner_mode === "owner" && !opts.owner_id) return toast.error("Choose the consultant");
        setBusy(true);
        try {
            const { data } = await crmService.importLeads(body(dry));
            if (dry) setCheck(data.data);
            else {
                setResult(data.data);
                toast.success(`${data.data.created} lead${data.data.created === 1 ? "" : "s"} imported`);
                onDone?.();
            }
        } catch (err) {
            toast.error(apiMessage(err, dry ? "Couldn't check the file" : "Import failed"));
        } finally {
            setBusy(false);
        }
    };

    const downloadSample = () => {
        const url = URL.createObjectURL(new Blob([SAMPLE.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" }));
        const a = Object.assign(document.createElement("a"), { href: url, download: "certezy-leads-sample.csv" });
        a.click();
        URL.revokeObjectURL(url);
    };

    const recognised = (check?.mapping ?? []).filter((m) => m.field !== "extra");
    const kept = (check?.mapping ?? []).filter((m) => m.field === "extra");

    return (
        <CrmModal title="Import leads from CSV" onClose={onClose} wide>
            {result ? (
                <div className="py-2 text-center">
                    <CheckCircle2 size={40} className="mx-auto text-emerald-600" aria-hidden="true" />
                    <p className="mt-2 text-h3 font-extrabold text-slate-900">
                        {result.created} lead{result.created === 1 ? "" : "s"} imported
                    </p>
                    <p className="mt-1 text-ui text-slate-600">
                        {result.skipped_duplicates} already in the CRM (skipped) · {result.errors} couldn&rsquo;t be imported
                        {result.assigned?.round_robin ? ` · ${result.assigned.round_robin} assigned by Round Robin` : ""}
                    </p>
                    {result.rows?.length > 0 && <RowsTable rows={result.rows} className="mt-4 text-left" />}
                    <button type="button" onClick={onClose} className="mt-5 rounded-lg bg-action px-5 py-2 text-ui font-bold text-white hover:bg-action-hover">
                        Done
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-ui text-slate-600">
                        Upload a CSV with one lead per row. Columns are recognised by their heading — Name, Phone / Mobile, Email, Course,
                        Source, Campaign, Status, Notes, Assigned to… (a Facebook / Meta Leads export works as it is). Other columns are kept on
                        the lead. Each lead needs a phone or an email.
                    </p>

                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            pick(e.dataTransfer.files?.[0]);
                        }}
                        className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"
                    >
                        <FileUp size={22} className="text-action" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-ui font-semibold text-slate-800">{file ? file.name : "Drop a CSV here, or choose one"}</p>
                            <p className="text-small text-slate-500">Up to 2,000 leads and 5 MB per file</p>
                        </div>
                        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui font-semibold text-slate-700">
                            Choose file
                        </button>
                        <button type="button" onClick={downloadSample} className="inline-flex items-center gap-1.5 text-small font-semibold text-action hover:underline">
                            <Download size={13} aria-hidden="true" /> Sample CSV
                        </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-small font-semibold text-slate-600">
                            Source (when the file has none)
                            <select value={opts.default_source} onChange={set("default_source")} className={cn(inputCls, "mt-1")}>
                                {SOURCES.map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block text-small font-semibold text-slate-600">
                            Course (when the file has none)
                            <select value={opts.course_id} onChange={set("course_id")} className={cn(inputCls, "mt-1")}>
                                <option value="">No course</option>
                                {courses.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {isManager ? (
                            <>
                                <label className="block text-small font-semibold text-slate-600">
                                    Assign the leads to
                                    <select value={opts.owner_mode} onChange={set("owner_mode")} className={cn(inputCls, "mt-1")}>
                                        <option value="unassigned">Nobody yet (Unassigned)</option>
                                        <option value="me">Me</option>
                                        {canAssign && <option value="owner">A consultant…</option>}
                                        {canAssign && <option value="round_robin">Round Robin (automatic)</option>}
                                        {canAssign && <option value="column">The file&rsquo;s owner column (Assigned to / Consultant)</option>}
                                    </select>
                                </label>
                                {opts.owner_mode === "owner" && (
                                    <label className="block text-small font-semibold text-slate-600">
                                        Consultant
                                        <select value={opts.owner_id} onChange={set("owner_id")} className={cn(inputCls, "mt-1")}>
                                            <option value="">Choose…</option>
                                            {owners.map((o) => (
                                                <option key={o.id} value={o.id}>
                                                    {o.name}
                                                    {o.on_leave ? " (on leave)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                            </>
                        ) : (
                            <p className="self-end text-small text-slate-500 sm:col-span-2">The leads are added to your list.</p>
                        )}
                    </div>

                    {check && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                            <div className="flex flex-wrap gap-2 text-small font-semibold">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{check.total} rows</span>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{check.ready} ready</span>
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{check.duplicates} already leads</span>
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{check.errors} can&rsquo;t import</span>
                            </div>
                            <div>
                                <p className="mb-1 text-label font-bold uppercase tracking-wide text-slate-500">Columns recognised</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {recognised.map((m) => (
                                        <span key={m.header} className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-small text-brand-800">
                                            {m.header} → <b>{m.label}</b>
                                        </span>
                                    ))}
                                </div>
                                {kept.length > 0 && (
                                    <p className="mt-1.5 text-small text-slate-500">
                                        Kept on each lead as extra details: {kept.map((m) => m.header).join(", ")}
                                    </p>
                                )}
                            </div>
                            <RowsTable rows={check.rows} />
                            {check.total > check.rows.length && (
                                <p className="text-small text-slate-500">Showing {check.rows.length} of {check.total} rows (problems first).</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                            Cancel
                        </button>
                        {!check ? (
                            <button
                                type="button"
                                disabled={busy || !file}
                                onClick={() => run(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                            >
                                {busy && <Loader2 size={15} className="animate-spin" />} Check file
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={busy || !check.ready}
                                onClick={() => run(false)}
                                className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                            >
                                {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} aria-hidden="true" />}
                                Import {check.ready} lead{check.ready === 1 ? "" : "s"}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </CrmModal>
    );
}

function RowsTable({ rows, className }) {
    return (
        <div className={cn("max-h-72 overflow-auto rounded-lg border border-slate-200", className)}>
            <table className="w-full min-w-[560px] text-left text-small">
                <thead className="sticky top-0 bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-2.5 py-2">Row</th>
                        <th className="px-2.5 py-2">Lead</th>
                        <th className="px-2.5 py-2">Stage / owner</th>
                        <th className="px-2.5 py-2">Result</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                        const [label, cls] = STATUS[r.status] ?? STATUS.error;
                        return (
                            <tr key={r.row} className="align-top">
                                <td className="px-2.5 py-2 text-slate-500">{r.row}</td>
                                <td className="px-2.5 py-2">
                                    <p className="font-semibold text-slate-800">{r.name || "—"}</p>
                                    <p className="text-slate-500">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>
                                    {r.course && <p className="text-slate-500">{r.course}</p>}
                                </td>
                                <td className="px-2.5 py-2 text-slate-600">
                                    {STAGE_LABEL[r.stage] ?? r.stage}
                                    <span className="block text-slate-400">{r.owner ?? "Unassigned"}</span>
                                </td>
                                <td className="px-2.5 py-2">
                                    <span className={cn("inline-flex rounded-full px-2 py-0.5 font-semibold", cls)}>{label}</span>
                                    {r.issues?.map((i) => (
                                        <p key={i} className="mt-1 flex gap-1 text-slate-600">
                                            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                                            {i}
                                        </p>
                                    ))}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

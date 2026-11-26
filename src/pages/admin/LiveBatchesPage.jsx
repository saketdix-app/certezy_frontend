import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    CalendarDays,
    Download,
    ExternalLink,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserCheck,
    Users,
} from "lucide-react";

import batchService from "@/services/batchService";
import courseService from "@/services/courseService";
import { ROUTES } from "@/config/app";
import { cn } from "@/lib/utils";
import { apiMessage, fmtDateTime, inputCls } from "@/lib/crm";
import { CrmModal, StageBadge } from "@/components/crm/crmShared";
import LeadDetailPanel from "@/components/crm/LeadDetailPanel";
import MoveLeadsModal from "@/components/crm/MoveLeadsModal";

const STATUS = {
    draft: ["Draft", "bg-slate-100 text-slate-600"],
    published: ["Published", "bg-emerald-50 text-emerald-700"],
    closed: ["Enrollment closed", "bg-amber-50 text-amber-800"],
    cancelled: ["Cancelled", "bg-red-50 text-red-700"],
};
const MODES = [
    ["online", "Live online"],
    ["classroom", "Classroom"],
    ["hybrid", "Hybrid"],
];
const fmtDay = (d) => (d ? new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const money = (a, c) =>
    a == null ? "—" : new Intl.NumberFormat(c === "USD" ? "en-US" : "en-IN", { style: "currency", currency: c || "INR", maximumFractionDigits: 0 }).format(a);

function StatusPill({ status }) {
    const [label, cls] = STATUS[status] ?? STATUS.draft;
    return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-label font-semibold", cls)}>{label}</span>;
}

const EMPTY = {
    title: "PMP® Exam Prep — Live Batch",
    course_id: "",
    trainer_name: "",
    trainer_title: "",
    start_date: "",
    end_date: "",
    schedule: "",
    timezone: "IST",
    mode: "online",
    location: "",
    seats: "",
    price: "",
    currency: "INR",
    description: "",
    status: "published",
};

function L({ label, children, className }) {
    return (
        <label className={cn("block text-small font-semibold text-slate-600", className)}>
            {label}
            <span className="mt-1 block">{children}</span>
        </label>
    );
}

function BatchForm({ batch, courses, onClose, onSaved }) {
    const [f, setF] = useState(() =>
        batch
            ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, batch[k] ?? ""]))
            : EMPTY
    );
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (f.title.trim().length < 3) return toast.error("Give the batch a title");
        if (!f.start_date) return toast.error("Choose the start date");
        const body = {
            ...f,
            course_id: f.course_id ? Number(f.course_id) : null,
            end_date: f.end_date || null,
            seats: f.seats === "" ? null : Number(f.seats),
            price: f.price === "" ? null : Number(f.price),
        };
        setBusy(true);
        try {
            if (batch) await batchService.update(batch.id, body);
            else await batchService.create(body);
            toast.success(body.status === "published" ? "Batch saved — it's live on the website" : "Batch saved");
            onSaved();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not save the batch"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <CrmModal title={batch ? "Edit live batch" : "New live batch"} onClose={onClose} wide>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
                <L label="Title *" className="sm:col-span-2">
                    <input value={f.title} onChange={set("title")} className={inputCls} />
                </L>
                <L label="Course (optional)">
                    <select value={f.course_id ?? ""} onChange={set("course_id")} className={inputCls}>
                        <option value="">Not linked</option>
                        {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </L>
                <L label="Status">
                    <select value={f.status} onChange={set("status")} className={inputCls}>
                        <option value="draft">Draft (not on the website)</option>
                        <option value="published">Published (on the website)</option>
                        <option value="closed">Enrollment closed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </L>
                <L label="Start date *">
                    <input type="date" value={f.start_date} onChange={set("start_date")} className={inputCls} />
                </L>
                <L label="End date">
                    <input type="date" value={f.end_date ?? ""} min={f.start_date || undefined} onChange={set("end_date")} className={inputCls} />
                </L>
                <L label="Schedule">
                    <input value={f.schedule ?? ""} onChange={set("schedule")} placeholder="Sat & Sun, 9:00 AM – 1:00 PM" className={inputCls} />
                </L>
                <L label="Time zone">
                    <input value={f.timezone ?? ""} onChange={set("timezone")} placeholder="IST" className={inputCls} />
                </L>
                <L label="Trainer">
                    <input value={f.trainer_name ?? ""} onChange={set("trainer_name")} placeholder="Trainer's name" className={inputCls} />
                </L>
                <L label="Trainer credentials">
                    <input value={f.trainer_title ?? ""} onChange={set("trainer_title")} placeholder="PMP®, certified trainer" className={inputCls} />
                </L>
                <L label="Mode">
                    <select value={f.mode} onChange={set("mode")} className={inputCls}>
                        {MODES.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                </L>
                <L label="Location (classroom / hybrid)">
                    <input value={f.location ?? ""} onChange={set("location")} placeholder="Indore" className={inputCls} disabled={f.mode === "online"} />
                </L>
                <L label="Seats (empty = no limit)">
                    <input type="number" min="1" value={f.seats ?? ""} onChange={set("seats")} className={inputCls} />
                </L>
                <L label="Fee (empty = shared on enrollment)">
                    <span className="flex gap-2">
                        <select value={f.currency} onChange={set("currency")} className={cn(inputCls, "w-24 shrink-0")}>
                            <option value="INR">₹ INR</option>
                            <option value="USD">$ USD</option>
                        </select>
                        <input type="number" min="0" value={f.price ?? ""} onChange={set("price")} className={cn(inputCls, "min-w-0 flex-1")} />
                    </span>
                </L>
                <L label="Description (shown on the website)" className="sm:col-span-2">
                    <textarea value={f.description ?? ""} onChange={set("description")} rows={3} maxLength={2000} className={cn(inputCls, "resize-y")} />
                </L>
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60">
                        {busy && <Loader2 size={15} className="animate-spin" />} Save batch
                    </button>
                </div>
            </form>
        </CrmModal>
    );
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** One batch: everyone who enrolled, their lead's consultant and stage; assign in bulk. */
function BatchEnrollments({ batchId, onBack, onChanged }) {
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");
    const [onlyUnassigned, setOnlyUnassigned] = useState(false);
    const [openLead, setOpenLead] = useState(null);
    const [moving, setMoving] = useState(null);
    const [panelKey, setPanelKey] = useState(0);

    const load = useCallback(() => {
        batchService
            .enrollments(batchId)
            .then(({ data: res }) => setData(res.data))
            .catch((err) => toast.error(apiMessage(err, "Could not load enrollments")));
    }, [batchId]);
    useEffect(load, [load]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data?.enrollments ?? []).filter(
            (e) =>
                (!q || [e.name, e.email, e.phone, e.company].some((v) => v?.toLowerCase().includes(q))) &&
                (!onlyUnassigned || !e.owner_id)
        );
    }, [data, search, onlyUnassigned]);
    const leadIds = (list) => [...new Set(list.map((e) => e.lead_id).filter(Boolean))];
    const allSelected = rows.length > 0 && rows.every((e) => selected.includes(e.id));

    const exportCsv = () => {
        const head = ["Name", "Email", "Phone", "Company", "Experience (years)", "Message", "Enrolled at", "Consultant", "Stage"];
        const lines = (data?.enrollments ?? []).map((e) =>
            [e.name, e.email, e.phone, e.company, e.experience_years, e.message, e.created_at, e.owner_name ?? "Unassigned", e.stage].map(csvCell).join(",")
        );
        const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv" }));
        const a = Object.assign(document.createElement("a"), { href: url, download: `batch-${batchId}-enrollments.csv` });
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!data) return <p className="text-ui text-slate-500">Loading enrollments…</p>;
    const b = data.batch;
    const unassigned = data.enrollments.filter((e) => e.lead_id && !e.owner_id).length;

    return (
        <div>
            <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-ui font-semibold text-action hover:underline">
                <ArrowLeft size={15} aria-hidden="true" /> All batches
            </button>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="flex flex-wrap items-center gap-2 text-h3 font-bold text-slate-900">
                            {b.title} <StatusPill status={b.status} />
                        </h2>
                        <p className="mt-1 text-small text-slate-500">
                            Starts {fmtDay(b.start_date)}
                            {b.schedule ? ` · ${b.schedule}` : ""}
                            {b.trainer_name ? ` · Trainer: ${b.trainer_name}` : ""} · {money(b.price, b.currency)}
                        </p>
                    </div>
                    <div className="flex gap-4 text-center">
                        <div>
                            <p className="text-h2 font-extrabold text-slate-900">{b.enrolled}</p>
                            <p className="text-small text-slate-500">Enrolled{b.seats ? ` of ${b.seats}` : ""}</p>
                        </div>
                        <div>
                            <p className={cn("text-h2 font-extrabold", unassigned ? "text-amber-600" : "text-slate-900")}>{unassigned}</p>
                            <p className="text-small text-slate-500">Not assigned</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="relative min-w-[200px] flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone or company" aria-label="Search enrollments" className={cn(inputCls, "pl-8")} />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui text-slate-700">
                    <input type="checkbox" checked={onlyUnassigned} onChange={(e) => setOnlyUnassigned(e.target.checked)} className="accent-action" />
                    Not assigned only
                </label>
                <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui font-semibold text-slate-700">
                    <Download size={14} aria-hidden="true" /> Export CSV
                </button>
                <button
                    type="button"
                    disabled={!selected.length}
                    onClick={() => setMoving(leadIds(data.enrollments.filter((e) => selected.includes(e.id))))}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-50"
                >
                    <UserCheck size={14} aria-hidden="true" /> Assign {selected.length ? `${selected.length} ` : ""}to consultant
                </button>
            </div>

            {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-ui text-slate-500">
                    {data.enrollments.length ? "No enrollments match." : "No enrollments yet. They appear here as people enroll on the website."}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-surface">
                    <table className="w-full min-w-[820px] text-left text-ui">
                        <thead className="bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="w-10 px-3 py-2.5">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={() => setSelected(allSelected ? [] : rows.map((e) => e.id))}
                                        aria-label="Select all"
                                        className="accent-action"
                                    />
                                </th>
                                <th className="px-3 py-2.5">Name</th>
                                <th className="px-3 py-2.5">Contact</th>
                                <th className="px-3 py-2.5">Experience</th>
                                <th className="px-3 py-2.5">Enrolled</th>
                                <th className="px-3 py-2.5">Consultant</th>
                                <th className="px-3 py-2.5">Stage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((e) => (
                                <tr key={e.id} className="align-top hover:bg-brand-50/50">
                                    <td className="px-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(e.id)}
                                            onChange={() => setSelected((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]))}
                                            aria-label={`Select ${e.name}`}
                                            className="accent-action"
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        {e.lead_id ? (
                                            <button type="button" onClick={() => setOpenLead(e.lead_id)} className="text-left font-semibold text-slate-900 hover:text-action hover:underline">
                                                {e.name}
                                            </button>
                                        ) : (
                                            <p className="font-semibold text-slate-900">{e.name}</p>
                                        )}
                                        {e.company && <p className="text-small text-slate-500">{e.company}</p>}
                                        {e.message && <p className="mt-0.5 line-clamp-2 max-w-xs text-small text-slate-500">&ldquo;{e.message}&rdquo;</p>}
                                    </td>
                                    <td className="px-3 py-3 text-small text-slate-600">
                                        <p>{e.email}</p>
                                        <p>{e.phone}</p>
                                    </td>
                                    <td className="px-3 py-3 text-small text-slate-600">{e.experience_years != null ? `${e.experience_years} yrs` : "—"}</td>
                                    <td className="whitespace-nowrap px-3 py-3 text-small text-slate-600">{fmtDateTime(e.created_at)}</td>
                                    <td className="px-3 py-3">
                                        {e.owner_name ? (
                                            <span className="font-semibold text-slate-800">{e.owner_name}</span>
                                        ) : (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-label font-semibold text-amber-800">Not assigned</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">{e.stage ? <StageBadge stage={e.stage} /> : <span className="text-small text-slate-400">Processing…</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {openLead && (
                <LeadDetailPanel
                    key={`${openLead}-${panelKey}`}
                    leadId={openLead}
                    isAdmin
                    onClose={() => setOpenLead(null)}
                    onChanged={load}
                    onMove={(id) => setMoving([id])}
                />
            )}
            {moving && (
                <MoveLeadsModal
                    leadIds={moving}
                    onClose={() => setMoving(null)}
                    onDone={() => {
                        setSelected([]);
                        load();
                        onChanged();
                        setPanelKey((k) => k + 1);
                    }}
                />
            )}
        </div>
    );
}

/** Admin → Live batches: add upcoming batches, see who enrolled, assign them to consultants. */
export default function LiveBatchesPage() {
    const [params, setParams] = useSearchParams();
    const [batches, setBatches] = useState(null);
    const [courses, setCourses] = useState([]);
    const [editing, setEditing] = useState(null); // batch | "new"
    const openId = Number(params.get("batch")) || null;

    const load = useCallback(() => {
        batchService
            .adminList()
            .then(({ data }) => setBatches(data.data ?? []))
            .catch((err) => {
                setBatches([]);
                toast.error(apiMessage(err, "Could not load batches"));
            });
    }, []);
    useEffect(load, [load]);
    useEffect(() => {
        courseService
            .getAll({ limit: 100 })
            .then(({ data: res }) => setCourses(Array.isArray(res?.data) ? res.data : (res?.data?.courses ?? [])))
            .catch(() => {});
    }, []);

    const remove = async (b) => {
        if (!window.confirm(`Delete "${b.title}"? This can't be undone.`)) return;
        try {
            await batchService.remove(b.id);
            toast.success("Batch deleted");
            load();
        } catch (err) {
            toast.error(apiMessage(err, "Could not delete the batch"));
        }
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Live batches</h1>
                    <p className="mt-1 text-ui text-slate-500">
                        Upcoming instructor-led batches. Published batches show on the website with an Enroll form; every enrollment
                        becomes a lead you can assign to a consultant.
                    </p>
                </div>
                <div className="flex gap-2">
                    <a
                        href={`${ROUTES.PMI_ATP}#live-batches`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-ui font-semibold text-slate-700"
                    >
                        <ExternalLink size={15} aria-hidden="true" /> View on website
                    </a>
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-ui font-bold text-white hover:bg-action-hover"
                    >
                        <Plus size={16} aria-hidden="true" /> New batch
                    </button>
                </div>
            </div>

            {openId ? (
                <BatchEnrollments batchId={openId} onBack={() => setParams({}, { replace: true })} onChanged={load} />
            ) : !batches ? (
                <p className="text-ui text-slate-500">Loading…</p>
            ) : batches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                    <CalendarDays size={28} className="mx-auto text-brand-500" aria-hidden="true" />
                    <p className="mt-2 text-body font-semibold text-slate-800">No live batches yet</p>
                    <p className="mt-1 text-ui text-slate-500">Add your first batch; once published it shows on the website.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-surface">
                    <table className="w-full min-w-[860px] text-left text-ui">
                        <thead className="bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5">Batch</th>
                                <th className="px-3 py-2.5">Starts</th>
                                <th className="px-3 py-2.5">Trainer</th>
                                <th className="px-3 py-2.5">Status</th>
                                <th className="px-3 py-2.5 text-right">Enrolled</th>
                                <th className="px-3 py-2.5 text-right">Not assigned</th>
                                <th className="px-3 py-2.5 text-right">Fee</th>
                                <th className="px-3 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {batches.map((b) => (
                                <tr key={b.id} className="hover:bg-brand-50/50">
                                    <td className="px-4 py-3">
                                        <button type="button" onClick={() => setParams({ batch: String(b.id) })} className="text-left font-semibold text-slate-900 hover:text-action hover:underline">
                                            {b.title}
                                        </button>
                                        <p className="text-small text-slate-500">
                                            {MODES.find(([v]) => v === b.mode)?.[1]}
                                            {b.schedule ? ` · ${b.schedule}` : ""}
                                            {b.course_title ? ` · ${b.course_title}` : ""}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-slate-700">{fmtDay(b.start_date)}</td>
                                    <td className="px-3 py-3 text-slate-700">{b.trainer_name || "—"}</td>
                                    <td className="px-3 py-3">
                                        <StatusPill status={b.status} />
                                    </td>
                                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                                        {b.enrolled}
                                        {b.seats ? <span className="font-normal text-slate-400"> / {b.seats}</span> : ""}
                                    </td>
                                    <td className={cn("px-3 py-3 text-right font-semibold tabular-nums", b.unassigned ? "text-amber-600" : "text-slate-400")}>{b.unassigned}</td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{money(b.price, b.currency)}</td>
                                    <td className="px-3 py-3">
                                        <div className="flex justify-end gap-1.5">
                                            <button type="button" onClick={() => setParams({ batch: String(b.id) })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-small font-semibold text-slate-700 hover:bg-slate-50">
                                                <Users size={13} aria-hidden="true" /> Enrollments
                                            </button>
                                            <button type="button" onClick={() => setEditing(b)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-small font-semibold text-slate-700 hover:bg-slate-50">
                                                <Pencil size={13} aria-hidden="true" /> Edit
                                            </button>
                                            {b.enrolled === 0 && (
                                                <button type="button" onClick={() => remove(b)} aria-label={`Delete ${b.title}`} className="rounded-lg border border-red-200 px-2 py-1.5 text-red-600 hover:bg-red-50">
                                                    <Trash2 size={13} aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <BatchForm batch={editing === "new" ? null : editing} courses={courses} onClose={() => setEditing(null)} onSaved={load} />
            )}
        </div>
    );
}

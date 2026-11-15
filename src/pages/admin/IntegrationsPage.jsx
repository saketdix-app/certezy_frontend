import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";

import integrationService from "@/services/integrationService";
import courseService from "@/services/courseService";
import { cn } from "@/lib/utils";
import { apiMessage, fmtDateTime, inputCls } from "@/lib/crm";

/**
 * Admin → Integrations (2.0 phase 7, PRD §8): Meta and LinkedIn lead forms
 * and the website contact form. Secrets live only in the server's .env — this
 * page shows whether they're present, never their values.
 */

const INFO = {
    meta: {
        title: "Meta (Facebook & Instagram)",
        about: "Leads from Facebook and Instagram lead-form ads arrive within seconds.",
        settings: { app_secret: "META_APP_SECRET", verify_token: "META_VERIFY_TOKEN", page_access_token: "META_PAGE_ACCESS_TOKEN" },
        formLabel: "Meta lead form ID",
    },
    linkedin: {
        title: "LinkedIn Lead Gen Forms",
        about: "Leads from LinkedIn lead-gen ads, checked every 10 minutes.",
        settings: { client_secret: "LINKEDIN_CLIENT_SECRET", access_token: "LINKEDIN_ACCESS_TOKEN", ad_account_id: "LINKEDIN_AD_ACCOUNT_ID" },
        formLabel: "LinkedIn form ID",
    },
    website: {
        title: "Website contact form",
        about: "Messages from the Contact Us page also become leads (source: Website).",
        settings: {},
        formLabel: null,
    },
};
const STATUS = {
    created: ["New lead", "bg-emerald-50 text-emerald-700"],
    duplicate: ["Existing lead", "bg-sky-50 text-sky-700"],
    failed: ["Failed", "bg-red-50 text-red-700"],
    received: ["Waiting", "bg-amber-50 text-amber-700"],
    processing: ["Working", "bg-amber-50 text-amber-700"],
    skipped: ["Skipped (off)", "bg-slate-100 text-slate-500"],
};

function Switch({ checked, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-[#3282B8]" : "bg-slate-300")}
        >
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
        </button>
    );
}

function FormCourses({ integration, courses, onSave }) {
    const [rows, setRows] = useState(Object.entries(integration.config?.form_courses ?? {}).map(([form, course]) => ({ form, course: String(course) })));
    const [fallback, setFallback] = useState(integration.config?.default_course_id ? String(integration.config.default_course_id) : "");
    const save = () => {
        const form_courses = Object.fromEntries(rows.filter((r) => r.form.trim() && r.course).map((r) => [r.form.trim(), Number(r.course)]));
        onSave({ config: { form_courses, default_course_id: fallback ? Number(fallback) : null } });
    };
    const courseSelect = (value, onChange, label) => (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "py-1.5")} aria-label={label}>
            <option value="">Not set</option>
            {courses.map((c) => (
                <option key={c.id} value={c.id}>
                    {c.title}
                </option>
            ))}
        </select>
    );
    return (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="mb-2 text-[12.5px] font-semibold text-slate-700">Which course each form is about</p>
            <div className="space-y-1.5">
                {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                        <input
                            value={r.form}
                            onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, form: e.target.value } : y)))}
                            placeholder={INFO[integration.source].formLabel}
                            className={cn(inputCls, "py-1.5")}
                        />
                        {courseSelect(r.course, (v) => setRows((x) => x.map((y, j) => (j === i ? { ...y, course: v } : y))), "Course")}
                        <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="Remove" className="px-1 text-slate-400 hover:text-red-600">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => setRows((x) => [...x, { form: "", course: "" }])} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3282B8]">
                <Plus size={13} aria-hidden="true" /> Add form
            </button>
            <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2 text-[12.5px] text-slate-600">
                <span>Any other form:</span>
                {courseSelect(fallback, setFallback, "Default course")}
            </div>
            <div className="mt-2 flex justify-end">
                <button type="button" onClick={save} className="rounded-lg bg-[#3282B8] px-3 py-1.5 text-[12.5px] font-bold text-white">
                    Save mapping
                </button>
            </div>
        </div>
    );
}

export default function IntegrationsPage() {
    const [data, setData] = useState(null);
    const [courses, setCourses] = useState([]);
    const [busy, setBusy] = useState(null);

    const load = useCallback(
        () =>
            integrationService
                .status()
                .then(({ data: res }) => setData(res.data))
                .catch((err) => toast.error(apiMessage(err, "Could not load integrations"))),
        []
    );
    useEffect(() => {
        load();
        courseService
            .getAll({ limit: 100 })
            .then(({ data: res }) => setCourses(res?.data ?? []))
            .catch(() => {});
    }, [load]);

    const act = async (key, fn, ok) => {
        setBusy(key);
        try {
            const { data: res } = await fn();
            toast.success(res?.message || ok);
            await load();
        } catch (err) {
            toast.error(apiMessage(err, "That didn't work. Please try again."));
        } finally {
            setBusy(null);
        }
    };

    if (!data) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1300px] space-y-6">
            <div>
                <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Lead integrations</h1>
                <p className="mt-1 text-[13px] text-slate-500">
                    Leads from ads and forms go through the same duplicate checks and{" "}
                    <Link to="/admin/distribution" className="font-semibold text-[#3282B8]">Round Robin</Link> as leads added by hand.
                    Keys and secrets are set on the server, never here.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {data.integrations.map((i) => {
                    const info = INFO[i.source];
                    const healthy = i.last_success_at && (!i.last_error_at || new Date(i.last_success_at) > new Date(i.last_error_at));
                    return (
                        <section key={i.source} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-[15px] font-bold text-slate-900">{info.title}</h2>
                                    <p className="mt-0.5 text-[12.5px] text-slate-500">{info.about}</p>
                                </div>
                                <Switch
                                    checked={i.enabled}
                                    disabled={busy === i.source || (!i.configured && !i.enabled)}
                                    label={`${info.title} on`}
                                    onChange={(v) => act(i.source, () => integrationService.save(i.source, { enabled: v }), v ? "Turned on" : "Turned off")}
                                />
                            </div>

                            {Object.keys(info.settings).length > 0 && (
                                <ul className="mt-3 space-y-1 text-[12.5px]">
                                    {Object.entries(info.settings).map(([k, envName]) => (
                                        <li key={k} className="flex items-center gap-1.5">
                                            {i.ready[k] ? <CheckCircle2 size={13} className="text-emerald-600" aria-hidden="true" /> : <XCircle size={13} className="text-slate-400" aria-hidden="true" />}
                                            <code className="text-[11.5px]">{envName}</code>
                                            <span className="text-slate-400">{i.ready[k] ? "set" : "missing"}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {!i.configured && i.source !== "website" && (
                                <p className="mt-2 flex gap-1.5 text-[12px] text-amber-700">
                                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> Add the missing settings to the server's .env and restart to turn this on.
                                </p>
                            )}

                            {i.webhook_url && (
                                <div className="mt-3">
                                    <p className="text-[12px] font-semibold text-slate-600">Webhook URL</p>
                                    <div className="mt-1 flex items-center gap-1.5">
                                        <code className="min-w-0 flex-1 truncate rounded bg-slate-100 px-2 py-1 text-[11.5px]">{i.webhook_url}</code>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard?.writeText(i.webhook_url).then(() => toast.success("Copied"))}
                                            aria-label="Copy webhook URL"
                                            className="rounded border border-slate-200 p-1 text-slate-500"
                                        >
                                            <Copy size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[12.5px]">
                                <dt className="text-slate-500">Status</dt>
                                <dd className={cn("text-right font-semibold", !i.enabled ? "text-slate-400" : healthy ? "text-emerald-700" : i.last_error_at ? "text-red-600" : "text-slate-500")}>
                                    {!i.enabled ? "Off" : healthy ? "Working" : i.last_error_at ? "Problem" : "Waiting for first lead"}
                                </dd>
                                <dt className="text-slate-500">Last lead</dt>
                                <dd className="text-right">{fmtDateTime(i.last_success_at)}</dd>
                                <dt className="text-slate-500">Last 7 days</dt>
                                <dd className="text-right">
                                    {i.last_7_days.created ?? 0} new · {i.last_7_days.duplicate ?? 0} existing · {i.last_7_days.failed ?? 0} failed
                                </dd>
                            </dl>
                            {i.last_error && i.last_error_at && !healthy && (
                                <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
                                    {fmtDateTime(i.last_error_at)}: {i.last_error}
                                </p>
                            )}

                            {i.source === "linkedin" && i.enabled && (
                                <button
                                    type="button"
                                    disabled={busy === "sync"}
                                    onClick={() => act("sync", () => integrationService.syncLinkedIn(), "Synced")}
                                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 disabled:opacity-60"
                                >
                                    <RefreshCw size={13} className={cn(busy === "sync" && "animate-spin")} aria-hidden="true" /> Sync now
                                </button>
                            )}
                            {info.formLabel && (
                                <FormCourses
                                    key={JSON.stringify(i.config)}
                                    integration={i}
                                    courses={courses}
                                    onSave={(body) => act(i.source, () => integrationService.save(i.source, body), "Saved")}
                                />
                            )}
                        </section>
                    );
                })}
            </div>

            <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <h2 className="px-4 pt-3 text-[15px] font-bold text-slate-900">Recent imports</h2>
                <table className="mt-2 w-full min-w-[760px] text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-2">Received</th>
                            <th className="px-4 py-2">Source</th>
                            <th className="px-4 py-2">Result</th>
                            <th className="px-4 py-2">Lead</th>
                            <th className="px-4 py-2">Details</th>
                            <th className="px-4 py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {!data.events.length && (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Nothing imported yet.</td>
                            </tr>
                        )}
                        {data.events.map((e) => (
                            <tr key={e.id}>
                                <td className="whitespace-nowrap px-4 py-2 text-slate-500">{fmtDateTime(e.received_at)}</td>
                                <td className="px-4 py-2 capitalize">{e.source}</td>
                                <td className="px-4 py-2">
                                    <span className={cn("rounded-md px-2 py-0.5 text-[11.5px] font-semibold", STATUS[e.status]?.[1])}>{STATUS[e.status]?.[0] ?? e.status}</span>
                                    {e.attempts > 1 && <span className="ml-1 text-[11.5px] text-slate-400">{e.attempts} tries</span>}
                                </td>
                                <td className="px-4 py-2">
                                    {e.lead_id ? (
                                        <Link to={`/admin/leads?lead=${e.lead_id}`} className="font-semibold text-[#3282B8]">
                                            {e.lead_name ?? `#${e.lead_id}`}
                                        </Link>
                                    ) : (
                                        "—"
                                    )}
                                </td>
                                <td className="max-w-[320px] truncate px-4 py-2 text-[12px] text-slate-500" title={e.error ?? e.external_id}>
                                    {e.error ?? e.external_id}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    {["failed", "skipped"].includes(e.status) && (
                                        <button
                                            type="button"
                                            disabled={busy === `retry-${e.id}`}
                                            onClick={() => act(`retry-${e.id}`, () => integrationService.retry(e.id), "Queued")}
                                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-700"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

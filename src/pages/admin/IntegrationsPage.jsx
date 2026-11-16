import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Link2, Loader2, Plug, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";

import integrationService from "@/services/integrationService";
import crmService from "@/services/crmService";
import courseService from "@/services/courseService";
import { cn } from "@/lib/utils";
import { apiMessage, fmtDateTime, inputCls } from "@/lib/crm";
import { selectUser } from "@/features/auth/authSlice";

/**
 * Admin → Integrations (2.0 phase 7, PRD §8): Meta and LinkedIn lead forms
 * and the website contact form. A Super Admin saves each platform's keys here
 * (encrypted on the server, write-only: this page only learns whether each key
 * is set and where from — never the value).
 */

const INFO = {
    meta: {
        title: "Meta (Facebook & Instagram)",
        about: "Leads from Facebook and Instagram lead-form ads arrive within seconds.",
        formLabel: "Meta lead form ID",
    },
    linkedin: {
        title: "LinkedIn Lead Gen Forms",
        about: "Leads from LinkedIn lead-gen ads, checked every 10 minutes.",
        formLabel: "LinkedIn form ID",
    },
    whatsapp: {
        title: "WhatsApp",
        about: "Messages from new numbers become leads; replies happen on each lead's WhatsApp thread.",
        formLabel: null,
    },
    website: {
        title: "Website contact form",
        about: "Messages from the Contact Us page also become leads (source: Website).",
        formLabel: null,
    },
};
const AUTOMATIONS = [
    ["auto_stage_on_payment", "Paid → Application", "When a lead's student pays, move the lead to Application (if it's earlier in the pipeline)."],
    ["auto_course_done", "Completed → Course Done", "When the student completes the course, move the lead to Course Done and tell the consultant."],
    ["abandoned_checkout_nudge", "Abandoned checkout", "If someone starts checkout but hasn't paid after 1 hour, tell their consultant once."],
    ["follow_up_reminders", "Follow-up reminders", "Remind the consultant 15 minutes before a follow-up is due."],
];

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

function keyState(f) {
    if (f.unreadable) return ["Saved value can't be read — enter it again", "text-amber-700"];
    if (f.from === "admin") return [`Saved${f.hint ? ` · ends ${f.hint}` : ""}${f.updated_by_name ? ` · ${f.updated_by_name}` : ""}`, "text-slate-500"];
    if (f.from === "server") return ["Set in server .env", "text-slate-500"];
    if (f.from === "meta") return ["Uses the Meta app secret", "text-slate-500"];
    return [f.optional ? "Not set (optional)" : "Not set", f.optional ? "text-slate-400" : "text-amber-700"];
}

/** Keys for one integration. Values are typed in, never shown back. */
function IntegrationKeys({ integration, canEdit, onSaved }) {
    const fields = integration.credentials ?? [];
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState({});
    const [remove, setRemove] = useState({});
    const [password, setPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState(null);

    const close = () => {
        setOpen(false);
        setValues({});
        setRemove({});
        setPassword("");
    };

    const save = async (e) => {
        e.preventDefault();
        const body = {};
        for (const f of fields) {
            if (remove[f.name]) body[f.name] = "";
            else if (values[f.name]?.trim()) body[f.name] = values[f.name].trim();
        }
        if (!Object.keys(body).length) return toast.error("Type a key, or tick Remove");
        if (!password) return toast.error("Enter your password");
        setSaving(true);
        try {
            const { data: res } = await integrationService.saveKeys(integration.source, body, password);
            toast.success(res?.message || "Keys saved");
            close();
            setResult(null);
            await onSaved();
        } catch (err) {
            toast.error(apiMessage(err, "Could not save the keys"));
        } finally {
            setSaving(false);
        }
    };

    const test = async () => {
        setTesting(true);
        setResult(null);
        try {
            const { data: res } = await integrationService.test(integration.source);
            setResult(res.data);
        } catch (err) {
            setResult({ ok: false, message: apiMessage(err, "Could not run the test") });
        } finally {
            setTesting(false);
        }
    };

    if (!fields.length) return null;
    return (
        <div className="mt-3">
            <ul className="space-y-1 text-[12.5px]">
                {fields.map((f) => {
                    const [text, tone] = keyState(f);
                    return (
                        <li key={f.name} className="flex items-center gap-1.5">
                            {f.set ? (
                                <CheckCircle2 size={13} className="shrink-0 text-emerald-600" aria-hidden="true" />
                            ) : (
                                <XCircle size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                            )}
                            <span className="font-medium text-slate-700">{f.label}</span>
                            <span className={cn("min-w-0 truncate", tone)}>{text}</span>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-2 flex flex-wrap gap-2">
                {canEdit && !open && (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700"
                    >
                        <KeyRound size={13} aria-hidden="true" /> {fields.some((f) => f.set) ? "Change keys" : "Add keys"}
                    </button>
                )}
                <button
                    type="button"
                    onClick={test}
                    disabled={testing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 disabled:opacity-60"
                >
                    {testing ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Plug size={13} aria-hidden="true" />} Test connection
                </button>
            </div>
            {result && (
                <p role="status" className={cn("mt-2 rounded-lg px-2.5 py-1.5 text-[12px]", result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {result.message}
                </p>
            )}
            {!canEdit && <p className="mt-2 text-[12px] text-slate-400">Only a Super Admin can change these keys.</p>}

            {open && (
                <form onSubmit={save} className="mt-3 space-y-2.5 rounded-lg bg-slate-50 p-3" autoComplete="off">
                    <p className="text-[12px] text-slate-500">
                        Leave a box empty to keep the current key. Keys are encrypted and can't be viewed again after saving.
                    </p>
                    {fields.map((f) => (
                        <div key={f.name}>
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor={`${integration.source}-${f.name}`} className="text-[12.5px] font-semibold text-slate-700">
                                    {f.label}
                                    {f.optional && <span className="font-normal text-slate-400"> (optional)</span>}
                                </label>
                                {f.from === "admin" && (
                                    <label className="flex items-center gap-1 text-[12px] text-slate-500">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(remove[f.name])}
                                            onChange={(e) => setRemove((r) => ({ ...r, [f.name]: e.target.checked }))}
                                        />
                                        Remove
                                    </label>
                                )}
                            </div>
                            <input
                                id={`${integration.source}-${f.name}`}
                                type={f.secret ? "password" : "text"}
                                autoComplete="new-password"
                                spellCheck={false}
                                disabled={Boolean(remove[f.name])}
                                value={values[f.name] ?? ""}
                                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                                placeholder={f.from === "admin" ? "Saved — type to replace" : f.from === "server" ? "Set in server .env — type to override" : "Paste here"}
                                className={cn(inputCls, "mt-1 py-1.5 font-mono text-[12.5px] disabled:opacity-50")}
                            />
                        </div>
                    ))}
                    <label className="block border-t border-slate-200 pt-2.5">
                        <span className="text-[12.5px] font-semibold text-slate-700">Confirm with your password</span>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={cn(inputCls, "mt-1 py-1.5")}
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={close} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-slate-600">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3282B8] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-60">
                            {saving && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Save keys
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

const PLATFORM = { meta: "Facebook", linkedin: "LinkedIn" };
const APP_KEYS = { meta: ["app_id", "app_secret"], linkedin: ["client_id", "client_secret"] };

function copy(text) {
    navigator.clipboard?.writeText(text).then(() => toast.success("Copied"));
}

/** What "Connect" set up, in one line (no tokens). */
function ConnectionLine({ source, connection }) {
    if (!connection) return null;
    const when = connection.connected_at ? new Date(connection.connected_at).toLocaleDateString() : null;
    const what = source === "meta" ? `Page "${connection.page_name}"` : connection.account_name ? `"${connection.account_name}"` : "LinkedIn";
    const renew =
        source === "linkedin" && connection.expires_at
            ? connection.auto_renew
                ? " · renews automatically"
                : ` · connect again before ${new Date(connection.expires_at).toLocaleDateString()}`
            : "";
    return (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] text-emerald-800">
            <Link2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
                Connected to {what}
                {connection.connected_by ? ` by ${connection.connected_by}` : ""}
                {when ? ` on ${when}` : ""}
                {renew}
            </span>
        </p>
    );
}

/** "Connect with Facebook / LinkedIn": password, then off to the platform's sign-in. */
function ConnectButton({ integration }) {
    const [asking, setAsking] = useState(false);
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const source = integration.source;
    const keys = Object.fromEntries((integration.credentials ?? []).map((f) => [f.name, f.set]));
    const ready = APP_KEYS[source].every((k) => keys[k]);
    const connected = Boolean(integration.connection);

    const go = async (e) => {
        e.preventDefault();
        if (!password) return toast.error("Enter your password");
        setBusy(true);
        try {
            const { data: res } = await integrationService.connect(source, password);
            window.location.assign(res.data.url);
        } catch (err) {
            toast.error(apiMessage(err, "Could not start the connection"));
            setBusy(false);
        }
    };

    return (
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3">
            {!asking ? (
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => setAsking(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3282B8] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50"
                >
                    <Link2 size={13} aria-hidden="true" /> {connected ? `Reconnect ${PLATFORM[source]}` : `Connect with ${PLATFORM[source]}`}
                </button>
            ) : (
                <form onSubmit={go} className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[180px] flex-1">
                        <span className="text-[12.5px] font-semibold text-slate-700">Confirm with your password</span>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={cn(inputCls, "mt-1 py-1.5")}
                        />
                    </label>
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3282B8] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-60">
                        {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Continue to {PLATFORM[source]}
                    </button>
                    <button type="button" onClick={() => setAsking(false)} className="px-2 py-1.5 text-[12.5px] font-semibold text-slate-600">
                        Cancel
                    </button>
                </form>
            )}
            <p className="mt-2 text-[12px] text-slate-500">
                {ready
                    ? `Sign in to ${PLATFORM[source]} and CERTEZY sets up the rest${source === "meta" ? " (Page token, webhook, lead events)" : " (token, ad account, renewal)"}.`
                    : `One-time: save the ${source === "meta" ? "App ID and App secret" : "Client ID and Client secret"} under Change keys first.`}
            </p>
            {integration.oauth?.redirect_uri && (
                <details className="mt-1.5 text-[12px] text-slate-500">
                    <summary className="cursor-pointer font-semibold text-slate-600">One-time app setup</summary>
                    <p className="mt-1">
                        {source === "meta"
                            ? "In your Meta app → Facebook Login for Business → Settings → Valid OAuth Redirect URIs, add:"
                            : "In your LinkedIn app → Auth → Authorized redirect URLs, add:"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                        <code className="min-w-0 flex-1 truncate rounded bg-slate-100 px-2 py-1 text-[11.5px]">{integration.oauth.redirect_uri}</code>
                        <button type="button" onClick={() => copy(integration.oauth.redirect_uri)} aria-label="Copy redirect URL" className="rounded border border-slate-200 p-1 text-slate-500">
                            <Copy size={13} />
                        </button>
                    </div>
                </details>
            )}
        </div>
    );
}

/** Shown after Facebook / LinkedIn send the Super Admin back: progress, picker, result. */
function ConnectResult({ result, onChoose, onClose }) {
    const [choosing, setChoosing] = useState(null);
    if (!result) return null;
    const name = PLATFORM[result.source];
    return (
        <section className="rounded-xl border border-[#3282B8]/30 bg-sky-50/60 p-4" aria-live="polite">
            {result.status === "working" && (
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-700">
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Finishing the {name} connection…
                </p>
            )}
            {result.status === "choose" && (
                <>
                    <h2 className="text-[14.5px] font-bold text-slate-900">
                        {result.source === "meta" ? "Which Facebook Page runs your lead ads?" : "Which LinkedIn ad account runs your lead ads?"}
                    </h2>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {result.options.map((o) => (
                            <li key={o.id}>
                                <button
                                    type="button"
                                    disabled={Boolean(choosing)}
                                    onClick={async () => {
                                        setChoosing(o.id);
                                        await onChoose(o.id);
                                        setChoosing(null);
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[13px] font-semibold text-slate-800 hover:border-[#3282B8] disabled:opacity-60"
                                >
                                    <span className="min-w-0 truncate">{o.name}</span>
                                    {choosing === o.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <span className="text-[11.5px] font-normal text-slate-400">{o.id}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {result.status === "done" && (
                <>
                    <h2 className="text-[14.5px] font-bold text-slate-900">
                        {result.steps.every((x) => x.ok) ? `${name} is connected` : `${name} is connected — one step needs attention`}
                    </h2>
                    <ul className="mt-2 space-y-1 text-[13px]">
                        {result.steps.map((x) => (
                            <li key={x.label} className="flex items-start gap-1.5">
                                {x.ok ? (
                                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                                ) : (
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                                )}
                                <span className={x.ok ? "text-slate-700" : "text-amber-800"}>{x.label}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-[12.5px] text-slate-500">Next: Test connection, switch it on, and map your forms to courses below.</p>
                </>
            )}
            {result.status === "error" && (
                <p className="flex items-start gap-1.5 text-[13px] text-red-700">
                    <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {result.message}
                </p>
            )}
            {result.status !== "working" && (
                <div className="mt-3 flex justify-end">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-700">
                        Close
                    </button>
                </div>
            )}
        </section>
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
    const [automations, setAutomations] = useState(null);
    const isSuper = useSelector(selectUser)?.role === "super_admin";
    const navigate = useNavigate();
    const { source: returnedFrom } = useParams();
    const [params] = useSearchParams();
    const oauthState = params.get("state");
    const [connectResult, setConnectResult] = useState(() =>
        returnedFrom && oauthState ? { source: returnedFrom, status: "working" } : null
    );
    const finished = useRef(false);

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
        crmService
            .automations()
            .then(({ data: res }) => setAutomations(res.data))
            .catch(() => {});
    }, [load]);

    // Back from Facebook / LinkedIn: finish on the server (tokens never come to the browser)
    useEffect(() => {
        if (!returnedFrom || !oauthState || finished.current) return;
        finished.current = true;
        const body = { state: oauthState, ...(params.get("code") ? { code: params.get("code") } : { error: params.get("error") || "access_denied" }) };
        integrationService
            .finishConnect(returnedFrom, body)
            .then(({ data: res }) => {
                if (res.data.status === "redirect") return window.location.assign(res.data.url);
                setConnectResult({ source: returnedFrom, ...res.data });
                if (res.data.status === "done") load();
            })
            .catch((err) => setConnectResult({ source: returnedFrom, status: "error", message: apiMessage(err, "The connection didn't finish — click Connect again") }))
            // Drop ?code=… from the address bar
            .finally(() => navigate("/admin/integrations", { replace: true }));
    }, [returnedFrom, oauthState, params, navigate, load]);

    const chooseConnect = async (id) => {
        try {
            const { data: res } = await integrationService.chooseConnect(connectResult.source, { selection: connectResult.selection, id });
            setConnectResult({ source: connectResult.source, ...res.data });
            await load();
        } catch (err) {
            setConnectResult({ source: connectResult.source, status: "error", message: apiMessage(err, "Could not finish — click Connect again") });
        }
    };

    const toggleAutomation = async (key, value) => {
        setBusy(key);
        try {
            const { data: res } = await crmService.saveAutomations({ [key]: value });
            setAutomations(res.data);
            toast.success(value ? "Automation on" : "Automation off");
        } catch (err) {
            toast.error(apiMessage(err, "Could not save"));
        } finally {
            setBusy(null);
        }
    };

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
                    {" "}
                    {isSuper
                        ? "Use Connect with Facebook / LinkedIn, or paste keys into a card — they're encrypted and never shown again."
                        : "A Super Admin connects each platform; you can see whether it's set up and test the connection."}
                </p>
            </div>

            <ConnectResult result={connectResult} onChoose={chooseConnect} onClose={() => setConnectResult(null)} />

            <div className="grid gap-4 md:grid-cols-2">
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

                            <ConnectionLine source={i.source} connection={i.connection} />
                            {isSuper && i.oauth && <ConnectButton integration={i} />}
                            <IntegrationKeys integration={i} canEdit={isSuper} onSaved={load} />
                            {!i.configured && i.source !== "website" && (
                                <p className="mt-2 flex gap-1.5 text-[12px] text-amber-700">
                                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> Add the missing keys to turn this on.
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

            {automations && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="text-[15px] font-bold text-slate-900">Automations</h2>
                    <p className="mt-0.5 mb-3 text-[12.5px] text-slate-500">
                        Automatic moves only go forward and show on the lead's timeline as "automatic".
                    </p>
                    <ul className="divide-y divide-slate-100">
                        {AUTOMATIONS.map(([key, title, about]) => (
                            <li key={key} className="flex items-center justify-between gap-4 py-2.5">
                                <div>
                                    <p className="text-[13.5px] font-semibold text-slate-800">{title}</p>
                                    <p className="text-[12.5px] text-slate-500">{about}</p>
                                </div>
                                <Switch checked={Boolean(automations[key])} disabled={busy === key} label={title} onChange={(v) => toggleAutomation(key, v)} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

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

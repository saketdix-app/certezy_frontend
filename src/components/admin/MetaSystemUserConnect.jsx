import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import integrationService from "@/services/integrationService";
import { cn } from "@/lib/utils";
import { apiMessage, inputCls } from "@/lib/crm";

const PERMISSIONS = [
    "leads_retrieval",
    "pages_show_list",
    "pages_manage_metadata",
    "pages_read_engagement",
    "pages_manage_ads",
    "ads_management",
    "business_management",
];

/**
 * Facebook: connect with a Meta Business "System User" token instead of a
 * personal sign-in. No 90-day re-login; a 60-day token is renewed by CERTEZY.
 */
export default function MetaSystemUserConnect({ integration, onDone }) {
    const [open, setOpen] = useState(false);
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const active = integration.connection?.mode === "system_user";
    const keys = Object.fromEntries((integration.credentials ?? []).map((f) => [f.name, f.set]));
    const ready = keys.app_id && keys.app_secret;

    const submit = async (e) => {
        e.preventDefault();
        if (token.trim().length < 20) return toast.error("Paste the System User token");
        if (!password) return toast.error("Enter your CERTEZY password");
        setBusy(true);
        try {
            const { data: res } = await integrationService.connectSystemUser(token.trim(), password);
            setToken("");
            setPassword("");
            setOpen(false);
            onDone(res.data);
        } catch (err) {
            toast.error(apiMessage(err, "Could not connect the System User token"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
            <div className="flex flex-wrap items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-small font-bold text-slate-800">
                        {active ? "Connected with a System User token" : "Stop the 90-day Facebook re-login"}
                    </p>
                    <p className="text-small text-slate-600">
                        {active
                            ? "Not tied to anyone's Facebook account. A 60-day token is renewed automatically; a never-expiring one needs nothing."
                            : "Use a Meta Business System User token: it isn't tied to a person, so leads keep coming without anyone signing in again."}
                    </p>
                </div>
                {!open && (
                    <button
                        type="button"
                        disabled={!ready}
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-surface px-3 py-1.5 text-small font-bold text-emerald-800 hover:border-emerald-500 disabled:opacity-50"
                    >
                        <KeyRound size={13} aria-hidden="true" />{" "}
                        {active ? "Replace token" : "Use a System User token"}
                    </button>
                )}
            </div>
            {!ready && (
                <p className="mt-1.5 text-small text-slate-500">
                    Save the App ID and App secret under Change keys first.
                </p>
            )}

            {open && (
                <div className="mt-3 space-y-3">
                    <details className="rounded-lg bg-surface p-3 text-small text-slate-600" open={!active}>
                        <summary className="cursor-pointer font-semibold text-slate-700">
                            How to get the token (once, about 10 minutes)
                        </summary>
                        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                            <li>
                                Open <strong>business.facebook.com → Settings → Users → System users</strong>{" "}
                                and click <strong>Add</strong>. Name it e.g. &ldquo;CERTEZY Leads&rdquo;, role{" "}
                                <strong>Admin</strong>.
                            </li>
                            <li>
                                <strong>Assign assets</strong> to it: each <strong>Page</strong> that runs
                                lead ads (full control, or at least leads access), and the{" "}
                                <strong>CERTEZY app</strong> (the one whose App ID is saved on this card).
                            </li>
                            <li>
                                If <strong>Settings → Integrations → Leads access</strong> is turned on for a
                                Page, add the System User there too.
                            </li>
                            <li>
                                Back on the System User, click <strong>Generate new token</strong> → choose
                                the CERTEZY app → token expiry <strong>Never</strong> (or 60 days — CERTEZY
                                renews it) → tick these permissions:
                                <span className="mt-1 flex flex-wrap gap-1">
                                    {PERMISSIONS.map((p) => (
                                        <code
                                            key={p}
                                            className="rounded bg-slate-100 px-1.5 py-0.5 text-label"
                                        >
                                            {p}
                                        </code>
                                    ))}
                                </span>
                            </li>
                            <li>
                                Copy the token and paste it below. It&apos;s stored encrypted and never shown
                                again.
                            </li>
                        </ol>
                    </details>
                    <form onSubmit={submit} className="space-y-2">
                        <label className="block">
                            <span className="text-small font-semibold text-slate-700">System User token</span>
                            <input
                                type="password"
                                autoComplete="off"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="EAAG…"
                                className={cn(inputCls, "mt-1 py-1.5 font-mono")}
                            />
                        </label>
                        <label className="block">
                            <span className="text-small font-semibold text-slate-700">
                                Your CERTEZY password
                            </span>
                            <span className="block text-label text-slate-500">
                                The one you use to sign in here — not your Facebook password
                            </span>
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={cn(inputCls, "mt-1 py-1.5")}
                            />
                        </label>
                        <p className="text-label text-slate-500">
                            CERTEZY checks the token with Facebook, connects every Page the System User can
                            manage, subscribes them to new leads and points the webhook here. It replaces the
                            current Facebook connection.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60"
                            >
                                {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}{" "}
                                Check and connect
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="px-2 py-1.5 text-small font-semibold text-slate-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

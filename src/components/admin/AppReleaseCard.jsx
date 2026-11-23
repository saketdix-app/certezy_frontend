import { useEffect, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

import crmService from "@/services/crmService";
import { apiMessage, inputCls } from "@/lib/crm";
import { cn } from "@/lib/utils";

/**
 * Admins: after building a new CERTEZY Team APK (npm run build:apk), paste its
 * version and download link here. The app's Profile → "Check for updates"
 * offers it to everyone on an older version.
 */
export default function AppReleaseCard() {
    const [current, setCurrent] = useState(undefined);
    const [f, setF] = useState({ version: "", version_code: "", apk_url: "", notes: "" });
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    useEffect(() => {
        crmService
            .appRelease()
            .then(({ data }) => {
                setCurrent(data?.data ?? null);
                if (data?.data) setF({ version: data.data.version, version_code: String(data.data.version_code), apk_url: data.data.apk_url ?? "", notes: data.data.notes ?? "" });
            })
            .catch(() => setCurrent(null));
    }, []);

    const save = async (e) => {
        e.preventDefault();
        if (!/^\d+\.\d+\.\d+$/.test(f.version.trim())) return toast.error("Version like 1.3.0 (from app.json)");
        if (!(Number(f.version_code) >= 1)) return toast.error("Version code like 5 (android.versionCode in app.json)");
        if (!/^https:\/\//.test(f.apk_url.trim())) return toast.error("Paste the APK download link (https://…)");
        setBusy(true);
        try {
            const { data } = await crmService.saveAppRelease({
                version: f.version.trim(),
                version_code: Number(f.version_code),
                apk_url: f.apk_url.trim(),
                notes: f.notes.trim() || null,
            });
            setCurrent(data.data);
            toast.success("Published — the team will see the update in the app");
        } catch (err) {
            toast.error(apiMessage(err, "Could not publish"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-surface p-5" aria-label="Team app updates">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Smartphone size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-h3 font-bold text-slate-900">CERTEZY Team app updates</h2>
                    <p className="text-small text-slate-500">
                        After building a new APK, paste its version and download link. In the app, Profile → Check for updates offers it to
                        everyone on an older version.
                        {current && (
                            <>
                                {" "}
                                Live now: <b className="text-slate-800">v{current.version}</b> (code {current.version_code}).
                            </>
                        )}
                    </p>
                </div>
            </div>
            <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[120px_110px_1fr]">
                <label className="block text-small font-semibold text-slate-600">
                    Version
                    <input value={f.version} onChange={set("version")} placeholder="1.4.0" className={cn(inputCls, "mt-1")} />
                </label>
                <label className="block text-small font-semibold text-slate-600">
                    Version code
                    <input type="number" min="1" value={f.version_code} onChange={set("version_code")} placeholder="6" className={cn(inputCls, "mt-1")} />
                </label>
                <label className="block min-w-0 text-small font-semibold text-slate-600">
                    APK download link
                    <input value={f.apk_url} onChange={set("apk_url")} placeholder="https://expo.dev/artifacts/eas/….apk" className={cn(inputCls, "mt-1")} />
                </label>
                <label className="block text-small font-semibold text-slate-600 sm:col-span-3">
                    What's new (optional)
                    <input value={f.notes} onChange={set("notes")} maxLength={240} placeholder="Faster leads list, WhatsApp number on leads" className={cn(inputCls, "mt-1")} />
                </label>
                <div className="sm:col-span-3">
                    <button type="submit" disabled={busy || current === undefined} className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60">
                        {busy && <Loader2 size={15} className="animate-spin" />} Publish update
                    </button>
                </div>
            </form>
        </section>
    );
}

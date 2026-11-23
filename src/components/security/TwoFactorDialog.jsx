import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, ShieldCheck, ShieldOff, X } from "lucide-react";
import toast from "react-hot-toast";

import authService from "@/services/authService";
import { patchUser } from "@/features/auth/authSlice";

const inputCls =
    "w-full rounded-lg border border-slate-200 bg-surface px-3 py-2.5 text-ui outline-none focus:border-action focus:ring-2 focus:ring-action/20";

/**
 * Account security: turn two-step sign-in on (we email a code to confirm) or
 * off (with your password). `suggest` shows the Super Admin recommendation.
 */
export default function TwoFactorDialog({ onClose, suggest = false }) {
    const dispatch = useDispatch();
    const user = useSelector((s) => s.auth.user);
    const enabled = Boolean(user?.two_factor_enabled);
    const [step, setStep] = useState("intro"); // intro → code (turning on) | password (turning off)
    const [challenge, setChallenge] = useState(null);
    const [hint, setHint] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const call = async (fn) => {
        setBusy(true);
        try {
            return await fn();
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
            return null;
        } finally {
            setBusy(false);
        }
    };

    const start = () =>
        call(async () => {
            const { data } = await authService.twoFactorSetup();
            setChallenge(data.data.challenge);
            setHint(data.data.email_hint);
            setStep("code");
        });
    const confirm = () =>
        call(async () => {
            await authService.twoFactorEnable({ challenge, code });
            dispatch(patchUser({ two_factor_enabled: true }));
            toast.success("Two-step sign-in is on");
            onClose();
        });
    const turnOff = () =>
        call(async () => {
            await authService.twoFactorDisable(password);
            dispatch(patchUser({ two_factor_enabled: false }));
            toast.success("Two-step sign-in is off");
            onClose();
        });

    return (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Two-step sign-in"
                className="w-full rounded-t-2xl bg-surface p-6 shadow-2xl sm:max-w-md sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        {enabled ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>
                <h2 className="text-h3 font-extrabold text-slate-900">
                    {suggest ? "Protect your Super Admin account" : "Two-step sign-in"}
                </h2>

                {step === "intro" && (
                    <>
                        <p className="mt-1.5 text-ui text-slate-600">
                            {enabled
                                ? "It's on: after your password, we email you a 6-digit code every time you sign in."
                                : "After your password, we'll email you a 6-digit code every time you sign in — so a stolen password alone can't open your account."}
                        </p>
                        {suggest && !enabled && (
                            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-small text-amber-900">
                                Recommended for Super Admins: your account can change everything on CERTEZY.
                            </p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                                {suggest ? "Remind me later" : "Close"}
                            </button>
                            {enabled ? (
                                <button type="button" onClick={() => setStep("password")} className="rounded-lg border border-red-200 px-4 py-2 text-ui font-semibold text-red-700 hover:bg-red-50">
                                    Turn off
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={start}
                                    className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                                >
                                    {busy && <Loader2 size={15} className="animate-spin" />} Turn on
                                </button>
                            )}
                        </div>
                    </>
                )}

                {step === "code" && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            confirm();
                        }}
                    >
                        <p className="mt-1.5 text-ui text-slate-600">
                            We emailed a code to <b>{hint}</b>. Enter it to turn on two-step sign-in.
                        </p>
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            placeholder="6-digit code"
                            aria-label="Code from the email"
                            className={`${inputCls} mt-4 text-center text-h3 font-bold tracking-[0.4em]`}
                        />
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setStep("intro")} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={busy || code.length !== 6}
                                className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                            >
                                {busy && <Loader2 size={15} className="animate-spin" />} Confirm
                            </button>
                        </div>
                    </form>
                )}

                {step === "password" && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            turnOff();
                        }}
                    >
                        <p className="mt-1.5 text-ui text-slate-600">Enter your password to turn two-step sign-in off.</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            autoFocus
                            aria-label="Your password"
                            className={`${inputCls} mt-4`}
                        />
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setStep("intro")} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={busy || !password}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-ui font-bold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {busy && <Loader2 size={15} className="animate-spin" />} Turn off
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

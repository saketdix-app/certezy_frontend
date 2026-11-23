import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import toast from "react-hot-toast";

import authService from "@/services/authService";
import { verifyLoginCode } from "@/features/auth/authSlice";

/**
 * Second step of sign-in when two-step sign-in is on: the 6-digit code that
 * was emailed. Calls onDone(result) with { user, ... } once signed in.
 */
export default function LoginCodeStep({ challenge: initial, emailHint, onDone, onBack }) {
    const dispatch = useDispatch();
    const loading = useSelector((s) => s.auth.loading);
    const [challenge, setChallenge] = useState(initial);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [wait, setWait] = useState(45);
    const input = useRef(null);

    useEffect(() => {
        input.current?.focus();
    }, []);
    useEffect(() => {
        if (wait <= 0) return undefined;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    const submit = async (value = code) => {
        if (!/^\d{6}$/.test(value)) return setError("Enter the 6-digit code");
        setError("");
        try {
            const result = await dispatch(verifyLoginCode({ challenge, code: value })).unwrap();
            onDone(result);
        } catch (msg) {
            setError(msg || "That code didn't work");
            setCode("");
            input.current?.focus();
            if (/sign in again/i.test(String(msg))) setTimeout(onBack, 1500);
        }
    };

    const resend = async () => {
        try {
            const { data } = await authService.resendLoginCode(challenge);
            setChallenge(data.data?.challenge ?? challenge);
            setWait(45);
            setError("");
            toast.success("A new code is on its way");
        } catch (err) {
            toast.error(err.response?.data?.message || "Couldn't send a new code");
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={onBack}
                className="mb-6 inline-flex items-center gap-1.5 text-ui font-semibold text-action hover:underline"
            >
                <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <MailCheck size={24} aria-hidden="true" />
            </div>
            <h1 className="text-h1 font-extrabold tracking-tight text-slate-900">Check your email</h1>
            <p className="mt-1.5 text-ui text-slate-500">
                We sent a 6-digit code to <b className="text-slate-800">{emailHint}</b>. It works for 10 minutes.
            </p>

            <form
                className="mt-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <label htmlFor="login-code" className="mb-1.5 block text-small font-bold uppercase tracking-wide text-slate-600">
                    Sign-in code
                </label>
                <input
                    id="login-code"
                    ref={input}
                    value={code}
                    onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setCode(v);
                        if (v.length === 6) submit(v);
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    aria-invalid={Boolean(error)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-[26px] font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-action focus:ring-2 focus:ring-action/20"
                />
                {error && (
                    <p className="mt-2 text-small font-semibold text-red-600" role="alert">
                        {error}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-action px-4 py-3 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                >
                    {loading && <Loader2 size={16} className="animate-spin" />} Verify and sign in
                </button>
            </form>

            <p className="mt-4 text-center text-small text-slate-500">
                Didn&rsquo;t get it? Check spam, or{" "}
                {wait > 0 ? (
                    <span>send a new code in {wait}s</span>
                ) : (
                    <button type="button" onClick={resend} className="font-semibold text-action hover:underline">
                        send a new code
                    </button>
                )}
                .
            </p>
        </div>
    );
}

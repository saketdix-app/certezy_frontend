import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

import api from "@/services/api";
import Logo from "@/components/shared/Logo";
import { ROUTES } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * Forgot password → email link → Reset password.
 *   /forgot-password           enter your email (same answer for any email)
 *   /reset-password?token=…    choose a new password (link from the email)
 */

// Same rule as sign-up and the server
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,72}$/;

const inputCls =
    "w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-slate-50 text-[14px] text-slate-800 outline-none focus:bg-white transition-colors";

function Card({ title, subtitle, children }) {
    return (
        <div className="min-h-[70vh] flex items-center justify-center bg-[#F1F5F9] px-4 py-12">
            <div
                className="w-full max-w-md bg-white rounded-2xl border border-slate-100 p-7 sm:p-8"
                style={{
                    boxShadow: "0 8px 30px rgba(15,23,42,0.08)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                <Logo to="/" height={30} className="mb-6" />
                <h1 className="text-[22px] font-extrabold text-slate-900">{title}</h1>
                {subtitle && <p className="text-[14px] text-slate-500 mt-1.5">{subtitle}</p>}
                <div className="mt-6">{children}</div>
            </div>
        </div>
    );
}

function BackToLogin() {
    return (
        <Link
            to={ROUTES.LOGIN}
            className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#3282B8] hover:underline"
        >
            <ArrowLeft size={15} /> Back to sign in
        </Link>
    );
}

// ─── /forgot-password ─────────────────────────────────────────────────────────

export function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [sentTo, setSentTo] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        const value = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError("Enter a valid email address");
        setBusy(true);
        try {
            await api.post("/auth/forgot-password", { email: value });
            setSentTo(value);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not send the reset link. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    if (sentTo) {
        return (
            <Card title="Check your email">
                <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4 text-[13.5px] text-green-900">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-green-600" />
                    <p>
                        If an account exists for <b>{sentTo}</b>, we&apos;ve sent a link to reset the
                        password. It works for 1 hour. Check your spam folder if it doesn&apos;t arrive in a
                        few minutes.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setSentTo(null)}
                    className="mt-4 text-[13px] text-slate-500 hover:text-slate-700 underline"
                >
                    Use a different email
                </button>
                <div>
                    <BackToLogin />
                </div>
            </Card>
        );
    }

    return (
        <Card
            title="Forgot your password?"
            subtitle="Enter the email you signed up with and we'll send you a reset link."
        >
            <form onSubmit={submit} noValidate>
                <label htmlFor="fp-email" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Email
                </label>
                <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        id="fp-email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                        }}
                        placeholder="you@example.com"
                        className={cn(
                            inputCls,
                            error ? "border-red-300" : "border-slate-200 focus:border-[#3282B8]"
                        )}
                        aria-invalid={!!error}
                    />
                </div>
                {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3282B8] hover:bg-[#2A6FA0] text-white text-[14px] font-bold disabled:opacity-60"
                >
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    Send reset link
                </button>
            </form>
            <BackToLogin />
        </Card>
    );
}

// ─── /reset-password?token=… ──────────────────────────────────────────────────

export function ResetPasswordPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get("token") || "";
    const [linkState, setLinkState] = useState(token ? "checking" : "invalid"); // checking | valid | invalid
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        api.get(`/auth/reset-password/${encodeURIComponent(token)}`)
            .then(({ data }) => !cancelled && setLinkState(data?.data?.valid ? "valid" : "invalid"))
            .catch(() => !cancelled && setLinkState("invalid"));
        return () => {
            cancelled = true;
        };
    }, [token]);

    const submit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!STRONG.test(password))
            errs.password = "Use 8+ characters with upper and lower case letters, a number and a symbol";
        if (confirm !== password) errs.confirm = "Passwords don't match";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setBusy(true);
        try {
            const { data } = await api.post("/auth/reset-password", { token, password });
            toast.success(data?.message || "Password changed. Sign in with your new password.");
            navigate(ROUTES.LOGIN, { replace: true });
        } catch (err) {
            const message = err.response?.data?.message || "Could not change the password. Please try again.";
            if (/invalid|expired/i.test(message)) setLinkState("invalid");
            toast.error(message);
        } finally {
            setBusy(false);
        }
    };

    if (linkState === "checking") {
        return (
            <Card title="Reset your password">
                <div className="flex items-center gap-2 text-[14px] text-slate-500">
                    <Loader2 size={16} className="animate-spin" /> Checking your link…
                </div>
            </Card>
        );
    }

    if (linkState === "invalid") {
        return (
            <Card title="This link has expired">
                <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-[13.5px] text-amber-900">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                    <p>
                        Reset links work once and expire after 1 hour. Request a new one and use the latest
                        email.
                    </p>
                </div>
                <Link
                    to="/forgot-password"
                    className="mt-5 w-full flex items-center justify-center py-3 rounded-xl bg-[#3282B8] hover:bg-[#2A6FA0] text-white text-[14px] font-bold"
                >
                    Send a new link
                </Link>
                <BackToLogin />
            </Card>
        );
    }

    const field = (id, label, value, setValue, error, autoComplete) => (
        <div>
            <label htmlFor={id} className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setErrors({});
                    }}
                    className={cn(
                        inputCls,
                        "pr-11",
                        error ? "border-red-300" : "border-slate-200 focus:border-[#3282B8]"
                    )}
                    aria-invalid={!!error}
                />
                <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
        </div>
    );

    return (
        <Card
            title="Choose a new password"
            subtitle="You'll be signed out on other devices after the change."
        >
            <form onSubmit={submit} noValidate className="space-y-4">
                {field("rp-new", "New password", password, setPassword, errors.password, "new-password")}
                {field(
                    "rp-confirm",
                    "Confirm new password",
                    confirm,
                    setConfirm,
                    errors.confirm,
                    "new-password"
                )}
                <p className="text-[12px] text-slate-500">
                    At least 8 characters with upper and lower case letters, a number and a symbol.
                </p>
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3282B8] hover:bg-[#2A6FA0] text-white text-[14px] font-bold disabled:opacity-60"
                >
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    Change password
                </button>
            </form>
            <BackToLogin />
        </Card>
    );
}

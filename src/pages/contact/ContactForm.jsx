// src/pages/contact/ContactForm.jsx

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import contactService from "@/services/contactService";

const SUBJECTS = [
    "General Inquiry",
    "Technical Support",
    "Course Question",
    "Partnership",
    "Billing",
    "Other",
];

const officeHours = [
    { day: "Monday – Friday", time: "24/7 Available" },
    { day: "Saturday", time: "24/7 Available" },
    { day: "Sunday", time: "24/7 Available" },
];

function FieldError({ message }) {
    if (!message) return null;
    return <p className="text-xs text-red-400 mt-0.5">{message}</p>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 5000;

// Shown for every submission, whatever the backend says.
const CONFIRMATION_TITLE = "Thank you for reaching out!";
const CONFIRMATION_TEXT = "We've received your message and our team will get back to you within 24 hours.";

// Mirrors the backend rules so users can fix real mistakes before sending.
const validate = ({ name, email, message }) => {
    const errors = {};
    if (!name.trim()) errors.name = "Please enter your name";
    if (!EMAIL_RE.test(email.trim())) errors.email = "Please enter a valid email address";
    if (message.trim().length < MIN_MESSAGE)
        errors.message = `Please write at least ${MIN_MESSAGE} characters`;
    else if (message.length > MAX_MESSAGE) errors.message = `Please keep it under ${MAX_MESSAGE} characters`;
    return errors;
};

const EMPTY_FORM = { name: "", email: "", phone: "", subject: SUBJECTS[0], message: "" };

export default function ContactForm() {
    const user = useSelector((s) => s.auth?.user);
    const isLoggedIn = !!user;

    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [submittedName, setSubmittedName] = useState(null);

    // Signed-in users: always use account details (they may load after mount)
    const values = isLoggedIn ? { ...form, name: user.name || "", email: user.email || "" } : form;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const found = validate(values);
        setErrors(found);
        if (Object.keys(found).length) return;

        setLoading(true);
        const payload = {
            name: values.name.trim(),
            email: values.email.trim(),
            phone: values.phone.trim() || undefined,
            subject: values.subject,
            message: values.message.trim(),
        };
        // Never throws: failures are queued and retried on the next visit.
        await contactService.submitEnquiry(payload);
        setLoading(false);

        setSubmittedName(payload.name.split(" ")[0]);
        setForm(EMPTY_FORM);
        toast.success(CONFIRMATION_TITLE);
    };

    // Shared input/textarea/select base classes
    const inputCls = [
        "w-full rounded-xl px-4 py-3 text-sm text-slate-200",
        "bg-white/5 border border-white/10",
        "placeholder:text-slate-500",
        "focus:outline-none focus:border-[#3282B8] focus:bg-[#3282B8]/5",
        "transition-colors duration-200",
    ].join(" ");

    return (
        <section
            className="px-6 pb-20 pt-14"
            style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f2545 55%, #162d5a 100%)" }}
        >
            <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* ── LEFT: Form ─────────────────────────────────────── */}
                <div
                    className="rounded-2xl p-8 md:p-9"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    {submittedName !== null ? (
                        <div className="flex flex-col items-center text-center py-10" role="status">
                            <CheckCircle2 size={52} className="text-green-400 mb-5" />
                            <h2 className="text-xl font-bold text-slate-100 mb-2">
                                {submittedName ? `Thank you, ${submittedName}!` : CONFIRMATION_TITLE}
                            </h2>
                            <p className="text-sm text-slate-400 max-w-sm mb-8">{CONFIRMATION_TEXT}</p>
                            <button
                                type="button"
                                onClick={() => setSubmittedName(null)}
                                className="text-sm font-semibold text-[#3282B8] hover:brightness-125"
                            >
                                Send another message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            <h2 className="text-xl font-bold text-slate-100 mb-7">Send a Message</h2>

                            {/* Autofill badge */}
                            {isLoggedIn && (
                                <div className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1 mb-6">
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Name & email auto-filled from your account
                                </div>
                            )}

                            {/* Name + Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white">
                                        Full Name
                                    </label>
                                    <input
                                        className={inputCls}
                                        name="name"
                                        placeholder="John Doe"
                                        value={values.name}
                                        onChange={handleChange}
                                        aria-invalid={!!errors.name}
                                        disabled={isLoggedIn}
                                        style={isLoggedIn ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                                    />
                                    <FieldError message={errors.name} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white">
                                        Email Address
                                    </label>
                                    <input
                                        className={inputCls}
                                        name="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={values.email}
                                        onChange={handleChange}
                                        aria-invalid={!!errors.email}
                                        disabled={isLoggedIn}
                                        style={isLoggedIn ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                                    />
                                    <FieldError message={errors.email} />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex flex-col gap-1.5 mb-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-white">
                                    Phone{" "}
                                    <span className="text-slate-500 normal-case font-normal tracking-normal">
                                        (Optional)
                                    </span>
                                </label>
                                <input
                                    className={inputCls}
                                    name="phone"
                                    type="tel"
                                    placeholder="Your phone number"
                                    value={form.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Subject */}
                            <div className="flex flex-col gap-1.5 mb-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-white">
                                    Subject
                                </label>
                                <select
                                    className={inputCls}
                                    name="subject"
                                    value={form.subject}
                                    onChange={handleChange}
                                    style={{
                                        appearance: "none",
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: "no-repeat",
                                        backgroundPosition: "right 14px center",
                                        cursor: "pointer",
                                    }}
                                >
                                    {SUBJECTS.map((s) => (
                                        <option
                                            key={s}
                                            value={s}
                                            style={{ background: "#0f2545", color: "#e2e8f0" }}
                                        >
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Message */}
                            <div className="flex flex-col gap-1.5 mb-6">
                                <label className="text-xs font-bold uppercase tracking-widest text-white">
                                    Message
                                </label>
                                <textarea
                                    className={inputCls}
                                    name="message"
                                    placeholder="Tell us how we can help..."
                                    value={form.message}
                                    onChange={handleChange}
                                    rows={5}
                                    maxLength={MAX_MESSAGE}
                                    aria-invalid={!!errors.message}
                                    style={{ resize: "vertical" }}
                                />
                                <FieldError message={errors.message} />
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all duration-200 hover:brightness-90 active:scale-[0.99]"
                                style={{
                                    background: "#3282B8",
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    boxShadow: loading ? "none" : "0 4px 20px rgba(50,130,184,0.3)",
                                }}
                            >
                                {loading ? "Sending..." : "Send Message"}
                            </button>
                        </form>
                    )}
                </div>

                {/* ── RIGHT: Map + Hours ─────────────────────────────── */}
                <div className="flex flex-col gap-5">
                    <iframe
                        src="https://www.google.com/maps?q=CERTEZY%20E-LEARNING%20PRIVATE%20LIMITED%20Indore&output=embed"
                        width="100%"
                        height="220"
                        style={{ border: 0, borderRadius: "16px" }}
                        loading="lazy"
                    />

                    {/* Office Hours */}
                    <div
                        className="rounded-2xl p-7"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-5">
                            <span
                                className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"
                                style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.2)" }}
                            />
                            <h3 className="text-base font-bold text-slate-100">Support Hours</h3>
                        </div>

                        {/* 24/7 highlight */}
                        <div
                            className="flex items-center justify-center rounded-xl py-4 mb-5 gap-3"
                            style={{
                                background: "rgba(50,130,184,0.1)",
                                border: "1px solid rgba(50,130,184,0.2)",
                            }}
                        >
                            <span className="text-3xl font-extrabold tracking-tight text-white">24/7</span>
                            <span className="text-sm text-white font-medium leading-snug">
                                Always available
                                <br />
                                for you
                            </span>
                        </div>

                        {/* Days */}
                        {officeHours.map((h) => (
                            <div
                                key={h.day}
                                className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 text-sm"
                            >
                                <span className="text-slate-400">{h.day}</span>
                                <span className="font-semibold text-white">{h.time}</span>
                            </div>
                        ))}

                        {/* Note */}
                        <div
                            className="mt-4 rounded-xl px-4 py-3 text-xs text-slate-400 leading-relaxed"
                            style={{
                                background: "rgba(50,130,184,0.08)",
                                border: "1px solid rgba(50,130,184,0.2)",
                            }}
                        >
                            <strong style={{ color: "#3282B8" }}>Note:</strong> Enterprise Plan members get
                            priority support via the private scholar dashboard.
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

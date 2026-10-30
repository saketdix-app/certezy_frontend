// src/pages/contact/ContactForm.jsx

import { useState } from "react";
import { CheckCircle2, MapPin, MessageCircle } from "lucide-react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import contactService from "@/services/contactService";
import { SUPPORT_PHONES, WHATSAPP_LINES, COMPANY } from "@/config/app";

const SUBJECTS = [
    "General Inquiry",
    "Technical Support",
    "Course Question",
    "Partnership",
    "Billing",
    "Other",
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
                            <h2 className="text-xl font-bold text-slate-100 mb-7">Contact Us</h2>

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

                {/* ── RIGHT: Office address + WhatsApp ───────────────── */}
                <div className="flex flex-col gap-5">
                    {/* Office */}
                    <div
                        className="rounded-2xl p-7"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <div className="flex items-center gap-2.5 mb-4">
                            <span
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{
                                    background: "rgba(50,130,184,0.15)",
                                    border: "1px solid rgba(50,130,184,0.25)",
                                }}
                            >
                                <MapPin size={17} color="#fff" />
                            </span>
                            <h3 className="text-base font-bold text-slate-100">Our Office</h3>
                        </div>
                        <address className="not-italic text-sm leading-relaxed">
                            <span className="block font-semibold text-white">{COMPANY.legalName}</span>
                            {COMPANY.addressLines.map((line) => (
                                <span key={line} className="block text-slate-400">
                                    {line}
                                </span>
                            ))}
                        </address>
                    </div>

                    {/* WhatsApp 24 × 7 */}
                    <div
                        className="rounded-2xl p-7"
                        style={{
                            background: "rgba(37,211,102,0.06)",
                            border: "1px solid rgba(37,211,102,0.25)",
                        }}
                    >
                        <div className="flex items-center gap-2.5 mb-2">
                            <span
                                className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-pulse"
                                style={{ boxShadow: "0 0 0 3px rgba(37,211,102,0.25)" }}
                            />
                            <h3 className="text-base font-bold text-slate-100">WhatsApp Chat · 24 × 7</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-5">
                            Prefer chatting? Message us on WhatsApp any time — every day of the year.
                        </p>
                        <div className="flex flex-col gap-2.5">
                            {WHATSAPP_LINES.map((p) => (
                                <a
                                    key={p.region}
                                    href={p.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-[#25D366] text-[#053B1E] font-bold text-sm no-underline transition hover:brightness-105 hover:-translate-y-0.5"
                                >
                                    <span className="flex items-center gap-2">
                                        <MessageCircle size={17} />
                                        Chat on WhatsApp · {p.region === "IN" ? "India" : "US"}
                                    </span>
                                    <span className="font-semibold opacity-80">{p.number}</span>
                                </a>
                            ))}
                        </div>
                        <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                            Or call us:{" "}
                            {SUPPORT_PHONES.map((p, i) => (
                                <span key={p.region}>
                                    {i > 0 && " · "}
                                    {p.region === "IN" ? "India" : "US"}{" "}
                                    <a
                                        href={p.href}
                                        className="text-slate-300 font-semibold hover:text-white"
                                    >
                                        {p.number}
                                    </a>
                                </span>
                            ))}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

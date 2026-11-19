import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckCircle2, Download, Loader2, X } from "lucide-react";

import enquiryService from "@/services/enquiryService";
import { selectUser } from "@/features/auth/authSlice";
import { ROUTES } from "@/config/app";
import { printSyllabus } from "@/lib/courseLeads";

const COPY = {
    advisor: {
        title: "Talk to an advisor",
        intro: "Leave your number and an advisor will call you to answer your questions about the course, the exam and fees.",
        submit: "Request a call",
    },
    syllabus: {
        title: "Download the syllabus",
        intro: "Get the full module-by-module syllabus on screen now and in your inbox.",
        submit: "Get the syllabus",
    },
    team: {
        title: "Training a team?",
        intro: "Tell us about your team and we'll send a quote for group training.",
        submit: "Request a quote",
    },
};

const fieldCls =
    "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-ui text-slate-900 placeholder:text-slate-400 focus:border-[#2F6496] focus:outline-none focus:ring-2 focus:ring-[#2F6496]/20";

function Field({ id, label, optional, children }) {
    return (
        <label htmlFor={id} className="block">
            <span className="mb-1 block text-small font-semibold text-slate-700">
                {label}
                {optional && <span className="font-normal text-slate-500"> (optional)</span>}
            </span>
            {children}
        </label>
    );
}

/**
 * Course-page lead form: "advisor" (phone), "syllabus" (email) or "team"
 * (company + size). Each submission becomes a CRM lead for this course.
 */
export default function EnquiryModal({ kind, course, onClose }) {
    const user = useSelector(selectUser);
    const [form, setForm] = useState({
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        company: "",
        team_size: "",
        preferred_time: "",
        message: "",
        consent: false,
        website: "", // honeypot
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(null); // { syllabus? }
    const first = useRef(null);
    const copy = COPY[kind];

    useEffect(() => {
        first.current?.focus();
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.consent) return setError("Please tick the box so we can contact you.");
        setBusy(true);
        try {
            const { data: res } = await enquiryService.submit({
                kind,
                course_id: course?.id ?? null,
                name: form.name.trim(),
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                ...(kind === "team" && { company: form.company.trim(), team_size: form.team_size ? Number(form.team_size) : null }),
                ...(kind === "advisor" && form.preferred_time && { preferred_time: form.preferred_time }),
                ...(form.message.trim() && { message: form.message.trim() }),
                consent: true,
                website: form.website,
            });
            setDone(res?.data ?? {});
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong. Please try again or email us.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="enquiry-title"
                className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-[460px] sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="min-w-0">
                        <h2 id="enquiry-title" className="text-h3 font-bold text-slate-900">
                            {copy.title}
                        </h2>
                        {course?.title && <p className="mt-0.5 truncate text-small text-slate-500">{course.title}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                {done ? (
                    <div className="px-5 py-5">
                        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-ui text-emerald-800">
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <p>
                                {kind === "syllabus"
                                    ? `Thanks, ${form.name.split(" ")[0]}. Here's the syllabus — we've also emailed it to ${form.email}.`
                                    : kind === "team"
                                      ? `Thanks, ${form.name.split(" ")[0]}. We've got your request and will send a quote for your team soon.`
                                      : `Thanks, ${form.name.split(" ")[0]}. We've got your request — an advisor will call you soon.`}
                            </p>
                        </div>
                        {kind === "syllabus" && Array.isArray(done.syllabus) && done.syllabus.length > 0 && (
                            <>
                                <ol className="mt-4 space-y-3">
                                    {done.syllabus.map((s, i) => (
                                        <li key={i}>
                                            <p className="text-ui font-bold text-slate-900">
                                                {i + 1}. {s.title}
                                            </p>
                                            {s.lessons.length > 0 && (
                                                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ui text-slate-600">
                                                    {s.lessons.map((l, j) => (
                                                        <li key={j}>{l}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                                <button
                                    type="button"
                                    onClick={() => printSyllabus(course.title, done.syllabus)}
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#2F6496] px-4 py-2.5 text-ui font-bold text-white hover:bg-[#275382]"
                                >
                                    <Download size={16} aria-hidden="true" /> Save as PDF
                                </button>
                            </>
                        )}
                        <button type="button" onClick={onClose} className="mt-3 w-full rounded-[10px] border border-slate-200 px-4 py-2.5 text-ui font-semibold text-slate-700">
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-3.5 px-5 py-4" noValidate>
                        <p className="text-ui leading-relaxed text-slate-600">{copy.intro}</p>
                        <Field id="enq-name" label="Full name">
                            <input id="enq-name" ref={first} required autoComplete="name" value={form.name} onChange={set("name")} className={fieldCls} />
                        </Field>
                        {kind === "team" && (
                            <div className="grid grid-cols-[1fr_120px] gap-3">
                                <Field id="enq-company" label="Company">
                                    <input id="enq-company" required autoComplete="organization" value={form.company} onChange={set("company")} className={fieldCls} />
                                </Field>
                                <Field id="enq-size" label="Team size" optional>
                                    <input id="enq-size" type="number" min="2" inputMode="numeric" value={form.team_size} onChange={set("team_size")} className={fieldCls} />
                                </Field>
                            </div>
                        )}
                        <Field id="enq-phone" label="Phone (with country code)" optional={kind !== "advisor"}>
                            <input
                                id="enq-phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="+91 98765 43210"
                                required={kind === "advisor"}
                                value={form.phone}
                                onChange={set("phone")}
                                className={fieldCls}
                            />
                        </Field>
                        <Field id="enq-email" label={kind === "team" ? "Work email" : "Email"} optional={kind === "advisor"}>
                            <input
                                id="enq-email"
                                type="email"
                                autoComplete="email"
                                required={kind === "syllabus"}
                                value={form.email}
                                onChange={set("email")}
                                className={fieldCls}
                            />
                        </Field>
                        {kind === "advisor" && (
                            <Field id="enq-time" label="Best time to call" optional>
                                <select id="enq-time" value={form.preferred_time} onChange={set("preferred_time")} className={fieldCls}>
                                    <option value="">Any time</option>
                                    <option>Morning</option>
                                    <option>Afternoon</option>
                                    <option>Evening</option>
                                </select>
                            </Field>
                        )}
                        {kind !== "syllabus" && (
                            <Field id="enq-msg" label={kind === "team" ? "What does your team need?" : "Your question"} optional>
                                <textarea id="enq-msg" rows={2} maxLength={1000} value={form.message} onChange={set("message")} className={fieldCls} />
                            </Field>
                        )}
                        {/* Honeypot: hidden from people, filled in by bots */}
                        <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />
                        <label className="flex cursor-pointer items-start gap-2.5 text-small leading-relaxed text-slate-600">
                            <input type="checkbox" checked={form.consent} onChange={set("consent")} className="mt-0.5 h-4 w-4 shrink-0 accent-[#2F6496]" />
                            <span>
                                I agree that CERTEZY may contact me about this course by phone, email or WhatsApp. See our{" "}
                                <Link to={ROUTES.PRIVACY} target="_blank" className="font-semibold text-[#2F6496] underline">
                                    Privacy Policy
                                </Link>
                                .
                            </span>
                        </label>
                        {error && (
                            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-ui text-red-700">
                                {error}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={busy}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#2F6496] px-4 py-3 text-body font-bold text-white hover:bg-[#275382] disabled:opacity-60"
                        >
                            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} {copy.submit}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

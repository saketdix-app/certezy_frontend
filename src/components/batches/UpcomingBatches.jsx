import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin, UserRound, Users, X } from "lucide-react";
import toast from "react-hot-toast";

import batchService from "@/services/batchService";
import { cn } from "@/lib/utils";

const MODE = { online: "Live online", classroom: "Classroom", hybrid: "Hybrid" };

const fmtDay = (d) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
const fmtPrice = (amount, currency) =>
    amount == null
        ? null
        : new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
              style: "currency",
              currency: currency || "INR",
              maximumFractionDigits: 0,
          }).format(amount);

const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-ui text-slate-900 outline-none focus:border-[#3A76AA] focus:ring-2 focus:ring-[#3A76AA]/20";

function EnrollModal({ batch, onClose, onDone }) {
    const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", experience_years: "", message: "", consent: false, website: "" });
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (form.name.trim().length < 2) return toast.error("Enter your full name");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("Enter a valid email");
        if (!/^[+\d][\d\s()-]{6,24}$/.test(form.phone.trim())) return toast.error("Enter a valid phone number");
        if (!form.consent) return toast.error("Please agree to be contacted");
        setBusy(true);
        try {
            const { data } = await batchService.enroll(batch.id, {
                ...form,
                experience_years: form.experience_years === "" ? null : Number(form.experience_years),
            });
            setDone(data?.message || "You're enrolled — our team will contact you shortly");
            onDone?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Could not enroll right now. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Enroll: ${batch.title}`}
                className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-7"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-label font-bold uppercase tracking-[0.12em] text-[#3A76AA]">Enroll in live batch</p>
                        <h2 className="mt-1 text-h3 font-extrabold text-[#1E3F5E]">{batch.title}</h2>
                        <p className="mt-1 text-small text-slate-500">
                            Starts {fmtDay(batch.start_date)}
                            {batch.schedule ? ` · ${batch.schedule}` : ""}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                {done ? (
                    <div className="py-6 text-center">
                        <CheckCircle2 size={44} className="mx-auto text-emerald-600" aria-hidden="true" />
                        <p className="mt-3 text-h3 font-bold text-slate-900">{done}</p>
                        <p className="mt-1 text-ui text-slate-500">We&rsquo;ll share the joining details, schedule and fee by email and phone.</p>
                        <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-[#2F6496] px-5 py-2.5 text-ui font-bold text-white hover:bg-[#275382]">
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-3">
                        <input value={form.name} onChange={set("name")} placeholder="Full name *" aria-label="Full name" className={field} autoFocus />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <input type="email" value={form.email} onChange={set("email")} placeholder="Email *" aria-label="Email" className={field} />
                            <input value={form.phone} onChange={set("phone")} placeholder="Phone / WhatsApp *" aria-label="Phone" className={field} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <input value={form.company} onChange={set("company")} placeholder="Company (optional)" aria-label="Company" className={field} />
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={form.experience_years}
                                onChange={set("experience_years")}
                                placeholder="Years of PM experience"
                                aria-label="Years of project management experience"
                                className={field}
                            />
                        </div>
                        <textarea value={form.message} onChange={set("message")} rows={2} placeholder="Anything we should know? (optional)" aria-label="Message" className={cn(field, "resize-none")} />
                        {/* Honeypot: hidden from people */}
                        <input value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                        <label className="flex items-start gap-2 text-small text-slate-600">
                            <input type="checkbox" checked={form.consent} onChange={set("consent")} className="mt-0.5 accent-[#2F6496]" />
                            I agree to be contacted by CERTEZY about this batch by phone, WhatsApp or email.
                        </label>
                        <button
                            type="submit"
                            disabled={busy}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6496] px-5 py-3 text-ui font-bold text-white hover:bg-[#275382] disabled:opacity-60"
                        >
                            {busy && <Loader2 size={16} className="animate-spin" />} Enroll now
                        </button>
                        <p className="text-center text-small text-slate-500">No payment now. Our team will confirm your seat.</p>
                    </form>
                )}
            </div>
        </div>
    );
}

function BatchCard({ b, onEnroll }) {
    const full = b.seats_left === 0;
    const price = fmtPrice(b.price, b.currency);
    return (
        <article className="flex flex-col rounded-3xl border border-[#C9DCEC] bg-white p-6 shadow-[0_10px_30px_rgba(30,63,94,0.06)]">
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF2F9] px-3 py-1 text-label font-bold uppercase tracking-wide text-[#275382]">
                    {/* Live classes (online / hybrid): a blinking green dot */}
                    {b.mode !== "classroom" && (
                        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-75 motion-reduce:animate-none" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                        </span>
                    )}
                    {MODE[b.mode] ?? "Live online"}
                </span>
                {b.seats_left != null && (
                    <span
                        className={cn(
                            "rounded-full px-3 py-1 text-label font-bold",
                            full ? "bg-slate-100 text-slate-500" : b.seats_left <= 5 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
                        )}
                    >
                        {full ? "Batch full" : `${b.seats_left} seat${b.seats_left === 1 ? "" : "s"} left`}
                    </span>
                )}
            </div>
            <h3 className="mt-3 text-h3 font-extrabold leading-snug text-[#1E3F5E]">{b.title}</h3>
            <ul className="mt-3 space-y-1.5 text-ui text-slate-600">
                <li className="flex items-start gap-2">
                    <CalendarDays size={16} className="mt-0.5 shrink-0 text-[#3A76AA]" aria-hidden="true" />
                    <span>
                        Starts <b className="font-semibold text-slate-800">{fmtDay(b.start_date)}</b>
                        {b.end_date ? ` · ends ${fmtDay(b.end_date)}` : ""}
                    </span>
                </li>
                {b.schedule && (
                    <li className="flex items-start gap-2">
                        <Clock size={16} className="mt-0.5 shrink-0 text-[#3A76AA]" aria-hidden="true" />
                        <span>
                            {b.schedule}
                            {b.timezone ? ` (${b.timezone})` : ""}
                        </span>
                    </li>
                )}
                {b.trainer_name && (
                    <li className="flex items-start gap-2">
                        <UserRound size={16} className="mt-0.5 shrink-0 text-[#3A76AA]" aria-hidden="true" />
                        <span>
                            Trainer: <b className="font-semibold text-slate-800">{b.trainer_name}</b>
                            {b.trainer_title ? `, ${b.trainer_title}` : ""}
                        </span>
                    </li>
                )}
                {b.mode !== "online" && b.location && (
                    <li className="flex items-start gap-2">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-[#3A76AA]" aria-hidden="true" />
                        <span>{b.location}</span>
                    </li>
                )}
            </ul>
            {b.description && <p className="mt-3 line-clamp-3 text-ui text-slate-500">{b.description}</p>}
            <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                <div>
                    {price ? (
                        <>
                            <p className="text-label uppercase tracking-wide text-slate-500">Fee</p>
                            <p className="text-h3 font-extrabold text-[#1E3F5E]">{price}</p>
                        </>
                    ) : (
                        <p className="text-small text-slate-500">Fee shared on enrollment</p>
                    )}
                </div>
                <button
                    type="button"
                    disabled={full}
                    onClick={() => onEnroll(b)}
                    className="rounded-xl bg-[#2F6496] px-5 py-2.5 text-ui font-bold text-white hover:bg-[#275382] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {full ? "Full" : "Enroll now"}
                </button>
            </div>
        </article>
    );
}

/**
 * Upcoming live batches from Admin → Live batches, with an Enroll form.
 * `hideWhenEmpty` (home page) shows nothing until a batch is published.
 */
export default function UpcomingBatches({ hideWhenEmpty = false, id = "live-batches", className }) {
    const [batches, setBatches] = useState(null);
    const [enrolling, setEnrolling] = useState(null);

    const load = () =>
        batchService
            .upcoming()
            .then(({ data }) => setBatches(data?.data ?? []))
            .catch(() => setBatches([]));
    useEffect(() => {
        load();
    }, []);

    if (hideWhenEmpty && !batches?.length) return null;

    return (
        <section id={id} className={cn("scroll-mt-24 py-16", className)} aria-labelledby={`${id}-title`}>
            <div className="mx-auto max-w-6xl px-4">
                <p className="text-label font-bold uppercase tracking-[0.16em] text-[#3A76AA]">Live batches</p>
                <h2 id={`${id}-title`} className="mt-2 text-h1 font-extrabold tracking-tight text-[#1E3F5E]">
                    Upcoming live PMP<sup className="text-[0.5em]">®</sup> batches
                </h2>
                <p className="mt-2 max-w-2xl text-body text-slate-600">
                    Instructor-led classes with our certified trainers. Pick a batch and enroll; our team confirms your seat and shares the
                    joining details.
                </p>

                {batches === null ? (
                    <p className="mt-8 text-ui text-slate-500">Loading batches…</p>
                ) : batches.length === 0 ? (
                    <div className="mt-8 rounded-3xl border border-dashed border-[#C9DCEC] bg-white p-8 text-center">
                        <Users size={28} className="mx-auto text-[#3A76AA]" aria-hidden="true" />
                        <p className="mt-2 text-body font-semibold text-slate-800">New live batches are announced soon.</p>
                        <p className="mt-1 text-ui text-slate-500">
                            Talk to us to reserve a seat in the next batch:{" "}
                            <a href="/contact-us" className="font-semibold text-[#2F6496] hover:underline">
                                contact our team
                            </a>
                            .
                        </p>
                    </div>
                ) : (
                    <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {batches.map((b) => (
                            <BatchCard key={b.id} b={b} onEnroll={setEnrolling} />
                        ))}
                    </div>
                )}
            </div>
            {enrolling && <EnrollModal batch={enrolling} onClose={() => setEnrolling(null)} onDone={load} />}
        </section>
    );
}

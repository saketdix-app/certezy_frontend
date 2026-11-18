import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Award, BookOpenCheck, Copy, Loader2, Percent, UserPlus } from "lucide-react";

import crmService from "@/services/crmService";
import courseService from "@/services/courseService";
import { cn } from "@/lib/utils";
import { apiMessage, inputCls } from "@/lib/crm";

const ACTIONS = [
    ["assign", "Assign course", BookOpenCheck],
    ["discount", "Send discount link", Percent],
    ["certificate", "Issue certificate", Award],
];

/**
 * CRM → LMS actions on a lead (2.0 phase 5, PRD §7): create the student
 * account, assign a course, send a discount link, issue a certificate.
 * The server checks ownership, permissions, eligibility and limits.
 */
export default function LeadStudentActions({ lead, isAdmin, onLeadChanged }) {
    const [open, setOpen] = useState(null);
    const [courses, setCourses] = useState([]);
    const [courseId, setCourseId] = useState(lead.course_id ? String(lead.course_id) : "");
    const [note, setNote] = useState("");
    const [price, setPrice] = useState("");
    const [hours, setHours] = useState("48");
    const [override, setOverride] = useState("");
    const [lastLink, setLastLink] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        courseService
            .getAll({ limit: 100 })
            .then(({ data }) => setCourses(data?.data ?? []))
            .catch(() => {});
    }, []);
    const course = courses.find((c) => String(c.id) === courseId);

    const run = async (fn, ok) => {
        setBusy(true);
        try {
            const { data } = await fn();
            const payload = data.data;
            onLeadChanged(payload.lead ?? payload);
            toast.success(data.message || ok);
            return payload;
        } catch (err) {
            toast.error(apiMessage(err, "That didn't work. Please try again."));
            return null;
        } finally {
            setBusy(false);
        }
    };

    const submit = async () => {
        if (!courseId) return toast.error("Choose a course");
        if (open === "assign") {
            if (await run(() => crmService.assignCourse(lead.id, { course_id: Number(courseId), note: note.trim() || undefined }), "Course assigned")) {
                setOpen(null);
                setNote("");
            }
        } else if (open === "discount") {
            if (price === "" || Number(price) < 0) return toast.error("Enter the discounted price");
            const r = await run(
                () => crmService.sendDiscount(lead.id, { course_id: Number(courseId), discount_price: Number(price), expiry_hours: Number(hours) || 48 }),
                "Discount link sent"
            );
            if (r) {
                setLastLink(r.link);
                setOpen(null);
                setPrice("");
            }
        } else if (open === "certificate") {
            if (await run(() => crmService.issueCertificate(lead.id, { course_id: Number(courseId), override_reason: override.trim() || undefined }), "Certificate issued")) {
                setOpen(null);
                setOverride("");
            }
        }
    };

    return (
        <section>
            <h3 className="mb-2 text-ui font-bold uppercase tracking-wide text-slate-500">Student & course</h3>

            {!lead.user_id ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-ui text-slate-600">
                    <p>No student account yet. Create one to assign courses or issue certificates — they get an email to set their password.</p>
                    <button
                        type="button"
                        disabled={busy || !lead.email}
                        onClick={() => run(() => crmService.studentAccount(lead.id), "Student account created")}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-50"
                    >
                        <UserPlus size={13} aria-hidden="true" /> Create student account
                    </button>
                    {!lead.email && <p className="mt-1 text-small text-amber-700">Add the lead's email first.</p>}
                </div>
            ) : (
                <p className="mb-2 text-ui text-slate-600">
                    Student account: <b>{lead.student_email ?? lead.email}</b>
                </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
                {ACTIONS.map(([key, label, Icon]) => (
                    <button
                        key={key}
                        type="button"
                        disabled={key !== "discount" && !lead.user_id}
                        onClick={() => setOpen(open === key ? null : key)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-small font-semibold disabled:opacity-40",
                            open === key ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        <Icon size={13} aria-hidden="true" /> {label}
                    </button>
                ))}
            </div>

            {open && (
                <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls} aria-label="Course">
                        <option value="">Choose a course…</option>
                        {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>

                    {open === "assign" && (
                        <>
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inputCls} />
                            <p className="text-small text-slate-500">Gives free access to the course. The student is emailed.</p>
                        </>
                    )}

                    {open === "discount" && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="block">
                                    <span className="mb-1 block text-small font-semibold text-slate-600">
                                        Price (US$){course ? ` — list $${course.price}` : ""}
                                    </span>
                                    <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-small font-semibold text-slate-600">Valid for (hours)</span>
                                    <input type="number" min="1" value={hours} onChange={(e) => setHours(e.target.value)} className={inputCls} />
                                </label>
                            </div>
                            {course && price !== "" && Number(course.price) > 0 && (
                                <p className="text-small text-slate-500">
                                    {Math.round(((Number(course.price) - Number(price)) / Number(course.price)) * 100)}% off.
                                    {!isAdmin && " Large discounts need an Admin."} It's emailed to {lead.student_email ?? lead.email}; it only counts as a sale once paid.
                                </p>
                            )}
                        </>
                    )}

                    {open === "certificate" && (
                        <>
                            <p className="text-small text-slate-500">
                                Issued only when the student has completed the course (all lessons and every exam).
                            </p>
                            {isAdmin && (
                                <input
                                    value={override}
                                    onChange={(e) => setOverride(e.target.value)}
                                    placeholder="Admin override reason (only if not complete)"
                                    className={inputCls}
                                />
                            )}
                        </>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setOpen(null)} className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold">
                            Cancel
                        </button>
                        <button type="button" disabled={busy} onClick={submit} className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60">
                            {busy && <Loader2 size={13} className="animate-spin" />}
                            {ACTIONS.find(([k]) => k === open)?.[1]}
                        </button>
                    </div>
                </div>
            )}

            {lastLink && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-small text-emerald-900">
                    <span className="truncate">Offer link: {lastLink.offer_url}</span>
                    <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(lastLink.offer_url).then(() => toast.success("Link copied"))}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-300 bg-surface px-2 py-0.5 font-semibold"
                    >
                        <Copy size={12} aria-hidden="true" /> Copy
                    </button>
                </div>
            )}
        </section>
    );
}

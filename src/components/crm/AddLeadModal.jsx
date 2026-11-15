import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

import crmService from "@/services/crmService";
import courseService from "@/services/courseService";
import { CrmModal } from "./crmShared";
import { SOURCES, STAGE_LABEL, apiMessage, inputCls } from "@/lib/crm";

/**
 * Add a lead by hand (source defaults to Manual). Consultants own what they
 * add; Admins can pick an owner or leave it unassigned. If the person is
 * already a lead, the server refuses and we show the match instead.
 */
export default function AddLeadModal({ isAdmin, onClose, onCreated, onOpenLead }) {
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        course_id: "",
        preferred_schedule: "",
        source: "manual",
        campaign: "",
        owner_id: "",
    });
    const [courses, setCourses] = useState([]);
    const [owners, setOwners] = useState([]);
    const [duplicates, setDuplicates] = useState(null);
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    useEffect(() => {
        courseService
            .getAll({ limit: 100 })
            .then(({ data }) => setCourses(data?.data ?? []))
            .catch(() => {});
        if (isAdmin)
            crmService
                .owners()
                .then(({ data }) => setOwners(data?.data ?? []))
                .catch(() => {});
    }, [isAdmin]);

    const submit = async (e) => {
        e.preventDefault();
        if (form.name.trim().length < 2) return toast.error("Enter the person's name");
        if (!form.phone.trim() && !form.email.trim()) return toast.error("Add a phone number or an email");
        setBusy(true);
        setDuplicates(null);
        try {
            const { data } = await crmService.create({
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                course_id: form.course_id ? Number(form.course_id) : null,
                preferred_schedule: form.preferred_schedule.trim() || null,
                source: form.source,
                ...(form.campaign.trim() && { source_meta: { campaign: form.campaign.trim() } }),
                ...(isAdmin && { owner_id: form.owner_id ? Number(form.owner_id) : null }),
            });
            toast.success("Lead added");
            onCreated(data.data);
            onClose();
        } catch (err) {
            if (err.response?.status === 409 && err.response.data?.details?.duplicates) {
                setDuplicates(err.response.data.details.duplicates);
            } else {
                toast.error(apiMessage(err, "Could not add the lead"));
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <CrmModal title="Add lead" onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                {duplicates && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
                        <p className="flex items-center gap-2 font-semibold">
                            <AlertTriangle size={15} aria-hidden="true" /> This person may already be a lead
                        </p>
                        <ul className="mt-2 space-y-1.5">
                            {duplicates.map((d, i) => (
                                <li key={d.id ?? i} className="flex flex-wrap items-center justify-between gap-2">
                                    <span>
                                        <b>{d.name}</b> · {STAGE_LABEL[d.stage] ?? d.stage}
                                        {d.owner_name ? ` · ${d.owner_name}` : " · unassigned"}
                                    </span>
                                    {d.id ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onOpenLead(d.id);
                                            }}
                                            className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[12px] font-semibold"
                                        >
                                            Open lead
                                        </button>
                                    ) : (
                                        <span className="text-[12px]">Ask an Admin to review it</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-slate-700">Name</span>
                    <input value={form.name} onChange={set("name")} className={inputCls} autoFocus />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1 block text-[13px] font-semibold text-slate-700">Phone</span>
                        <input value={form.phone} onChange={set("phone")} inputMode="tel" placeholder="+91 98765 43210" className={inputCls} />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[13px] font-semibold text-slate-700">Email</span>
                        <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
                    </label>
                </div>
                <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-slate-700">Interested in</span>
                    <select value={form.course_id} onChange={set("course_id")} className={inputCls}>
                        <option value="">Not sure yet</option>
                        {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-slate-700">Preferred schedule (optional)</span>
                    <input value={form.preferred_schedule} onChange={set("preferred_schedule")} placeholder="Weekend evenings" className={inputCls} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1 block text-[13px] font-semibold text-slate-700">Source</span>
                        <select value={form.source} onChange={set("source")} className={inputCls}>
                            {SOURCES.map(([v, l]) => (
                                <option key={v} value={v}>
                                    {l}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[13px] font-semibold text-slate-700">Campaign (optional)</span>
                        <input value={form.campaign} onChange={set("campaign")} className={inputCls} />
                    </label>
                </div>
                {isAdmin && (
                    <label className="block">
                        <span className="mb-1 block text-[13px] font-semibold text-slate-700">Owner</span>
                        <select value={form.owner_id} onChange={set("owner_id")} className={inputCls}>
                            <option value="">Unassigned</option>
                            {owners.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name}
                                    {o.role !== "consultant" ? " (Admin)" : o.accepting_leads === 0 ? " (paused)" : ""}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13.5px] font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#3282B8] px-4 py-2 text-[13.5px] font-bold text-white hover:bg-[#2A6FA0] disabled:opacity-60"
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        Add lead
                    </button>
                </div>
            </form>
        </CrmModal>
    );
}

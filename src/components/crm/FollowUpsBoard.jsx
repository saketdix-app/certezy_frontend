import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, Phone, XCircle } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import LeadDetailPanel from "./LeadDetailPanel";
import { StageBadge } from "./crmShared";
import { apiMessage, fmtDateTime } from "@/lib/crm";

const TABS = [
    ["today", "Due today"],
    ["overdue", "Overdue"],
    ["upcoming", "Upcoming"],
];

/** Follow-ups due today / overdue / upcoming, with quick completion (PRD §4.1, §5). */
export function FollowUpList({ items, onOpen, onDone, busyId, showOwner }) {
    if (!items.length) return <p className="py-6 text-center text-ui text-slate-500">Nothing here.</p>;
    return (
        <ul className="divide-y divide-slate-100">
            {items.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                    <button type="button" onClick={() => onOpen(f.lead_id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-ui font-semibold text-slate-900">
                            {f.lead_name} <StageBadge stage={f.stage} className="ml-1 align-middle" />
                        </p>
                        <p className="truncate text-small text-slate-500">
                            <span className="capitalize">{f.type}</span> · {fmtDateTime(f.due_at)}
                            {f.course_title && ` · ${f.course_title}`}
                            {showOwner && f.owner_name && ` · ${f.owner_name}`}
                            {f.note && ` — ${f.note}`}
                        </p>
                    </button>
                    <div className="flex gap-1.5">
                        {f.phone && (
                            <a href={`tel:${f.phone}`} aria-label={`Call ${f.lead_name}`} className="rounded-lg border border-slate-200 p-2 text-action">
                                <Phone size={14} />
                            </a>
                        )}
                        <button
                            type="button"
                            disabled={busyId === f.id}
                            onClick={() => onDone(f.id, "done")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-small font-semibold text-emerald-700"
                        >
                            <CheckCircle2 size={13} aria-hidden="true" /> Done
                        </button>
                        <button
                            type="button"
                            disabled={busyId === f.id}
                            onClick={() => onDone(f.id, "missed")}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-small font-semibold text-slate-600"
                        >
                            <XCircle size={13} aria-hidden="true" /> Missed
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function FollowUpsBoard({ isAdmin }) {
    const [tab, setTab] = useState("today");
    const [items, setItems] = useState(null);
    const [openId, setOpenId] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(
        () =>
            crmService
                .followUps({ when: tab })
                .then(({ data }) => setItems(data.data))
                .catch((err) => {
                    toast.error(apiMessage(err, "Could not load follow-ups"));
                    setItems([]);
                }),
        [tab]
    );
    useEffect(() => {
        load();
    }, [load]);

    const complete = async (id, status) => {
        setBusyId(id);
        try {
            await crmService.completeFollowUp(id, status);
            toast.success(status === "done" ? "Marked done" : "Marked missed");
            load();
        } catch (err) {
            toast.error(apiMessage(err, "Could not update the follow-up"));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Follow-ups</h1>
            <p className="mt-1 mb-4 text-ui text-slate-500">
                {isAdmin ? "Pending follow-ups across the team." : "Your scheduled calls, messages and demos."}
            </p>
            <div className="mb-3 flex gap-1 border-b border-slate-200" role="tablist">
                {TABS.map(([k, l]) => (
                    <button
                        key={k}
                        role="tab"
                        aria-selected={tab === k}
                        onClick={() => {
                            setItems(null);
                            setTab(k);
                        }}
                        className={cn(
                            "-mb-px border-b-2 px-4 py-2 text-ui font-semibold",
                            tab === k ? "border-action text-action" : "border-transparent text-slate-500"
                        )}
                    >
                        {l}
                    </button>
                ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-surface px-4">
                {!items ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-slate-500" />
                    </div>
                ) : (
                    <FollowUpList items={items} onOpen={setOpenId} onDone={complete} busyId={busyId} showOwner={isAdmin} />
                )}
            </div>
            {openId && <LeadDetailPanel leadId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
        </div>
    );
}

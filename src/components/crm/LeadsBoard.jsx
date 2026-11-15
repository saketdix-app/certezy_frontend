import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarClock, Loader2, Plus, Search } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import AddLeadModal from "./AddLeadModal";
import LeadDetailPanel from "./LeadDetailPanel";
import { StageBadge } from "./crmShared";
import { SOURCES, SOURCE_LABEL, STAGES, ageOf, apiMessage, fmtDateTime, inputCls, isOverdue, maskPhone } from "@/lib/crm";

/**
 * Lead list with the eight status tabs (PRD §4.1–4.3). Consultants get their
 * own leads; Admins get everyone's, plus an owner filter.
 */
export default function LeadsBoard({ isAdmin, initialLeadId }) {
    const [stage, setStage] = useState("");
    const [search, setSearch] = useState("");
    const [source, setSource] = useState("");
    const [ownerId, setOwnerId] = useState("");
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [owners, setOwners] = useState([]);
    const [openId, setOpenId] = useState(initialLeadId ?? null);
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data: res } = await crmService.list({
                stage: stage || undefined,
                search: search.trim() || undefined,
                source: source || undefined,
                owner_id: ownerId || undefined,
                follow_up: overdueOnly ? "overdue" : undefined,
                page,
                limit: 25,
            });
            setData(res.data);
        } catch (err) {
            toast.error(apiMessage(err, "Could not load leads"));
            setData({ leads: [], counts: {}, pagination: { totalPages: 1 } });
        }
    }, [stage, search, source, ownerId, overdueOnly, page]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    useEffect(() => {
        if (isAdmin)
            crmService
                .owners()
                .then(({ data: res }) => setOwners(res.data ?? []))
                .catch(() => {});
    }, [isAdmin]);

    const counts = data?.counts ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const resetPage = (fn) => (v) => {
        fn(v);
        setPage(1);
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">{isAdmin ? "Leads" : "My Leads"}</h1>
                    <p className="mt-1 text-[13px] text-slate-500">
                        {isAdmin ? "Every lead across the team." : "Leads assigned to you."} Open a lead to call, log notes, update its status or schedule a follow-up.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#3282B8] px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-[#2A6FA0]"
                >
                    <Plus size={16} aria-hidden="true" /> Add lead
                </button>
            </div>

            {/* Status tabs */}
            <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
                {[["", "All", total], ...STAGES.map(([k, l]) => [k, l, counts[k] ?? 0])].map(([k, l, n]) => (
                    <button
                        key={k || "all"}
                        role="tab"
                        aria-selected={stage === k}
                        onClick={() => resetPage(setStage)(k)}
                        className={cn(
                            "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                            stage === k ? "border-[#3282B8] bg-[#EBF4FF] text-[#1A5F8A]" : "border-slate-200 bg-white text-slate-600"
                        )}
                    >
                        {l} <span className="ml-0.5 text-slate-400">{n}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                        value={search}
                        onChange={(e) => resetPage(setSearch)(e.target.value)}
                        placeholder="Search name, phone or email"
                        aria-label="Search leads"
                        className={cn(inputCls, "pl-9")}
                    />
                </div>
                <select value={source} onChange={(e) => resetPage(setSource)(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="Source">
                    <option value="">All sources</option>
                    {SOURCES.map(([v, l]) => (
                        <option key={v} value={v}>
                            {l}
                        </option>
                    ))}
                </select>
                {isAdmin && (
                    <select value={ownerId} onChange={(e) => resetPage(setOwnerId)(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="Owner">
                        <option value="">All owners</option>
                        <option value="unassigned">Unassigned</option>
                        {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name}
                            </option>
                        ))}
                    </select>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700">
                    <input type="checkbox" checked={overdueOnly} onChange={(e) => resetPage(setOverdueOnly)(e.target.checked)} className="accent-[#3282B8]" />
                    Overdue follow-ups
                </label>
            </div>

            {/* List */}
            {!data ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-slate-400" />
                </div>
            ) : !data.leads.length ? (
                <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-[14px] text-slate-500">
                    {total ? "No leads match these filters." : "No leads yet. Add your first lead to get started."}
                </p>
            ) : (
                <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                    {data.leads.map((l) => (
                        <li key={l.id}>
                            <button
                                type="button"
                                onClick={() => setOpenId(l.id)}
                                className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-[#3282B8]"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="truncate text-[15px] font-bold text-slate-900">{l.name}</p>
                                    <StageBadge stage={l.stage} />
                                </div>
                                <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                                    {maskPhone(l.phone) || l.email}
                                    {l.course_title && ` · ${l.course_title}`}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{SOURCE_LABEL[l.source] ?? l.source}</span>
                                    <span>{ageOf(l.created_at)} old</span>
                                    {l.next_follow_up_at && (
                                        <span className={cn("inline-flex items-center gap-1", isOverdue(l.next_follow_up_at) && "font-semibold text-red-600")}>
                                            <CalendarClock size={12} aria-hidden="true" /> {fmtDateTime(l.next_follow_up_at)}
                                        </span>
                                    )}
                                    {l.enrolled && <span className="font-semibold text-emerald-700">Enrolled</span>}
                                    {isAdmin && <span className="ml-auto">{l.owner_name ?? "Unassigned"}</span>}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {data?.pagination?.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2 text-[13px]">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border bg-white px-3 py-1.5 disabled:opacity-40">
                        Previous
                    </button>
                    <span>
                        Page {page} of {data.pagination.totalPages}
                    </span>
                    <button
                        disabled={page >= data.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border bg-white px-3 py-1.5 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}

            {adding && (
                <AddLeadModal
                    isAdmin={isAdmin}
                    onClose={() => setAdding(false)}
                    onCreated={(lead) => {
                        load();
                        setOpenId(lead.id);
                    }}
                    onOpenLead={setOpenId}
                />
            )}
            {openId && <LeadDetailPanel leadId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
        </div>
    );
}

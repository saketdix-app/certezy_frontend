import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ExternalLink, Loader2 } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { apiMessage, fmtDateTime } from "@/lib/crm";

const LINK_STATE = {
    generated: ["Sent", "bg-sky-50 text-sky-700"],
    clicked: ["Opened", "bg-indigo-50 text-indigo-700"],
    redeemed: ["Paid", "bg-emerald-50 text-emerald-700"],
    expired: ["Expired", "bg-slate-100 text-slate-500"],
    revoked: ["Withdrawn", "bg-red-50 text-red-700"],
};

function useRecords(fetcher) {
    const [rows, setRows] = useState(null);
    const load = useCallback(
        () =>
            fetcher()
                .then(({ data }) => setRows(data.data))
                .catch((err) => {
                    toast.error(apiMessage(err, "Could not load"));
                    setRows([]);
                }),
        [fetcher]
    );
    useEffect(() => {
        load();
    }, [load]);
    return [rows, load];
}

function Table({ title, intro, head, rows, render, empty }) {
    return (
        <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 mb-4 text-[13px] text-slate-500">{intro}</p>
            {!rows ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-slate-500" />
                </div>
            ) : !rows.length ? (
                <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-[14px] text-slate-500">{empty}</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
                    <table className="w-full min-w-[720px] text-left text-[13px]">
                        <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
                            <tr>
                                {head.map((h) => (
                                    <th key={h} className="px-4 py-2.5">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">{rows.map(render)}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/** Discount links sent from leads (own; Admins all, with Withdraw). */
export function DiscountLinksBoard({ isAdmin }) {
    const [rows, load] = useRecords(crmService.discounts);
    const revoke = async (r) => {
        const reason = window.prompt(`Withdraw the ${r.discount_pct}% link for ${r.lead_name ?? r.email}? Reason:`);
        if (!reason?.trim()) return;
        try {
            await crmService.revokeDiscount(r.id, reason.trim());
            toast.success("Discount link withdrawn");
            load();
        } catch (err) {
            toast.error(apiMessage(err, "Could not withdraw the link"));
        }
    };
    return (
        <Table
            title="Discount links"
            intro="Sent → opened → paid. A link only counts as a sale once it's paid."
            head={["Sent", "Lead / email", "Course", "Price", "Status", "Expires", ...(isAdmin ? ["By", ""] : [])]}
            rows={rows}
            empty="No discount links yet. Send one from a lead."
            render={(r) => (
                <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{fmtDateTime(r.created_at)}</td>
                    <td className="px-4 py-2.5">{r.lead_name ?? r.email}</td>
                    <td className="px-4 py-2.5">{r.course_title}</td>
                    <td className="px-4 py-2.5">
                        ${Number(r.discount_price).toFixed(0)} <span className="text-slate-500 line-through">${Number(r.original_price).toFixed(0)}</span>
                        <span className="ml-1 text-slate-500">({Math.round(r.discount_pct)}%)</span>
                    </td>
                    <td className="px-4 py-2.5">
                        <span className={cn("rounded-md px-2 py-0.5 text-[11.5px] font-semibold", LINK_STATE[r.state]?.[1])}>{LINK_STATE[r.state]?.[0]}</span>
                        {r.revoke_reason && <span className="block text-[11.5px] text-slate-500">{r.revoke_reason}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{fmtDateTime(r.expires_at)}</td>
                    {isAdmin && <td className="px-4 py-2.5">{r.created_by_name}</td>}
                    {isAdmin && (
                        <td className="px-4 py-2.5 text-right">
                            {["generated", "clicked"].includes(r.state) && (
                                <button type="button" onClick={() => revoke(r)} className="rounded-lg border border-red-200 px-2.5 py-1 text-[12px] font-semibold text-red-600">
                                    Withdraw
                                </button>
                            )}
                        </td>
                    )}
                </tr>
            )}
        />
    );
}

/** Courses assigned free (own; Admins all). */
export function AssignmentsBoard({ isAdmin }) {
    const [rows] = useRecords(crmService.assignments);
    return (
        <Table
            title="Course assignments"
            intro="Courses given to students for free, and how far they've got."
            head={["Assigned", "Student", "Course", "Progress", ...(isAdmin ? ["By"] : [])]}
            rows={rows}
            empty="No course assignments yet."
            render={(r) => (
                <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{fmtDateTime(r.created_at)}</td>
                    <td className="px-4 py-2.5">
                        {r.student_name}
                        <span className="block text-[12px] text-slate-500">{r.student_email}</span>
                    </td>
                    <td className="px-4 py-2.5">{r.course_title}</td>
                    <td className="px-4 py-2.5">{r.progress ?? 0}%</td>
                    {isAdmin && <td className="px-4 py-2.5">{r.assigned_by_name}</td>}
                </tr>
            )}
        />
    );
}

/** Certificates issued from leads (own; Admins all). */
export function IssuedCertificatesBoard({ isAdmin }) {
    const [rows] = useRecords(crmService.certificates);
    return (
        <Table
            title="Certificates"
            intro="Certificates issued from leads. Overrides (issued before completion) show their reason."
            head={["Issued", "Student", "Course", "Certificate", ...(isAdmin ? ["By"] : [])]}
            rows={rows}
            empty="No certificates issued from leads yet."
            render={(r) => (
                <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{fmtDateTime(r.issued_at)}</td>
                    <td className="px-4 py-2.5">{r.student_name}</td>
                    <td className="px-4 py-2.5">{r.course_title}</td>
                    <td className="px-4 py-2.5">
                        {r.pdf_url ? (
                            <a href={r.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-action">
                                {r.certificate_no} <ExternalLink size={12} aria-hidden="true" />
                            </a>
                        ) : (
                            r.certificate_no
                        )}
                        {r.override_reason && <span className="block text-[11.5px] text-amber-700">Override: {r.override_reason}</span>}
                    </td>
                    {isAdmin && <td className="px-4 py-2.5">{r.issued_by_name}</td>}
                </tr>
            )}
        />
    );
}

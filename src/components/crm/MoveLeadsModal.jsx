import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

import crmService from "@/services/crmService";
import { CrmModal, StageBadge } from "./crmShared";
import { apiMessage, inputCls } from "@/lib/crm";

const WARNING = {
    paused: "is paused for new leads",
    on_leave: "is on leave",
    daily_limit: "has reached today's lead limit",
    open_limit: "has reached their open-lead limit",
    inactive: "is not an active consultant",
};

/**
 * Assign, transfer or rebalance leads (PRD §6.4): choose the new owner, see
 * the preview (current → new owner, follow-ups that move), give a reason for
 * transfers, confirm. Admins only — the server enforces it.
 */
export default function MoveLeadsModal({ leadIds, onClose, onDone }) {
    const [owners, setOwners] = useState([]);
    const [ownerId, setOwnerId] = useState("");
    const [preview, setPreview] = useState(null);
    const [reason, setReason] = useState("");
    const [rebalance, setRebalance] = useState(false);
    const [busy, setBusy] = useState(false);
    // Several leads: give them all to one person, or split them evenly between several
    const [split, setSplit] = useState(false);
    const [splitIds, setSplitIds] = useState([]);

    useEffect(() => {
        crmService
            .owners()
            .then(({ data }) => setOwners(data.data ?? []))
            .catch(() => {});
    }, []);

    const pickOwner = async (id) => {
        setOwnerId(id);
        setPreview(null);
        if (!id) return;
        try {
            const { data } = await crmService.previewMove({ lead_ids: leadIds, owner_id: Number(id) });
            setPreview(data.data);
        } catch (err) {
            toast.error(apiMessage(err, "Could not prepare the preview"));
        }
    };

    const confirm = async () => {
        if (preview?.needs_reason && !reason.trim()) return toast.error("Give a reason for the transfer");
        setBusy(true);
        try {
            const { data } = await crmService.move({
                lead_ids: leadIds,
                owner_id: Number(ownerId),
                reason: reason.trim() || undefined,
                ...(rebalance && { mode: "rebalance" }),
            });
            toast.success(data.message || "Leads moved");
            onDone();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not move the leads"));
        } finally {
            setBusy(false);
        }
    };

    const ownerNote = (o) =>
        o.role !== "consultant"
            ? " (Admin)"
            : o.on_leave
              ? " (on leave)"
              : o.accepting_leads === 0
                ? " (paused)"
                : "";

    const confirmSplit = async () => {
        if (splitIds.length < 2) return toast.error("Choose at least two people");
        setBusy(true);
        try {
            const { data } = await crmService.move({
                lead_ids: leadIds,
                owner_ids: splitIds.map(Number),
                reason: reason.trim() || undefined,
                ...(rebalance && { mode: "rebalance" }),
            });
            const per = data.data?.per_owner ?? [];
            toast.success(
                per.length
                    ? per.map((p) => `${p.name}: ${p.moved}`).join(" · ")
                    : data.message || "Leads moved"
            );
            onDone();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not move the leads"));
        } finally {
            setBusy(false);
        }
    };

    const changing = preview?.leads.filter((l) => l.change !== "no_change") ?? [];
    const followUps = changing.reduce((n, l) => n + l.pending_follow_ups, 0);

    return (
        <CrmModal
            title={
                leadIds.length === 1
                    ? "Assign or transfer lead"
                    : `Assign or transfer ${leadIds.length} leads`
            }
            onClose={onClose}
            wide
        >
            {leadIds.length > 1 && (
                <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-0.5" role="tablist">
                    {[
                        [false, "One person"],
                        [true, "Split evenly"],
                    ].map(([v, l]) => (
                        <button
                            key={l}
                            type="button"
                            role="tab"
                            aria-selected={split === v}
                            onClick={() => setSplit(v)}
                            className={`rounded-md px-3 py-1.5 text-small font-semibold ${split === v ? "bg-action text-white" : "text-slate-600"}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            )}

            {split ? (
                <>
                    <p className="mb-2 text-ui text-slate-600">
                        Tick who should share these {leadIds.length} leads. They're dealt out in turn, so each
                        person gets{" "}
                        {splitIds.length >= 2
                            ? `about ${Math.ceil(leadIds.length / splitIds.length)}`
                            : "an equal share"}
                        .
                    </p>
                    <ul className="max-h-[260px] space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                        {owners.map((o) => (
                            <li key={o.id}>
                                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-ui hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={splitIds.includes(o.id)}
                                        onChange={(e) =>
                                            setSplitIds((ids) =>
                                                e.target.checked
                                                    ? [...ids, o.id]
                                                    : ids.filter((x) => x !== o.id)
                                            )
                                        }
                                        className="accent-action"
                                    />
                                    {o.name}
                                    <span
                                        className={
                                            o.on_leave || o.accepting_leads === 0
                                                ? "text-amber-700"
                                                : "text-slate-500"
                                        }
                                    >
                                        {ownerNote(o)}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                    <label className="mt-3 block">
                        <span className="mb-1 block text-ui font-semibold text-slate-700">Reason</span>
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Required if any of these leads already has an owner"
                            className={inputCls}
                        />
                    </label>
                    <label className="mt-3 flex items-center gap-2 text-ui text-slate-700">
                        <input
                            type="checkbox"
                            checked={rebalance}
                            onChange={(e) => setRebalance(e.target.checked)}
                            className="accent-action"
                        />
                        Record this as a workload rebalance
                    </label>
                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={busy || splitIds.length < 2}
                            onClick={confirmSplit}
                            className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-50"
                        >
                            {busy && <Loader2 size={15} className="animate-spin" />}
                            Split {leadIds.length} leads
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <label className="block">
                        <span className="mb-1 block text-ui font-semibold text-slate-700">New owner</span>
                        <select
                            value={ownerId}
                            onChange={(e) => pickOwner(e.target.value)}
                            className={inputCls}
                        >
                            <option value="">Choose a consultant…</option>
                            {owners.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name}
                                    {ownerNote(o)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {ownerId && !preview && (
                        <div className="flex justify-center py-6">
                            <Loader2 className="animate-spin text-slate-500" />
                        </div>
                    )}

                    {preview && (
                        <>
                            {preview.new_owner.warning && (
                                <p className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-ui text-amber-900">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    {preview.new_owner.name} {WARNING[preview.new_owner.warning]}. Manual
                                    assignment still works — this only affects Round Robin.
                                </p>
                            )}
                            <div className="mt-3 max-h-[240px] overflow-y-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-ui">
                                    <thead className="sticky top-0 bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Lead</th>
                                            <th className="px-3 py-2">Change</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {preview.leads.map((l) => (
                                            <tr key={l.id}>
                                                <td className="px-3 py-2">
                                                    {l.name} <StageBadge stage={l.stage} className="ml-1" />
                                                </td>
                                                <td className="px-3 py-2 text-slate-600">
                                                    {l.change === "no_change" ? (
                                                        <span className="text-slate-500">Already theirs</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1">
                                                            {l.current_owner ?? "Unassigned"}{" "}
                                                            <ArrowRight size={12} aria-hidden="true" />{" "}
                                                            {preview.new_owner.name}
                                                            {l.pending_follow_ups > 0 && (
                                                                <span className="text-slate-500">
                                                                    {" "}
                                                                    · {l.pending_follow_ups} follow-up(s)
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-2 text-small text-slate-500">
                                {changing.length} lead{changing.length === 1 ? "" : "s"} will move
                                {followUps
                                    ? ` with ${followUps} pending follow-up${followUps === 1 ? "" : "s"}`
                                    : ""}
                                . Notes and history stay with each lead. Round Robin's turn order isn't
                                affected.
                            </p>
                            {preview.needs_reason && (
                                <label className="mt-3 block">
                                    <span className="mb-1 block text-ui font-semibold text-slate-700">
                                        Reason for the transfer (required)
                                    </span>
                                    <input
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Consultant on leave"
                                        className={inputCls}
                                    />
                                </label>
                            )}
                            {leadIds.length > 1 && (
                                <label className="mt-3 flex items-center gap-2 text-ui text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={rebalance}
                                        onChange={(e) => setRebalance(e.target.checked)}
                                        className="accent-action"
                                    />
                                    Record this as a workload rebalance
                                </label>
                            )}
                        </>
                    )}

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={busy || !preview || !changing.length}
                            onClick={confirm}
                            className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-50"
                        >
                            {busy && <Loader2 size={15} className="animate-spin" />}
                            Confirm
                        </button>
                    </div>
                </>
            )}
        </CrmModal>
    );
}

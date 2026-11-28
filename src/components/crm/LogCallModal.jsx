import { useState } from "react";
import toast from "react-hot-toast";
import { Phone } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { apiMessage, inputCls } from "@/lib/crm";
import { btnPrimary } from "@/lib/newUi";
import { CrmModal } from "./crmShared";

const CALL_OUTCOMES = ["Connected", "No answer", "Busy", "Left voicemail", "Call back later", "Wrong number"];

// "2026-11-28T18:05" in this browser's time, for a datetime-local input
const localNow = () => {
    const d = new Date();
    d.setSeconds(0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
};

/** Log a call with its outcome, direction, time and length (new lead page). */
export default function LogCallModal({ lead, onClose, onSaved }) {
    const [f, setF] = useState({ outcome: "Connected", direction: "outbound", at: localNow(), duration: "", body: "" });
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    const save = async (e) => {
        e.preventDefault();
        const at = new Date(f.at);
        if (!f.at || isNaN(at)) return toast.error("Pick the date and time of the call");
        if (at.getTime() > Date.now() + 60e3) return toast.error("The call time can't be in the future");
        const duration = f.duration === "" ? null : Number(f.duration);
        if (duration != null && !(Number.isInteger(duration) && duration >= 0 && duration <= 600))
            return toast.error("Duration is minutes, 0 to 600");
        setBusy(true);
        try {
            const { data } = await crmService.logActivity(lead.id, {
                type: "call",
                body: f.body.trim() || `${f.outcome} (${f.direction === "inbound" ? "inbound" : "outbound"} call)`,
                outcome: f.outcome,
                direction: f.direction,
                duration_min: duration,
                occurred_at: at.toISOString(),
            });
            toast.success("Call logged");
            onSaved(data.data);
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not log the call"));
        } finally {
            setBusy(false);
        }
    };

    const label = "block text-small font-semibold text-slate-600";
    return (
        <CrmModal title="Log call" onClose={onClose} wide>
            <form onSubmit={save} className="space-y-3">
                {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-action-soft px-3 py-1.5 text-small font-bold text-action-soft-ink hover:bg-action hover:text-white">
                        <Phone size={13} aria-hidden="true" /> Call {lead.phone} on your phone
                    </a>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className={label}>
                        Contacted
                        <input value={lead.name} disabled className={cn(inputCls, "mt-1 bg-slate-50")} />
                    </label>
                    <label className={label}>
                        Call outcome
                        <select value={f.outcome} onChange={set("outcome")} className={cn(inputCls, "mt-1")}>
                            {CALL_OUTCOMES.map((o) => (
                                <option key={o}>{o}</option>
                            ))}
                        </select>
                    </label>
                    <label className={label}>
                        Direction
                        <select value={f.direction} onChange={set("direction")} className={cn(inputCls, "mt-1")}>
                            <option value="outbound">Outbound</option>
                            <option value="inbound">Inbound</option>
                        </select>
                    </label>
                    <label className={cn(label, "sm:col-span-2")}>
                        Date and time
                        <input type="datetime-local" value={f.at} max={localNow()} onChange={set("at")} className={cn(inputCls, "mt-1")} />
                    </label>
                    <label className={label}>
                        Duration (minutes)
                        <input type="number" min="0" max="600" inputMode="numeric" value={f.duration} onChange={set("duration")} placeholder="e.g. 10" className={cn(inputCls, "mt-1")} />
                    </label>
                </div>
                <label className={label}>
                    What was discussed
                    <textarea value={f.body} onChange={set("body")} rows={4} placeholder="Describe the call…" className={cn(inputCls, "mt-1")} autoFocus />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-ui font-semibold">
                        Cancel
                    </button>
                    <button type="submit" disabled={busy} className={btnPrimary}>
                        Log call
                    </button>
                </div>
            </form>
        </CrmModal>
    );
}

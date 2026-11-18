import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2, X } from "lucide-react";

import teamService from "@/services/teamService";
import crmService from "@/services/crmService";
import { apiMessage, inputCls } from "@/lib/crm";
import { cn } from "@/lib/utils";

const TEXT = {
    block: {
        title: (n) => `Block ${n}?`,
        intro: "They'll be signed out everywhere and can't sign in until unblocked. Their history stays.",
        confirm: "Block",
    },
    delete: {
        title: (n) => `Delete ${n}?`,
        intro: "They can't sign in again and disappear from the team, pickers and Round Robin. Their name stays on past activity and reports. This can't be undone from the app.",
        confirm: "Delete",
    },
    handover: {
        title: (n) => `Hand over ${n}'s work`,
        intro: "Move their open leads and exams to someone else. Closed leads keep their owner for history.",
        confirm: "Hand over",
    },
};

function Choice({ name, value, current, onChange, children, disabled }) {
    return (
        <label
            className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-ui",
                current === value ? "border-action bg-action-soft" : "border-slate-200",
                disabled && "cursor-not-allowed opacity-50"
            )}
        >
            <input
                type="radio"
                name={name}
                value={value}
                checked={current === value}
                onChange={() => onChange(value)}
                disabled={disabled}
                className="mt-1 accent-action"
            />
            <span className="min-w-0 flex-1">{children}</span>
        </label>
    );
}

/**
 * Block, delete or hand over a team member, moving their open leads (to a
 * person, Round Robin or the unassigned queue) and open exams (to another
 * coordinator or none) first. Deleting requires everything to be handed over.
 */
export default function HandoverDialog({ member, purpose, onClose, onDone }) {
    const t = TEXT[purpose];
    const [info, setInfo] = useState(null);
    const [owners, setOwners] = useState([]);
    const [coordinators, setCoordinators] = useState([]);
    const [ownerMode, setOwnerMode] = useState(purpose === "block" ? "keep" : "owner");
    const [ownerId, setOwnerId] = useState("");
    const [coordMode, setCoordMode] = useState(purpose === "block" ? "keep" : "coordinator");
    const [coordId, setCoordId] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        teamService
            .handoverInfo(member.id)
            .then(({ data }) => setInfo(data.data))
            .catch((err) => {
                toast.error(apiMessage(err, "Could not load their leads"));
                onClose();
            });
        crmService
            .owners()
            .then(({ data }) => setOwners((data.data ?? []).filter((o) => o.id !== member.id)))
            .catch(() => {});
        crmService
            .examCoordinators()
            .then(({ data }) => setCoordinators((data.data ?? []).filter((c) => c.id !== member.id)))
            .catch(() => {});
    }, [member.id, onClose]);

    const hasLeads = info?.open_leads > 0;
    const hasExams = info?.open_exams > 0;
    const handover = {
        owner_mode: hasLeads ? ownerMode : "keep",
        ...(hasLeads && ownerMode === "owner" && { owner_id: Number(ownerId) }),
        coordinator_mode: hasExams ? coordMode : "keep",
        ...(hasExams && coordMode === "coordinator" && { coordinator_id: Number(coordId) }),
    };
    const moving = handover.owner_mode !== "keep" || handover.coordinator_mode !== "keep";
    const ready =
        info &&
        (!hasLeads || ownerMode !== "owner" || ownerId) &&
        (!hasExams || coordMode !== "coordinator" || coordId) &&
        (purpose !== "delete" || email.trim().toLowerCase() === String(member.email).toLowerCase()) &&
        (purpose !== "handover" || moving);

    const submit = async (e) => {
        e.preventDefault();
        if (!ready) return;
        setBusy(true);
        try {
            if (purpose === "delete") {
                await teamService.remove(member.id, {
                    confirm_email: email.trim(),
                    ...(moving && { handover }),
                });
                toast.success(`${member.name} deleted`);
            } else {
                if (moving) {
                    const { data } = await teamService.handover(member.id, handover);
                    const r = data.data;
                    const parts = [
                        r.leads_moved && `${r.leads_moved} leads moved`,
                        r.leads_round_robin && `${r.leads_round_robin} shared by Round Robin`,
                        r.leads_waiting && `${r.leads_waiting} waiting in the unassigned queue`,
                        r.leads_unassigned && `${r.leads_unassigned} left unassigned`,
                        r.exams_moved && `${r.exams_moved} exams moved`,
                    ].filter(Boolean);
                    if (parts.length) toast.success(parts.join(" · "));
                }
                if (purpose === "block") {
                    await teamService.setStatus(member.id, false);
                    toast.success(`${member.name} blocked`);
                }
            }
            onDone();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "That didn't work. Please try again."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-label={t.title(member.name)}
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-h3 font-bold text-slate-900">{t.title(member.name)}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-slate-500 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>
                <p className="text-ui text-slate-600">{t.intro}</p>

                {!info ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-slate-500" />
                    </div>
                ) : (
                    <>
                        {!hasLeads && !hasExams && (
                            <p className="rounded-lg bg-slate-50 px-3 py-2 text-ui text-slate-600">
                                They have no open leads or exams to hand over.
                            </p>
                        )}

                        {hasLeads && (
                            <fieldset className="space-y-1.5">
                                <legend className="mb-1.5 text-ui font-semibold text-slate-800">
                                    {info.open_leads} open lead{info.open_leads === 1 ? "" : "s"}
                                    {info.closed_leads > 0 && (
                                        <span className="font-normal text-slate-500">
                                            {" "}
                                            (+{info.closed_leads} closed, they stay for history)
                                        </span>
                                    )}
                                </legend>
                                <Choice
                                    name="owner"
                                    value="owner"
                                    current={ownerMode}
                                    onChange={setOwnerMode}
                                >
                                    Give them all to
                                    <select
                                        value={ownerId}
                                        onChange={(e) => {
                                            setOwnerId(e.target.value);
                                            setOwnerMode("owner");
                                        }}
                                        aria-label="New owner"
                                        className={cn(inputCls, "mt-1.5")}
                                    >
                                        <option value="">Choose a person…</option>
                                        {owners.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.name}
                                                {o.role !== "consultant"
                                                    ? " (Admin)"
                                                    : o.on_leave
                                                      ? " (on leave)"
                                                      : o.accepting_leads === 0
                                                        ? " (paused)"
                                                        : ""}
                                            </option>
                                        ))}
                                    </select>
                                </Choice>
                                <Choice
                                    name="owner"
                                    value="round_robin"
                                    current={ownerMode}
                                    onChange={setOwnerMode}
                                    disabled={!info.round_robin_enabled}
                                >
                                    Share them out by Round Robin
                                    <span className="block text-small text-slate-500">
                                        {info.round_robin_enabled
                                            ? "Skips people on leave or paused. Anything no one can take waits in the unassigned queue."
                                            : "Round Robin is off (Admin → Distribution)."}
                                    </span>
                                </Choice>
                                <Choice
                                    name="owner"
                                    value="unassigned"
                                    current={ownerMode}
                                    onChange={setOwnerMode}
                                >
                                    Put them in the unassigned queue
                                    <span className="block text-small text-slate-500">
                                        Assign them later from Admin → Leads.
                                    </span>
                                </Choice>
                                {purpose === "block" && (
                                    <Choice
                                        name="owner"
                                        value="keep"
                                        current={ownerMode}
                                        onChange={setOwnerMode}
                                    >
                                        Keep them with {member.name} for now
                                    </Choice>
                                )}
                            </fieldset>
                        )}

                        {hasExams && (
                            <fieldset className="space-y-1.5">
                                <legend className="mb-1.5 text-ui font-semibold text-slate-800">
                                    {info.open_exams} open exam{info.open_exams === 1 ? "" : "s"} they
                                    coordinate
                                </legend>
                                <Choice
                                    name="coord"
                                    value="coordinator"
                                    current={coordMode}
                                    onChange={setCoordMode}
                                >
                                    Give them to
                                    <select
                                        value={coordId}
                                        onChange={(e) => {
                                            setCoordId(e.target.value);
                                            setCoordMode("coordinator");
                                        }}
                                        aria-label="New exam coordinator"
                                        className={cn(inputCls, "mt-1.5")}
                                    >
                                        <option value="">Choose a coordinator…</option>
                                        {coordinators.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                                {c.open_exams ? ` (${c.open_exams} open)` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </Choice>
                                <Choice
                                    name="coord"
                                    value="unassigned"
                                    current={coordMode}
                                    onChange={setCoordMode}
                                >
                                    Remove the coordinator (the consultant can pick a new one)
                                </Choice>
                                {purpose === "block" && (
                                    <Choice
                                        name="coord"
                                        value="keep"
                                        current={coordMode}
                                        onChange={setCoordMode}
                                    >
                                        Keep them with {member.name} for now
                                    </Choice>
                                )}
                            </fieldset>
                        )}

                        {purpose === "delete" && (
                            <label className="block">
                                <span className="mb-1 flex items-center gap-1.5 text-ui font-semibold text-red-700">
                                    <AlertTriangle size={14} aria-hidden="true" /> Type their email to confirm
                                </span>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={member.email}
                                    autoComplete="off"
                                    className={inputCls}
                                />
                            </label>
                        )}
                    </>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy || !ready}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-ui font-bold text-white disabled:opacity-50",
                            purpose === "handover"
                                ? "bg-action hover:bg-action-hover"
                                : "bg-red-600 hover:bg-red-700"
                        )}
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />} {t.confirm}
                    </button>
                </div>
            </form>
        </div>
    );
}

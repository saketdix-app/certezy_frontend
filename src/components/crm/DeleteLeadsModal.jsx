import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import crmService from "@/services/crmService";
import { apiMessage, inputCls } from "@/lib/crm";
import { CrmModal } from "./crmShared";

/** Super Admin: delete one or more leads for good, after re-entering the password. */
export default function DeleteLeadsModal({ leadIds, names = [], onClose, onDeleted }) {
    const [password, setPassword] = useState("");
    const [typed, setTyped] = useState("");
    const [busy, setBusy] = useState(false);
    const n = leadIds.length;
    const many = n > 1;
    const confirmWord = "DELETE";

    const submit = async (e) => {
        e.preventDefault();
        if (!password) return toast.error("Enter your password");
        if (many && typed.trim().toUpperCase() !== confirmWord) return toast.error(`Type ${confirmWord} to confirm`);
        setBusy(true);
        try {
            const { data } = await crmService.deleteLeads(leadIds, password);
            toast.success(data?.message || (many ? `${n} leads deleted` : "Lead deleted"));
            onDeleted?.(data?.data?.ids ?? leadIds);
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not delete"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <CrmModal title={many ? `Delete ${n} leads?` : `Delete ${names[0] ?? "this lead"}?`} onClose={onClose}>
            <form onSubmit={submit}>
                <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-ui text-red-900">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                        This permanently deletes {many ? `these ${n} leads` : "the lead"} with {many ? "their" : "its"} notes, calls, follow-ups and
                        WhatsApp messages. It can&rsquo;t be undone. Payments, enrollments and certificates are kept. The audit log records it.
                    </span>
                </div>
                {many && names.length > 0 && (
                    <p className="mt-3 line-clamp-3 text-small text-slate-500">
                        {names.slice(0, 8).join(", ")}
                        {n > 8 ? ` and ${n - 8} more` : ""}
                    </p>
                )}
                {many && (
                    <label className="mt-4 block text-ui font-semibold text-slate-700">
                        Type <b>{confirmWord}</b> to confirm
                        <input value={typed} onChange={(e) => setTyped(e.target.value)} className={`${inputCls} mt-1`} autoComplete="off" />
                    </label>
                )}
                <label className="mt-4 block text-ui font-semibold text-slate-700">
                    Your password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        autoFocus={!many}
                        className={`${inputCls} mt-1`}
                    />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy || !password || (many && typed.trim().toUpperCase() !== confirmWord)}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-ui font-bold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} aria-hidden="true" />}
                        {many ? `Delete ${n} leads` : "Delete lead"}
                    </button>
                </div>
            </form>
        </CrmModal>
    );
}

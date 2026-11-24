import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, Mail, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import crmService from "@/services/crmService";
import { selectUser } from "@/features/auth/authSlice";
import { apiMessage, inputCls } from "@/lib/crm";
import { cn } from "@/lib/utils";
import { CrmModal } from "./crmShared";
import { PLACEHOLDERS, STARTERS, fillTemplate, whatsappNumberOf } from "@/lib/leadMessages";

function TemplateForm({ channel, initial, isAdmin, onSaved, onCancel }) {
    const [f, setF] = useState({ title: initial?.title ?? "", subject: initial?.subject ?? "", body: initial?.body ?? STARTERS[channel], shared: false });
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
    const save = async () => {
        if (f.title.trim().length < 2) return toast.error("Give the message a name");
        if (f.body.trim().length < 2) return toast.error("Write the message");
        setBusy(true);
        try {
            const body = { channel, title: f.title.trim(), subject: f.subject.trim() || null, body: f.body.trim(), ...(isAdmin && !initial && { shared: f.shared }) };
            if (initial) await crmService.updateTemplate(initial.id, body);
            else await crmService.createTemplate(body);
            toast.success("Message saved");
            onSaved();
        } catch (err) {
            toast.error(apiMessage(err, "Could not save"));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input value={f.title} onChange={set("title")} placeholder="Name, e.g. First contact" aria-label="Message name" className={inputCls} />
            {channel === "email" && <input value={f.subject} onChange={set("subject")} placeholder="Email subject" aria-label="Email subject" className={inputCls} />}
            <textarea value={f.body} onChange={set("body")} rows={5} aria-label="Message" className={cn(inputCls, "resize-y")} />
            <p className="text-small text-slate-500">
                Fill-ins: {PLACEHOLDERS.map(([k, l]) => (
                    <span key={k} title={l} className="mr-1.5 inline-block rounded bg-white px-1.5 font-mono text-[12px] text-slate-700 ring-1 ring-slate-200">
                        {k}
                    </span>
                ))}
            </p>
            {isAdmin && !initial && (
                <label className="flex items-center gap-2 text-small text-slate-600">
                    <input type="checkbox" checked={f.shared} onChange={set("shared")} className="accent-action" /> Share with the whole team
                </label>
            )}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold">
                    Cancel
                </button>
                <button type="button" disabled={busy} onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60">
                    {busy && <Loader2 size={13} className="animate-spin" />} Save message
                </button>
            </div>
        </div>
    );
}

/**
 * WhatsApp or email to a lead: pick a saved message (yours or the team's), the
 * lead's details are filled in, edit if needed, then open WhatsApp / your email
 * app with it ready to send. Saved messages can be added, edited and deleted here.
 */
export default function MessageComposer({ lead, channel, onClose, onLogged }) {
    const me = useSelector(selectUser);
    const isAdmin = ["admin", "super_admin"].includes(me?.role);
    const [templates, setTemplates] = useState(null);
    const [pick, setPick] = useState("");
    const [text, setText] = useState(fillTemplate(STARTERS[channel], lead, me));
    const [subject, setSubject] = useState(fillTemplate("About {course} — CERTEZY", lead, me));
    const [editing, setEditing] = useState(null); // null | "new" | template

    const load = () =>
        crmService
            .templates()
            .then(({ data }) => setTemplates((data?.data ?? []).filter((t) => t.channel === channel)))
            .catch(() => setTemplates([]));
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channel]);

    const choose = (id) => {
        setPick(id);
        const t = templates?.find((x) => String(x.id) === String(id));
        if (!t) return;
        setText(fillTemplate(t.body, lead, me));
        if (t.subject) setSubject(fillTemplate(t.subject, lead, me));
    };
    const remove = async (t) => {
        if (!window.confirm(`Delete "${t.title}"?`)) return;
        try {
            await crmService.deleteTemplate(t.id);
            if (String(pick) === String(t.id)) setPick("");
            load();
        } catch (err) {
            toast.error(apiMessage(err, "Could not delete"));
        }
    };

    const number = whatsappNumberOf(lead);
    const href = useMemo(
        () =>
            channel === "whatsapp"
                ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
                : `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
        [channel, number, text, subject, lead.email]
    );
    const isWa = channel === "whatsapp";

    return (
        <CrmModal title={isWa ? `WhatsApp ${lead.name}` : `Email ${lead.name}`} onClose={onClose} wide>
            <p className="mb-3 text-small text-slate-500">
                {isWa ? (
                    <>
                        To <b className="text-slate-800">+{number}</b>
                        {lead.whatsapp_number ? " (WhatsApp number)" : " (phone)"}
                    </>
                ) : (
                    <>
                        To <b className="text-slate-800">{lead.email}</b>
                    </>
                )}
            </p>

            <label className="mb-1 block text-small font-semibold text-slate-600">Saved message</label>
            <div className="mb-3 flex gap-2">
                <select value={pick} onChange={(e) => choose(e.target.value)} className={cn(inputCls, "flex-1")} aria-label="Saved message">
                    <option value="">{templates === null ? "Loading…" : templates.length ? "Choose a saved message…" : "No saved messages yet"}</option>
                    {(templates ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.title}
                            {t.shared ? " (team)" : ""}
                        </option>
                    ))}
                </select>
                <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 text-small font-semibold text-slate-700 hover:bg-slate-50">
                    <Plus size={14} aria-hidden="true" /> New
                </button>
            </div>

            {editing && (
                <div className="mb-3">
                    <TemplateForm
                        channel={channel}
                        initial={editing === "new" ? null : editing}
                        isAdmin={isAdmin}
                        onCancel={() => setEditing(null)}
                        onSaved={() => {
                            setEditing(null);
                            load();
                        }}
                    />
                </div>
            )}

            {!isWa && (
                <label className="mb-2 block text-small font-semibold text-slate-600">
                    Subject
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} className={cn(inputCls, "mt-1")} />
                </label>
            )}
            <label className="block text-small font-semibold text-slate-600">
                Message (edit before sending if you like)
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={isWa ? 5 : 8} className={cn(inputCls, "mt-1 resize-y")} />
            </label>

            {(templates ?? []).some((t) => t.can_edit) && (
                <details className="mt-3">
                    <summary className="cursor-pointer text-small font-semibold text-action">Manage saved messages</summary>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {templates
                            .filter((t) => t.can_edit)
                            .map((t) => (
                                <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-ui">
                                    <span className="min-w-0 truncate">
                                        {t.title}
                                        {t.shared && <span className="ml-1.5 text-small text-slate-500">(team)</span>}
                                    </span>
                                    <span className="flex shrink-0 gap-1">
                                        <button type="button" onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`} className="rounded p-1.5 text-slate-600 hover:bg-slate-100">
                                            <Pencil size={14} />
                                        </button>
                                        <button type="button" onClick={() => remove(t)} aria-label={`Delete ${t.title}`} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                                            <Trash2 size={14} />
                                        </button>
                                    </span>
                                </li>
                            ))}
                    </ul>
                </details>
            )}

            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                    Cancel
                </button>
                <a
                    href={href}
                    target={isWa ? "_blank" : undefined}
                    rel="noreferrer"
                    onClick={() => {
                        // Recorded in the lead's history (we can't see whether it was then sent)
                        const what = isWa ? "WhatsApp" : "Email";
                        const body = `${what} opened from the CRM${!isWa && subject.trim() ? ` · ${subject.trim()}` : ""}${text.trim() ? `:\n${text.trim()}` : ""}`.slice(0, 5000);
                        crmService
                            .logActivity(lead.id, { type: isWa ? "whatsapp" : "email", body })
                            .then(() => onLogged?.())
                            .catch(() => {});
                        setTimeout(onClose, 300);
                    }}
                    className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-ui font-bold text-white",
                        isWa ? "bg-[#0F7A42] hover:bg-[#0c6636]" : "bg-[#B45309] hover:bg-[#92400e]"
                    )}
                >
                    {isWa ? <MessageCircle size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
                    {isWa ? "Open in WhatsApp" : "Open in email"}
                </a>
            </div>
        </CrmModal>
    );
}

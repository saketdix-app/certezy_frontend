import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Check, CheckCheck, Loader2, MessageCircle, Send } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { apiMessage, fmtDateTime, inputCls } from "@/lib/crm";

/**
 * WhatsApp conversation on a lead (2.0 phase 8). Free text only within 24 h
 * of their last message (WhatsApp's rule); otherwise an approved template.
 */
export default function LeadWhatsApp({ leadId, onSent }) {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState(null);
    const [templates, setTemplates] = useState(null);
    const [text, setText] = useState("");
    const [tpl, setTpl] = useState("");
    const [params, setParams] = useState([]);
    const [busy, setBusy] = useState(false);
    const endRef = useRef(null);

    const load = useCallback(
        () =>
            crmService
                .whatsappThread(leadId)
                .then(({ data: res }) => setData(res.data))
                .catch(() => setData({ messages: [], window_open: false, unavailable: true })),
        [leadId]
    );
    useEffect(() => {
        if (!open) return;
        load();
        crmService.whatsappTemplates().then(({ data: res }) => setTemplates(res.data ?? [])).catch(() => setTemplates([]));
    }, [open, load]);
    useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [data]);

    const template = templates?.find((t) => `${t.name}|${t.language}` === tpl);
    const send = async () => {
        setBusy(true);
        try {
            const body = data.window_open && text.trim() ? { text: text.trim() } : { template: template?.name, language: template?.language, params };
            if (!body.text && !body.template) return toast.error(data.window_open ? "Write a message" : "Choose a template");
            const { data: res } = await crmService.whatsappSend(leadId, body);
            setData(res.data);
            setText("");
            setTpl("");
            setParams([]);
            onSent?.();
        } catch (err) {
            toast.error(apiMessage(err, "Could not send on WhatsApp"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <section>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between text-[13px] font-bold uppercase tracking-wide text-slate-500"
            >
                <span className="inline-flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-emerald-600" aria-hidden="true" /> WhatsApp conversation
                </span>
                <span className="text-[12px] font-semibold normal-case text-action">{open ? "Hide" : "Show"}</span>
            </button>

            {open && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-[#F7F5F0]">
                    {!data ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="animate-spin text-slate-500" />
                        </div>
                    ) : (
                        <>
                            <div className="max-h-72 space-y-1.5 overflow-y-auto p-3">
                                {!data.messages.length && <p className="py-4 text-center text-[12.5px] text-slate-500">No WhatsApp messages yet.</p>}
                                {data.messages.map((m) => (
                                    <div key={m.id} className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}>
                                        <div
                                            className={cn(
                                                "max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13px] shadow-sm",
                                                m.direction === "out" ? "bg-[#DCF8C6] text-slate-800" : "bg-white text-slate-800"
                                            )}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                            <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-slate-500">
                                                {m.direction === "out" && m.sent_by_name && <span>{m.sent_by_name} ·</span>}
                                                {fmtDateTime(m.created_at)}
                                                {m.direction === "out" &&
                                                    (m.status === "read" ? (
                                                        <CheckCheck size={12} className="text-sky-500" aria-label="Read" />
                                                    ) : m.status === "delivered" ? (
                                                        <CheckCheck size={12} aria-label="Delivered" />
                                                    ) : m.status === "failed" ? (
                                                        <span className="text-red-600">failed{m.error ? `: ${m.error}` : ""}</span>
                                                    ) : (
                                                        <Check size={12} aria-label="Sent" />
                                                    ))}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={endRef} />
                            </div>

                            <div className="border-t border-slate-200 bg-white p-2.5">
                                {data.unavailable ? (
                                    <p className="text-[12.5px] text-slate-500">WhatsApp isn't connected yet (Admin → Integrations).</p>
                                ) : data.window_open ? (
                                    <div className="flex gap-2">
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            rows={2}
                                            placeholder="Type a message…"
                                            className={cn(inputCls, "resize-none")}
                                            aria-label="WhatsApp message"
                                        />
                                        <button
                                            type="button"
                                            disabled={busy || !text.trim()}
                                            onClick={send}
                                            aria-label="Send"
                                            className="self-end rounded-lg bg-emerald-600 p-2.5 text-white disabled:opacity-50"
                                        >
                                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-[12px] text-slate-500">
                                            They haven't written in the last 24 hours, so WhatsApp only allows an approved template.
                                        </p>
                                        <select
                                            value={tpl}
                                            onChange={(e) => {
                                                setTpl(e.target.value);
                                                const t = templates?.find((x) => `${x.name}|${x.language}` === e.target.value);
                                                setParams(Array.from({ length: t?.params ?? 0 }, () => ""));
                                            }}
                                            className={inputCls}
                                            aria-label="Template"
                                        >
                                            <option value="">{templates === null ? "Loading templates…" : templates.length ? "Choose a template…" : "No approved templates yet"}</option>
                                            {(templates ?? []).map((t) => (
                                                <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>
                                                    {t.name} ({t.language})
                                                </option>
                                            ))}
                                        </select>
                                        {template && <p className="rounded bg-slate-50 px-2 py-1.5 text-[12px] text-slate-600">{template.body}</p>}
                                        {params.map((p, i) => (
                                            <input
                                                key={i}
                                                value={p}
                                                onChange={(e) => setParams((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
                                                placeholder={`{{${i + 1}}}`}
                                                className={inputCls}
                                            />
                                        ))}
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                disabled={busy || !template}
                                                onClick={send}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50"
                                            >
                                                {busy && <Loader2 size={13} className="animate-spin" />} Send template
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}

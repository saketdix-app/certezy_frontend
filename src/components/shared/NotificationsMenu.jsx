import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";

import notificationService from "@/services/notificationService";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

/** Bell with unread count; opens the latest notifications (new leads, waiting leads…). */
export default function NotificationsMenu({ className }) {
    const [data, setData] = useState({ items: [], unread: 0 });
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const ref = useRef(null);

    const load = useCallback(
        () =>
            notificationService
                .list()
                .then(({ data: res }) => setData(res.data))
                .catch(() => {}),
        []
    );
    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);
    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const openItem = async (n) => {
        setOpen(false);
        if (!n.read_at) await notificationService.markRead(n.id).catch(() => {});
        load();
        if (n.link) navigate(n.link);
    };

    return (
        <div ref={ref} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ""}`}
                className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            >
                <Bell size={16} />
                {data.unread > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10.5px] font-bold leading-[18px] text-white">
                        {data.unread > 9 ? "9+" : data.unread}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 z-50 mt-2 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                        <p className="text-[14px] font-bold text-slate-900">Notifications</p>
                        {data.unread > 0 && (
                            <button
                                type="button"
                                onClick={() => notificationService.markRead().then(load)}
                                className="text-[12px] font-semibold text-[#3282B8]"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <ul className="max-h-[360px] overflow-y-auto">
                        {!data.items.length && <li className="px-4 py-6 text-center text-[13px] text-slate-500">You're all caught up.</li>}
                        {data.items.map((n) => (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => openItem(n)}
                                    className={cn("block w-full px-4 py-2.5 text-left hover:bg-slate-50", !n.read_at && "bg-[#F5FAFF]")}
                                >
                                    <p className="text-[13px] font-semibold text-slate-900">{n.title}</p>
                                    {n.body && <p className="text-[12px] text-slate-500">{n.body}</p>}
                                    <p className="mt-0.5 text-[11px] text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

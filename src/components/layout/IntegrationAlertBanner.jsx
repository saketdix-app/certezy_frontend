import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X, XCircle } from "lucide-react";

import integrationService from "@/services/integrationService";
import { cn } from "@/lib/utils";

const CHECK_EVERY_MS = 30 * 60 * 1000;
const today = () => new Date().toISOString().slice(0, 10);
const hiddenKey = (a) => `integration-alert:${a.source}:${a.level}:${today()}`;
const isHidden = (a) => {
    try {
        return sessionStorage.getItem(hiddenKey(a)) === "1";
    } catch {
        return false;
    }
};

/**
 * Top-of-portal warning for Admins: a Facebook / LinkedIn connection has
 * stopped working or ends within 7 days (from GET /integrations/alerts).
 * Warnings can be hidden for the day; they come back the next day.
 */
export default function IntegrationAlertBanner() {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        let alive = true;
        const check = () =>
            integrationService
                .alerts()
                .then(({ data: res }) => alive && setAlerts(Array.isArray(res?.data) ? res.data.filter((a) => !isHidden(a)) : []))
                .catch(() => {}); // a failed check never blocks the portal
        check();
        const t = setInterval(check, CHECK_EVERY_MS);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);

    const hide = (a) => {
        try {
            sessionStorage.setItem(hiddenKey(a), "1");
        } catch {
            /* fine */
        }
        setAlerts((list) => list.filter((x) => x !== a));
    };

    if (!alerts.length) return null;
    return (
        <div className="space-y-px">
            {alerts.map((a) => {
                const error = a.level === "error";
                const Icon = error ? XCircle : AlertTriangle;
                return (
                    <div
                        key={`${a.source}-${a.level}`}
                        role={error ? "alert" : "status"}
                        className={cn(
                            "flex items-start gap-2.5 px-4 py-2.5 text-[13px] lg:px-6",
                            error ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"
                        )}
                    >
                        <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <p className="min-w-0 flex-1">
                            {a.message}{" "}
                            <Link to="/admin/integrations" className="font-bold underline underline-offset-2">
                                Open Integrations
                            </Link>
                        </p>
                        {!error && (
                            <button type="button" onClick={() => hide(a)} aria-label="Hide for today" title="Hide for today" className="rounded p-0.5 opacity-70 hover:opacity-100">
                                <X size={15} />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

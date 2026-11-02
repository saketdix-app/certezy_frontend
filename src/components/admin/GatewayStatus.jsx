import { useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from "lucide-react";
import paymentService from "@/services/paymentService";

/**
 * Admin: checks the server's Razorpay and PayPal keys against the gateways
 * (no money moves) and shows test / live mode and what to fix.
 */
function Row({ name, g, extra }) {
    return (
        <div
            className={`rounded-xl border p-4 ${g.ok ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}
        >
            <div className="flex items-center gap-2">
                {g.ok ? (
                    <ShieldCheck size={18} className="text-emerald-600" />
                ) : (
                    <ShieldAlert size={18} className="text-rose-600" />
                )}
                <p className="text-[14px] font-bold text-slate-900">{name}</p>
                {g.mode && (
                    <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                            g.mode === "live"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                        }`}
                    >
                        {g.mode}
                    </span>
                )}
            </div>
            <p className={`mt-1.5 text-[12.5px] ${g.ok ? "text-emerald-800" : "text-rose-700"}`}>
                {g.ok ? "Keys accepted by the gateway." : g.error}
            </p>
            {extra}
        </div>
    );
}

export default function GatewayStatus() {
    const [state, setState] = useState({ loading: false, data: null, error: null });

    const run = async () => {
        setState({ loading: true, data: null, error: null });
        try {
            const res = await paymentService.checkGateways();
            setState({ loading: false, data: res.data?.data, error: null });
        } catch (err) {
            setState({ loading: false, data: null, error: err.response?.data?.message || "Check failed" });
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[15px] font-bold text-slate-900">Payment gateways</p>
                    <p className="text-[12.5px] text-slate-500">
                        Checks the server's Razorpay and PayPal keys — no payment is made.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={run}
                    disabled={state.loading}
                    className="flex items-center gap-2 rounded-xl bg-[#3282B8] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                >
                    {state.loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Check gateways
                </button>
            </div>

            {state.error && <p className="mt-3 text-[13px] text-rose-600">{state.error}</p>}
            {state.data && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Row
                        name="Razorpay (INR)"
                        g={state.data.razorpay}
                        extra={
                            !state.data.razorpay.webhook_secret_set && (
                                <p className="mt-1 text-[12px] text-amber-700">
                                    Webhook secret not set — payments still work, but set it so a payment is
                                    recorded even if the student closes the page.
                                </p>
                            )
                        }
                    />
                    <Row
                        name="PayPal (USD)"
                        g={state.data.paypal}
                        extra={
                            <p className="mt-1 text-[12px] text-slate-500 break-all">
                                Return page: {state.data.paypal_return_url}
                            </p>
                        }
                    />
                </div>
            )}
        </div>
    );
}

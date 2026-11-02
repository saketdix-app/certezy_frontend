import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import paymentService from "@/services/paymentService";

/**
 * /payment/paypal/return and /payment/paypal/cancel — where PayPal sends the
 * payer back (return_url / cancel_url set by the API).
 *
 * In the checkout popup: tell the checkout tab the result and close.
 * Without an opener (mobile / popup became a tab): finish the payment here,
 * using the pending order saved by checkout, then open the course.
 */
export default function PaypalReturnPage() {
    const { outcome } = useParams(); // "return" | "cancel"
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const approved = outcome === "return";
    const [state, setState] = useState({ phase: "working", message: "" });

    useEffect(() => {
        const opener = window.opener && !window.opener.closed ? window.opener : null;
        if (opener) {
            opener.postMessage(
                {
                    source: "certezy-paypal",
                    status: approved ? "approved" : "cancelled",
                    token: params.get("token"),
                },
                window.location.origin
            );
            window.close();
            return;
        }

        let pending = null;
        try {
            pending = JSON.parse(localStorage.getItem("certezy_paypal_pending") || "null");
        } catch {
            /* ignore */
        }
        if (!approved || !pending) {
            navigate(pending ? `/checkout?course=${pending.course_id}` : "/student/my-courses", {
                replace: true,
            });
            return;
        }

        let alive = true;
        paymentService
            .paypalCapture({ payment_id: pending.payment_id, paypal_order_id: pending.paypal_order_id })
            .then(() => {
                try {
                    localStorage.removeItem("certezy_paypal_pending");
                } catch {
                    /* ignore */
                }
                if (!alive) return;
                setState({ phase: "done", message: "" });
                setTimeout(
                    () => navigate(`/student/course/${pending.course_id}/learn`, { replace: true }),
                    1200
                );
            })
            .catch(
                (err) =>
                    alive &&
                    setState({
                        phase: "error",
                        message: err.response?.data?.message || "We couldn't confirm your PayPal payment.",
                    })
            );
        return () => {
            alive = false;
        };
    }, [approved, navigate, params]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                {state.phase === "working" && (
                    <>
                        <Loader2 className="mx-auto animate-spin text-[#2563EB]" size={34} />
                        <p className="mt-4 text-[15px] font-semibold text-slate-800">
                            Finishing your PayPal payment…
                        </p>
                        <p className="mt-1 text-[13px] text-slate-500">Please don't close this window.</p>
                    </>
                )}
                {state.phase === "done" && (
                    <>
                        <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
                        <p className="mt-4 text-[15px] font-semibold text-slate-800">
                            Payment successful — opening your course
                        </p>
                    </>
                )}
                {state.phase === "error" && (
                    <>
                        <XCircle className="mx-auto text-rose-500" size={36} />
                        <p className="mt-4 text-[15px] font-semibold text-slate-800">{state.message}</p>
                        <p className="mt-1 text-[13px] text-slate-500">
                            If money was taken, contact support with your PayPal receipt.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate("/student/payments")}
                            className="mt-5 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[13px] font-bold text-white"
                        >
                            View my payments
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

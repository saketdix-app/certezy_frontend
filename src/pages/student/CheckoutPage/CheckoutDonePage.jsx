import { Link } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";
import { ROUTES } from "@/config/app";

const readDone = () => {
    try {
        return JSON.parse(sessionStorage.getItem("certezy_checkout_done") || "null");
    } catch {
        return null;
    }
};

/** After a guest checkout: the course is in the account — how to get in. */
export default function CheckoutDonePage() {
    const done = readDone();
    const isNew = done?.account !== "existing";
    const learn = done?.course_id ? `/student/course/${done.course_id}/learn` : "/student/my-courses";
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
                <CheckCircle2 className="mx-auto text-emerald-600" size={44} aria-hidden="true" />
                <h1 className="mt-4 text-h2 font-bold text-slate-900">Payment successful</h1>
                {done?.course_title && <p className="mt-1 text-ui text-slate-600">{done.course_title} is yours.</p>}
                {isNew ? (
                    <div className="mt-5 rounded-xl bg-action-soft px-4 py-3.5 text-left text-ui text-action-soft-ink">
                        <p className="flex items-center gap-2 font-semibold">
                            <Mail size={16} aria-hidden="true" /> Check your inbox
                        </p>
                        <p className="mt-1">
                            We've emailed {done?.email ? <b>{done.email}</b> : "you"} a link to set your password. Then sign in to start
                            learning. Your receipt is in a separate email.
                        </p>
                    </div>
                ) : (
                    <p className="mt-5 text-ui text-slate-600">
                        The course has been added to your account{done?.email ? ` (${done.email})` : ""}. Log in to start learning.
                    </p>
                )}
                <div className="mt-6 grid gap-2">
                    <Link
                        to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(learn)}`}
                        className="rounded-[10px] bg-action px-4 py-3 text-ui font-bold text-white hover:bg-action-hover"
                    >
                        {isNew ? "I've set my password — log in" : "Log in to start"}
                    </Link>
                    {isNew && (
                        <p className="text-small text-slate-500">
                            No email after a few minutes? Check spam, or use{" "}
                            <Link to="/forgot-password" className="font-semibold text-action hover:underline">
                                Forgot password
                            </Link>{" "}
                            with the same email.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

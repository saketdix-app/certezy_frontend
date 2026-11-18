import { Link } from "react-router-dom";
import { ROUTES } from "@/config/app";

const field =
    "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-ui text-slate-900 placeholder:text-slate-400 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20";

/**
 * Guest checkout: who the course is for. No password here — after payment we
 * email a link to set one (or, for an existing account, they just log in).
 */
export default function GuestDetails({ guest, setGuest, courseId }) {
    const set = (k) => (e) => setGuest((g) => ({ ...g, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
    const back = `${ROUTES.CHECKOUT}?course=${courseId}`;
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="guest-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="guest-title" className="text-body font-bold text-slate-900">
                    Your details
                </h2>
                <p className="text-small text-slate-500">
                    Have an account?{" "}
                    <Link to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(back)}`} className="font-semibold text-action hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
            <p className="mt-1 text-small text-slate-500">
                No account needed. We'll add the course to this email and send you a link to set your password.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                    <span className="mb-1 block text-small font-semibold text-slate-700">Full name</span>
                    <input autoComplete="name" value={guest.name} onChange={set("name")} className={field} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-small font-semibold text-slate-700">Email</span>
                    <input type="email" autoComplete="email" value={guest.email} onChange={set("email")} className={field} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-small font-semibold text-slate-700">
                        Phone <span className="font-normal text-slate-500">(optional)</span>
                    </span>
                    <input type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={guest.phone} onChange={set("phone")} className={field} />
                </label>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-small leading-relaxed text-slate-600">
                <input type="checkbox" checked={guest.consent} onChange={set("consent")} className="mt-0.5 h-4 w-4 shrink-0 accent-action" />
                <span>
                    I agree to the{" "}
                    <Link to={ROUTES.TERMS} target="_blank" className="font-semibold text-action underline">
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to={ROUTES.PRIVACY} target="_blank" className="font-semibold text-action underline">
                        Privacy Policy
                    </Link>
                    , and that CERTEZY may contact me about my purchase.
                </span>
            </label>
        </section>
    );
}

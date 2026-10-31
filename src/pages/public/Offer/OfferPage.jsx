import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Tag, Clock, Loader2, ShieldCheck, AlertCircle, Mail } from "lucide-react";
import discountService from "@/services/discountService";
import { selectIsLoggedIn, selectUser } from "@/features/auth/authSlice";
import CourseThumbnail from "@/components/shared/CourseThumbnail";

/**
 * /offer/:token — landing page for discount links sent by email.
 * Shows the course and the offer; the recipient signs up / signs in with the
 * email the offer was sent to and continues to checkout with the discount.
 */

const money = (v) => `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function OfferPage() {
    const { token } = useParams();
    const isLoggedIn = useSelector(selectIsLoggedIn);
    const user = useSelector(selectUser);
    const [state, setState] = useState({ token: null, offer: null, error: null });

    useEffect(() => {
        let alive = true;
        discountService
            .getOffer(token)
            .then((res) => alive && setState({ token, offer: res.data?.data, error: null }))
            .catch(
                (err) =>
                    alive &&
                    setState({
                        token,
                        offer: null,
                        error: err.response?.data?.message || "This offer link is not valid.",
                    })
            );
        return () => {
            alive = false;
        };
    }, [token]);

    const loading = state.token !== token;
    const { offer, error } = state;

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center gap-2 text-slate-500 text-[14px]">
                <Loader2 size={18} className="animate-spin" /> Loading your offer…
            </div>
        );
    }

    if (error || !offer) {
        return (
            <OfferShell>
                <div className="flex gap-4 rounded-2xl border border-rose-200 bg-white p-6">
                    <AlertCircle className="text-rose-500 shrink-0" size={26} />
                    <div>
                        <p className="text-[16px] font-bold text-slate-900">Offer not found</p>
                        <p className="mt-1 text-[14px] text-slate-500">{error}</p>
                        <Link to="/courses" className="mt-4 inline-block text-[14px] font-bold text-primary">
                            Browse courses →
                        </Link>
                    </div>
                </div>
            </OfferShell>
        );
    }

    const checkoutUrl = `/checkout?course=${offer.course.id}&discount=${token}`;
    const authQuery = (extra = {}) => new URLSearchParams({ redirect: checkoutUrl, ...extra }).toString();
    const savings = Number(offer.original_price) - Number(offer.discount_price);
    const inactive = offer.status !== "active";

    return (
        <OfferShell>
            <div className="overflow-hidden rounded-2xl border border-[#DBEAFE] bg-white shadow-[0_12px_32px_rgba(37,99,235,0.10)]">
                <div className="grid sm:grid-cols-[260px_1fr]">
                    <CourseThumbnail
                        src={offer.course.thumbnail}
                        title={offer.course.title}
                        className="w-full self-center sm:ml-6 sm:my-6 sm:w-[calc(100%-24px)] rounded-xl"
                    />
                    <div className="p-6">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-3 py-1 text-[12px] font-bold text-[#1D4ED8]">
                            <Tag size={13} /> Exclusive offer
                        </span>
                        <h1 className="mt-3 text-[22px] font-extrabold leading-snug text-slate-900">
                            {offer.course.title}
                        </h1>
                        {offer.course.short_desc && (
                            <p className="mt-1.5 text-[14px] text-slate-500 line-clamp-2">
                                {offer.course.short_desc}
                            </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-baseline gap-3">
                            <span className="text-[32px] font-extrabold text-[#2563EB]">
                                {money(offer.discount_price)}
                            </span>
                            <span className="text-[18px] text-slate-400 line-through">
                                {money(offer.original_price)}
                            </span>
                            {offer.discount_pct && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[13px] font-bold text-emerald-700">
                                    {Math.round(offer.discount_pct)}% off · save {money(savings)}
                                </span>
                            )}
                        </div>

                        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-slate-500">
                            <Clock size={14} />
                            {offer.status === "expired"
                                ? "This offer has expired."
                                : offer.status === "used"
                                  ? "This offer has already been used."
                                  : `Valid until ${new Date(offer.expires_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`}
                        </p>
                    </div>
                </div>

                <div className="border-t border-[#DBEAFE] bg-[#F8FAFF] p-6">
                    {inactive ? (
                        <Link
                            to={`/courses/${offer.course.slug}`}
                            className="inline-flex rounded-xl bg-[#2563EB] px-5 py-3 text-[14px] font-bold text-white no-underline hover:opacity-90"
                        >
                            View the course
                        </Link>
                    ) : isLoggedIn ? (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-[13.5px] text-slate-600">
                                Signed in as <strong>{user?.email}</strong>. The offer works only for the
                                email it was sent to{offer.email_hint ? ` (${offer.email_hint})` : ""}.
                            </p>
                            <Link
                                to={checkoutUrl}
                                className="rounded-xl bg-[#2563EB] px-6 py-3 text-[14px] font-bold text-white no-underline hover:opacity-90"
                            >
                                Continue to payment
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <p className="flex items-center gap-2 text-[14px] text-slate-700">
                                <Mail size={16} className="text-[#2563EB]" />
                                Use the email this offer was sent to
                                {offer.email_hint && (
                                    <strong className="font-mono">{offer.email_hint}</strong>
                                )}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <Link
                                    to={`/register?${authQuery()}`}
                                    className="rounded-xl bg-[#2563EB] px-6 py-3 text-[14px] font-bold text-white no-underline hover:opacity-90"
                                >
                                    Create account &amp; claim
                                </Link>
                                <Link
                                    to={`/login?${authQuery()}`}
                                    className="rounded-xl border border-[#BFDBFE] bg-white px-6 py-3 text-[14px] font-bold text-[#1D4ED8] no-underline hover:bg-[#EFF6FF]"
                                >
                                    I already have an account
                                </Link>
                            </div>
                            <p className="mt-3 text-[12.5px] text-slate-500">
                                After signing in you'll go straight to payment with the discounted price
                                applied.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </OfferShell>
    );
}

function OfferShell({ children }) {
    return (
        <div className="min-h-[70vh] bg-[#F1F5F9] px-4 py-10 sm:py-14">
            <div className="mx-auto max-w-3xl">
                {children}
                <p className="mt-5 flex items-center justify-center gap-1.5 text-[12.5px] text-slate-500">
                    <ShieldCheck size={14} className="text-[#2563EB]" /> Secure checkout by Certezy E-Learning
                    Pvt. Ltd.
                </p>
            </div>
        </div>
    );
}

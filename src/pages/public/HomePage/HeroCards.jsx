import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

import { PMI_ATP } from "@/config/app";
import { formatMoney, getPricing } from "@/lib/format";
import { PMP_FALLBACK, PMP_PRACTICE_EXAMS, PMP_SLUG, TOPICS } from "./useHeroCatalog";

/**
 * Hero cards in a plain, factual style (like pmi.org): the PMP® course card
 * and four topic cards. Numbers come from the live catalog (useHeroCatalog);
 * until it loads, or if it fails, the cards show fixed PMP facts and no counts.
 */

function Fact({ value, label, first }) {
    return (
        <div className={`px-3 py-2.5 ${first ? "" : "border-l border-slate-200"}`}>
            <div className="text-[22px] font-extrabold leading-none text-slate-900">{value}</div>
            <div className="mt-1 text-[11.5px] font-medium text-slate-500">{label}</div>
        </div>
    );
}

export function PmpCourseCard({ pmp }) {
    const course = pmp ?? PMP_FALLBACK;
    const pricing = pmp ? getPricing(pmp) : null;

    return (
        <article
            aria-labelledby="hero-pmp-title"
            className="w-full max-w-[440px] rounded-lg border-t-4 border-[#3282B8] bg-white px-6 pb-6 pt-5 sm:px-7"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <span className="text-[11px] font-bold tracking-[0.09em] text-[#1A5F8A]">PMP® EXAM PREP</span>
                    <span className="ml-2 rounded bg-[#E6F1FB] px-2 py-0.5 text-[11px] font-semibold text-[#0C447C]">
                        Self-paced
                    </span>
                    <p className="mt-1 text-[11.5px] font-semibold text-slate-500">PMI® Authorized Training Partner</p>
                </div>
                <img src={PMI_ATP.badge} alt={PMI_ATP.alt} width={56} height={56} className="h-14 w-14 shrink-0" />
            </div>

            <h2 id="hero-pmp-title" className="mt-3 text-[20px] font-extrabold leading-snug text-slate-900">
                Project Management Professional (PMP)®
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                Predictive, agile and hybrid project management, built for the PMP® certification exam.
            </p>

            <div className="mt-5 grid grid-cols-3 rounded-md border border-slate-200">
                <Fact first value={course.contact_hours || PMP_FALLBACK.contact_hours} label="Contact hours" />
                <Fact value={course.total_lessons || PMP_FALLBACK.total_lessons} label="Lessons" />
                <Fact value={PMP_PRACTICE_EXAMS} label="Practice exams" />
            </div>

            <ul className="mt-4 space-y-1.5 text-[13.5px] text-slate-700">
                {["Certificate with 35 contact hours", "Full-length timed exam simulations"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                        <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#3282B8]" aria-hidden="true" />
                        {t}
                    </li>
                ))}
            </ul>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="min-h-[24px] text-[13px] text-slate-500">
                    {pricing && !pricing.isFree && (
                        <>
                            <span className="text-[18px] font-extrabold text-slate-900">{pricing.label}</span>
                            {pricing.originalPrice && (
                                <span className="ml-2 line-through">
                                    {formatMoney(pricing.originalPrice, pricing.currency)}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <Link
                    to={`/courses/${PMP_SLUG}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#3282B8] px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#2A6FA0]"
                >
                    View course <ArrowRight size={15} aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

export function TopicCards({ topics = {} }) {
    return (
        <nav
            aria-label="Course topics"
            className="relative z-10 mx-auto grid max-w-[1000px] grid-cols-2 gap-3 px-4 pb-12 pt-10 sm:gap-4 lg:grid-cols-4"
        >
            {TOPICS.map(({ slug, title, Icon }) => {
                const info = topics[slug];
                return (
                    <Link
                        key={slug}
                        to={`/courses?category=${slug}`}
                        className="group flex flex-col rounded-lg border-t-[3px] border-[#3282B8] bg-white px-4 py-4 transition-transform hover:-translate-y-1 sm:px-5"
                    >
                        <Icon size={22} className="text-[#3282B8]" aria-hidden="true" />
                        <h3 className="mt-2.5 text-[15px] font-extrabold text-slate-900">{title}</h3>
                        <p className="mt-0.5 min-h-[18px] text-[12px] leading-snug text-slate-500">
                            {info?.subtitle}
                        </p>
                        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[12.5px] font-bold text-[#1A5F8A]">
                            {info?.count ? `${info.count} course${info.count === 1 ? "" : "s"}` : "Explore"}
                            <ArrowRight
                                size={14}
                                className="transition-transform group-hover:translate-x-0.5"
                                aria-hidden="true"
                            />
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}

import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    BadgeCheck,
    BookOpenCheck,
    CalendarDays,
    Download,
    ExternalLink,
    GraduationCap,
    Layers,
    ListChecks,
    MousePointerClick,
    ShieldCheck,
    Timer,
} from "lucide-react";

import { PMI_ATP } from "@/config/app";
import UpcomingBatches from "@/components/batches/UpcomingBatches";
import { PMP_SLUG } from "@/pages/public/HomePage/useHeroCatalog";

const ADVANTAGES = [
    {
        title: "Quality-assured training",
        body: "Courses reviewed and approved through the PMI ATP program, so you train with confidence that the program meets PMI's quality standards.",
    },
    { title: "35 contact hours", body: "Meet the education requirement for your project management certification." },
    { title: "Earn PDUs", body: "35 PDUs across Ways of Working, Power Skills and Business Acumen." },
];

const MORE = [
    { Icon: GraduationCap, title: "Certified trainers", body: "Live batches are taught by our certified trainers, with time for your questions." },
    { Icon: Layers, title: "Predictive, Agile and Hybrid", body: "Structured training from fundamentals to final revision across all three approaches." },
    { Icon: ListChecks, title: "Practice and revision", body: "Practice questions, knowledge checks and real-world scenarios before your exam." },
    { Icon: CalendarDays, title: "Live or on-demand", body: "Join an upcoming live batch, or study the on-demand course at your own pace." },
];

// The 35-hour PMP® exam prep brochure (public/brochures)
const BROCHURE_URL = "/brochures/CERTEZY-PMP-35-Hour-Brochure.pdf";

const STATS = [
    ["35", "Training hours"],
    ["35", "PDUs"],
    ["12", "Modules"],
    ["17", "Learning outcomes"],
];
const TOPICS = ["Predictive", "Agile & Scrum", "Hybrid", "Risk", "Leadership", "On-Demand · English"];

/** Public page: CERTEZY as a PMI Authorized Training Partner, the PMP program and live batches. */
export default function PmiAtpPage() {
    const { hash } = useLocation();
    useEffect(() => {
        document.title = "PMI Authorized Training Partner · PMP® Exam Prep | CERTEZY";
    }, []);
    // /live-batches and "#live-batches" links land on the batches
    useEffect(() => {
        if (!hash) return;
        const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 300);
        return () => clearTimeout(t);
    }, [hash]);

    return (
        <main className="bg-[#F6F9FC]">
            {/* ── Hero ── */}
            <section className="relative overflow-hidden bg-[linear-gradient(135deg,#3A76AA_0%,#1E3F5E_48%,#15304A_100%)] text-white">
                <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full border-[60px] border-white/5" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.4fr_1fr] md:py-20">
                    <div>
                        <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-label font-bold uppercase tracking-[0.14em]">
                            Project Management Institute
                        </span>
                        <h1 className="mt-5 text-[34px] font-extrabold leading-[1.1] tracking-tight sm:text-[46px]">
                            CERTEZY is a PMI <span className="text-[#FFD08A]">Authorized Training Partner</span>
                        </h1>
                        <p className="mt-4 max-w-xl text-body text-[#EAF2F9]">
                            CERTEZY E-LEARNING PVT LTD is recognized by Project Management Institute (PMI)<sup>®</sup> as an Authorized
                            Training Partner (ATP), delivering quality project management education and PMP<sup>®</sup> exam preparation.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <a
                                href="#live-batches"
                                className="inline-flex items-center gap-2 rounded-xl bg-[#F2A33A] px-5 py-3 text-ui font-bold text-[#15304A] hover:bg-[#FFB95A]"
                            >
                                <CalendarDays size={16} aria-hidden="true" /> Upcoming live batches
                            </a>
                            <a
                                href={BROCHURE_URL}
                                download="CERTEZY-PMP-35-Hour-Brochure.pdf"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-ui font-bold text-white hover:bg-white/10"
                            >
                                <Download size={16} aria-hidden="true" /> Download course brochure
                                <span className="text-small font-semibold text-[#C9DCEC]">PDF</span>
                            </a>
                        </div>
                    </div>

                    {/* Verified credential */}
                    <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur">
                        <img
                            src={PMI_ATP.premierBadge}
                            alt={`PMI Authorized Training Partner – ${PMI_ATP.tier}`}
                            width="160"
                            height="160"
                            className="mx-auto h-40 w-40 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                        />
                        <p className="mt-4 inline-flex items-center gap-1.5 text-small font-bold uppercase tracking-[0.12em] text-[#FFD08A]">
                            <BadgeCheck size={15} aria-hidden="true" /> Verified credential
                        </p>
                        <p className="mt-1 text-h3 font-bold">PMI Authorized Training Partner · {PMI_ATP.tier}</p>
                        <a
                            href={PMI_ATP.credlyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-ui font-bold text-[#1E3F5E] hover:bg-[#EAF2F9]"
                        >
                            Verify on Credly <ExternalLink size={14} aria-hidden="true" />
                        </a>
                        <p className="mt-3 text-small text-[#C9DCEC]">
                            Course ID: <b className="font-bold text-white">{PMI_ATP.courseId}</b>
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Why it matters ── */}
            <section className="py-16" aria-labelledby="why-atp">
                <div className="mx-auto max-w-6xl px-4">
                    <p className="text-label font-bold uppercase tracking-[0.16em] text-[#3A76AA]">Why it matters</p>
                    <h2 id="why-atp" className="mt-2 text-h1 font-extrabold tracking-tight text-[#1E3F5E]">
                        What being an Authorized Training Partner means for you
                    </h2>
                    <p className="mt-3 max-w-3xl text-body text-slate-600">
                        PMI Authorized Training Partners are reviewed by PMI, so you can train with confidence that the program meets its
                        quality standards.
                    </p>
                    <div className="mt-8 grid gap-5 md:grid-cols-3">
                        {ADVANTAGES.map((a, i) => (
                            <article key={a.title} className="rounded-3xl border border-[#C9DCEC] bg-white p-6">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3A76AA] text-h3 font-extrabold text-white">
                                    {i + 1}
                                </span>
                                <h3 className="mt-4 text-h3 font-extrabold text-[#1E3F5E]">{a.title}</h3>
                                <p className="mt-2 text-ui leading-relaxed text-slate-600">{a.body}</p>
                            </article>
                        ))}
                    </div>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {MORE.map(({ Icon, title, body }) => (
                            <article key={title} className="rounded-3xl bg-[#EAF2F9] p-5">
                                <Icon size={22} className="text-[#2F6496]" aria-hidden="true" />
                                <h3 className="mt-3 text-ui font-bold text-[#1E3F5E]">{title}</h3>
                                <p className="mt-1 text-small leading-relaxed text-slate-600">{body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Featured program ── */}
            <section className="pb-4" aria-labelledby="featured-program">
                <div className="mx-auto max-w-6xl px-4">
                    <p className="text-label font-bold uppercase tracking-[0.16em] text-[#3A76AA]">Featured program</p>
                    <div className="mt-4 grid gap-8 rounded-3xl border border-[#C9DCEC] bg-white p-6 sm:p-9 lg:grid-cols-[1.4fr_1fr]">
                        <div>
                            <h2 id="featured-program" className="text-h2 font-extrabold leading-snug text-[#1E3F5E] sm:text-[28px]">
                                35-Hour Project Management Certification Exam Preparation Course
                            </h2>
                            <p className="mt-3 text-body leading-relaxed text-slate-600">
                                Structured training across predictive, Agile and Hybrid approaches, from fundamentals to final revision, with
                                practice questions and real-world scenarios.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {TOPICS.map((t) => (
                                    <span key={t} className="rounded-full border border-[#C9DCEC] bg-[#EAF2F9] px-3.5 py-1.5 text-small font-semibold text-[#275382]">
                                        {t}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-5 text-ui text-slate-600">
                                Course ID: <b className="font-bold text-[#1E3F5E]">{PMI_ATP.courseId}</b>
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Link
                                    to={`/courses/${PMP_SLUG}`}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#2F6496] px-5 py-2.5 text-ui font-bold text-white hover:bg-[#275382]"
                                >
                                    <BookOpenCheck size={16} aria-hidden="true" /> Start on-demand
                                </Link>
                                <a
                                    href="#live-batches"
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#C9DCEC] px-5 py-2.5 text-ui font-bold text-[#1E3F5E] hover:bg-[#EAF2F9]"
                                >
                                    <CalendarDays size={16} aria-hidden="true" /> Join a live batch
                                </a>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {STATS.map(([n, l]) => (
                                <div key={l} className="rounded-2xl bg-[#EAF2F9] p-5">
                                    <p className="text-[40px] font-extrabold leading-none text-[#3A76AA]">{n}</p>
                                    <p className="mt-2 text-ui text-slate-600">{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Live batches ── */}
            <UpcomingBatches />

            {/* ── How to verify ── */}
            <section className="pb-16" aria-labelledby="verify-atp">
                <div className="mx-auto max-w-6xl px-4">
                    <div className="grid gap-6 rounded-3xl bg-[#1E3F5E] p-6 text-white sm:p-9 md:grid-cols-[1fr_1.3fr]">
                        <div>
                            <ShieldCheck size={30} className="text-[#FFD08A]" aria-hidden="true" />
                            <h2 id="verify-atp" className="mt-3 text-h2 font-extrabold">Check our ATP status yourself</h2>
                            <p className="mt-2 text-ui text-[#C9DCEC]">
                                Our PMI Authorized Training Partner badge is issued on Credly, so anyone can confirm it in a few seconds.
                            </p>
                        </div>
                        <ol className="space-y-3">
                            {[
                                [MousePointerClick, "Open our badge", <>Click <b>Verify on Credly</b> on this page.</>],
                                [BadgeCheck, "Check the details", <>The badge is &ldquo;PMI Authorized Training Partner · {PMI_ATP.tier}&rdquo;, issued by Project Management Institute.</>],
                                [Timer, "Match the course", <>Our PMP<sup>®</sup> exam prep course ID is <b>{PMI_ATP.courseId}</b>.</>],
                            ].map(([Icon, title, body], i) => (
                                <li key={i} className="flex gap-3 rounded-2xl bg-white/10 p-4">
                                    <Icon size={20} className="mt-0.5 shrink-0 text-[#FFD08A]" aria-hidden="true" />
                                    <div>
                                        <p className="font-bold">{title}</p>
                                        <p className="text-small text-[#EAF2F9]">{body}</p>
                                    </div>
                                </li>
                            ))}
                            <li>
                                <a
                                    href={PMI_ATP.credlyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#F2A33A] px-5 py-2.5 text-ui font-bold text-[#15304A] hover:bg-[#FFB95A]"
                                >
                                    Verify on Credly <ExternalLink size={14} aria-hidden="true" />
                                </a>
                            </li>
                        </ol>
                    </div>
                    <p className="mt-6 text-center text-small text-slate-500">
                        PMI, PMP and the PMI Authorized Training Partner logo are registered marks of Project Management Institute, Inc.
                    </p>
                </div>
            </section>
        </main>
    );
}

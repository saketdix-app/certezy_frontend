import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ExternalLink } from "lucide-react";

import { PMI_ATP, ROUTES } from "@/config/app";

const POINTS = ["Quality-assured by PMI", "35 contact hours", "35 PDUs", "Certified trainers · live batches"];

/** Home: we are a PMI Authorized Training Partner, with the badge and a Credly check. */
export default function AtpStrip() {
    return (
        <section className="bg-[#F6F9FC] py-12" aria-labelledby="atp-strip-title">
            <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-3xl border border-[#C9DCEC] bg-white px-6 py-7 shadow-[0_10px_30px_rgba(30,63,94,0.06)] sm:px-9 md:grid-cols-[auto_1fr_auto]">
                <img
                    src={PMI_ATP.premierBadge}
                    alt={`PMI Authorized Training Partner – ${PMI_ATP.tier}`}
                    width="112"
                    height="112"
                    loading="lazy"
                    className="mx-auto h-28 w-28 rounded-full shadow-[0_8px_24px_rgba(30,63,94,0.25)]"
                />
                <div className="text-center md:text-left">
                    <p className="inline-flex items-center gap-1.5 text-label font-bold uppercase tracking-[0.14em] text-[#3A76AA]">
                        <BadgeCheck size={14} aria-hidden="true" /> Verified credential
                    </p>
                    <h2 id="atp-strip-title" className="mt-1 text-h2 font-extrabold text-[#1E3F5E]">
                        PMI Authorized Training Partner · {PMI_ATP.tier}
                    </h2>
                    <ul className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                        {POINTS.map((p) => (
                            <li key={p} className="rounded-full bg-[#EAF2F9] px-3 py-1 text-small font-semibold text-[#275382]">
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                    <Link
                        to={ROUTES.PMI_ATP}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F6496] px-5 py-2.5 text-ui font-bold text-white hover:bg-[#275382]"
                    >
                        PMP® program &amp; live batches <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <a
                        href={PMI_ATP.credlyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9DCEC] px-5 py-2.5 text-ui font-bold text-[#1E3F5E] hover:bg-[#EAF2F9]"
                    >
                        Verify on Credly <ExternalLink size={14} aria-hidden="true" />
                    </a>
                </div>
            </div>
        </section>
    );
}

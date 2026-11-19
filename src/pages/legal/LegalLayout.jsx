import { useEffect } from "react";
import { Link } from "react-router-dom";
import { APP_NAME, ROUTES } from "@/config/app";
import { LEGAL } from "./legal.config";

const slug = (text) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

/** Section heading + body. `id` defaults to a slug of the title. */
export function Section({ title, id, children }) {
    return (
        <section id={id || slug(title)} className="scroll-mt-24 mb-10">
            <h2 className="text-h2 font-extrabold text-slate-900 mb-3 tracking-tight">{title}</h2>
            <div className="legal-body">{children}</div>
        </section>
    );
}

export function ContactBlock() {
    return (
        <ul>
            <li>
                Email:{" "}
                <a href={`mailto:${LEGAL.email}`} className="text-primary font-semibold">
                    {LEGAL.email}
                </a>
            </li>
            {LEGAL.phones.map((p) => (
                <li key={p.region}>
                    Phone ({p.label}):{" "}
                    <a href={p.href} className="text-primary font-semibold">
                        {p.number}
                    </a>
                </li>
            ))}
            <li>
                Contact form:{" "}
                <Link to={ROUTES.CONTACT} className="text-primary font-semibold">
                    {LEGAL.website}/contact-us
                </Link>
            </li>
        </ul>
    );
}

/**
 * Shared layout for legal pages.
 * `sections` is a list of titles used for the table of contents.
 */
export default function LegalLayout({ title, intro, sections, effectiveDate = LEGAL.effectiveDate, meta, children }) {
    useEffect(() => {
        document.title = `CERTEZY | ${title}`;
        window.scrollTo(0, 0);
    }, [title]);

    return (
        <main className="bg-white">
            <style>{`
                .legal-body p { color: #475569; font-size: 15px; line-height: 1.75; margin-bottom: 12px; }
                .legal-body ul { list-style: disc; padding-left: 22px; margin-bottom: 12px; }
                .legal-body ol { list-style: decimal; padding-left: 22px; margin-bottom: 12px; }
                .legal-body li { color: #475569; font-size: 15px; line-height: 1.7; margin-bottom: 6px; }
                .legal-body h3 { color: #0F172A; font-size: 16px; font-weight: 700; margin: 18px 0 8px; }
                .legal-body strong { color: #0F172A; }
                .legal-body a { color: #2F6496; }
                .legal-body table { width: 100%; border-collapse: collapse; font-size: 14px; }
                .legal-body th, .legal-body td { border: 1px solid #E2E8F0; padding: 10px 12px; text-align: left; vertical-align: top; color: #475569; line-height: 1.6; }
                .legal-body th { background: #F8FAFC; color: #0F172A; font-weight: 700; }
            `}</style>

            {/* Header */}
            <section
                className="px-6 pt-16 pb-12"
                style={{ background: "linear-gradient(135deg, #15304a 0%, #183254 55%, #1e3f5e 100%)" }}
            >
                <div className="max-w-5xl mx-auto">
                    <p className="text-small font-bold uppercase tracking-widest text-[#5B91C0] mb-3">Legal</p>
                    <h1 className="text-h1 md:text-display font-extrabold text-white tracking-tight mb-3">
                        {title}
                    </h1>
                    <p className="text-ui text-slate-400">
                        Effective date: {effectiveDate}
                        {meta && <span className="mx-2">|</span>}
                        {meta}
                    </p>
                    {intro && (
                        <p className="text-body text-slate-300 leading-relaxed mt-5 max-w-3xl">{intro}</p>
                    )}
                </div>
            </section>

            {/* Body */}
            <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-10">
                <nav aria-label="On this page" className="hidden lg:block">
                    <div className="sticky top-24">
                        <p className="text-small font-bold uppercase tracking-widest text-slate-500 mb-3">
                            On this page
                        </p>
                        <ol className="space-y-2">
                            {sections.map((s) => (
                                <li key={s}>
                                    <a
                                        href={`#${slug(s)}`}
                                        className="text-ui text-slate-600 hover:text-primary leading-snug block"
                                    >
                                        {s}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </div>
                </nav>

                <article className="min-w-0">{children}</article>
            </div>
        </main>
    );
}

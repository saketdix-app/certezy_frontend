import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

import { PmpCourseCard, TopicCards } from "./HeroCards";
import { useHeroCatalog } from "./useHeroCatalog";

/* ─────────────────────────────────────────────────────────────────────────────
   Only animations + a few layout helpers that Tailwind can't express.
   All colours are CSS variables → one place to tweak the whole page.
───────────────────────────────────────────────────────────────────────────── */
const STYLES = `
  :root {
    --c-bg:       #0B1120;
    --c-blue:     #3282B8;
    --c-blue-d:   #1A5F8A;
    --c-text:     #F1F5F9;
    --c-muted:    #94A3B8;
  }

  /* GPU-only — no layout recalc */
  @keyframes heroFadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes glowPulse {
    0%,100% { opacity:.35; }
    50%      { opacity:.6;  }
  }

  .afu1 { animation: heroFadeUp .55s .00s ease both; }
  .afu2 { animation: heroFadeUp .55s .08s ease both; }
  .afu3 { animation: heroFadeUp .55s .16s ease both; }
  .afu4 { animation: heroFadeUp .55s .24s ease both; }
  .afu5 { animation: heroFadeUp .55s .32s ease both; }
  .afu6 { animation: heroFadeUp .55s .40s ease both; }

  .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }

  /* ── RESPONSIVE ─────────────────────────────────────────────────── */
  .hero-wrap {
    display: flex;
    align-items: center;
    gap: 48px;
    padding: 72px 0 0;
    min-height: calc(100svh - 260px);
  }
  .hero-left  { flex: 1.05; min-width: 0; }
  .hero-right { flex: .95;  min-width: 0; display:flex; justify-content:center; }

  /* large screens */
  @media (min-width: 1400px) {
    .hero-container { max-width: 1320px !important; }
    .hero-title     { font-size: 68px !important; }
  }

  /* 1024 – 1280 */
  @media (max-width: 1280px) {
    .hero-title { font-size: 52px !important; }
  }

  /* tablet landscape 900 – 1024 */
  @media (max-width: 1024px) {
    .hero-title { font-size: 46px !important; }
    .hero-wrap  { gap: 32px; }
  }

  /* tablet portrait 768 – 900 */
  @media (max-width: 900px) {
    .hero-wrap   { flex-direction: column; padding: 52px 0 0; min-height: auto; }
    .hero-left   { text-align: center; }
    .hero-right  { width: 100%; justify-content: center; }
    .hero-title  { font-size: 44px !important; }
    .stat-sep    { display: none; }
  }

  /* mobile 640 – 768 */
  @media (max-width: 768px) {
    .hero-title  { font-size: 38px !important; line-height:1.12 !important; }
    .hero-desc   { font-size: 15px !important; }
    .btn-row     { flex-wrap: wrap; }
  }

  /* mobile 480 – 640 */
  @media (max-width: 640px) {
    .hero-title  { font-size: 32px !important; }
    .hero-wrap   { padding: 40px 0 0; }
  }

  /* small mobile < 480 */
  @media (max-width: 480px) {
    .hero-title   { font-size: 28px !important; }
    .btn-row      { flex-direction: column; }
    .btn-row a    { text-align:center; justify-content:center; width:100%; }
  }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   HERO SECTION
═══════════════════════════════════════════════════════════════════════════ */
export default function HeroSection() {
    const catalog = useHeroCatalog();
    return (
        <>
            <style>{STYLES}</style>

            {/* SEO: semantic landmark, descriptive aria-label */}
            <section
                aria-label="Certezy — Industry-ready IT certification courses"
                style={{
                    background: "var(--c-bg)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    overflow: "hidden",
                }}
            >
                {/* ── Radial glow (single element, GPU opacity only) ─────────────── */}
                <div
                    aria-hidden="true"
                    className="glow-pulse"
                    style={{
                        position: "absolute",
                        top: "10%",
                        right: "8%",
                        width: "520px",
                        height: "520px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 68%)",
                        pointerEvents: "none",
                    }}
                />

                {/* ── Container ──────────────────────────────────────────────────── */}
                <div
                    className="hero-container"
                    style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", position: "relative" }}
                >
                    {/* ══ HERO ROW ══════════════════════════════════════════════════ */}
                    <div className="hero-wrap">
                        {/* ════ LEFT ═══════════════════════════════════════════════ */}
                        <div className="hero-left">
                            {/* PMP badge — SEO: meaningful text, not just decorative */}
                            <div className="afu1" style={{ marginBottom: "24px" }}>
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "7px 16px",
                                        borderRadius: "100px",
                                        border: "1px solid rgba(59,130,246,0.35)",
                                        background: "rgba(59,130,246,0.08)",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#93C5FD",
                                        letterSpacing: "0.02em",
                                        lineHeight: 1.45,
                                        maxWidth: "100%",
                                    }}
                                >
                                    <ShieldCheck
                                        size={14}
                                        color="#3282B8"
                                        aria-hidden="true"
                                        style={{ flexShrink: 0 }}
                                    />
                                    PMI® Authorized Training Partner · Prepare for the PMP® Exam with Confidence
                                </span>
                            </div>

                            {/* H1 — primary SEO keyword */}
                            <h1
                                className="afu2 hero-title"
                                style={{
                                    fontSize: "60px",
                                    fontWeight: 900,
                                    lineHeight: 1.07,
                                    letterSpacing: "-0.03em",
                                    color: "var(--c-text)",
                                    marginBottom: "20px",
                                }}
                            >
                                Become Industry-Ready <br />
                                with{" "}
                                <span
                                    style={{
                                        background: "linear-gradient(90deg, #3282B8 0%, #38BDF8 100%)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                    }}
                                >
                                    CERTEZY
                                </span>
                            </h1>

                            {/* Description — SEO: natural keywords */}
                            <p
                                className="afu3 hero-desc"
                                style={{
                                    fontSize: "16.5px",
                                    color: "var(--c-muted)",
                                    lineHeight: 1.72,
                                    maxWidth: "480px",
                                    marginBottom: "32px",
                                }}
                            >
                                Expert-led PMP® and IT certification training with real-world skills for
                                modern careers — including 35 contact hours and full-length PMP® practice
                                exams.
                            </p>

                            {/* Trust proof row */}
                            <div
                                className="afu3"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                    marginBottom: "32px",
                                }}
                            >
                                {[
                                    "Learning made easier and more convenient for you",
                                    "Expert-led courses: AWS, Azure, DevOps, Cybersecurity",
                                ].map((t) => (
                                    <div
                                        key={t}
                                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                    >
                                        <CheckCircle2
                                            size={15}
                                            color="#3282B8"
                                            aria-hidden="true"
                                            style={{ flexShrink: 0 }}
                                        />
                                        <span
                                            style={{ fontSize: "13.5px", color: "#CBD5E1", fontWeight: 500 }}
                                        >
                                            {t}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA buttons */}
                            <div
                                className="afu4 btn-row"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "14px",
                                    marginBottom: "40px",
                                }}
                            >
                                <Link
                                    to="/courses"
                                    aria-label="Explore all IT certification courses"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "14px 26px",
                                        borderRadius: "12px",
                                        background: "linear-gradient(135deg, #3282B8 0%, #1A5F8A 100%)",
                                        color: "#fff",
                                        fontSize: "15px",
                                        fontWeight: 700,
                                        textDecoration: "none",
                                        boxShadow: "0 6px 24px rgba(50,130,184,0.45)",
                                        transition: "transform .2s ease, box-shadow .2s ease",
                                        whiteSpace: "nowrap",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 10px 32px rgba(59,130,246,0.55)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "";
                                        e.currentTarget.style.boxShadow = "0 6px 24px rgba(59,130,246,0.45)";
                                    }}
                                >
                                    Explore Courses <ArrowRight size={16} aria-hidden="true" />
                                </Link>
                            </div>

                            {/* Stats */}
                            <div
                                className="afu5"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "28px",
                                    flexWrap: "wrap",
                                }}
                            >
                                {[
                                    { val: "35", label: "PMP® CONTACT HOURS" },
                                    { val: "Verified", label: "ONLINE CERTIFICATES", blue: true },
                                ].map(({ val, label, blue }, i) => (
                                    <div
                                        key={label}
                                        style={{ display: "flex", alignItems: "center", gap: "12px" }}
                                    >
                                        {i > 0 && (
                                            <div
                                                className="stat-sep"
                                                style={{
                                                    width: "1px",
                                                    height: "36px",
                                                    background: "rgba(255,255,255,0.12)",
                                                }}
                                            />
                                        )}
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: "24px",
                                                    fontWeight: 900,
                                                    lineHeight: 1,
                                                    color: blue ? "#3282B8" : "var(--c-text)",
                                                    letterSpacing: "-0.02em",
                                                }}
                                            >
                                                {val}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "10.5px",
                                                    fontWeight: 700,
                                                    color: "var(--c-muted)",
                                                    letterSpacing: "0.08em",
                                                    marginTop: "3px",
                                                }}
                                            >
                                                {label}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ════ RIGHT ══════════════════════════════════════════════ */}
                        <div className="hero-right afu6">
                            <PmpCourseCard pmp={catalog.pmp} />
                        </div>
                        {/* ════ END RIGHT ══════════════════════════════════════════ */}
                    </div>
                </div>

                {/* ══ TOPIC CARDS ══ */}
                <TopicCards topics={catalog.topics} />
            </section>
        </>
    );
}

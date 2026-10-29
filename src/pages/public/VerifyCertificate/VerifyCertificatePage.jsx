import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Search, Download, Loader2, Award } from "lucide-react";
import certificateService from "@/services/certificateService";

/**
 * Public certificate verification — /verify and /verify/:certificateNo.
 * The certificate PDF prints this link, so employers can confirm a
 * Certezy E-Learning Pvt. Ltd. certificate is genuine.
 */

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";

function Row({ label, value }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
            <dt className="sm:w-40 shrink-0 text-[12px] font-bold uppercase tracking-wider text-slate-400">
                {label}
            </dt>
            <dd className="text-[15px] font-semibold text-slate-900 break-words">{value}</dd>
        </div>
    );
}

export default function VerifyCertificatePage() {
    const { certificateNo } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(certificateNo || "");
    // result of the last lookup, tagged with the number it belongs to
    const [result, setResult] = useState({ no: null, cert: null, error: null });

    useEffect(() => {
        if (!certificateNo) return;
        let alive = true;
        certificateService
            .verify(certificateNo)
            .then(
                (res) =>
                    alive && setResult({ no: certificateNo, cert: res.data?.data?.certificate, error: null })
            )
            .catch(
                (err) =>
                    alive &&
                    setResult({
                        no: certificateNo,
                        cert: null,
                        error:
                            err.response?.status === 404
                                ? "No certificate with this number was issued by Certezy."
                                : err.response?.data?.message ||
                                  "Could not verify right now. Please try again.",
                    })
            );
        return () => {
            alive = false;
        };
    }, [certificateNo]);

    const submit = (e) => {
        e.preventDefault();
        const no = query.trim().toUpperCase();
        if (no) navigate(`/verify/${encodeURIComponent(no)}`);
    };

    const loading = Boolean(certificateNo) && result.no !== certificateNo;
    const { cert, error } = result.no === certificateNo ? result : { cert: null, error: null };

    return (
        <div className="min-h-[70vh] bg-[#F1F5F9] px-4 py-10 sm:py-16">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex w-12 h-12 rounded-full bg-primary/10 text-primary items-center justify-center mb-3">
                        <Award size={22} />
                    </div>
                    <h1 className="text-[26px] sm:text-[30px] font-extrabold text-slate-900 tracking-tight">
                        Verify a certificate
                    </h1>
                    <p className="text-[14px] text-slate-500 mt-1">
                        Check that a certificate was issued by Certezy E-Learning Pvt. Ltd.
                    </p>
                </div>

                <form onSubmit={submit} className="flex gap-2 mb-6">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Certificate number, e.g. CERT-2026-8F3A1C9B2E"
                        className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[14px] font-mono uppercase outline-none focus:border-primary"
                        aria-label="Certificate number"
                    />
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-4 sm:px-5 rounded-xl bg-primary text-white text-[14px] font-bold hover:opacity-90"
                    >
                        <Search size={16} />
                        <span className="hidden sm:inline">Verify</span>
                    </button>
                </form>

                {loading && (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-[14px]">
                        <Loader2 size={18} className="animate-spin" /> Checking…
                    </div>
                )}

                {error && !loading && (
                    <div className="rounded-2xl bg-white border border-rose-200 p-6 flex gap-4">
                        <ShieldAlert className="text-rose-500 shrink-0" size={28} />
                        <div>
                            <p className="text-[16px] font-bold text-slate-900">Not verified</p>
                            <p className="text-[14px] text-slate-500 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {cert && !loading && (
                    <div className="rounded-2xl bg-white border border-emerald-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 border-b border-emerald-100">
                            <ShieldCheck className="text-emerald-600 shrink-0" size={26} />
                            <div>
                                <p className="text-[16px] font-bold text-emerald-800">Valid certificate</p>
                                <p className="text-[12.5px] text-emerald-700">Issued by {cert.issuer}</p>
                            </div>
                        </div>
                        <dl className="px-6 py-2">
                            <Row label="Awarded to" value={cert.student_name} />
                            <Row
                                label="Course"
                                value={
                                    cert.course_slug ? (
                                        <Link
                                            to={`/courses/${cert.course_slug}`}
                                            className="text-primary hover:underline"
                                        >
                                            {cert.course_title}
                                        </Link>
                                    ) : (
                                        cert.course_title
                                    )
                                }
                            />
                            <Row label="Issued on" value={fmtDate(cert.issued_at)} />
                            {cert.valid_until && (
                                <Row label="Valid until" value={fmtDate(cert.valid_until)} />
                            )}
                            <Row
                                label="Certificate No."
                                value={<span className="font-mono">{cert.certificate_no}</span>}
                            />
                        </dl>
                        {cert.pdf_url && (
                            <div className="px-6 pb-6">
                                <a
                                    href={cert.pdf_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold no-underline hover:opacity-90"
                                >
                                    <Download size={15} /> View certificate PDF
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

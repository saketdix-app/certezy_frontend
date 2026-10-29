import toast from "react-hot-toast";
import { Award, X } from "lucide-react";

/**
 * showCertificateEarned(certificate, navigate) — celebration toast shown when
 * the API reports a freshly issued certificate (last lesson completed or final
 * test passed). Links to the PDF and to My Certificates.
 */
export function showCertificateEarned(certificate, navigate) {
    if (!certificate) return;
    toast.custom(
        (t) => (
            <div
                className={`${t.visible ? "animate-in fade-in" : "opacity-0"} pointer-events-auto w-[340px] max-w-[92vw] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-4 flex gap-3`}
            >
                <div className="w-10 h-10 shrink-0 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Award size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-slate-900">Certificate earned! 🎉</p>
                    <p className="text-[12.5px] text-slate-500 mt-0.5">
                        You completed the course. Your certificate from Certezy E-Learning Pvt. Ltd. is ready.
                    </p>
                    <div className="flex items-center gap-3 mt-2.5">
                        {certificate.pdf_url && (
                            <a
                                href={certificate.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[12.5px] font-bold text-primary hover:underline"
                            >
                                Download PDF
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                toast.dismiss(t.id);
                                navigate?.("/student/certificates");
                            }}
                            className="text-[12.5px] font-semibold text-slate-600 hover:text-primary"
                        >
                            My certificates
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="self-start p-1 text-slate-400 hover:text-slate-600"
                    aria-label="Dismiss"
                >
                    <X size={15} />
                </button>
            </div>
        ),
        { duration: 12000, id: `cert-${certificate.certificate_no}` }
    );
}

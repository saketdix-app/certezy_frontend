import { useSyncExternalStore } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";

// Phones and tablets: most mobile browsers can't scroll a PDF embedded in a
// page (iOS shows only page 1), so they get an "Open PDF" card instead.
const MOBILE_QUERY = "(max-width: 1023px), (pointer: coarse)";
const subscribe = (cb) => {
    const mq = window.matchMedia(MOBILE_QUERY);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
};
const useIsMobile = () =>
    useSyncExternalStore(
        subscribe,
        () => window.matchMedia(MOBILE_QUERY).matches,
        () => false
    );

const fileNameFromUrl = (url) => {
    try {
        return decodeURIComponent(new URL(url).pathname.split("/").pop() || "document.pdf");
    } catch {
        return "document.pdf";
    }
};

const btn =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors";

export default function PdfLesson({ lesson }) {
    const isMobile = useIsMobile();
    const url = (lesson.content || "").trim();
    const fileName = fileNameFromUrl(url);

    if (!/^https?:\/\//.test(url)) {
        return (
            <div className="flex flex-col items-center justify-center text-center px-6 py-20">
                <FileText size={48} className="mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                    This PDF isn&apos;t available yet.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 sm:p-6">
            {isMobile ? (
                <div
                    className="rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
                        <FileText size={30} className="text-red-400" />
                    </div>
                    <p className="text-white font-bold text-[15px] mb-1">{lesson.title}</p>
                    <p className="text-[12.5px] mb-5 break-all" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {fileName}
                    </p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className={`${btn} w-full sm:w-auto bg-[#3282B8] hover:bg-[#2a6fa0] text-white`}
                    >
                        <ExternalLink size={16} /> Open PDF
                    </a>
                </div>
            ) : (
                <iframe
                    key={lesson.id}
                    src={`${url}#view=FitH`}
                    title={lesson.title}
                    className="w-full rounded-xl bg-white"
                    style={{ height: "calc(100vh - 260px)", minHeight: 480, border: 0 }}
                />
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
                {!isMobile && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className={`${btn} text-white`}
                        style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                        <ExternalLink size={15} /> Open in new tab
                    </a>
                )}
                <a
                    href={url}
                    download={fileName}
                    target="_blank"
                    rel="noreferrer"
                    className={`${btn} text-white`}
                    style={{ background: "rgba(255,255,255,0.08)" }}
                >
                    <Download size={15} /> Download
                </a>
            </div>
        </div>
    );
}

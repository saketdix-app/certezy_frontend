import {
    MonitorPlay,
    ListVideo,
    Layers,
    Award,
    Infinity as InfinityIcon,
    Smartphone,
    FileDown,
} from "lucide-react";
import { formatDuration } from "@/lib/format";

/**
 * "This course includes" — Udemy-style summary grid built from the course and
 * its sections. Only facts the API knows are listed.
 */
export default function CourseIncludes({ course, sections }) {
    const items = [
        course.total_duration > 0 && {
            icon: MonitorPlay,
            text: `${formatDuration(course.total_duration)} of on-demand content`,
        },
        course.total_lessons > 0 && { icon: ListVideo, text: `${course.total_lessons} lessons` },
        sections.length > 0 && { icon: Layers, text: `${sections.length} sections` },
        { icon: FileDown, text: "Downloadable resources & official links" },
        { icon: Smartphone, text: "Access on mobile and desktop" },
        { icon: InfinityIcon, text: "Full lifetime access" },
        course.certificate_eligible === 1 && { icon: Award, text: "Certificate of completion" },
    ].filter(Boolean);

    return (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {items.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
                    <Icon size={16} className="text-primary shrink-0" />
                    {text}
                </li>
            ))}
        </ul>
    );
}

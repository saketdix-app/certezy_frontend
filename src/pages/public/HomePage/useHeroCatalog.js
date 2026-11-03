import { useEffect, useState } from "react";
import { Briefcase, Cloud, Infinity as InfinityIcon, ShieldCheck } from "lucide-react";

import courseService from "@/services/courseService";
import categoryService from "@/services/categoryService";

export const PMP_SLUG = "pmp";
export const PMP_FALLBACK = { total_lessons: 33, contact_hours: 35 };
export const PMP_PRACTICE_EXAMS = 3; // Practice Exam Sets 1–3

// Parent categories on the site (Admin → Categories)
export const TOPICS = [
    { slug: "project-management", title: "Project management", Icon: Briefcase },
    { slug: "cloud-computing", title: "Cloud", Icon: Cloud },
    { slug: "devops", title: "DevOps", Icon: InfinityIcon },
    { slug: "cyber-security", title: "Cybersecurity", Icon: ShieldCheck },
];

/** Loads the catalog once; HeroSection passes the result to both card groups. */
export function useHeroCatalog() {
    const [data, setData] = useState({ pmp: null, topics: {} });
    useEffect(() => {
        let cancelled = false;
        Promise.all([courseService.getAll({ limit: 100 }), categoryService.getAll()])
            .then(([coursesRes, categoriesRes]) => {
                if (cancelled) return;
                const courses = coursesRes.data?.data ?? [];
                const parents = categoriesRes.data?.data?.categories ?? [];
                const topics = {};
                for (const { slug } of TOPICS) {
                    const parent = parents.find((c) => c.slug === slug);
                    if (!parent) continue;
                    const children = parent.children ?? [];
                    const slugs = new Set([slug, ...children.map((c) => c.slug)]);
                    topics[slug] = {
                        count: courses.filter((c) => slugs.has(c.category_slug)).length,
                        subtitle: children
                            .slice(0, 3)
                            .map((c) => c.name)
                            .join(" · "),
                    };
                }
                setData({ pmp: courses.find((c) => c.slug === PMP_SLUG) ?? null, topics });
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);
    return data;
}

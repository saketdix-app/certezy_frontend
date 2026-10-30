import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import categoryService from "@/services/categoryService";
import courseService from "@/services/courseService";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import PriceTag from "@/components/shared/PriceTag";
import { cn } from "@/lib/utils";

/**
 * CategoryTabs — the dark bar of category tabs under the navbar (desktop).
 *
 * Hovering (or focusing) a tab opens a panel: its sub-categories on the left,
 * the courses in the hovered sub-category (or the whole category) on the right.
 * Categories come from GET /categories, courses from GET /courses (published);
 * both are loaded once and cached for the session.
 */

let cache = null;
const loadMenuData = () => {
    cache ??= Promise.all([
        categoryService.getAll().then((r) => r.data?.data?.categories ?? []),
        courseService
            .getAll({ status: "published", limit: 200 })
            .then((r) => (Array.isArray(r.data?.data) ? r.data.data : (r.data?.data?.courses ?? []))),
    ]).catch((err) => {
        cache = null;
        throw err;
    });
    return cache;
};

const OPEN_DELAY = 120;
const CLOSE_DELAY = 180;

function CoursePanel({ category, courses, activeChild, setActiveChild, onNavigate }) {
    const children = category.children ?? [];
    const slugs = activeChild ? [activeChild.slug] : [category.slug, ...children.map((c) => c.slug)];
    const list = courses.filter((c) => slugs.includes(c.category_slug)).slice(0, 6);
    const scope = activeChild ?? category;

    return (
        <div className="grid grid-cols-[230px_1fr] min-h-[280px]">
            {/* Sub-categories */}
            <div className="border-r border-slate-100 bg-slate-50/70 py-2">
                <button
                    type="button"
                    onMouseEnter={() => setActiveChild(null)}
                    onFocus={() => setActiveChild(null)}
                    className={cn(
                        "w-full text-left px-5 py-2.5 text-[13.5px] font-semibold transition-colors",
                        !activeChild ? "text-primary bg-white" : "text-slate-700 hover:text-primary"
                    )}
                >
                    All {category.name}
                </button>
                {children.map((child) => (
                    <Link
                        key={child.id}
                        to={`/courses?category=${child.slug}`}
                        onClick={onNavigate}
                        onMouseEnter={() => setActiveChild(child)}
                        onFocus={() => setActiveChild(child)}
                        className={cn(
                            "flex items-center justify-between px-5 py-2.5 text-[13.5px] font-medium no-underline transition-colors",
                            activeChild?.id === child.id
                                ? "text-primary bg-white"
                                : "text-slate-600 hover:text-primary"
                        )}
                    >
                        {child.name}
                        <ArrowRight size={13} className="opacity-50" />
                    </Link>
                ))}
            </div>

            {/* Courses */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        {scope.name} courses
                    </p>
                    <Link
                        to={`/courses?category=${scope.slug}`}
                        onClick={onNavigate}
                        className="flex items-center gap-1 text-[13px] font-semibold text-primary no-underline hover:underline"
                    >
                        View all <ArrowRight size={13} />
                    </Link>
                </div>
                {list.length === 0 ? (
                    <p className="text-[13.5px] text-slate-500 py-10 text-center">
                        New {scope.name} courses are coming soon.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                        {list.map((course) => (
                            <Link
                                key={course.id}
                                to={`/courses/${course.slug}`}
                                onClick={onNavigate}
                                className="group flex gap-3 rounded-xl p-2 no-underline hover:bg-slate-50 transition-colors"
                            >
                                <CourseThumbnail
                                    src={course.thumbnail}
                                    title={course.title}
                                    categorySlug={course.category_slug}
                                    className="w-[104px] rounded-lg"
                                    compact
                                />
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-primary">
                                        {course.title}
                                    </p>
                                    <PriceTag course={course} size="sm" className="mt-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CategoryTabs() {
    const [data, setData] = useState({ categories: [], courses: [] });
    // Open tab, remembered with the page it was opened on so it closes on navigation
    const [openState, setOpenState] = useState({ id: null, page: null });
    const [activeChild, setActiveChild] = useState(null);
    const timer = useRef(null);
    const location = useLocation();

    useEffect(() => {
        let alive = true;
        loadMenuData()
            .then(([categories, courses]) => alive && setData({ categories, courses }))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    const page = location.pathname + location.search;
    const open = openState.page === page ? openState.id : null;
    const setOpen = (id) => setOpenState({ id, page });

    useEffect(() => () => clearTimeout(timer.current), []);

    const openTab = (id, delay = OPEN_DELAY) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            setOpen(id);
            setActiveChild(null);
        }, delay);
    };
    const scheduleClose = () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(null), CLOSE_DELAY);
    };
    const keepOpen = () => clearTimeout(timer.current);
    const close = () => {
        clearTimeout(timer.current);
        setOpen(null);
    };

    const categories = data.categories.filter((c) => !c.parent_id);
    if (!categories.length) return null;
    const current = categories.find((c) => c.id === open);

    return (
        <nav
            aria-label="Course categories"
            className="relative bg-[#0a1628] text-white"
            onMouseLeave={scheduleClose}
            onKeyDown={(e) => e.key === "Escape" && close()}
        >
            <ul className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-stretch gap-1 overflow-x-auto no-scrollbar">
                {categories.map((cat) => {
                    const isOpen = open === cat.id;
                    return (
                        <li key={cat.id} className="shrink-0">
                            <Link
                                to={`/courses?category=${cat.slug}`}
                                onMouseEnter={() => openTab(cat.id, open ? 0 : OPEN_DELAY)}
                                onFocus={() => openTab(cat.id, 0)}
                                onClick={close}
                                aria-expanded={isOpen}
                                className={cn(
                                    "flex items-center gap-1.5 h-11 px-3.5 text-[13px] font-semibold no-underline whitespace-nowrap border-b-2 transition-colors",
                                    isOpen
                                        ? "text-white border-[#60A5FA] bg-white/5"
                                        : "text-white/80 border-transparent hover:text-white"
                                )}
                            >
                                {cat.name}
                                <ChevronDown
                                    size={13}
                                    className={cn("transition-transform opacity-70", isOpen && "rotate-180")}
                                />
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {current && (
                <div className="absolute left-0 right-0 top-full z-50" onMouseEnter={keepOpen}>
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
                        <div className="overflow-hidden rounded-b-2xl bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-200">
                            <CoursePanel
                                category={current}
                                courses={data.courses}
                                activeChild={activeChild}
                                setActiveChild={setActiveChild}
                                onNavigate={close}
                            />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}

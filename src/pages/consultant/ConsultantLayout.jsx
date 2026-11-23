import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Award, BookOpenCheck, CalendarClock, LayoutDashboard, LogOut, MoreHorizontal, Percent, TrendingUp, Users } from "lucide-react";

import Logo from "@/components/shared/Logo";
import NotificationsMenu from "@/components/shared/NotificationsMenu";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { usePortalTheme } from "@/lib/portalTheme";
import { logoutUser, selectUser } from "@/features/auth/authSlice";
import { useNewLeads } from "@/lib/newLeads";
import RedDot from "@/components/crm/RedDot";
import { cn } from "@/lib/utils";

// PRD §4.1 left navigation. Phones show the first four as tabs, the rest under "More".
const NAV = [
    { to: "/consultant", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/consultant/leads", label: "My Leads", icon: Users },
    { to: "/consultant/follow-ups", label: "Follow-ups", icon: CalendarClock },
    { to: "/consultant/sales", label: "Sales", icon: TrendingUp },
    { to: "/consultant/discount-links", label: "Discount Links", icon: Percent },
    { to: "/consultant/course-assignments", label: "Course Assignments", icon: BookOpenCheck },
    { to: "/consultant/certificates", label: "Certificates", icon: Award },
];
// Exam Coordinators: only the students assigned to them for the exam
const EXAM_NAV = [
    { to: "/consultant", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/consultant/leads", label: "Exam Students", icon: Users },
];

/**
 * Consultant sales workspace (2.0, PRD §4.1). Left navigation on desktop,
 * bottom tabs plus a "More" menu on phones.
 */
export default function ConsultantLayout() {
    const user = useSelector(selectUser);
    const dispatch = useDispatch();
    const { pathname } = useLocation();
    const [moreOpen, setMoreOpen] = useState(false);
    const [theme, setTheme] = usePortalTheme();
    const isCoordinator = user?.role === "exam_coordinator";
    const NAV_ITEMS = isCoordinator ? EXAM_NAV : NAV;
    // New leads assigned to me that I haven't opened: red dot on the tab and on "My Leads"
    const newLeads = useNewLeads(!isCoordinator);
    const dotFor = (to) => (to === "/consultant/leads" && newLeads > 0 ? <RedDot label={`${newLeads} new leads`} className="ml-auto" /> : null);
    const TABS = NAV_ITEMS.slice(0, 4);
    const MORE = NAV_ITEMS.slice(4);
    const logout = async () => {
        try {
            await dispatch(logoutUser());
        } finally {
            window.location.href = "/";
        }
    };

    return (
        <div className="min-h-dvh bg-page" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-surface px-4 lg:px-6">
                <div className="flex items-center gap-2">
                    <Logo to="/consultant" height={26} />
                    <span className="rounded bg-[#EAF2F9] px-1.5 py-0.5 text-label font-bold uppercase tracking-wider text-action-soft-ink">{isCoordinator ? "Exams" : "Sales"}</span>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle mode={theme} onChange={setTheme} />
                    <NotificationsMenu />
                    <span className="hidden text-ui text-slate-600 sm:inline">{user?.name}</span>
                    <button
                        type="button"
                        onClick={logout}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-small font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <LogOut size={14} aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>
            </header>

            <div className="flex">
                <nav aria-label="Sales workspace" className="sticky top-14 hidden h-[calc(100dvh-56px)] w-56 shrink-0 border-r border-slate-200 bg-surface p-3 lg:block">
                    <ul className="space-y-1">
                        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    end={end}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-ui font-medium",
                                            isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                                        )
                                    }
                                >
                                    <Icon size={18} aria-hidden="true" /> {label}
                                    {dotFor(to)}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <main className="min-w-0 flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
                    <div className="mx-auto max-w-[1300px]">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Phone: bottom tabs + More */}
            {moreOpen && (
                <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMoreOpen(false)}>
                    <ul className="absolute inset-x-3 bottom-[68px] rounded-2xl bg-surface p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        {MORE.map(({ to, label, icon: Icon }) => (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    onClick={() => setMoreOpen(false)}
                                    className={({ isActive }) =>
                                        cn("flex items-center gap-3 rounded-lg px-3 py-3 text-ui font-medium", isActive ? "bg-blue-50 text-blue-700" : "text-slate-700")
                                    }
                                >
                                    <Icon size={18} aria-hidden="true" /> {label}
                                    {dotFor(to)}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <nav
                aria-label="Sales workspace"
                className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-surface lg:hidden"
                style={{ gridTemplateColumns: `repeat(${TABS.length + (MORE.length ? 1 : 0)}, minmax(0, 1fr))` }}
            >
                {TABS.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            cn("flex flex-col items-center gap-0.5 py-2 text-label font-semibold", isActive ? "text-action" : "text-slate-500")
                        }
                    >
                        <span className="relative">
                            <Icon size={20} aria-hidden="true" />
                            {to === "/consultant/leads" && newLeads > 0 && <RedDot label={`${newLeads} new leads`} className="absolute -right-1.5 -top-1" />}
                        </span>
                        {label}
                    </NavLink>
                ))}
                {MORE.length > 0 && (
                <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    aria-expanded={moreOpen}
                    className={cn(
                        "flex flex-col items-center gap-0.5 py-2 text-label font-semibold",
                        MORE.some((m) => pathname.startsWith(m.to)) ? "text-action" : "text-slate-500"
                    )}
                >
                    <MoreHorizontal size={20} aria-hidden="true" /> More
                </button>
                )}
            </nav>
        </div>
    );
}

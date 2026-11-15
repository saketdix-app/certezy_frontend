import { NavLink, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CalendarClock, LayoutDashboard, LogOut, Users } from "lucide-react";

import Logo from "@/components/shared/Logo";
import { logoutUser, selectUser } from "@/features/auth/authSlice";
import { cn } from "@/lib/utils";

const NAV = [
    { to: "/consultant", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/consultant/leads", label: "My Leads", icon: Users },
    { to: "/consultant/follow-ups", label: "Follow-ups", icon: CalendarClock },
];

/**
 * Consultant sales workspace (2.0 phase 3, PRD §4.1). Left navigation on
 * desktop, a bottom tab bar on phones. Sales, discount links, course
 * assignments and certificates join the menu in phase 5.
 */
export default function ConsultantLayout() {
    const user = useSelector(selectUser);
    const dispatch = useDispatch();
    const logout = async () => {
        try {
            await dispatch(logoutUser());
        } finally {
            window.location.href = "/";
        }
    };

    return (
        <div className="min-h-dvh bg-[#F1F5F9]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
                <div className="flex items-center gap-2">
                    <Logo to="/consultant" height={26} />
                    <span className="rounded bg-[#E6F1FB] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0C447C]">Sales</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden text-[13px] text-slate-600 sm:inline">{user?.name}</span>
                    <button
                        type="button"
                        onClick={logout}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <LogOut size={14} aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>
            </header>

            <div className="flex">
                <nav aria-label="Sales workspace" className="sticky top-14 hidden h-[calc(100dvh-56px)] w-56 shrink-0 border-r border-slate-200 bg-white p-3 lg:block">
                    <ul className="space-y-1">
                        {NAV.map(({ to, label, icon: Icon, end }) => (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    end={end}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium",
                                            isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                                        )
                                    }
                                >
                                    <Icon size={18} aria-hidden="true" /> {label}
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

            {/* Phone: bottom tabs */}
            <nav aria-label="Sales workspace" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white lg:hidden">
                {NAV.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive ? "text-[#3282B8]" : "text-slate-500")
                        }
                    >
                        <Icon size={20} aria-hidden="true" /> {label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}

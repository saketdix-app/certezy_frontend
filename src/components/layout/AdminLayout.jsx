import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
    LayoutDashboard,
    Users,
    Shield,
    Tag,
    BookOpen,
    FileText,
    TestTube,
    HelpCircle,
    CreditCard,
    Percent,
    Award,
    MessageSquare,
    LogOut,
    GraduationCap,
    Menu,
    X,
    ChevronRight,
    Gift,
    FileUp,
    UserCog,
    Contact,
    CalendarClock,
    Shuffle,
    TrendingUp,
    BarChart3,
    Plug,
} from "lucide-react";

import { selectUser } from "@/features/auth/authSlice";
import { logoutUser } from "@/features/auth/authSlice";
import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";
import NotificationsMenu from "@/components/shared/NotificationsMenu";
import { ROLE_LABELS, TEAM_MANAGER_ROLES } from "@/config/app";
import IntegrationAlertBanner from "./IntegrationAlertBanner";

const ADMIN_NAV_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" },
    { label: "Users", icon: Users, to: "/admin/users" },
    { label: "Leads", icon: Contact, to: "/admin/leads", roles: TEAM_MANAGER_ROLES },
    { label: "Follow-ups", icon: CalendarClock, to: "/admin/follow-ups", roles: TEAM_MANAGER_ROLES },
    { label: "Distribution", icon: Shuffle, to: "/admin/distribution", roles: TEAM_MANAGER_ROLES },
    { label: "Sales", icon: TrendingUp, to: "/admin/sales", roles: TEAM_MANAGER_ROLES },
    { label: "CRM Reports", icon: BarChart3, to: "/admin/crm-reports", roles: TEAM_MANAGER_ROLES },
    { label: "Integrations", icon: Plug, to: "/admin/integrations", roles: TEAM_MANAGER_ROLES },
    { label: "Lead discount links", icon: Percent, to: "/admin/crm-discount-links", roles: TEAM_MANAGER_ROLES },
    { label: "Team", icon: UserCog, to: "/admin/team", roles: TEAM_MANAGER_ROLES },
    { label: "Assign Courses", icon: Gift, to: "/admin/assign-courses" },
    { label: "Categories", icon: Tag, to: "/admin/categories" },
    { label: "Courses", icon: BookOpen, to: "/admin/courses" },
    { label: "Bulk Import", icon: FileUp, to: "/admin/import" },
    { label: "Enrollments", icon: Users, to: "/admin/enrollments" },
    { label: "Payments", icon: CreditCard, to: "/admin/payments" },
    { label: "Discounts", icon: Percent, to: "/admin/discounts" },
    { label: "Reviews", icon: MessageSquare, to: "/admin/reviews" },
    { label: "Certificates", icon: Award, to: "/admin/certificates" },
    { label: "Contact", icon: MessageSquare, to: "/admin/contact" },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const dispatch = useDispatch();
    const user = useSelector(selectUser);

    const handleLogout = async () => {
        try {
            await dispatch(logoutUser());
        } finally {
            window.location.href = "/";
        }
    };

    return (
        <div
            className="min-h-screen bg-slate-50 flex"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 w-64 h-full bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <Logo to="/" height={28} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-action bg-action-soft px-1.5 py-0.5 rounded">
                            Admin
                        </span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1 rounded-lg hover:bg-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-1">
                        {ADMIN_NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => {
                            const isActive = location.pathname === item.to;
                            return (
                                <li key={item.to}>
                                    <Link
                                        to={item.to}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                        )}
                                    >
                                        <item.icon size={18} />
                                        <span>{item.label}</span>
                                        {isActive && <ChevronRight size={16} className="ml-auto" />}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                                {user?.name?.charAt(0)?.toUpperCase() || "A"}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                                {user?.name || "Admin User"}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <Link
                        to="/student/dashboard"
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-action rounded-lg hover:bg-blue-50 transition-colors"
                        title="Use the site as a learner: enroll, learn, take tests"
                    >
                        <GraduationCap size={18} />
                        <span>Learner view</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-4 py-4 lg:px-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold text-slate-900">Admin Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <NotificationsMenu />
                        </div>
                    </div>
                </header>
                {/* Facebook / LinkedIn connection expiring or broken (Admins only) */}
                {TEAM_MANAGER_ROLES.includes(user?.role) && <IntegrationAlertBanner />}

                {/* Page content */}
                <main className="admin-main flex-1 p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

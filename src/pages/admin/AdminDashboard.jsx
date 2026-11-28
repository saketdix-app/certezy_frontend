import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    BookOpen,
    CreditCard,
    TrendingUp,
    IndianRupee,
    Handshake,
    UserCheck,
    Star,
    AlertCircle,
    Calendar,
    Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import adminService from "@/services/adminService";
import paymentService from "@/services/paymentService";
import reviewService from "@/services/reviewService";
import { useSelector } from "react-redux";
import { selectUser } from "@/features/auth/authSlice";
import { TEAM_MANAGER_ROLES } from "@/config/app";
import ExamPipelineCard from "@/components/crm/ExamPipelineCard";

/** "₹2,40,000" — whole rupees, Indian grouping; other currencies with their own symbol. */
const fmtMoney = (amount, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: Number(amount) % 1 ? 2 : 0,
    }).format(Number(amount) || 0);
/** Short form for chart labels: ₹2.4L, ₹1.2Cr, ₹45K */
const fmtShort = (n) => {
    if (n >= 1e7) return `₹${+(n / 1e7).toFixed(1)}Cr`;
    if (n >= 1e5) return `₹${+(n / 1e5).toFixed(1)}L`;
    if (n >= 1e3) return `₹${+(n / 1e3).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
};

// Analytics Card Component
function AnalyticsCard({ title, value, sub, extra, icon, color = "blue" }) {
    const bgClasses = {
        blue: "bg-blue-50",
        green: "bg-green-50",
        purple: "bg-purple-50",
        orange: "bg-orange-50",
        emerald: "bg-emerald-50",
    };

    const textClasses = {
        blue: "text-blue-700",
        green: "text-green-700",
        purple: "text-purple-700",
        orange: "text-orange-700",
        emerald: "text-emerald-700",
    };

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-ui font-medium text-slate-600">{title}</p>
                    <p className="text-h2 font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
                    {sub && <p className="text-ui font-medium mt-2 text-slate-600">{sub}</p>}
                    {extra && <p className="text-small mt-1 text-slate-500">{extra}</p>}
                </div>
                <div
                    className={cn(
                        "w-12 h-12 shrink-0 rounded-lg flex items-center justify-center",
                        bgClasses[color]
                    )}
                >
                    {React.createElement(icon, { className: cn("w-6 h-6", textClasses[color]), "aria-hidden": true })}
                </div>
            </div>
        </div>
    );
}

const otherCurrencies = (list) =>
    list?.length ? `Also ${list.map((o) => fmtMoney(o.total, o.currency)).join(", ")} (not included)` : null;

// Revenue chart: online and offline sales per month (last 6 India-time months)
function RevenueChart({ months }) {
    const max = Math.max(0, ...months.flatMap((m) => [m.online, m.offline]));
    const series = [
        { key: "online", label: "Online", bar: "bg-blue-500", dot: "bg-blue-500" },
        { key: "offline", label: "Offline sales", bar: "bg-emerald-500", dot: "bg-emerald-500" },
    ];

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-h3 font-semibold text-slate-900">Revenue Overview</h3>
                <div className="flex items-center gap-4 text-small text-slate-600">
                    {series.map((s) => (
                        <span key={s.key} className="inline-flex items-center gap-1.5">
                            <span className={cn("h-2.5 w-2.5 rounded-sm", s.dot)} aria-hidden="true" />
                            {s.label}
                        </span>
                    ))}
                </div>
            </div>
            {max === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-ui text-slate-500">
                    No revenue in the last 6 months yet.
                </div>
            ) : (
                <div className="flex h-64 items-end gap-3" role="list" aria-label="Revenue by month">
                    {months.map((m) => (
                        <div
                            key={m.period}
                            role="listitem"
                            aria-label={`${m.month}: online ${fmtMoney(m.online)}, offline ${fmtMoney(m.offline)}`}
                            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                        >
                            <div className="flex w-full flex-1 items-end justify-center gap-1">
                                {series.map((s) => (
                                    <div key={s.key} className="flex h-full w-1/2 max-w-[36px] flex-col items-center justify-end">
                                        {m[s.key] > 0 && (
                                            <span className="mb-1 text-[11px] font-medium text-slate-700 tabular-nums">
                                                {fmtShort(m[s.key])}
                                            </span>
                                        )}
                                        <div
                                            title={`${s.label}: ${fmtMoney(m[s.key])}`}
                                            className={cn("w-full rounded-t-md", s.bar)}
                                            style={{ height: m[s.key] > 0 ? `max(4px, ${(m[s.key] / max) * 85}%)` : 0 }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <span className="text-small text-slate-600">{m.month}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Recent Payments Table Component
function RecentPaymentsTable({ payments }) {
    const navigate = useNavigate();

    const getStatusBadge = (status) => {
        const styles = {
            success: "bg-green-100 text-green-800",
            pending: "bg-yellow-100 text-yellow-800",
            failed: "bg-red-100 text-red-800",
        };

        return (
            <span
                className={cn(
                    "px-2 py-1 text-small font-medium rounded-full",
                    styles[status] || "bg-slate-100 text-slate-800"
                )}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-h3 font-semibold text-slate-900">Recent Payments</h3>
                <button
                    onClick={() => navigate("/admin/payments")}
                    className="text-ui text-blue-600 hover:text-blue-700 font-medium"
                >
                    View All
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 text-ui font-medium text-slate-700">User</th>
                            <th className="text-left py-3 px-4 text-ui font-medium text-slate-700">Course</th>
                            <th className="text-left py-3 px-4 text-ui font-medium text-slate-700">Amount</th>
                            <th className="text-left py-3 px-4 text-ui font-medium text-slate-700">Status</th>
                            <th className="text-left py-3 px-4 text-ui font-medium text-slate-700">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((payment) => (
                            <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4 text-ui text-slate-900">{payment.user}</td>
                                <td className="py-3 px-4 text-ui text-slate-900">{payment.course}</td>
                                <td className="py-3 px-4 text-ui font-medium text-slate-900">
                                    {fmtMoney(payment.amount, payment.currency)}
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                                <td className="py-3 px-4 text-ui text-slate-600">{payment.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Pending Reviews Component
function PendingReviews({ reviews }) {
    const navigate = useNavigate();

    const handleApproveReview = async (reviewId) => {
        try {
            await reviewService.approveReview(reviewId);
            // Refresh reviews data
            window.location.reload();
        } catch (error) {
            console.error("Error approving review:", error);
        }
    };

    const handleRejectReview = async (reviewId) => {
        try {
            await reviewService.rejectReview(reviewId);
            // Refresh reviews data
            window.location.reload();
        } catch (error) {
            console.error("Error rejecting review:", error);
        }
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={14}
                className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"}
            />
        ));
    };

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-h3 font-semibold text-slate-900">Pending Reviews</h3>
                <button
                    onClick={() => navigate("/admin/reviews")}
                    className="text-ui text-blue-600 hover:text-blue-700 font-medium"
                >
                    View All
                </button>
            </div>
            <div className="space-y-4">
                {reviews.map((review) => (
                    <div key={review.id} className="border-b border-slate-100 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-ui font-medium text-slate-900">{review.user}</span>
                                    <div className="flex items-center gap-1">
                                        {renderStars(review.rating)}
                                    </div>
                                </div>
                                <p className="text-ui text-slate-600 mb-1">{review.course}</p>
                                <p className="text-ui text-slate-700">{review.comment}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleApproveReview(review.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Approve Review"
                                >
                                    <UserCheck size={16} />
                                </button>
                                <button
                                    onClick={() => handleRejectReview(review.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Reject Review"
                                >
                                    <AlertCircle size={16} />
                                </button>
                            </div>
                        </div>
                        <p className="text-small text-slate-500 mt-2">{review.date}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Quick Actions Component
function QuickActions() {
    const navigate = useNavigate();

    const actions = [
        { title: "Create Course", icon: BookOpen, color: "blue", href: "/admin/courses" },
        { title: "Manage Users", icon: Users, color: "green", href: "/admin/users" },
        { title: "Enrollments", icon: CreditCard, color: "purple", href: "/admin/enrollments" },
        { title: "Contact", icon: AlertCircle, color: "orange", href: "/admin/contact" },
    ];

    const getColorClasses = (color) => {
        const colorMap = {
            blue: "bg-blue-100 text-blue-600",
            green: "bg-green-100 text-green-600",
            purple: "bg-purple-100 text-purple-600",
            orange: "bg-orange-100 text-orange-600",
        };
        return colorMap[color] || "bg-slate-100 text-slate-600";
    };

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-h3 font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
                {actions.map((action) => (
                    <button
                        key={action.title}
                        onClick={() => navigate(action.href)}
                        className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(action.color)}`}
                        >
                            <action.icon className="w-5 h-5" />
                        </div>
                        <span className="text-ui font-medium text-slate-900">{action.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const myRole = useSelector(selectUser)?.role;
    const canSeeCrm = TEAM_MANAGER_ROLES.includes(myRole);
    const isSuper = myRole === "super_admin"; // revenue is for Super Admins only
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalCourses: 0,
        publishedCourses: 0,
        newUsersThisMonth: null,
        newCoursesThisMonth: null,
    });
    const [revenue, setRevenue] = useState(null);
    const [recentPayments, setRecentPayments] = useState([]);
    const [pendingReviews, setPendingReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Load dashboard stats
                let dashboardStats = {};
                let statsErr = null;
                try {
                    const statsResponse = await adminService.getDashboardStats();
                    dashboardStats = statsResponse.data?.data || statsResponse.data || {};
                } catch (err) {
                    statsErr = err;
                    console.error("Dashboard stats error:", err);
                }

                // 2. Load revenue data
                let revenueData = {};
                if (isSuper) {
                    try {
                        const revenueResponse = await paymentService.getRevenueStats();
                        revenueData = revenueResponse.data?.data || revenueResponse.data || {};
                    } catch (revErr) {
                        console.warn("Revenue stats not available:", revErr);
                    }
                }

                // If primary stats endpoint returned 404 and no data was resolved, show friendly message
                if (
                    statsErr &&
                    statsErr.response?.status === 404 &&
                    Object.keys(dashboardStats).length === 0
                ) {
                    setError(
                        "Dashboard API endpoints not available. Please make sure the backend is configured."
                    );
                }

                const n = (v) => (v == null ? null : Number(v));
                setStats({
                    totalUsers: dashboardStats.totalUsers ?? dashboardStats.total_users ?? 0,
                    activeUsers: dashboardStats.activeUsers ?? dashboardStats.active_users ?? 0,
                    totalCourses: dashboardStats.totalCourses ?? dashboardStats.total_courses ?? 0,
                    publishedCourses:
                        dashboardStats.publishedCourses ?? dashboardStats.published_courses ?? 0,
                    newUsersThisMonth: n(dashboardStats.new_users_this_month),
                    newCoursesThisMonth: n(dashboardStats.new_courses_this_month),
                });

                // Online and offline sales revenue (Super Admins only)
                setRevenue(revenueData.online ? revenueData : null);

                // 3. Load recent payments
                try {
                    const paymentsResponse = await paymentService.getRecentPayments(5);
                    const rawPayments =
                        paymentsResponse.data?.data?.payments ||
                        paymentsResponse.data?.data ||
                        paymentsResponse.data ||
                        [];
                    const payments = Array.isArray(rawPayments) ? rawPayments : [];
                    setRecentPayments(
                        payments.map((payment) => ({
                            id: payment.id,
                            user:
                                payment.student_name ||
                                payment.user?.name ||
                                payment.userName ||
                                "Unknown User",
                            course:
                                payment.course_title ||
                                payment.course?.title ||
                                payment.courseName ||
                                "Unknown Course",
                            amount: payment.amount || 0,
                            currency: payment.currency || "INR",
                            status: payment.status || "unknown",
                            date: payment.created_at
                                ? new Date(payment.created_at).toLocaleDateString()
                                : "Invalid Date",
                        }))
                    );
                } catch (payErr) {
                    console.warn("Recent payments error:", payErr);
                    setRecentPayments([]);
                }

                // 4. Load pending reviews
                try {
                    const reviewsResponse = await reviewService.getPendingReviews(5);
                    const rawReviews =
                        reviewsResponse.data?.data?.reviews ||
                        reviewsResponse.data?.data ||
                        reviewsResponse.data ||
                        [];
                    const reviews = Array.isArray(rawReviews) ? rawReviews : [];
                    setPendingReviews(
                        reviews.map((review) => ({
                            id: review.id,
                            user:
                                review.user_name ||
                                review.student_name ||
                                review.user?.name ||
                                "Unknown User",
                            course: review.course_title || review.course?.title || "Unknown Course",
                            rating: review.rating || 0,
                            comment: review.comment || "",
                            date: review.created_at
                                ? new Date(review.created_at).toLocaleDateString()
                                : "Invalid Date",
                        }))
                    );
                } catch (reviewError) {
                    console.warn("Pending reviews error:", reviewError);
                    setPendingReviews([]);
                }
            } catch (err) {
                console.error("Error loading dashboard data:", err);
                if (err.response?.status === 404) {
                    setError(
                        "Dashboard API endpoints not available. Please make sure the backend is configured."
                    );
                } else {
                    setError("Failed to load dashboard data");
                }
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [isSuper]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-slate-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-600" />
                        <div>
                            <h3 className="text-h3 font-medium text-red-900">Error Loading Dashboard</h3>
                            <p className="text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-h2 font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">
                    Welcome back! Here's what's happening with your platform today.
                </p>
            </div>

            {/* Analytics Cards */}
            <div
                className={cn(
                    "grid grid-cols-1 md:grid-cols-2 gap-6",
                    isSuper ? "lg:grid-cols-3 2xl:grid-cols-5" : "lg:grid-cols-3"
                )}
            >
                <AnalyticsCard
                    title="Total Users"
                    value={stats.totalUsers.toLocaleString("en-IN")}
                    sub={stats.newUsersThisMonth != null ? `+${stats.newUsersThisMonth.toLocaleString("en-IN")} this month` : null}
                    icon={Users}
                    color="blue"
                />
                <AnalyticsCard
                    title="Active Users"
                    value={stats.activeUsers.toLocaleString("en-IN")}
                    icon={UserCheck}
                    color="green"
                />
                {isSuper && (
                    <AnalyticsCard
                        title="Online revenue"
                        value={revenue ? fmtMoney(revenue.online.total) : "—"}
                        sub={
                            revenue &&
                            `${fmtMoney(revenue.online.this_month)} this month · ${revenue.online.count.toLocaleString("en-IN")} ${revenue.online.count === 1 ? "payment" : "payments"}`
                        }
                        extra={revenue && otherCurrencies(revenue.online.other_currencies)}
                        icon={IndianRupee}
                        color="purple"
                    />
                )}
                {isSuper && (
                    <AnalyticsCard
                        title="Offline sales revenue"
                        value={revenue ? fmtMoney(revenue.offline.total) : "—"}
                        sub={
                            revenue &&
                            `${fmtMoney(revenue.offline.this_month)} this month · ${revenue.offline.count.toLocaleString("en-IN")} ${revenue.offline.count === 1 ? "lead" : "leads"}`
                        }
                        extra={
                            revenue &&
                            (otherCurrencies(revenue.offline.other_currencies) ?? "CRM leads: Payment Done or Course Done")
                        }
                        icon={Handshake}
                        color="emerald"
                    />
                )}
                <AnalyticsCard
                    title="Published Courses"
                    value={stats.publishedCourses}
                    sub={stats.newCoursesThisMonth ? `+${stats.newCoursesThisMonth} this month` : null}
                    icon={BookOpen}
                    color="orange"
                />
            </div>

            {/* Exams and open applications (Admins: the CRM) */}
            {canSeeCrm && <ExamPipelineCard />}

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {isSuper ? (
                        <RevenueChart months={revenue?.months ?? []} />
                    ) : (
                        <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-ui text-slate-500">
                            Revenue is visible to Super Admins only.
                        </div>
                    )}
                </div>
                <div>
                    <QuickActions />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isSuper && <RecentPaymentsTable payments={recentPayments} />}
                <PendingReviews reviews={pendingReviews} />
            </div>
        </div>
    );
}

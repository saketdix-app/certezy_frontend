import { useState, useEffect, useCallback } from "react";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import {
    Search,
    Send,
    CheckCircle,
    Copy,
    Users,
    Mail,
    X,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RotateCw,
    Link2,
    Clock,
    BadgeCheck,
    TimerOff,
    Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import courseService from "@/services/courseService";
import authService from "@/services/authService";
import discountService from "@/services/discountService";
import { formatMoney } from "@/lib/format";
import SearchPicker from "@/components/admin/SearchPicker";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = [6, 12, 24, 48, 72, 168];
const PER_PAGE = 10;

const STATUS = {
    active: { label: "Active", bg: "#F0FDF4", color: "#16A34A", icon: Clock },
    used: { label: "Used", bg: "#EBF4FF", color: "#3282B8", icon: BadgeCheck },
    expired: { label: "Expired", bg: "#FEF2F2", color: "#DC2626", icon: TimerOff },
};

const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] text-slate-800 outline-none focus:border-[#3282B8] focus:bg-white transition-colors";

const pct = (base, offer) => {
    const b = Number(base);
    const o = Number(offer);
    return b > 0 && o >= 0 && o < b ? Math.round(((b - o) / b) * 100) : 0;
};

const hoursLabel = (h) => (h % 24 === 0 ? `${h / 24} day${h === 24 ? "" : "s"}` : `${h} hours`);

const formatDateTime = (v) =>
    v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const copy = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success("Link copied");
    } catch {
        toast.error("Could not copy — select the link and copy it");
    }
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
    const [historyKey, setHistoryKey] = useState(0);

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Discount Links</h1>
                    <p className="text-slate-600 text-sm">
                        Send a personal offer by email, then track which links were used, are still active or
                        have expired.
                    </p>
                </div>
                <SendDiscountForm onSent={() => setHistoryKey((k) => k + 1)} />
                <SentLinks refreshKey={historyKey} />
            </div>
        </div>
    );
}

// ─── Send form ────────────────────────────────────────────────────────────────

function SendDiscountForm({ onSent }) {
    const [loading, setLoading] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    // "student" = pick a registered student, "email" = anyone, by email address
    const [recipientMode, setRecipientMode] = useState("student");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [priceUsd, setPriceUsd] = useState("");
    const [priceInr, setPriceInr] = useState("");
    // Rupee price follows the dollar discount until the admin types their own
    const [inrEdited, setInrEdited] = useState(false);
    const [expiryHours, setExpiryHours] = useState(24);
    const [sent, setSent] = useState(null);

    const loadCourses = useCallback(async (search) => {
        const { data } = await courseService.getAll({ search: search || undefined, limit: 30 });
        return (data?.data ?? []).filter((c) => c.pricing_type !== "free" && Number(c.price) > 0);
    }, []);

    const loadStudents = useCallback(async (search) => {
        const { data } = await authService.getAllUsers({
            role: "student",
            search: search || undefined,
            limit: 30,
        });
        return data?.data ?? [];
    }, []);

    const usdBase = Number(selectedCourse?.price || 0);
    const inrBase = Number(selectedCourse?.price_inr || 0);
    // Rupee price only for courses that sell in rupees (Admin → Courses)
    const sellsInr = Boolean(selectedCourse?.inr_enabled) && inrBase > 0;

    const onUsdChange = (value) => {
        setPriceUsd(value);
        if (!inrEdited && usdBase > 0 && inrBase > 0) {
            const v = Number(value);
            setPriceInr(
                value === "" || !(v >= 0) ? "" : String(Math.max(1, Math.round((inrBase * v) / usdBase)))
            );
        }
    };

    const reset = () => {
        setSelectedCourse(null);
        setSelectedStudent(null);
        setRecipientEmail("");
        setPriceUsd("");
        setPriceInr("");
        setInrEdited(false);
        setExpiryHours(24);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const email = recipientEmail.trim();
        if (!selectedCourse) return toast.error("Choose a course");
        if (recipientMode === "student" ? !selectedStudent : !email)
            return toast.error(recipientMode === "student" ? "Choose a student" : "Enter an email address");
        if (recipientMode === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return toast.error("Please enter a valid email address");
        const usd = Number(priceUsd);
        const inr = !sellsInr || priceInr === "" ? null : Number(priceInr);
        if (!(usd >= 0) || priceUsd === "" || usd >= usdBase)
            return toast.error(`US price must be lower than ${formatMoney(usdBase, "USD")}`);
        if (inr != null && inrBase > 0 && !(inr >= 1 && inr < inrBase))
            return toast.error(`India price must be lower than ${formatMoney(inrBase, "INR")}`);

        setLoading(true);
        try {
            const { data } = await discountService.createDiscountLink({
                ...(recipientMode === "student" ? { user_id: selectedStudent.id } : { email }),
                course_id: selectedCourse.id,
                discount_price: usd,
                discount_price_inr: inr,
                expiry_hours: expiryHours,
            });
            const r = data?.data ?? {};
            setSent({ email: r.student_email, isRegistered: r.is_registered, link: r.offer_url || "" });
            toast.success("Discount link sent");
            reset();
            onSent?.();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send discount");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {sent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Discount link sent</h3>
                        <p className="text-slate-600 text-sm mb-4">
                            Emailed to <strong>{sent.email}</strong>.{" "}
                            {sent.isRegistered === false
                                ? "They don't have an account yet — the link lets them sign up with this email and pay the discounted price."
                                : "They can open the link, sign in and pay the discounted price."}{" "}
                            You can also copy the link and share it yourself.
                        </p>
                        {sent.link && (
                            <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={sent.link}
                                    readOnly
                                    className="flex-1 bg-transparent text-xs text-slate-700 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => copy(sent.link)}
                                    aria-label="Copy link"
                                    className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-slate-600" />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setSent(null)}
                            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#3282B8]"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-8"
                style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
            >
                <div className="space-y-6">
                    <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                        <Send className="w-4 h-4 text-[#3282B8]" /> Send a new discount link
                    </h2>

                    {/* Course */}
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Course</label>
                        {selectedCourse ? (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-3 items-center">
                                <CourseThumbnail
                                    src={selectedCourse.thumbnail}
                                    title={selectedCourse.title}
                                    className="w-20 rounded-lg shrink-0"
                                    compact
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm truncate">
                                        {selectedCourse.title}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {formatMoney(usdBase, "USD")}
                                        {inrBase > 0 && ` · ${formatMoney(inrBase, "INR")} in India`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCourse(null);
                                        setPriceUsd("");
                                        setPriceInr("");
                                        setInrEdited(false);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                    aria-label="Change course"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <SearchPicker
                                placeholder="Search courses by title…"
                                load={loadCourses}
                                onSelect={setSelectedCourse}
                                emptyText="No paid courses match"
                                renderItem={(c) => (
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[13px] font-medium text-slate-800 truncate">
                                            {c.title}
                                        </span>
                                        <span className="text-[12px] text-slate-500 shrink-0">
                                            {formatMoney(c.price, "USD")}
                                            {Number(c.price_inr) > 0 &&
                                                ` · ${formatMoney(c.price_inr, "INR")}`}
                                        </span>
                                    </div>
                                )}
                            />
                        )}
                    </div>

                    {/* Recipient */}
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Send to</label>
                        <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 text-[12.5px] font-semibold">
                            {[
                                ["student", "Registered student", Users],
                                ["email", "Any email address", Mail],
                            ].map(([mode, label, Icon]) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setRecipientMode(mode)}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors",
                                        recipientMode === mode
                                            ? "bg-white text-[#3282B8] shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" /> {label}
                                </button>
                            ))}
                        </div>

                        {recipientMode === "email" ? (
                            <div>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        placeholder="person@example.com"
                                        className={cn(inputCls, "pl-10")}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                                    Works for people without an account. We email them a link; they sign up
                                    (or sign in) with this email and pay the discounted price. Only this email
                                    address can use the offer.
                                </p>
                            </div>
                        ) : selectedStudent ? (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3282B8] to-[#0a1628] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                    {selectedStudent.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm truncate">
                                        {selectedStudent.name}
                                    </p>
                                    <p className="text-slate-500 text-xs truncate">{selectedStudent.email}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                    aria-label="Change student"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <SearchPicker
                                placeholder="Search student by name or email…"
                                icon={Users}
                                load={loadStudents}
                                onSelect={setSelectedStudent}
                                emptyText="No students match — try “Any email address”"
                                renderItem={(s) => (
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-slate-800 truncate">
                                            {s.name}
                                        </p>
                                        <p className="text-[12px] text-slate-500 truncate">{s.email}</p>
                                    </div>
                                )}
                            />
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Pricing: US$ for everyone outside India, ₹ for India */}
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                            Discounted price
                        </label>
                        <div className={cn("grid grid-cols-1 gap-3", sellsInr && "sm:grid-cols-2")}>
                            <PriceField
                                label={sellsInr ? "Outside India (US$)" : "Price (US$)"}
                                symbol="$"
                                base={usdBase}
                                currency="USD"
                                value={priceUsd}
                                onChange={onUsdChange}
                                disabled={!selectedCourse}
                            />
                            {sellsInr && (
                                <PriceField
                                    label="India (₹)"
                                    symbol="₹"
                                    base={inrBase}
                                    currency="INR"
                                    value={priceInr}
                                    onChange={(v) => {
                                        setInrEdited(true);
                                        setPriceInr(v);
                                    }}
                                    disabled={!selectedCourse}
                                    hint={
                                        selectedCourse && !inrEdited && priceInr
                                            ? "Same % off as the US price — edit to set your own"
                                            : null
                                    }
                                />
                            )}
                        </div>
                        <p className="mt-2 text-[11.5px] text-slate-500">
                            {sellsInr
                                ? "Visitors from India see and pay the ₹ price (Razorpay); everyone else pays the US$ price (PayPal)."
                                : "This course is sold in US$ to everyone (PayPal)."}
                        </p>
                    </div>

                    {/* Expiry */}
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                            Link expires in
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {EXPIRY_OPTIONS.map((hours) => (
                                <button
                                    key={hours}
                                    type="button"
                                    onClick={() => setExpiryHours(hours)}
                                    className={cn(
                                        "py-2 px-3 rounded-xl text-xs font-medium transition-colors",
                                        expiryHours === hours
                                            ? "bg-[#3282B8] text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    {hoursLabel(hours)}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="number"
                                value={expiryHours}
                                onChange={(e) => setExpiryHours(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                max="720"
                                className={cn(inputCls, "w-28")}
                                aria-label="Custom expiry in hours"
                            />
                            <span className="text-[12.5px] text-slate-500">hours (custom)</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={reset}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#3282B8] disabled:opacity-60"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" /> Send discount link
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}

function PriceField({ label, symbol, base, currency, value, onChange, disabled, hint }) {
    const off = pct(base, value);
    const tooHigh = value !== "" && base > 0 && Number(value) >= base;
    return (
        <div>
            <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <span className="text-[11px] text-slate-400">
                    was {base > 0 ? formatMoney(base, currency) : "—"}
                </span>
            </div>
            <div
                className={cn(
                    inputCls,
                    "flex items-center gap-2",
                    disabled && "opacity-60",
                    tooHigh && "border-red-300"
                )}
            >
                <span className="text-slate-400 font-semibold">{symbol}</span>
                <input
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Offer price"
                    min="0"
                    step="any"
                    disabled={disabled}
                    className="flex-1 min-w-0 bg-transparent outline-none"
                />
                {off > 0 && (
                    <span className="text-[11px] font-bold text-green-700 bg-green-50 rounded-md px-1.5 py-0.5 shrink-0">
                        {off}% off
                    </span>
                )}
            </div>
            {tooHigh ? (
                <p className="mt-1 text-[11px] text-red-600">
                    Must be lower than {formatMoney(base, currency)}
                </p>
            ) : hint ? (
                <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
            ) : null}
        </div>
    );
}

// ─── Sent links: status counts, search, copy, resend ──────────────────────────

function SentLinks({ refreshKey }) {
    const [rows, setRows] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [resendTarget, setResendTarget] = useState(null);
    const search = useDebounce(searchInput.trim(), 300);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await discountService.getAllAdmin({
                page,
                limit: PER_PAGE,
                status: status || undefined,
                search: search || undefined,
            });
            setRows(data?.data?.discounts ?? []);
            setStats(data?.data?.stats ?? null);
            setTotal(data?.pagination?.total ?? 0);
        } catch {
            toast.error("Could not load discount links");
        } finally {
            setLoading(false);
        }
    }, [page, status, search]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    const totalPages = Math.ceil(total / PER_PAGE);
    const cards = [
        { key: "", label: "All links", value: stats?.total, icon: Link2, color: "#3282B8", bg: "#EBF4FF" },
        { key: "active", label: "Active", value: stats?.active, ...STATUS.active },
        { key: "used", label: "Used (discount availed)", value: stats?.used, ...STATUS.used },
        { key: "expired", label: "Expired", value: stats?.expired, ...STATUS.expired },
    ];

    return (
        <section className="space-y-4">
            <h2 className="text-[17px] font-bold text-slate-900">Sent discount links</h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map(({ key, label, value, icon: Icon, color, bg }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => {
                            setStatus(key);
                            setPage(1);
                        }}
                        aria-pressed={status === key}
                        className={cn(
                            "text-left bg-white rounded-2xl border p-4 transition-all flex items-center gap-3",
                            status === key
                                ? "border-[#3282B8] ring-2 ring-[#3282B8]/15"
                                : "border-slate-100 hover:border-slate-200"
                        )}
                    >
                        <span
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: bg }}
                        >
                            <Icon className="w-[18px] h-[18px]" style={{ color }} />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
                                {label}
                            </span>
                            <span className="block text-[22px] font-extrabold text-slate-900 leading-tight">
                                {value ?? "—"}
                            </span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => {
                        setSearchInput(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search by student, email or course…"
                    className={cn(inputCls, "pl-10 bg-white")}
                />
            </div>

            <div
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
            >
                {loading && rows.length === 0 ? (
                    <div className="flex justify-center py-14">
                        <Loader2 className="w-6 h-6 animate-spin text-[#3282B8]" />
                    </div>
                ) : rows.length === 0 ? (
                    <p className="text-center py-14 text-sm text-slate-500">No discount links found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {["Sent to", "Course", "Offer price", "Status", "Sent", ""].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((d) => {
                                    const st = STATUS[d.status] ?? STATUS.active;
                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {d.is_email_only ? "Not registered yet" : d.student_name}
                                                </p>
                                                <p className="text-xs text-slate-500">{d.student_email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-800 max-w-[220px]">
                                                <p className="truncate">{d.course_title}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                <p className="font-semibold text-slate-900">
                                                    {formatMoney(d.discount_price, "USD")}{" "}
                                                    <span className="text-xs font-normal text-slate-400 line-through">
                                                        {formatMoney(d.original_price, "USD")}
                                                    </span>
                                                </p>
                                                {d.discount_price_inr != null && (
                                                    <p className="text-xs text-slate-600">
                                                        {formatMoney(d.discount_price_inr, "INR")} in India
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                    style={{ background: st.bg, color: st.color }}
                                                >
                                                    {st.label}
                                                </span>
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    {d.status === "used"
                                                        ? `on ${formatDateTime(d.used_at)}`
                                                        : `${d.status === "expired" ? "ended" : "until"} ${formatDateTime(d.expires_at)}`}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                                {formatDateTime(d.created_at)}
                                                {d.sent_count > 1 && (
                                                    <p className="text-[11px] text-slate-400">
                                                        sent {d.sent_count}× · last{" "}
                                                        {formatDateTime(d.last_sent_at)}
                                                    </p>
                                                )}
                                                {d.created_by_name && (
                                                    <p className="text-[11px] text-slate-400">
                                                        by {d.created_by_name}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => copy(d.offer_url)}
                                                        title="Copy link"
                                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    {d.status !== "used" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setResendTarget(d)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-[#3282B8] hover:bg-[#EBF4FF]"
                                                        >
                                                            <RotateCw className="w-3.5 h-3.5" /> Resend
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <p className="text-sm text-slate-600">
                            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                aria-label="Previous page"
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                aria-label="Next page"
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {resendTarget && (
                <ResendModal
                    link={resendTarget}
                    onClose={() => setResendTarget(null)}
                    onDone={() => {
                        setResendTarget(null);
                        load();
                    }}
                />
            )}
        </section>
    );
}

function ResendModal({ link, onClose, onDone }) {
    const expired = link.status === "expired";
    // Expired links need a new expiry; active ones keep theirs unless changed
    const [hours, setHours] = useState(expired ? 24 : 0);
    const [busy, setBusy] = useState(false);

    const send = async () => {
        setBusy(true);
        try {
            const { data } = await discountService.resend(link.id, hours ? { extend_hours: hours } : {});
            toast.success(data?.message || "Offer sent again");
            onDone();
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not resend");
        } finally {
            setBusy(false);
        }
    };

    const options = expired ? EXPIRY_OPTIONS : [0, ...EXPIRY_OPTIONS];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <h3 className="text-lg font-bold text-slate-900">Resend this offer</h3>
                <p className="text-sm text-slate-600 mt-1">
                    The same link goes to <b>{link.student_email}</b> for <b>{link.course_title}</b> at{" "}
                    {formatMoney(link.discount_price, "USD")}
                    {link.discount_price_inr != null && ` / ${formatMoney(link.discount_price_inr, "INR")}`}.
                </p>

                <p className="text-[13px] font-semibold text-slate-700 mt-5 mb-2">
                    {expired ? "This link has expired. New expiry:" : "Expiry"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {options.map((h) => (
                        <button
                            key={h}
                            type="button"
                            onClick={() => setHours(h)}
                            className={cn(
                                "py-2 rounded-xl text-xs font-medium",
                                hours === h
                                    ? "bg-[#3282B8] text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {h === 0 ? "Keep current" : hoursLabel(h)}
                        </button>
                    ))}
                </div>
                {!expired && hours === 0 && (
                    <p className="text-[11.5px] text-slate-500 mt-2">
                        Valid until {formatDateTime(link.expires_at)}
                    </p>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={send}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#3282B8] disabled:opacity-60"
                    >
                        {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RotateCw className="w-4 h-4" />
                        )}
                        Send again
                    </button>
                </div>
            </div>
        </div>
    );
}

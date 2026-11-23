import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
    AlertTriangle,
    CheckCircle2,
    History,
    KeyRound,
    PauseCircle,
    PlayCircle,
    SlidersHorizontal,
    Loader2,
    Mail,
    Pencil,
    Search,
    ShieldCheck,
    ShieldOff,
    UserPlus,
    X,
} from "lucide-react";

import teamService from "@/services/teamService";
import HandoverDialog from "@/components/team/HandoverDialog";
import { selectUser } from "@/features/auth/authSlice";
import { ROLE_LABELS } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * Admin → Team (2.0 phase 1). Staff accounts, the delegated
 * "May create Super Admin accounts" privilege, and the audit log.
 * The server enforces every rule; this page only shows what's allowed.
 */

const ROLE_FILTERS = [
    ["", "All"],
    ["super_admin", "Super Admins"],
    ["admin", "Admins"],
    ["sub_admin", "Sub-Admins"],
    ["consultant", "Consultants"],
    ["exam_coordinator", "Exam Coordinators"],
];

const ROLE_BADGE = {
    super_admin: "bg-violet-50 text-violet-700 border-violet-200",
    admin: "bg-blue-50 text-blue-700 border-blue-200",
    sub_admin: "bg-sky-50 text-sky-700 border-sky-200",
    consultant: "bg-emerald-50 text-emerald-700 border-emerald-200",
    exam_coordinator: "bg-amber-50 text-amber-800 border-amber-200",
    student: "bg-slate-50 text-slate-600 border-slate-200",
};

const ACTION_LABELS = {
    "user.create": "Created account",
    "super_admin.create": "Created Super Admin",
    "super_admin.promote": "Made Super Admin",
    "user.role_change": "Changed role",
    "user.update": "Edited details",
    "user.activate": "Unblocked account",
    "user.deactivate": "Blocked account",
    "user.delete": "Deleted account",
    "user.invite_resend": "Resent invitation",
    "privilege.grant": "Granted Super Admin creation",
    "privilege.revoke": "Revoked Super Admin creation",
    "permissions.update": "Changed permissions",
    "permissions.delete": "Removed permissions",
    "allocation.pause": "Paused lead allocation",
    "allocation.resume": "Resumed lead allocation",
    "allocation.update": "Changed lead allocation",
};

// Per-person permissions for Sub-Admins and Consultants (Admins have them all)
const PERMISSION_INFO = {
    can_assign_courses: ["Assign courses", "Give students access to courses"],
    can_send_discounts: ["Discount links", "Create and send discount links"],
    can_issue_certificates: ["Certificates", "Issue and regenerate certificates for eligible students"],
    can_manage_students: ["Students", "View and manage student accounts"],
    can_view_payments: ["Payments", "View payments and revenue"],
    can_manage_courses: ["Courses", "Create and edit courses, curriculum and reviews"],
    can_manage_tests: ["Tests", "Create and edit quizzes and exams"],
    // Sub-Admin feature areas
    can_access_crm: ["CRM", "Leads, follow-ups, By consultant and Sales — work every lead like an Admin"],
    can_assign_leads: ["Lead assignment", "Distribution, assign and transfer leads, hand over (needs CRM)"],
    can_view_crm_reports: ["CRM reports", "Conversion, sources, consultants and exams (revenue stays Super Admin only)"],
    can_manage_team: ["Account management", "Add and manage Consultants and Exam Coordinators in Team"],
    can_manage_batches: ["Live batches", "Add and publish live batches, see enrollments"],
};
// Shown for Sub-Admins only (Consultants work their own leads)
const SUB_ADMIN_ONLY = ["can_access_crm", "can_assign_leads", "can_view_crm_reports", "can_manage_team", "can_manage_batches"];
const keysFor = (role, keys) => (role === "sub_admin" ? keys : keys.filter((k) => !SUB_ADMIN_ONLY.includes(k)));

const ALLOCATION_BADGE = {
    receiving: ["Receiving leads", "text-emerald-700"],
    paused: ["Leads paused", "text-amber-700"],
    on_leave: ["On leave", "text-slate-500"],
};

const apiMessage = (err, fallback) => err.response?.data?.message || fallback;
const fmt = (d) =>
    d
        ? new Date(d).toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
          })
        : "—";

const inputCls =
    "w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui outline-none focus:border-action";

function RoleBadge({ role }) {
    return (
        <span
            className={cn(
                "inline-flex rounded-md border px-2 py-0.5 text-label font-semibold",
                ROLE_BADGE[role] ?? ROLE_BADGE.student
            )}
        >
            {ROLE_LABELS[role] ?? role}
        </span>
    );
}

function Modal({ title, onClose, children, wide }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cn(
                    "max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl",
                    wide ? "max-w-2xl" : "max-w-md"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 className="text-h3 font-bold text-slate-900">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function PasswordField({ value, onChange }) {
    return (
        <label className="mt-4 block">
            <span className="mb-1 block text-ui font-semibold text-slate-700">Confirm with your password</span>
            <input
                type="password"
                autoComplete="current-password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputCls}
            />
            <span className="mt-1 block text-small text-slate-500">
                Sensitive changes need your password again, so nobody can make them from an unattended session.
            </span>
        </label>
    );
}

/** Confirm a sensitive action, optionally asking for the password again. */
function ConfirmModal({ title, warning, confirmLabel, danger, needsPassword, onConfirm, onClose }) {
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        if (needsPassword && !password) return toast.error("Enter your password");
        setBusy(true);
        try {
            await onConfirm(password);
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "That didn't work. Please try again."));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal title={title} onClose={onClose}>
            <form onSubmit={submit}>
                <div
                    className={cn(
                        "flex gap-2.5 rounded-xl border p-3 text-ui leading-relaxed",
                        danger ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"
                    )}
                >
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div>{warning}</div>
                </div>
                {needsPassword && <PasswordField value={password} onChange={setPassword} />}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-ui font-bold text-white disabled:opacity-60",
                            danger ? "bg-red-600 hover:bg-red-700" : "bg-action hover:bg-action-hover"
                        )}
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function PermissionChecklist({ keys, value, onChange }) {
    const groups = [
        ["Learning & students", keys.filter((k) => !SUB_ADMIN_ONLY.includes(k))],
        ["CRM, team & batches", keys.filter((k) => SUB_ADMIN_ONLY.includes(k))],
    ].filter(([, list]) => list.length);
    return groups.map(([title, list]) => (
        <fieldset key={title} className="mb-3 space-y-1.5">
            {groups.length > 1 && <legend className="mb-1 text-label font-bold uppercase tracking-wide text-slate-500">{title}</legend>}
            {list.map((k) => (
                <label key={k} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <input
                        type="checkbox"
                        checked={Boolean(value[k])}
                        onChange={(e) => onChange({ ...value, [k]: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-action"
                    />
                    <span>
                        <span className="block text-ui font-semibold text-slate-800">{PERMISSION_INFO[k]?.[0] ?? k}</span>
                        <span className="block text-small text-slate-500">{PERMISSION_INFO[k]?.[1]}</span>
                    </span>
                </label>
            ))}
        </fieldset>
    ));
}

function PermissionsModal({ member, keys, onClose, onDone }) {
    const [value, setValue] = useState(member.permissions ?? {});
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            // Every key is sent; areas not shown for this role stay off
            const shown = keysFor(member.role, keys);
            await teamService.setPermissions(member.id, Object.fromEntries(keys.map((k) => [k, shown.includes(k) && Boolean(value[k])])));
            toast.success("Permissions updated");
            onDone();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not update permissions"));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal title={`Permissions — ${member.name}`} onClose={onClose}>
            <form onSubmit={submit}>
                <p className="mb-3 text-ui text-slate-500">
                    What this {ROLE_LABELS[member.role]} can do. Changes apply on their next action and are recorded
                    in the audit log.
                </p>
                <PermissionChecklist keys={keysFor(member.role, keys)} value={value} onChange={setValue} />
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60">
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        Save permissions
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function AllocationModal({ member, onClose, onDone }) {
    const a = member.allocation ?? {};
    const [form, setForm] = useState({
        accepting_leads: a.accepting_leads ?? true,
        paused_reason: a.paused_reason ?? "",
        on_leave_from: a.on_leave_from ? String(a.on_leave_from).slice(0, 10) : "",
        on_leave_until: a.on_leave_until ? String(a.on_leave_until).slice(0, 10) : "",
        daily_limit: a.daily_limit ?? "",
        open_limit: a.open_limit ?? "",
    });
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const num = (v) => (v === "" || v == null ? null : Number(v));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await teamService.setAllocation(member.id, {
                accepting_leads: form.accepting_leads,
                paused_reason: form.accepting_leads ? null : form.paused_reason,
                on_leave_from: form.on_leave_until ? form.on_leave_from || null : null,
                on_leave_until: form.on_leave_until || null,
                daily_limit: num(form.daily_limit),
                open_limit: num(form.open_limit),
            });
            toast.success("Lead allocation updated");
            onDone();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not update lead allocation"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={`Lead allocation — ${member.name}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <span>
                        <span className="block text-ui font-semibold text-slate-800">Receive new leads</span>
                        <span className="block text-small text-slate-500">
                            Off = skipped by automatic distribution. Existing leads stay with them.
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        checked={form.accepting_leads}
                        onChange={(e) => setForm((f) => ({ ...f, accepting_leads: e.target.checked }))}
                        className="h-5 w-5 accent-action"
                    />
                </label>
                {!form.accepting_leads && (
                    <label className="block">
                        <span className="mb-1 block text-ui font-semibold text-slate-700">Reason (optional)</span>
                        <input value={form.paused_reason} onChange={set("paused_reason")} placeholder="Training week" className={inputCls} />
                    </label>
                )}
                <fieldset>
                    <legend className="mb-1 text-ui font-semibold text-slate-700">Leave (optional)</legend>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="mb-1 block text-small text-slate-500">From</span>
                            <input type="date" value={form.on_leave_from} onChange={set("on_leave_from")} className={inputCls} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-small text-slate-500">Until</span>
                            <input type="date" value={form.on_leave_until} min={form.on_leave_from || undefined} onChange={set("on_leave_until")} className={inputCls} />
                        </label>
                    </div>
                    <span className="mt-1 block text-small text-slate-500">
                        No new leads go to them from the first to the last day (both included). Leave "From" empty to start today. Their existing leads stay with them; use Hand over to move them.
                    </span>
                    {(form.on_leave_from || form.on_leave_until) && (
                        <button type="button" onClick={() => setForm((f) => ({ ...f, on_leave_from: "", on_leave_until: "" }))} className="mt-1 text-small font-semibold text-action hover:underline">
                            Clear leave
                        </button>
                    )}
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-1 block text-ui font-semibold text-slate-700">New leads per day</span>
                        <input type="number" min="0" value={form.daily_limit} onChange={set("daily_limit")} placeholder="No limit" className={inputCls} />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-ui font-semibold text-slate-700">Max open leads</span>
                        <input type="number" min="0" value={form.open_limit} onChange={set("open_limit")} placeholder="No limit" className={inputCls} />
                    </label>
                </div>
                <p className="text-small text-slate-500">Round Robin and new-lead routing follow these settings.</p>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60">
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        Save
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function CreateMemberModal({ roles, permissionKeys = [], defaults = {}, onClose, onCreated }) {
    const [form, setForm] = useState({ name: "", email: "", mobile: "", role: roles[roles.length - 1] ?? "" });
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const isSuper = form.role === "super_admin";
    const hasPermissions = Boolean(defaults[form.role]);
    const [perms, setPerms] = useState({});
    // Role defaults until the person ticks something themselves
    const shownPerms = perms[form.role] ?? Object.fromEntries((defaults[form.role] ?? []).map((k) => [k, true]));

    const submit = async (e) => {
        e.preventDefault();
        if (form.name.trim().length < 2) return toast.error("Enter the person's name");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("Enter a valid email");
        if (isSuper && !password) return toast.error("Enter your password to create a Super Admin");
        setBusy(true);
        try {
            const { data } = await teamService.create({
                ...form,
                ...(isSuper && { password }),
                ...(hasPermissions && {
                    permissions: Object.fromEntries(permissionKeys.map((k) => [k, Boolean(shownPerms[k])])),
                }),
            });
            toast.success(data?.message || "Invitation sent");
            onCreated();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not create the account"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title="Add team member" onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <label className="block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">Full name</span>
                    <input value={form.name} onChange={set("name")} className={inputCls} autoFocus />
                </label>
                <label className="block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">Email</span>
                    <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">Phone (optional)</span>
                    <input value={form.mobile} onChange={set("mobile")} placeholder="+91 98765 43210" className={inputCls} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">Role</span>
                    <select value={form.role} onChange={set("role")} className={inputCls}>
                        {roles.map((r) => (
                            <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                            </option>
                        ))}
                    </select>
                </label>
                {hasPermissions && (
                    <div>
                        <span className="mb-1 block text-ui font-semibold text-slate-700">Permissions</span>
                        <PermissionChecklist
                            keys={keysFor(form.role, permissionKeys)}
                            value={shownPerms}
                            onChange={(v) => setPerms((p) => ({ ...p, [form.role]: v }))}
                        />
                    </div>
                )}
                {isSuper && (
                    <>
                        <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-ui text-amber-900">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                            Super Admins can do everything, including managing other Super Admins. All Super
                            Admins are notified by email.
                        </div>
                        <PasswordField value={password} onChange={setPassword} />
                    </>
                )}
                <p className="text-small text-slate-500">
                    They'll get an email invitation to set their own password (valid 72 hours). No password is
                    sent by email.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        Send invitation
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function EditMemberModal({ member, isSelf, onClose, onDone }) {
    const [form, setForm] = useState({ name: member.name ?? "", email: member.email ?? "", mobile: member.mobile ?? "" });
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const emailChanged = form.email.trim().toLowerCase() !== String(member.email ?? "").toLowerCase();
    // Same rule as the server: your own email, or an Admin's / Super Admin's
    const needsPassword = emailChanged && (isSelf || ["super_admin", "admin"].includes(member.role));

    const submit = async (e) => {
        e.preventDefault();
        if (form.name.trim().length < 2) return toast.error("Enter the person's name");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("Enter a valid email");
        if (needsPassword && !password) return toast.error("Enter your password to change this email");
        const body = {};
        if (form.name.trim() !== member.name) body.name = form.name.trim();
        if (emailChanged) body.email = form.email.trim();
        if (form.mobile.trim() !== (member.mobile ?? "")) body.mobile = form.mobile.trim();
        if (!Object.keys(body).length) return onClose();
        setBusy(true);
        try {
            await teamService.update(member.id, { ...body, ...(needsPassword && { password }) });
            toast.success(emailChanged ? "Details saved. Both email addresses have been notified." : "Details saved");
            onDone();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not save the changes"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={`Edit details — ${member.name}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <label className="block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">Full name</span>
                    <input value={form.name} onChange={set("name")} className={inputCls} autoFocus />
                </label>
                <label className="block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">Email (used to sign in)</span>
                    <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
                </label>
                {emailChanged && (
                    <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-ui text-amber-900">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                            {isSelf ? "You" : "They"} will sign in with <b>{form.email.trim() || "the new email"}</b> from now on. The old and
                            the new address both get an email about this change.
                        </span>
                    </div>
                )}
                <label className="block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">Phone (optional)</span>
                    <input value={form.mobile} onChange={set("mobile")} placeholder="+91 98765 43210" className={inputCls} />
                </label>
                {needsPassword && <PasswordField value={password} onChange={setPassword} />}
                <p className="text-small text-slate-500">To change the role, use Change role. Every change is recorded in the audit log.</p>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        Save changes
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function ChangeRoleModal({ member, roles, onClose, onDone }) {
    // Only Super Admins (who can create Admins) may remove staff access entirely
    const options = [...roles, ...(roles.includes("admin") ? ["student"] : [])].filter((r) => r !== member.role);
    const [role, setRole] = useState(options[0] ?? "");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const sensitive = ["super_admin", "admin"].includes(role) || ["super_admin", "admin"].includes(member.role);

    const submit = async (e) => {
        e.preventDefault();
        if (sensitive && !password) return toast.error("Enter your password");
        setBusy(true);
        try {
            await teamService.changeRole(member.id, { role, ...(sensitive && { password }) });
            toast.success(`${member.name} is now ${ROLE_LABELS[role]}`);
            onDone();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not change the role"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={`Change role — ${member.name}`} onClose={onClose}>
            <form onSubmit={submit}>
                <p className="text-ui text-slate-600">
                    Current role: <RoleBadge role={member.role} />
                </p>
                <label className="mt-4 block">
                    <span className="mb-1 block text-ui font-semibold text-slate-700">New role</span>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                        {options.map((r) => (
                            <option key={r} value={r}>
                                {r === "student" ? "Student (remove staff access)" : ROLE_LABELS[r]}
                            </option>
                        ))}
                    </select>
                </label>
                {member.role === "admin" && member.super_admin_grant && (
                    <p className="mt-2 text-small text-amber-700">
                        Their "May create Super Admin accounts" privilege will be revoked.
                    </p>
                )}
                {sensitive && <PasswordField value={password} onChange={setPassword} />}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy || !role}
                        className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60"
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        Change role
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function HistoryModal({ member, onClose }) {
    const [detail, setDetail] = useState(null);
    const [logs, setLogs] = useState(null);
    useEffect(() => {
        teamService.get(member.id).then(({ data }) => setDetail(data.data)).catch(() => setDetail({ grants: [] }));
        teamService
            .audit({ target_id: member.id, limit: 50 })
            .then(({ data }) => setLogs(data.data.logs))
            .catch(() => setLogs([]));
    }, [member.id]);

    return (
        <Modal title={`${member.name} — history`} onClose={onClose} wide>
            <div className="grid gap-x-6 gap-y-2 text-ui sm:grid-cols-2">
                <p><span className="text-slate-500">Email:</span> {member.email}</p>
                <p><span className="text-slate-500">Role:</span> <RoleBadge role={member.role} /></p>
                <p><span className="text-slate-500">Status:</span> {member.is_active ? "Active" : "Blocked"}</p>
                <p><span className="text-slate-500">Last active:</span> {fmt(member.last_active_at)}</p>
                <p><span className="text-slate-500">Added:</span> {fmt(member.created_at)}</p>
            </div>

            <h3 className="mt-5 mb-2 text-ui font-bold text-slate-900">Delegated privileges</h3>
            {!detail ? (
                <Loader2 size={16} className="animate-spin text-slate-500" />
            ) : detail.grants?.length ? (
                <ul className="space-y-1.5 text-ui">
                    {detail.grants.map((g) => (
                        <li key={g.id} className="rounded-lg border border-slate-200 px-3 py-2">
                            <b>May create Super Admin accounts</b> — granted by {g.granted_by ?? "—"} on {fmt(g.granted_at)}
                            {g.revoked_at ? `; revoked by ${g.revoked_by ?? "—"} on ${fmt(g.revoked_at)}` : " (active)"}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-ui text-slate-500">None.</p>
            )}

            <h3 className="mt-5 mb-2 text-ui font-bold text-slate-900">Account activity</h3>
            <AuditTable logs={logs} compact />
        </Modal>
    );
}

function AuditTable({ logs, compact }) {
    if (!logs) return <Loader2 size={16} className="animate-spin text-slate-500" />;
    if (!logs.length) return <p className="text-ui text-slate-500">No recorded actions yet.</p>;
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-ui">
                <thead className="bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2">Who</th>
                        <th className="px-3 py-2">Action</th>
                        {!compact && <th className="px-3 py-2">Account</th>}
                        <th className="px-3 py-2">Result</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {logs.map((l) => (
                        <tr key={l.id}>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-500">{fmt(l.created_at)}</td>
                            <td className="px-3 py-2">
                                {l.actor_name ?? "System"}
                                {l.actor_role && <span className="text-slate-500"> · {ROLE_LABELS[l.actor_role] ?? l.actor_role}</span>}
                            </td>
                            <td className="px-3 py-2">
                                {ACTION_LABELS[l.action] ?? l.action}
                                {l.details?.from && l.details?.to && (
                                    <span className="text-slate-500">
                                        {" "}({ROLE_LABELS[l.details.from] ?? l.details.from} → {ROLE_LABELS[l.details.to] ?? l.details.to})
                                    </span>
                                )}
                                {l.result !== "success" && l.details?.reason && (
                                    <span className="block text-small text-slate-500">{l.details.reason}</span>
                                )}
                            </td>
                            {!compact && <td className="px-3 py-2">{l.target_name ?? l.details?.email ?? "—"}</td>}
                            <td className="px-3 py-2">
                                <span
                                    className={cn(
                                        "rounded-md px-2 py-0.5 text-label font-semibold",
                                        l.result === "success" && "bg-emerald-50 text-emerald-700",
                                        l.result === "denied" && "bg-red-50 text-red-700",
                                        l.result === "failed" && "bg-amber-50 text-amber-700"
                                    )}
                                >
                                    {l.result === "success" ? "Done" : l.result === "denied" ? "Refused" : "Failed"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AuditLogTab() {
    const [action, setAction] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    useEffect(() => {
        teamService
            .audit({ action: action || undefined, page, limit: 50 })
            .then(({ data }) => setData(data.data))
            .catch((err) => {
                toast.error(apiMessage(err, "Could not load the audit log"));
                setData({ logs: [], pagination: { totalPages: 1 } });
            });
    }, [action, page]);

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
                <select
                    value={action}
                    onChange={(e) => {
                        setAction(e.target.value);
                        setPage(1);
                    }}
                    className={cn(inputCls, "w-auto")}
                    aria-label="Filter by action"
                >
                    <option value="">All actions</option>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <p className="text-small text-slate-500">
                    Entries can't be edited or deleted. Refused attempts are recorded too.
                </p>
            </div>
            <AuditTable logs={data?.logs} />
            {data?.pagination?.totalPages > 1 && (
                <div className="mt-3 flex items-center justify-end gap-2 text-ui">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">
                        Previous
                    </button>
                    <span>
                        Page {page} of {data.pagination.totalPages}
                    </span>
                    <button
                        disabled={page >= data.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

export default function TeamPage() {
    const me = useSelector(selectUser);
    const [tab, setTab] = useState("members");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [members, setMembers] = useState(null);
    const [caps, setCaps] = useState(null);
    const [modal, setModal] = useState(null); // { type, member }

    const load = useCallback(async () => {
        try {
            const { data } = await teamService.list({
                role: role || undefined,
                status: status || undefined,
                search: search.trim() || undefined,
            });
            setMembers(data.data.members);
            setCaps(data.data.me);
        } catch (err) {
            toast.error(apiMessage(err, "Could not load the team"));
            setMembers([]);
        }
    }, [role, status, search]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    const isSuper = caps?.role === "super_admin";
    const canCreate = caps?.can_create_roles?.length > 0;
    const close = () => setModal(null);

    const canManage = (m) =>
        m.id !== me?.id && (isSuper || ["sub_admin", "consultant", "exam_coordinator"].includes(m.role));

    return (
        <div className="mx-auto max-w-[1300px]">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Team</h1>
                    <p className="mt-1 text-ui text-slate-500">
                        Super Admins, Admins, Sub-Admins, Consultants and Exam Coordinators. Every change is recorded in the audit log.
                    </p>
                </div>
                {canCreate && (
                    <button
                        type="button"
                        onClick={() => setModal({ type: "create" })}
                        className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-ui font-bold text-white hover:bg-action-hover"
                    >
                        <UserPlus size={16} aria-hidden="true" /> Add team member
                    </button>
                )}
            </div>

            {caps?.role === "admin" && caps?.can_create_roles?.includes("super_admin") && (
                <p className="mb-4 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-ui text-violet-800">
                    <KeyRound size={15} aria-hidden="true" /> A Super Admin has allowed you to create Super Admin accounts.
                </p>
            )}

            <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist">
                {[
                    ["members", "Members"],
                    ...(caps?.can_view_audit ? [["audit", "Audit log"]] : []),
                ].map(([key, label]) => (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={cn(
                            "-mb-px border-b-2 px-4 py-2 text-ui font-semibold",
                            tab === key ? "border-action text-action" : "border-transparent text-slate-500 hover:text-slate-800"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === "audit" ? (
                <AuditLogTab />
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {ROLE_FILTERS.map(([value, label]) => (
                            <button
                                key={value || "all"}
                                onClick={() => setRole(value)}
                                className={cn(
                                    "rounded-full border px-3 py-1.5 text-small font-semibold",
                                    role === value ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 bg-surface text-slate-600"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-small"
                            aria-label="Filter by status"
                        >
                            <option value="">Any status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Blocked</option>
                        </select>
                        <div className="relative ml-auto w-full sm:w-64">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or email"
                                aria-label="Search team"
                                className={cn(inputCls, "pl-9")}
                            />
                        </div>
                    </div>

                    {!members ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="animate-spin text-slate-500" />
                        </div>
                    ) : !members.length ? (
                        <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-ui text-slate-500">
                            No team members match these filters.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
                            <table className="w-full min-w-[860px] text-left text-ui">
                                <thead className="bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Member</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Super Admin creation</th>
                                        <th className="px-4 py-3">Last active</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((m) => (
                                        <tr key={m.id} className={cn(!m.is_active && "bg-slate-50/60")}>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-slate-900">
                                                    {m.name}
                                                    {m.id === me?.id && <span className="ml-1.5 text-label font-normal text-slate-500">(you)</span>}
                                                </p>
                                                <p className="text-small text-slate-500">{m.email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <RoleBadge role={m.role} />
                                            </td>
                                            <td className="px-4 py-3">
                                                {m.invite_pending ? (
                                                    <span className="text-small font-semibold text-amber-700">Invitation sent</span>
                                                ) : m.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-small font-semibold text-emerald-700">
                                                        <CheckCircle2 size={13} aria-hidden="true" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="text-small font-semibold text-red-700">Blocked</span>
                                                )}
                                                {m.allocation && m.is_active && (
                                                    <span className={cn("mt-0.5 block text-label font-semibold", ALLOCATION_BADGE[m.allocation.state]?.[1])}>
                                                        {ALLOCATION_BADGE[m.allocation.state]?.[0]}
                                                        {m.allocation.state === "on_leave" && ` until ${fmt(m.allocation.on_leave_until).split(",")[0]}`}
                                                    </span>
                                                )}
                                                {m.allocation?.leave_planned && (
                                                    <span className="block text-label font-semibold text-slate-500">
                                                        Leave {fmt(m.allocation.on_leave_from).split(",")[0]} – {fmt(m.allocation.on_leave_until).split(",")[0]}
                                                    </span>
                                                )}
                                                {(m.open_leads > 0 || m.open_exams > 0) && (
                                                    <span className={cn("block text-label", m.is_active ? "text-slate-500" : "font-semibold text-amber-700")}>
                                                        {[m.open_leads && `${m.open_leads} open leads`, m.open_exams && `${m.open_exams} open exams`].filter(Boolean).join(" · ")}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-small">
                                                {m.role === "super_admin" ? (
                                                    <span className="text-slate-500">Yes (Super Admin)</span>
                                                ) : m.super_admin_grant ? (
                                                    <span className="text-violet-700">
                                                        <b>Allowed</b> · by {m.super_admin_grant.granted_by} · {fmt(m.super_admin_grant.granted_at)}
                                                    </span>
                                                ) : m.role === "admin" ? (
                                                    <span className="text-slate-500">Not allowed</span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-small text-slate-500">{fmt(m.last_active_at)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    <ActionBtn icon={History} label="History" onClick={() => setModal({ type: "history", member: m })} />
                                                    {(canManage(m) || m.id === me?.id) && (
                                                        <ActionBtn icon={Pencil} label="Edit" onClick={() => setModal({ type: "edit", member: m })} />
                                                    )}
                                                    {isSuper && m.role === "admin" && m.is_active && (
                                                        <ActionBtn
                                                            icon={m.super_admin_grant ? ShieldOff : ShieldCheck}
                                                            label={m.super_admin_grant ? "Revoke SA creation" : "Allow SA creation"}
                                                            onClick={() => setModal({ type: m.super_admin_grant ? "revoke" : "grant", member: m })}
                                                        />
                                                    )}
                                                    {canManage(m) && (
                                                        <>
                                                            {m.invite_pending && (
                                                                <ActionBtn icon={Mail} label="Resend invite" onClick={() => setModal({ type: "resend", member: m })} />
                                                            )}
                                                            {["sub_admin", "consultant"].includes(m.role) && (
                                                                <ActionBtn
                                                                    icon={SlidersHorizontal}
                                                                    label="Permissions"
                                                                    onClick={() => setModal({ type: "permissions", member: m })}
                                                                />
                                                            )}
                                                            {m.role === "consultant" && (
                                                                <ActionBtn
                                                                    icon={m.allocation?.accepting_leads === false ? PlayCircle : PauseCircle}
                                                                    label="Lead settings"
                                                                    onClick={() => setModal({ type: "allocation", member: m })}
                                                                />
                                                            )}
                                                            <ActionBtn label="Change role" onClick={() => setModal({ type: "role", member: m })} />
                                                            {(m.open_leads > 0 || m.open_exams > 0) && (
                                                                <ActionBtn label="Hand over" onClick={() => setModal({ type: "handover", member: m })} />
                                                            )}
                                                            <ActionBtn
                                                                label={m.is_active ? "Block" : "Unblock"}
                                                                danger={m.is_active}
                                                                onClick={() => setModal({ type: m.is_active ? "block" : "status", member: m })}
                                                            />
                                                            <ActionBtn label="Delete" danger onClick={() => setModal({ type: "delete", member: m })} />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {modal?.type === "create" && (
                <CreateMemberModal
                    roles={caps.can_create_roles}
                    permissionKeys={caps.permission_keys}
                    defaults={caps.default_permissions}
                    onClose={close}
                    onCreated={load}
                />
            )}
            {modal?.type === "permissions" && (
                <PermissionsModal member={modal.member} keys={caps.permission_keys ?? []} onClose={close} onDone={load} />
            )}
            {modal?.type === "allocation" && <AllocationModal member={modal.member} onClose={close} onDone={load} />}
            {modal?.type === "history" && <HistoryModal member={modal.member} onClose={close} />}
            {modal?.type === "edit" && (
                <EditMemberModal member={modal.member} isSelf={modal.member.id === me?.id} onClose={close} onDone={load} />
            )}
            {modal?.type === "role" && (
                <ChangeRoleModal member={modal.member} roles={caps.can_create_roles} onClose={close} onDone={load} />
            )}
            {modal?.type === "grant" && (
                <ConfirmModal
                    title="Allow this Admin to create Super Admins?"
                    warning={
                        <>
                            <b>{modal.member.name}</b> will be able to create new Super Admin accounts, who can do
                            everything — including managing you. They can't pass this permission on. All Super
                            Admins are notified, and you can revoke it at any time.
                        </>
                    }
                    confirmLabel="Allow"
                    needsPassword
                    onConfirm={async (password) => {
                        await teamService.grantSuperAdminCreate(modal.member.id, password);
                        toast.success("Privilege granted");
                        load();
                    }}
                    onClose={close}
                />
            )}
            {modal?.type === "revoke" && (
                <ConfirmModal
                    title="Revoke Super Admin creation?"
                    warning={
                        <>
                            <b>{modal.member.name}</b> will no longer be able to create Super Admins, starting
                            immediately. Super Admins they already created keep their accounts.
                        </>
                    }
                    confirmLabel="Revoke"
                    danger
                    needsPassword
                    onConfirm={async (password) => {
                        await teamService.revokeSuperAdminCreate(modal.member.id, password);
                        toast.success("Privilege revoked");
                        load();
                    }}
                    onClose={close}
                />
            )}
            {["block", "delete", "handover"].includes(modal?.type) && (
                <HandoverDialog member={modal.member} purpose={modal.type} onClose={close} onDone={load} />
            )}
            {modal?.type === "status" && (
                <ConfirmModal
                    title={modal.member.is_active ? `Block ${modal.member.name}?` : `Unblock ${modal.member.name}?`}
                    warning={
                        modal.member.is_active
                            ? "They'll be signed out everywhere and can't sign in until reactivated. Their records stay."
                            : "They'll be able to sign in again with their existing password."
                    }
                    confirmLabel={modal.member.is_active ? "Block" : "Unblock"}
                    danger={modal.member.is_active}
                    onConfirm={async () => {
                        await teamService.setStatus(modal.member.id, !modal.member.is_active);
                        toast.success(modal.member.is_active ? "Account blocked" : "Account unblocked");
                        load();
                    }}
                    onClose={close}
                />
            )}
            {modal?.type === "resend" && (
                <ConfirmModal
                    title="Resend invitation?"
                    warning={`A new set-password link (valid 72 hours) goes to ${modal.member.email}. Earlier links stop working.`}
                    confirmLabel="Send"
                    onConfirm={async () => {
                        await teamService.resendInvite(modal.member.id);
                        toast.success("Invitation sent");
                    }}
                    onClose={close}
                />
            )}
        </div>
    );
}

function ActionBtn({ icon: Icon, label, onClick, danger }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-small font-semibold transition-colors",
                danger
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
        >
            {Icon && <Icon size={13} aria-hidden="true" />}
            {label}
        </button>
    );
}

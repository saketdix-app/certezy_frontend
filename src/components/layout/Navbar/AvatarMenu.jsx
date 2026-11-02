import { Link } from "react-router-dom";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { useDispatch } from "react-redux";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { logoutUser } from "@/features/auth/authSlice";
import { ADMIN_PANEL_ITEM, STUDENT_MENU_ITEMS } from "./navbar.data";
import { isAdminRole } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * AvatarMenu.jsx
 *
 * Props:
 *   user → { name, email, role } from Redux auth state
 *
 * Real project mein index.jsx mein:
 *   const user = useSelector(selectUser)
 *   <AvatarMenu user={user} />
 *
 * Logout: POST /api/v1/auth/logout
 */
export default function AvatarMenu({ user }) {
    const dispatch = useDispatch();

    // Initials from name — "Arjun Sharma" → "AS"
    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const isAdmin = isAdminRole(user.role);
    const items = isAdmin ? [ADMIN_PANEL_ITEM, { divider: true }, ...STUDENT_MENU_ITEMS] : STUDENT_MENU_ITEMS;

    const handleLogout = async () => {
        try {
            await dispatch(logoutUser());
        } finally {
            window.location.href = "/";
        }
    };

    return (
        <DropdownMenu>
            {/* ── Avatar trigger ── */}
            <DropdownMenuTrigger
                className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded outline-none",
                    "border border-transparent",
                    "hover:bg-primary-light hover:border-primary",
                    "data-[state=open]:bg-primary-light data-[state=open]:border-primary",
                    "transition-all duration-200"
                )}
            >
                {/* Initials circle */}
                <div className="w-[30px] h-[30px] rounded-full shrink-0 bg-primary flex items-center justify-center text-white text-[11.5px] font-bold">
                    {initials}
                </div>

                {/* First name — hidden on small screens */}
                <span className="hidden sm:block text-[13.5px] font-semibold text-text-primary max-w-[80px] truncate">
                    {user.name.split(" ")[0]}
                </span>

                {/* Chevron */}
                <ChevronDown
                    size={13}
                    className="text-text-muted transition-transform duration-200 data-[state=open]:rotate-180"
                />
            </DropdownMenuTrigger>

            {/* ── Dropdown ── */}
            <DropdownMenuContent
                align="end"
                className="min-w-[210px] rounded-lg shadow-drop border-border p-1"
            >
                {/* User info */}
                <div className="px-3 py-2.5 border-b border-border mb-1">
                    <p className="text-[13.5px] font-semibold text-text-primary truncate flex items-center gap-1.5">
                        <span className="truncate">{user.name}</span>
                        {isAdmin && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white bg-primary rounded px-1.5 py-0.5">
                                {user.role === "sub_admin" ? "Sub-admin" : "Admin"}
                            </span>
                        )}
                    </p>
                    <p className="text-[12px] text-text-muted truncate">{user.email}</p>
                </div>

                {/* Menu items */}
                {items.map((item, i) =>
                    item.divider ? (
                        <DropdownMenuSeparator key={i} className="bg-border my-1" />
                    ) : item.danger ? (
                        // Logout — dispatch action
                        <DropdownMenuItem
                            key={i}
                            onClick={handleLogout}
                            className="text-[13.5px] font-medium text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer rounded"
                        >
                            {item.label}
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem key={i} asChild>
                            <Link
                                to={item.to}
                                className={cn(
                                    "text-[13.5px] font-medium cursor-pointer w-full rounded",
                                    item.admin
                                        ? "text-primary font-semibold flex items-center gap-2"
                                        : "text-text-primary"
                                )}
                            >
                                {item.admin && <ShieldCheck size={15} />}
                                {item.label}
                            </Link>
                        </DropdownMenuItem>
                    )
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

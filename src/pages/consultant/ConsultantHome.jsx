import { useDispatch, useSelector } from "react-redux";
import { BarChart3, LogOut } from "lucide-react";

import Logo from "@/components/shared/Logo";
import { logoutUser, selectUser } from "@/features/auth/authSlice";

/**
 * Consultant landing page. The sales workspace (My Leads, Follow-ups, Sales…)
 * is 2.0 phase 3; until then consultants see this page after signing in.
 */
export default function ConsultantHome() {
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
        <main className="min-h-screen bg-[#F1F5F9] flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-white border border-slate-100 p-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
                <Logo to="/" height={30} className="mx-auto mb-6" />
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6F1FB]">
                    <BarChart3 size={22} className="text-[#3282B8]" aria-hidden="true" />
                </div>
                <h1 className="text-[20px] font-extrabold text-slate-900">Welcome, {user?.name?.split(" ")[0]}</h1>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
                    Your consultant account is active. Your sales workspace with leads, follow-ups and sales
                    tracking is being set up — you'll see it here as soon as it's ready.
                </p>
                <button
                    type="button"
                    onClick={logout}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <LogOut size={15} aria-hidden="true" /> Sign out
                </button>
            </div>
        </main>
    );
}

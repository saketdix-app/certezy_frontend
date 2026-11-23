import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Clock } from "lucide-react";

import authService from "@/services/authService";
import { logoutUser } from "@/features/auth/authSlice";

const PING_EVERY_MS = 60 * 1000; // tell the server "still here" at most once a minute
const WARN_BEFORE_MS = 60 * 1000;
const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];

/**
 * Idle sign-out (the server enforces it too): Super Admins after 15 minutes
 * without activity, everyone else after 60. While someone uses the page we ping
 * the server so the session stays alive; a minute before the limit we warn.
 */
export default function IdleSession() {
    const dispatch = useDispatch();
    const user = useSelector((s) => s.auth.user);
    const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);
    const limitMs = (user?.idle_minutes ?? 60) * 60 * 1000;
    const lastActive = useRef(Date.now());
    const lastPing = useRef(Date.now());
    const [left, setLeft] = useState(null); // seconds left, while warning

    const signOut = useCallback(async () => {
        try {
            await dispatch(logoutUser());
        } finally {
            const redirect = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.assign(`/login?reason=idle&redirect=${redirect}`);
        }
    }, [dispatch]);

    const stillHere = useCallback(() => {
        lastActive.current = Date.now();
        setLeft(null);
        if (Date.now() - lastPing.current > PING_EVERY_MS) {
            lastPing.current = Date.now();
            authService.activity().catch(() => {});
        }
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return undefined;
        lastActive.current = Date.now();
        // Activity in any tab counts (shared through localStorage)
        const onActivity = () => {
            stillHere();
            try {
                localStorage.setItem("certezy.lastActive", String(Date.now()));
            } catch {
                /* private mode */
            }
        };
        const onStorage = (e) => {
            if (e.key === "certezy.lastActive") {
                lastActive.current = Number(e.newValue) || Date.now();
                setLeft(null);
            }
        };
        EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
        window.addEventListener("storage", onStorage);
        const tick = setInterval(() => {
            const idle = Date.now() - lastActive.current;
            if (idle >= limitMs) signOut();
            else if (idle >= limitMs - WARN_BEFORE_MS) setLeft(Math.ceil((limitMs - idle) / 1000));
        }, 1000);
        return () => {
            EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
            window.removeEventListener("storage", onStorage);
            clearInterval(tick);
        };
    }, [isLoggedIn, limitMs, stillHere, signOut]);

    if (!isLoggedIn || left === null) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
            <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-2xl">
                <Clock size={34} className="mx-auto text-amber-500" aria-hidden="true" />
                <h2 id="idle-title" className="mt-3 text-h3 font-extrabold text-slate-900">
                    Still there?
                </h2>
                <p className="mt-1.5 text-ui text-slate-600">
                    For security you&rsquo;ll be signed out in <b>{left}s</b> because there&rsquo;s been no activity.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                    <button type="button" onClick={signOut} className="rounded-lg border border-slate-200 px-4 py-2 text-ui font-semibold text-slate-700">
                        Sign out
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={() => {
                            lastPing.current = 0;
                            stillHere();
                        }}
                        className="rounded-lg bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover"
                    >
                        Stay signed in
                    </button>
                </div>
            </div>
        </div>
    );
}

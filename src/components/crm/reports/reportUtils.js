import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { apiMessage } from "@/lib/crm";

/** Helpers for CRM → Reports (IST days, durations, CSV). */

const IST = "Asia/Kolkata";
export const istDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);
const shift = (day, n) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86400e3).toISOString().slice(0, 10);
const mondayOf = (day) => shift(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

export const PERIODS = [
    ["today", "Today", () => [istDay(), istDay()]],
    ["yesterday", "Yesterday", () => [shift(istDay(), -1), shift(istDay(), -1)]],
    ["week", "This week", () => [mondayOf(istDay()), istDay()]],
    ["last_week", "Last week", () => [shift(mondayOf(istDay()), -7), shift(mondayOf(istDay()), -1)]],
    ["7d", "Last 7 days", () => [shift(istDay(), -6), istDay()]],
    ["month", "This month", () => [`${istDay().slice(0, 8)}01`, istDay()]],
    ["30d", "Last 30 days", () => [shift(istDay(), -29), istDay()]],
];

export const fmtDur = (sec) => {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};
export const fmtMin = (min) => {
    if (min == null) return "—";
    if (min < 60) return `${min}m`;
    if (min < 1440) return `${Math.floor(min / 60)}h ${min % 60}m`;
    return `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`;
};
export const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: IST }) : "—";
export const fmtDay = (day) => new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: IST });

export const defaultFilters = (period = "today") => {
    const [from, to] = PERIODS.find(([k]) => k === period)[2]();
    return { period, from, to, user_ids: "" };
};

/** Loads a report whenever the filters (or extra params) change. */
export function useReport(fetcher, params) {
    const [state, setState] = useState({ key: null, data: null });
    const key = JSON.stringify(params);
    useEffect(() => {
        let live = true;
        const p = Object.fromEntries(Object.entries(JSON.parse(key)).filter(([k, v]) => v !== "" && v != null && k !== "period"));
        fetcher(p)
            .then(({ data: res }) => live && setState({ key, data: res.data }))
            .catch((err) => {
                if (!live) return;
                toast.error(apiMessage(err, "Could not load the report"));
                setState((s) => ({ ...s, key }));
            });
        return () => {
            live = false;
        };
    }, [fetcher, key]);
    return { data: state.data, loading: state.key !== key };
}

const csvCell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const downloadCsv = (name, columns, rows, totals) => {
    const text = (c, r) => (c.csv ? c.csv(r) : c.text ? c.text(r) : r[c.key]);
    const lines = [columns.map((c) => csvCell(c.label)).join(",")];
    rows.forEach((r, i) => lines.push(columns.map((c) => csvCell(c.key === "_sr" ? i + 1 : text(c, r))).join(",")));
    if (totals) lines.push(columns.map((c, i) => csvCell(i === 0 ? "Total" : c.key === "_sr" || c.noTotal ? "" : text(c, totals))).join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
};


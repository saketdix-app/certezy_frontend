import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Trophy } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { ExportButton, Kpi, ReportFilters, ReportTable } from "./reportShared";
import { defaultFilters, downloadCsv, fmtDay, fmtDur, useReport } from "./reportUtils";

const person = { key: "name", label: "Consultant", align: "left", noTotal: true, text: (r) => (r.name ? <span className="font-semibold text-slate-800">{r.name}</span> : ""), csv: (r) => r.name ?? "" };

const COLUMNS = [
    { key: "_sr", label: "#" },
    person,
    { key: "leads", label: "Leads received", heat: "load" },
    { key: "first_contacts", label: "First contacts", hint: "Leads contacted for the first time in this period.", heat: "good" },
    { key: "calls", label: "Calls", heat: "good" },
    { key: "connected", label: "Connected", heat: "good" },
    { key: "long_calls", label: "2 min+ calls", heat: "good" },
    { key: "talk", label: "Talk time", text: (r) => fmtDur(r.talk), heat: "good" },
    { key: "fu_done", label: "Follow-ups done", heat: "good" },
    { key: "fu_missed", label: "Follow-ups missed", heat: "bad", tone: (r) => (r.fu_missed ? "text-red-700 font-semibold" : "") },
    { key: "applications", label: "Applications", hint: "Applications submitted in this period.", heat: "good" },
    { key: "exams_scheduled", label: "Exams scheduled", hint: "Exams scheduled to take place in this period.", heat: "good" },
    { key: "exams_done", label: "Exams done", heat: "good" },
    { key: "exams_passed", label: "Passed", heat: "good" },
    { key: "payments", label: "Payments done", heat: "good" },
    { key: "closed_lost", label: "Not interested / junk", hint: "Leads closed as Not Interested or Junk in this period." },
    { key: "open_now", label: "Open now", hint: "Right now: their leads not closed or done." },
];

const LEADERS = [
    ["first_contacts", "Most leads contacted"],
    ["long_calls", "Most 2 min+ calls"],
    ["exams_done", "Most exams done"],
    ["payments", "Most payments"],
];

const IST = "Asia/Kolkata";
const dayParts = (day) => {
    const d = new Date(`${day}T00:00:00+05:30`);
    return {
        week: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: IST }),
        date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST }),
    };
};
const fmtCount = (v) => (v >= 10000 ? `${+(v / 1000).toFixed(1)}K` : v.toLocaleString("en-IN"));

/** One metric per day, on its own scale, with the number on each bar. */
function DayRow({ title, series, value, inner, barCls, innerCls, legend, showNumbers }) {
    const max = Math.max(1, ...series.map(value));
    return (
        <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-small font-semibold text-slate-700">{title}</p>
                {legend}
            </div>
            <div className="flex h-28 items-end gap-1 border-b border-slate-200">
                {series.map((s) => {
                    const v = value(s);
                    const iv = inner ? inner(s) : 0;
                    return (
                        <div key={s.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${fmtDay(s.day)}: ${v.toLocaleString("en-IN")} ${title.toLowerCase()}${inner ? ` (${iv.toLocaleString("en-IN")} connected)` : ""}`}>
                            {showNumbers && (
                                <span className={cn("mb-0.5 text-label font-semibold tabular-nums", v ? "text-slate-700" : "text-slate-300")}>{fmtCount(v)}</span>
                            )}
                            <div className={cn("relative w-full max-w-[56px] overflow-hidden rounded-t", barCls)} style={{ height: v ? `max(3px, ${(v / max) * 100}%)` : 0 }}>
                                {inner && v > 0 && <div className={cn("absolute inset-x-0 bottom-0", innerCls)} style={{ height: `${(iv / v) * 100}%` }} />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Dot({ cls }) {
    return <span className={cn("h-2.5 w-2.5 rounded-sm", cls)} aria-hidden="true" />;
}

/** Day by day: leads received, and calls (connected inside), each on its own scale. */
function Trend({ series }) {
    if (!series?.length) return null;
    const few = series.length <= 16;
    const every = few ? 1 : Math.ceil(series.length / 10);
    return (
        <section className="rounded-xl border border-slate-200 bg-surface p-4">
            <h3 className="mb-3 text-body font-bold text-slate-900">Day by day</h3>
            <div className="space-y-4" role="img" aria-label={series.map((s) => `${fmtDay(s.day)}: ${s.leads} leads, ${s.calls} calls, ${s.connected} connected`).join("; ")}>
                <DayRow title="Leads received" series={series} value={(s) => s.leads} barCls="bg-brand-200" showNumbers={few} />
                <DayRow
                    title="Calls"
                    series={series}
                    value={(s) => s.calls ?? s.connected}
                    inner={(s) => s.connected}
                    barCls="bg-blue-200"
                    innerCls="bg-action"
                    showNumbers={few}
                    legend={
                        <p className="flex gap-3 text-label text-slate-500">
                            <span className="inline-flex items-center gap-1.5"><Dot cls="bg-blue-200" /> All calls</span>
                            <span className="inline-flex items-center gap-1.5"><Dot cls="bg-action" /> Connected</span>
                        </p>
                    }
                />
                <div className="flex gap-1">
                    {series.map((s, i) => {
                        const p = dayParts(s.day);
                        return (
                            <div key={s.day} className="min-w-0 flex-1 text-center text-label leading-tight text-slate-500">
                                {i % every === 0 && (
                                    <>
                                        {few && <span className="block font-semibold text-slate-700">{p.week}</span>}
                                        <span className="block whitespace-nowrap">{p.date}</span>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/** CRM → Reports → Team board: everyone's numbers on one screen, for the daily meeting. */
export default function TeamBoard() {
    const [f, setF] = useState(defaultFilters("week"));
    const { data, loading } = useReport(crmService.reportTeam, f);
    const rows = data?.rows ?? [];
    const t = data?.totals;
    const box = useRef(null);
    const [full, setFull] = useState(false);
    useEffect(() => {
        const on = () => setFull(document.fullscreenElement === box.current);
        document.addEventListener("fullscreenchange", on);
        return () => document.removeEventListener("fullscreenchange", on);
    }, []);
    const present = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.());

    return (
        <div ref={box} className={full ? "h-full space-y-4 overflow-auto bg-slate-50 p-6" : "space-y-4"}>
            {full ? (
                <div className="flex items-center justify-between">
                    <h2 className="text-h2 font-extrabold text-slate-900">
                        Team board · {data ? (data.period.from === data.period.to ? fmtDay(data.period.from) : `${fmtDay(data.period.from)} – ${fmtDay(data.period.to)}`) : ""}
                    </h2>
                    <button type="button" onClick={present} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold text-slate-700">
                        <Minimize2 size={14} aria-hidden="true" /> Exit
                    </button>
                </div>
            ) : (
                <ReportFilters value={f} onChange={setF}>
                    <button type="button" onClick={present} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-semibold text-white hover:bg-action-hover">
                        <Maximize2 size={14} aria-hidden="true" /> Present
                    </button>
                    <ExportButton disabled={!rows.length} onClick={() => downloadCsv(`team-board-${f.from}-to-${f.to}.csv`, COLUMNS, rows, t)} />
                </ReportFilters>
            )}

            {t && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                    <Kpi label="Leads received" value={t.leads} />
                    <Kpi label="First contacts" value={t.first_contacts} />
                    <Kpi label="Connected calls" value={t.connected} sub={`${t.calls} calls`} />
                    <Kpi label="Talk time" value={fmtDur(t.talk)} />
                    <Kpi label="Follow-ups done" value={t.fu_done} sub={t.fu_missed ? `${t.fu_missed} missed` : undefined} />
                    <Kpi label="Applications" value={t.applications} />
                    <Kpi label="Exams done" value={t.exams_done} sub={`${t.exams_passed} passed · ${t.exams_scheduled} scheduled`} tone="text-emerald-700" />
                    <Kpi label="Payments done" value={t.payments} tone="text-emerald-700" />
                </div>
            )}

            {rows.length > 1 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {LEADERS.map(([k, label]) => {
                        const top = [...rows].sort((a, b) => b[k] - a[k])[0];
                        return (
                            <div key={k} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface px-4 py-3">
                                <Trophy size={22} className={top?.[k] ? "text-amber-500" : "text-slate-300"} aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="text-small font-semibold text-slate-500">{label}</p>
                                    <p className="truncate font-bold text-slate-900">{top?.[k] ? `${top.name} · ${top[k]}` : "—"}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ReportTable columns={COLUMNS} rows={rows} totals={t} loading={loading} initialSort={{ key: "first_contacts", dir: "desc" }} />
            <Trend series={data?.series} />
        </div>
    );
}

"use client";

import type { CSSProperties } from "react";
import { useRef, useState } from "react";

import type { OrbitCardPreset } from "@/lib/orbit-card-presets";
import type { Task, TaskDraft, TaskPriority } from "@/lib/tasks/types";
import { getTaskCardAppearance } from "@/lib/tasks/view";

type OrbitCardProps = {
  draft: TaskDraft;
  errorMessage?: string;
  isFocused: boolean;
  isEditing: boolean;
  onCancelEdit: () => void;
  onChangeDraft: (draft: TaskDraft) => void;
  onSave: () => void;
  onStartAdd: () => void;
  onStartEdit: () => void;
  preset: OrbitCardPreset;
  task?: Task;
};

// ── constants ──────────────────────────────────────────────────────────────
const MONTHS = [
  "JAN","FEB","MAR","APR","MAY","JUN",
  "JUL","AUG","SEP","OCT","NOV","DEC",
] as const;

type PriorityEntry = { value: TaskPriority | ""; label: string; color: string };
const PRIORITIES: PriorityEntry[] = [
  { value: "",       label: "NONE",   color: "#a5f3fc" },
  { value: "low",    label: "LOW",    color: "#bef264" },
  { value: "medium", label: "MEDIUM", color: "#c4b5fd" },
  { value: "high",   label: "HIGH",   color: "#fdba74" },
];

// ── helpers ────────────────────────────────────────────────────────────────
function getDueParts(dueDate: string | null) {
  if (!dueDate) return null;
  const date = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    dayDigits: date.getDate().toString().split(""),
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

function parseDueDateParts(due_date: string) {
  if (!due_date) {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() };
  }
  const [y, m, d] = due_date.split("-").map(Number);
  const n = new Date();
  return { year: y ?? n.getFullYear(), month: m ?? 1, day: d ?? 1 };
}

function fmtDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── reusable horizontal picker ─────────────────────────────────────────────
function HorizPicker({
  label,
  onPrev,
  onNext,
  color = "#a5f3fc",
}: {
  label: string;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  color?: string;
}) {
  const btnCls =
    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-opacity opacity-70 hover:opacity-100 active:scale-90";
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className={btnCls}
        onClick={onPrev}
        style={{ color }}
        type="button"
      >
        ◀
      </button>
      <span
        className="min-w-[3.5rem] text-center text-xs font-black tracking-widest"
        style={{ color }}
      >
        {label}
      </span>
      <button
        className={btnCls}
        onClick={onNext}
        style={{ color }}
        type="button"
      >
        ▶
      </button>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
export function OrbitCard({
  draft,
  errorMessage,
  isFocused,
  isEditing,
  onCancelEdit,
  onChangeDraft,
  onSave,
  onStartAdd,
  onStartEdit,
  preset,
  task,
}: OrbitCardProps) {
  // local state: whether each picker is open
  const [priorityOpen, setPriorityOpen] = useState(() => draft.priority !== "");
  const [dateOpen, setDateOpen] = useState(() => Boolean(draft.due_date));
  const lastTapRef = useRef(0);

  // show picker if value already set, or user explicitly opened
  const showPriority = priorityOpen || draft.priority !== "";
  const showDate = dateOpen || Boolean(draft.due_date);

  const appearance = getTaskCardAppearance(task);
  const shellStyle: CSSProperties = {
    borderColor: appearance.borderColor,
    boxShadow: `${appearance.outerGlow}, inset 0 0 32px rgba(255,255,255,0.025)`,
  };
  const dueParts = getDueParts(task?.due_date ?? null);
  const hasOrbitDetails = Boolean(task?.priority || dueParts);
  const isEmpty = !task;

  // date helpers
  const { year: dYear, month: dMonth, day: dDay } = parseDueDateParts(draft.due_date);
  const maxDay = new Date(dYear, dMonth, 0).getDate();

  const sp = (e: React.MouseEvent) => e.stopPropagation();

  // ── priority helpers ──
  const currentPriIdx = PRIORITIES.findIndex((p) => p.value === draft.priority);
  const safePriIdx = currentPriIdx < 0 ? 0 : currentPriIdx;

  const stepPriority = (e: React.MouseEvent, delta: number) => {
    sp(e);
    const next = (safePriIdx + delta + PRIORITIES.length) % PRIORITIES.length;
    onChangeDraft({ ...draft, priority: PRIORITIES[next]!.value as TaskPriority | "" });
  };

  // ── month helpers ──
  const stepMonth = (e: React.MouseEvent, delta: number) => {
    sp(e);
    const nm = ((dMonth - 1 + delta + 12) % 12) + 1;
    onChangeDraft({
      ...draft,
      due_date: fmtDate(dYear, nm, Math.min(dDay, new Date(dYear, nm, 0).getDate())),
    });
  };

  // ── day helpers ──
  const stepDay = (e: React.MouseEvent, delta: number) => {
    sp(e);
    onChangeDraft({
      ...draft,
      due_date: fmtDate(dYear, dMonth, ((dDay - 1 + delta + maxDay) % maxDay) + 1),
    });
  };

  const openDate = (e: React.MouseEvent) => {
    sp(e);
    if (!draft.due_date) {
      const n = new Date();
      onChangeDraft({ ...draft, due_date: fmtDate(n.getFullYear(), n.getMonth() + 1, n.getDate()) });
    }
    setDateOpen(true);
  };

  const removeDate = (e: React.MouseEvent) => {
    sp(e);
    onChangeDraft({ ...draft, due_date: "" });
    setDateOpen(false);
  };

  const curPri = PRIORITIES[safePriIdx]!;

  // ── prompt button style ──
  const promptCls =
    "text-[10px] font-black tracking-[0.2em] uppercase text-cyan-100/40 hover:text-cyan-100/80 transition-colors underline-offset-2 hover:underline";

  // Manual double-tap/click — works on mobile (touch) and desktop
  const handleArticleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isEditing) return; // never interfere with edit mode
    if (isEmpty && isFocused && !isEditing) { onStartAdd(); return; }
    if (!isEmpty && isFocused) {
      const now = Date.now();
      const since = now - lastTapRef.current;
      if (since < 400 && since > 30) {
        e.stopPropagation();
        onStartEdit();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  return (
    <article
      className="group relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-[28px] border-2 bg-[rgba(8,12,22,0.96)] px-5 py-6 text-cyan-50 shadow-[inset_0_0_32px_rgba(255,255,255,0.025)]"
      data-card-interactive="true"
      onClick={handleArticleClick}
      style={shellStyle}
    >
      {isEditing ? (
        /* ── EDIT MODE ── */
        <div className="relative flex h-full flex-col pb-8" onClick={sp}>

          {/* RIGHT COLUMN: vertical ▲/▼ date picker or 'DATE' prompt */}
          <div className="absolute right-0 top-8 flex flex-col items-center gap-0.5 text-[11px] font-black leading-none text-cyan-100/50">
            {showDate ? (
              <>
                <button className="flex h-5 w-5 items-center justify-center text-[10px] opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => { sp(e); stepMonth(e, -1); }} type="button">▲</button>
                {MONTHS[dMonth - 1]!.split("").map((ch, i) => <span key={i}>{ch}</span>)}
                <button className="flex h-5 w-5 items-center justify-center text-[10px] opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => { sp(e); stepMonth(e, 1); }} type="button">▼</button>
                <span className="mt-2" />
                <button className="flex h-5 w-5 items-center justify-center text-[10px] opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => { sp(e); stepDay(e, -1); }} type="button">▲</button>
                {String(dDay).split("").map((ch, i) => <span key={i}>{ch}</span>)}
                <button className="flex h-5 w-5 items-center justify-center text-[10px] opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => { sp(e); stepDay(e, 1); }} type="button">▼</button>
                <button className="mt-1 text-[10px] opacity-30 hover:opacity-70 transition-opacity" onClick={removeDate} title="Remove date" type="button">✕</button>
              </>
            ) : (
              <button
                className="flex flex-col items-center gap-0.5 hover:text-cyan-100/80 transition-colors"
                onClick={openDate}
                title="Choose date"
                type="button"
              >
                {"DATE".split("").map((ch, i) => <span key={i}>{ch}</span>)}
                <span className="mt-1 text-[12px] font-black">+</span>
              </button>
            )}
          </div>

          {/* TITLE */}
          <input
            aria-label="Task title"
            autoFocus
            className={`bg-transparent border-0 outline-none text-center text-xl font-bold leading-tight text-cyan-50 placeholder:text-cyan-100/30 ${showDate ? "mx-auto w-[calc(100%-2.5rem)]" : "w-full"}`}
            maxLength={19}
            onChange={(e) => onChangeDraft({ ...draft, title: e.target.value })}
            placeholder="Task title"
            value={draft.title}
          />

          {/* DESCRIPTION */}
          <textarea
            aria-label="Task description"
            className={`mt-8 min-h-0 flex-1 resize-none bg-transparent border-0 outline-none text-sm leading-6 text-cyan-50/76 placeholder:text-cyan-100/25 ${showDate ? "max-w-[calc(100%-2.75rem)]" : "w-full"}`}
            maxLength={69}
            onChange={(e) => onChangeDraft({ ...draft, description: e.target.value })}
            placeholder="Description"
            value={draft.description}
          />

          {/* ERROR */}
          {errorMessage ? (
            <p className="mb-1 line-clamp-2 rounded-[6px] border border-rose-200/20 bg-rose-400/10 px-2 py-1 text-[10px] font-semibold leading-4 text-rose-100">
              {errorMessage}
            </p>
          ) : null}

          {/* PRIORITY PICKER — flanking lines, no outer dividers */}
          <div className="flex flex-col items-center">
            {showPriority ? (
              <div className="flex w-full items-center gap-1">
                <button
                  className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold opacity-70 hover:opacity-100 active:scale-90 transition-all"
                  onClick={(e) => stepPriority(e, -1)}
                  style={{ color: curPri.color }}
                  type="button"
                >◀</button>
                <div className="h-px flex-1 rounded" style={{ backgroundColor: curPri.color, opacity: 0.3 }} />
                <span className="shrink-0 px-1 text-[10px] font-black tracking-widest" style={{ color: curPri.color }}>
                  {curPri.label}
                </span>
                <div className="h-px flex-1 rounded" style={{ backgroundColor: curPri.color, opacity: 0.3 }} />
                <button
                  className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold opacity-70 hover:opacity-100 active:scale-90 transition-all"
                  onClick={(e) => stepPriority(e, 1)}
                  style={{ color: curPri.color }}
                  type="button"
                >▶</button>
              </div>
            ) : (
              <button
                className={promptCls}
                onClick={(e) => { sp(e); setPriorityOpen(true); }}
                type="button"
              >
                Choose Priority
              </button>
            )}
          </div>

          {/* SAVE / CANCEL */}
          <div className="absolute bottom-0 inset-x-0 flex justify-center gap-8">
            <button aria-label="Save task" className="text-xl leading-none" onClick={(e) => { sp(e); onSave(); }} type="button">✔️</button>
            <button aria-label="Cancel edit" className="text-xl leading-none" onClick={(e) => { sp(e); onCancelEdit(); }} type="button">❌</button>
          </div>
        </div>

      ) : isEmpty ? (
        /* ── EMPTY CARD ── */
        <div className="flex h-full flex-col items-center justify-center text-center">
          <span
            className={
              isFocused
                ? `relative h-16 w-16 rounded-full transition group-hover:scale-105 ${appearance.plusClassName}`
                : `relative h-16 w-16 rounded-full opacity-35 ${appearance.plusClassName}`
            }
          >
            <span className="absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100" />
          </span>
        </div>

      ) : (
        /* ── TASK VIEW ── */
        <div className="relative flex h-full flex-col pb-8">
          {dueParts ? (
            <div
              className={`absolute right-0 top-8 flex w-5 flex-col items-center gap-1 text-xs font-black leading-none ${appearance.dueTextClassName}`}
            >
              <span>D</span>
              <span>U</span>
              <span>E</span>
              <span className="mt-4">{dueParts.month[0]}</span>
              <span>{dueParts.month[1]}</span>
              <span>{dueParts.month[2]}</span>
              <span className="mt-4">{dueParts.dayDigits[0]}</span>
              {dueParts.dayDigits[1] ? <span>{dueParts.dayDigits[1]}</span> : null}
            </div>
          ) : null}

          <h2
            className={
              hasOrbitDetails
                ? "mx-auto max-w-[calc(100%-3.5rem)] text-center text-xl font-bold leading-tight text-cyan-50"
                : "mx-auto text-center text-xl font-bold leading-tight text-cyan-50"
            }
          >
            {task.title}
          </h2>

          {task.description ? (
            <p
              className={
                hasOrbitDetails
                  ? "mt-8 max-w-[calc(100%-3.75rem)] break-all pr-2 text-sm leading-6 text-cyan-50/76"
                  : "mt-8 break-all text-sm leading-6 text-cyan-50/76"
              }
            >
              {task.description}
            </p>
          ) : null}

          <div className="pointer-events-none absolute inset-x-4 bottom-3 text-center">
            <div className="h-px bg-cyan-100/20" />
            <span
              className={`absolute left-1/2 top-0 inline-block -translate-x-1/2 -translate-y-1/2 bg-[rgba(8,12,22,0.96)] px-3 text-xs font-black tracking-[0.24em] ${appearance.footerClassName}`}
            >
              {appearance.footerLabel}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

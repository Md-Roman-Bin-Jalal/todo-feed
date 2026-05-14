import type { Task } from "@/lib/tasks/types";

export type OrbitTaskFilter =
  | "completed"
  | "all"
  | "pending"
  | "due-today"
  | "overdue";

export const orbitTaskFilters: Array<{
  id: OrbitTaskFilter;
  label: string;
}> = [
  { id: "completed", label: "completed" },
  { id: "all", label: "all" },
  { id: "pending", label: "pending" },
  { id: "due-today", label: "due today" },
  { id: "overdue", label: "overdue" },
];

export type OrbitCardAppearance = {
  borderColor: string;
  dueTextClassName: string;
  footerClassName: string;
  footerLabel: string;
  outerGlow: string;
  plusClassName: string;
};

const msPerDay = 24 * 60 * 60 * 1000;

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function getTodayDateKey(now = new Date()) {
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(
    now.getDate(),
  )}`;
}

export function isTaskDueToday(task: Task, todayDateKey = getTodayDateKey()) {
  return task.status === "pending" && task.due_date === todayDateKey;
}

export function isTaskOverdue(task: Task, todayDateKey = getTodayDateKey()) {
  return (
    task.status === "pending" &&
    typeof task.due_date === "string" &&
    task.due_date < todayDateKey
  );
}

export function matchesTaskFilter(
  task: Task,
  filter: OrbitTaskFilter,
  todayDateKey = getTodayDateKey(),
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "completed") {
    return task.status === "completed";
  }

  if (filter === "pending") {
    return task.status === "pending";
  }

  if (filter === "due-today") {
    return isTaskDueToday(task, todayDateKey);
  }

  return isTaskOverdue(task, todayDateKey);
}

function compareTasksByDueDate(a: Task, b: Task) {
  if (a.due_date && b.due_date && a.due_date !== b.due_date) {
    return a.due_date.localeCompare(b.due_date);
  }

  if (a.due_date && !b.due_date) {
    return -1;
  }

  if (!a.due_date && b.due_date) {
    return 1;
  }

  if (a.created_at !== b.created_at) {
    return a.created_at.localeCompare(b.created_at);
  }

  return a.id.localeCompare(b.id);
}

function getPivotTaskIndex(tasks: Task[], todayDateKey: string) {
  if (tasks.length === 0) {
    return 0;
  }

  const dueTodayIndexes = tasks.reduce<number[]>((indexes, task, index) => {
    if (isTaskDueToday(task, todayDateKey)) {
      indexes.push(index);
    }

    return indexes;
  }, []);

  if (dueTodayIndexes.length > 0) {
    return dueTodayIndexes[Math.floor((dueTodayIndexes.length - 1) / 2)];
  }

  let pivotIndex = 0;
  let closestScore = Number.POSITIVE_INFINITY;
  let bestDirectionWeight = Number.POSITIVE_INFINITY;

  tasks.forEach((task, index) => {
    if (!task.due_date) {
      return;
    }

    const deltaDays =
      (parseDateKey(task.due_date).getTime() - parseDateKey(todayDateKey).getTime()) /
      msPerDay;
    const distance = Math.abs(deltaDays);
    const directionWeight = deltaDays >= 0 ? 0 : 1;

    if (
      distance < closestScore ||
      (distance === closestScore && directionWeight < bestDirectionWeight)
    ) {
      closestScore = distance;
      bestDirectionWeight = directionWeight;
      pivotIndex = index;
    }
  });

  return pivotIndex;
}

function rotateTasksToCenter(tasks: Task[], pivotIndex: number) {
  if (tasks.length < 2) {
    return { focusIndex: 0, tasks };
  }

  const focusIndex = Math.floor((tasks.length - 1) / 2);

  if (pivotIndex === focusIndex) {
    return { focusIndex, tasks };
  }

  const shift = focusIndex - pivotIndex;
  const rotatedTasks = tasks.map((_task, index) => {
    const sourceIndex = (index - shift + tasks.length) % tasks.length;

    return tasks[sourceIndex];
  });

  return {
    focusIndex,
    tasks: rotatedTasks,
  };
}

export function getOrderedTasksForFilter(
  tasks: Task[],
  filter: OrbitTaskFilter,
  todayDateKey = getTodayDateKey(),
) {
  const filteredTasks = tasks
    .filter((task) => matchesTaskFilter(task, filter, todayDateKey))
    .sort(compareTasksByDueDate);

  if (filteredTasks.length === 0) {
    return {
      focusIndex: 0,
      tasks: [] as Task[],
    };
  }

  return rotateTasksToCenter(
    filteredTasks,
    getPivotTaskIndex(filteredTasks, todayDateKey),
  );
}

export function getTaskCardAppearance(
  task: Task | undefined,
  todayDateKey = getTodayDateKey(),
): OrbitCardAppearance {
  if (!task) {
    return {
      borderColor: "#5eead4",
      dueTextClassName: "text-teal-100/85",
      footerClassName: "text-teal-100",
      footerLabel: "EMPTY",
      outerGlow: "0 0 12px rgba(94,234,212,0.04)",
      plusClassName:
        "border-teal-100/20 bg-teal-100/5 shadow-[0_0_12px_rgba(94,234,212,0.04)]",
    };
  }

  if (task.status === "completed") {
    return {
      borderColor: "#22d3ee",
      dueTextClassName: "text-cyan-100/85",
      footerClassName: "text-cyan-100",
      footerLabel: "COMPLETED",
      outerGlow: "0 0 24px rgba(34,211,238,0.2)",
      plusClassName: "border-cyan-100/20 bg-cyan-100/[0.03]",
    };
  }

  if (isTaskOverdue(task, todayDateKey)) {
    return {
      borderColor: "#fb7185",
      dueTextClassName: "text-rose-100",
      footerClassName: "text-rose-100",
      footerLabel: "OVERDUE",
      outerGlow: "0 0 28px rgba(251,113,133,0.3)",
      plusClassName: "border-rose-100/20 bg-rose-100/[0.03]",
    };
  }

  if (isTaskDueToday(task, todayDateKey)) {
    return {
      borderColor: "#f59e0b",
      dueTextClassName: "text-amber-100/95",
      footerClassName: "text-amber-100",
      footerLabel: "DUE TODAY",
      outerGlow: "0 0 24px rgba(245,158,11,0.22)",
      plusClassName: "border-amber-100/20 bg-amber-100/[0.03]",
    };
  }

  if (task.priority === "high") {
    return {
      borderColor: "#f97316",
      dueTextClassName: "text-orange-100/95",
      footerClassName: "text-orange-100",
      footerLabel: "HIGH",
      outerGlow: "0 0 22px rgba(249,115,22,0.2)",
      plusClassName: "border-orange-100/20 bg-orange-100/[0.03]",
    };
  }

  if (task.priority === "medium") {
    return {
      borderColor: "#a78bfa",
      dueTextClassName: "text-violet-100/95",
      footerClassName: "text-violet-100",
      footerLabel: "MEDIUM",
      outerGlow: "0 0 22px rgba(167,139,250,0.22)",
      plusClassName: "border-violet-100/20 bg-violet-100/[0.03]",
    };
  }

  if (task.priority === "low") {
    return {
      borderColor: "#84cc16",
      dueTextClassName: "text-lime-100/95",
      footerClassName: "text-lime-100",
      footerLabel: "LOW",
      outerGlow: "0 0 22px rgba(132,204,22,0.2)",
      plusClassName: "border-lime-100/20 bg-lime-100/[0.03]",
    };
  }

  return {
    borderColor: "#38bdf8",
    dueTextClassName: "text-sky-100/95",
    footerClassName: "text-sky-100",
    footerLabel: "PENDING",
    outerGlow: "0 0 22px rgba(56,189,248,0.18)",
    plusClassName: "border-sky-100/20 bg-sky-100/[0.03]",
  };
}

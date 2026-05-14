import type { Task } from "@/lib/tasks/types";

/**
 * Onboarding step identifiers — each corresponds to one tutorial phase.
 */
export type OnboardingStep =
  | "scroll"
  | "swipeUp"
  | "swipeDown"
  | "add"
  | "edit"
  | "compass";

export type OnboardingSubStep =
  | "intro"       // show instruction
  | "action"      // user performs the gesture
  | "confirmed";  // brief success flash then auto-advance

export type OnboardingStepConfig = {
  id: OnboardingStep;
  targetTaskId?: string;        // ID of the specific task to automatically center
  title: string;                // short instruction heading
  description: string;          // longer instruction text
  hintType: "swipe-horizontal" | "swipe-up" | "swipe-down" | "tap-add" | "double-tap" | "scroll-compass";
};

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: "scroll",
    targetTaskId: "onboard-1", // "Browse todos"
    title: "Swipe to browse",
    description: "Scroll left or right to see all your todos",
    hintType: "swipe-horizontal",
  },
  {
    id: "swipeUp",
    targetTaskId: "onboard-5", // "Swipe me up!"
    title: "Complete tasks",
    description: "Swipe up to mark a todo as complete",
    hintType: "swipe-up",
  },
  {
    id: "swipeDown",
    targetTaskId: "onboard-6", // "Swipe me down!"
    title: "Delete tasks",
    description: "Swipe down to permanently delete a todo",
    hintType: "swipe-down",
  },
  {
    id: "add",
    targetTaskId: undefined,
    title: "Create a todo",
    description: "Tap the + Add button below to create a new todo",
    hintType: "tap-add",
  },
  {
    id: "edit",
    targetTaskId: "onboard-4", // "Double-tap me!"
    title: "Edit a todo",
    description: "Double-tap this card to edit its content",
    hintType: "double-tap",
  },
  {
    id: "compass",
    targetTaskId: "onboard-3", // "Filter with compass"
    title: "Filter your orbit",
    description: "Scroll the compass above to filter todos and see counts",
    hintType: "scroll-compass",
  },
];

const now = new Date().toISOString();

/**
 * 5 hardcoded onboarding tasks — never saved to the database.
 */
export const ONBOARDING_TASKS: Task[] = [
  {
    id: "onboard-1",
    user_id: "onboarding",
    title: "Browse todos ←→",
    description: "Scroll left or right to see all your todos",
    status: "pending",
    priority: null,
    due_date: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "onboard-2",
    user_id: "onboarding",
    title: "Add a new todo",
    description: "Tap the + Add button below to create a todo",
    status: "pending",
    priority: "high",
    due_date: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "onboard-3",
    user_id: "onboarding",
    title: "Filter with compass",
    description: "Scroll the compass above to filter and see counts",
    status: "pending",
    priority: null,
    due_date: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "onboard-4",
    user_id: "onboarding",
    title: "Double-tap me!",
    description: "Double-tap this card to edit its content",
    status: "pending",
    priority: "low",
    due_date: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "onboard-5",
    user_id: "onboarding",
    title: "Swipe me up!",
    description: "Swipe up to mark as complete",
    status: "pending",
    priority: "medium",
    due_date: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "onboard-6",
    user_id: "onboarding",
    title: "Swipe me down!",
    description: "Swipe down to delete me forever",
    status: "pending",
    priority: "low",
    due_date: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  },
];

export const ONBOARDING_STORAGE_KEY = "orbit-onboarding-done";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}

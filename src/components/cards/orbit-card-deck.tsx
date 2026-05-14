"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { OrbitCard } from "@/components/cards/orbit-card";
import { orbitCardPresets } from "@/lib/orbit-card-presets";
import {
  createTask,
  deleteTask,
  loadTasks,
  toggleTaskStatus,
  updateTask,
} from "@/lib/tasks/api-client";
import type { Task, TaskDraft } from "@/lib/tasks/types";
import {
  getOrderedTasksForFilter,
  getTodayDateKey,
  type OrbitTaskFilter,
} from "@/lib/tasks/view";

type OrbitStyle = CSSProperties & {
  "--orbit-banish-rotate": string;
  "--orbit-banish-x": string;
  "--orbit-banish-scale": string;
  "--orbit-banish-y": string;
  "--orbit-gesture-y": string;
  "--orbit-y": string;
  "--orbit-scale-x": string;
  "--orbit-scale-y": string;
  "--orbit-rotate": string;
  "--orbit-opacity": string;
};

type BanishCardState = {
  direction: "up" | "down";
  taskId: string;
};

type GestureCardState = {
  direction: "up" | "down";
  intensity: number;
  offsetY: number;
  slotKey: string;
};

type PressCardState = {
  pointerId: number;
  hasHorizontalScrollIntent: boolean;
  slotKey: string;
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startTime: number;
  target: HTMLDivElement;
  task: Task;
};

const MOBILE_ORBIT_VERTICAL_RATIO = 0.53;
const DESKTOP_ORBIT_VERTICAL_RATIO = 0.53;
const MOBILE_ORBIT_BASELINE_OFFSET = 99;
const DESKTOP_ORBIT_BASELINE_OFFSET = 96;
const MOBILE_SIDE_CARD_DROP = 49;
const DESKTOP_SIDE_CARD_DROP = 63;
const MOBILE_ADD_TASK_BUTTON_SIZE = 69;
const DESKTOP_ADD_TASK_BUTTON_SIZE = 79;
const MOBILE_FOCUSED_CARD_WIDTH_SCALE = 1.08;
const MOBILE_FOCUSED_CARD_HEIGHT_SCALE = 1.08;
const DESKTOP_FOCUSED_CARD_WIDTH_SCALE = 1.08;
const DESKTOP_FOCUSED_CARD_HEIGHT_SCALE = 1.08;
const MOBILE_SIDE_CARD_WIDTH_SCALE_BASE = 0.8;
const MOBILE_SIDE_CARD_WIDTH_SCALE_BOOST = 0.1;
const MOBILE_SIDE_CARD_HEIGHT_SCALE_BASE = 0.9;
const MOBILE_SIDE_CARD_HEIGHT_SCALE_BOOST = 0.1;
const DESKTOP_SIDE_CARD_WIDTH_SCALE_BASE = 0.8;
const DESKTOP_SIDE_CARD_WIDTH_SCALE_BOOST = 0.1;
const DESKTOP_SIDE_CARD_HEIGHT_SCALE_BASE = 0.85;
const DESKTOP_SIDE_CARD_HEIGHT_SCALE_BOOST = 0.1;
const SWIPE_COMPLETE_THRESHOLD = 88;
const BANISH_DURATION_MS = 340;
const TASK_SLOT_STRIDE = 1;
const NEW_TASK_SLOT_KEY = "new-task";
const MAX_VERTICAL_GESTURE_OFFSET = 132;
const SWIPE_SNAP_DISTANCE = 28;

const emptyDraft: TaskDraft = {
  description: "",
  due_date: "",
  priority: "",
  title: "",
};

function draftFromTask(task: Task): TaskDraft {
  return {
    description: task.description ?? "",
    due_date: task.due_date ?? "",
    priority: task.priority ?? "",
    title: task.title,
  };
}

type OrbitCardDeckProps = {
  onVisibleCountChange?: (count: number) => void;
  selectedFilter: OrbitTaskFilter;
  onboardingActive?: boolean;
  onboardingTasks?: Task[];
};

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

export function OrbitCardDeck({
  onVisibleCountChange,
  selectedFilter,
  onboardingActive,
  onboardingTasks,
}: OrbitCardDeckProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pressCardStateRef = useRef<PressCardState | null>(null);
  const dragStateRef = useRef({
    activePointerId: -1,
    hasHorizontalIntent: false,
    hasMoved: false,
    startClientX: 0,
    startClientY: 0,
    startScrollLeft: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingKey, setEditingKey] = useState("");
  const [focusedSlotKey, setFocusedSlotKey] = useState("");
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [newTaskInsertIndex, setNewTaskInsertIndex] = useState<number | null>(
    null,
  );
  const [banishCardState, setBanishCardState] = useState<BanishCardState | null>(
    null,
  );
  const [gestureCardState, setGestureCardState] = useState<GestureCardState | null>(
    null,
  );
  const [isCardActionPending, setIsCardActionPending] = useState(false);
  const lastDoubleTapRef = useRef(0);

  useEffect(() => {
    if (onboardingActive && onboardingTasks) {
      setTasks(onboardingTasks);
      return;
    }

    let isMounted = true;

    loadTasks()
      .then((loadedTasks) => {
        if (isMounted) {
          setTasks(loadedTasks);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Failed to load tasks.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onboardingActive, onboardingTasks]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncLayout = () => {
      setIsDesktopLayout(mediaQuery.matches);
    };

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncLayout);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    let frameId = 0;

    const syncOrbit = () => {
      const orbitVerticalRatio = isDesktopLayout
        ? DESKTOP_ORBIT_VERTICAL_RATIO
        : MOBILE_ORBIT_VERTICAL_RATIO;
      const orbitBaselineOffset = isDesktopLayout
        ? DESKTOP_ORBIT_BASELINE_OFFSET
        : MOBILE_ORBIT_BASELINE_OFFSET;
      const sideCardDrop = isDesktopLayout
        ? DESKTOP_SIDE_CARD_DROP
        : MOBILE_SIDE_CARD_DROP;
      const focusedCardWidthScale = isDesktopLayout
        ? DESKTOP_FOCUSED_CARD_WIDTH_SCALE
        : MOBILE_FOCUSED_CARD_WIDTH_SCALE;
      const focusedCardHeightScale = isDesktopLayout
        ? DESKTOP_FOCUSED_CARD_HEIGHT_SCALE
        : MOBILE_FOCUSED_CARD_HEIGHT_SCALE;
      const sideCardWidthScaleBase = isDesktopLayout
        ? DESKTOP_SIDE_CARD_WIDTH_SCALE_BASE
        : MOBILE_SIDE_CARD_WIDTH_SCALE_BASE;
      const sideCardWidthScaleBoost = isDesktopLayout
        ? DESKTOP_SIDE_CARD_WIDTH_SCALE_BOOST
        : MOBILE_SIDE_CARD_WIDTH_SCALE_BOOST;
      const sideCardHeightScaleBase = isDesktopLayout
        ? DESKTOP_SIDE_CARD_HEIGHT_SCALE_BASE
        : MOBILE_SIDE_CARD_HEIGHT_SCALE_BASE;
      const sideCardHeightScaleBoost = isDesktopLayout
        ? DESKTOP_SIDE_CARD_HEIGHT_SCALE_BOOST
        : MOBILE_SIDE_CARD_HEIGHT_SCALE_BOOST;
      const viewportCenter = track.scrollLeft + track.clientWidth / 2;
      const horizontalRadius = Math.min(track.clientWidth * 0.54, 180);
      const verticalRadius = horizontalRadius * orbitVerticalRatio;
      const cardMetrics = itemRefs.current
        .map((item) => {
          if (!item) {
            return null;
          }

          const cardCenter = item.offsetLeft + item.offsetWidth / 2;
          const offset = cardCenter - viewportCenter;

          return { item, offset };
        })
        .filter((metric): metric is { item: HTMLDivElement; offset: number } => {
          return metric !== null;
        });

      let focusedItem: HTMLDivElement | null = null;
      let editingItem: HTMLDivElement | null = null;
      let nextFocusedSlotKey = "";
      let closestDistance = Number.POSITIVE_INFINITY;

      cardMetrics.forEach(({ item, offset }) => {
        if (editingKey && item.dataset.slotKey === editingKey) {
          editingItem = item;
        }

        const distance = Math.abs(offset);

        if (distance < closestDistance) {
          closestDistance = distance;
          focusedItem = item;
          nextFocusedSlotKey = item.dataset.slotKey ?? "";
        }
      });

      if (editingKey && editingItem) {
        focusedItem = editingItem;
        nextFocusedSlotKey = editingKey;
      }

      setFocusedSlotKey((currentFocusedSlotKey) => {
        if (editingKey) {
          return currentFocusedSlotKey === editingKey
            ? currentFocusedSlotKey
            : editingItem
              ? editingKey
              : currentFocusedSlotKey;
        }

        if (currentFocusedSlotKey === nextFocusedSlotKey) {
          return currentFocusedSlotKey;
        }

        return nextFocusedSlotKey;
      });

      cardMetrics.forEach(({ item, offset }) => {
        const normalizedOffset = Math.max(
          -1,
          Math.min(1, offset / horizontalRadius),
        );
        const orbitDepth = Math.sqrt(
          Math.max(0, 1 - normalizedOffset * normalizedOffset),
        );
        const sideDrop = sideCardDrop * Math.abs(normalizedOffset);
        const translateY =
          orbitBaselineOffset - verticalRadius * orbitDepth + sideDrop;
        const isEditingSlot = item.dataset.slotKey === editingKey;
        const isFocused = item === focusedItem || isEditingSlot;
        const scaleX = isFocused
          ? focusedCardWidthScale
          : sideCardWidthScaleBase +
            orbitDepth * sideCardWidthScaleBoost +
            (item.dataset.slotEmpty === "true" ? 0.04 : 0);
        const scaleY = isFocused
          ? focusedCardHeightScale
          : sideCardHeightScaleBase +
            orbitDepth * sideCardHeightScaleBoost +
            (item.dataset.slotEmpty === "true" ? 0.04 : 0);
        const rotate = isFocused ? 0 : normalizedOffset * 14;
        const isEmptySlot = item.dataset.slotEmpty === "true";
        const opacity = isFocused
          ? 1
          : isEmptySlot
            ? Math.max(0.92, 0.7 + orbitDepth * 0.3)
            : 0.38 + orbitDepth * 0.5;

        item.style.setProperty("--orbit-y", `${translateY.toFixed(2)}px`);
        item.style.setProperty("--orbit-scale-x", scaleX.toFixed(3));
        item.style.setProperty("--orbit-scale-y", scaleY.toFixed(3));
        item.style.setProperty("--orbit-rotate", `${rotate.toFixed(2)}deg`);
        item.style.setProperty("--orbit-opacity", opacity.toFixed(3));
        item.style.zIndex = isEditingSlot
          ? "160"
          : `${Math.round(orbitDepth * 100)}`;
      });
    };

    const queueSync = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        syncOrbit();
        frameId = 0;
      });
    };

    queueSync();

    track.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("resize", queueSync);

    // Detect native scrolling for onboarding step
    let onboardingScrollStart = track.scrollLeft;
    let onboardingScrollFired = false;
    const mountTime = Date.now();
    const handleOnboardingScroll = () => {
      // Ignore initial programmatic scroll-snapping by waiting 1 second
      if (onboardingScrollFired || Date.now() - mountTime < 1000) return;
      
      const delta = Math.abs(track.scrollLeft - onboardingScrollStart);
      if (delta > 60) {
        onboardingScrollFired = true;
        window.dispatchEvent(new CustomEvent("onboarding-action", { detail: { action: "scrolled" } }));
      }
    };
    if (onboardingActive) {
      track.addEventListener("scroll", handleOnboardingScroll, { passive: true });
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      track.removeEventListener("scroll", queueSync);
      window.removeEventListener("resize", queueSync);
      if (onboardingActive) {
        track.removeEventListener("scroll", handleOnboardingScroll);
      }
    };
  }, [editingKey, isDesktopLayout, onboardingActive, selectedFilter, tasks]);

  const todayDateKey = getTodayDateKey();
  const orderedTasksState = getOrderedTasksForFilter(
    tasks,
    selectedFilter,
    todayDateKey,
  );
  const visibleTasks = orderedTasksState.tasks;
  const defaultFocusIndex = orderedTasksState.focusIndex;
  const visibleTaskSignature = visibleTasks.map((task) => task.id).join("|");
  const isBusy = isSaving || isCardActionPending;
  const isCreatingTask = editingKey === NEW_TASK_SLOT_KEY;

  useEffect(() => {
    onVisibleCountChange?.(visibleTasks.length);
  }, [onVisibleCountChange, visibleTasks.length]);

  const clearPressCardState = () => {
    setGestureCardState(null);
    pressCardStateRef.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element) {
      const isCardClick = event.target.closest("[data-card-interactive]");

      if (isCardClick) {
        return;
      }
    }

    const track = trackRef.current;

    if (!track) {
      return;
    }

    dragStateRef.current = {
      activePointerId: event.pointerId,
      hasHorizontalIntent: false,
      hasMoved: false,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: track.scrollLeft,
    };

    track.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const dragState = dragStateRef.current;

    if (!track || dragState.activePointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const nextScrollLeft = dragState.startScrollLeft - deltaX;

    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      dragState.hasMoved = true;
    }

    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      dragState.hasHorizontalIntent = true;
    }

    track.scrollLeft = nextScrollLeft;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const dragState = dragStateRef.current;

    if (!track || dragStateRef.current.activePointerId !== event.pointerId) {
      return;
    }

    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current.activePointerId = -1;

    if (!dragState.hasMoved || !dragState.hasHorizontalIntent) {
      snapToSwipe(0);
      return;
    }

    const deltaX = event.clientX - dragState.startClientX;
    snapToSwipe(deltaX);

    // Notify onboarding of horizontal scroll
    if (onboardingActive && Math.abs(deltaX) > 30) {
      window.dispatchEvent(new CustomEvent("onboarding-action", { detail: { action: "scrolled" } }));
    }
  };

  const handleStartAdd = (slotKey: string) => {
    if (isBusy) {
      return;
    }

    setNewTaskInsertIndex(null);
    setFocusedSlotKey(slotKey);
    setEditingKey(slotKey);
    setDraft(emptyDraft);
    setMessage("");
  };

  const handleStartEdit = (slotKey: string, task: Task) => {
    if (isBusy) {
      return;
    }

    setEditingKey(slotKey);
    setDraft(draftFromTask(task));
    setMessage("");
  };

  const handleCancelEdit = () => {
    setNewTaskInsertIndex(null);
    setEditingKey("");
    setDraft(emptyDraft);
    setMessage("");
  };

  const handleSave = async (task?: Task) => {
    if (isBusy) {
      return;
    }

    if (!draft.title.trim()) {
      setMessage("Title is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (onboardingActive) {
        // In onboarding — save locally, no API call
        const now = new Date().toISOString();
        const fakeTask: Task = {
          id: task?.id ?? `onboard-new-${Date.now()}`,
          user_id: "onboarding",
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          status: "pending",
          priority: draft.priority || null,
          due_date: draft.due_date || null,
          completed_at: null,
          created_at: task?.created_at ?? now,
          updated_at: now,
        };
        setTasks((currentTasks) => {
          if (!task) {
            return [...currentTasks, fakeTask];
          }
          return currentTasks.map((ct) => ct.id === fakeTask.id ? fakeTask : ct);
        });
        setEditingKey("");
        setNewTaskInsertIndex(null);
        setDraft(emptyDraft);
        // Dispatch onboarding events
        if (!task) {
          window.dispatchEvent(new CustomEvent("onboarding-action", { detail: { action: "task-added" } }));
        } else {
          window.dispatchEvent(new CustomEvent("onboarding-action", { detail: { action: "edited" } }));
        }
      } else {
        const savedTask = task
          ? await updateTask(task.id, draft)
          : await createTask(draft);

        setTasks((currentTasks) => {
          if (!task) {
            return [...currentTasks, savedTask];
          }

          return currentTasks.map((currentTask) =>
            currentTask?.id === savedTask.id ? savedTask : currentTask,
          );
        });
        setEditingKey("");
        setNewTaskInsertIndex(null);
        setDraft(emptyDraft);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save task.");
    } finally {
      setIsSaving(false);
    }
  };

  const baseSlotCount =
    visibleTasks.length === 0
      ? orbitCardPresets.length
      : Math.max(
          orbitCardPresets.length,
          visibleTasks.length * TASK_SLOT_STRIDE + 1,
        );
  const middleSlotIndex = Math.floor((baseSlotCount - 1) / 2);
  const visibleTaskStartIndex =
    visibleTasks.length === 0
      ? middleSlotIndex
      : middleSlotIndex - defaultFocusIndex * TASK_SLOT_STRIDE;
  const baseSlots = Array.from({ length: baseSlotCount }, (_slot, index) => {
    const preset = orbitCardPresets[index % orbitCardPresets.length];
    const taskOffset = index - visibleTaskStartIndex;
    const taskIndex =
      taskOffset >= 0 && taskOffset % TASK_SLOT_STRIDE === 0
        ? taskOffset / TASK_SLOT_STRIDE
        : -1;

    return {
      key: `${preset.id}-${index}`,
      preset,
      task:
        taskIndex >= 0 && taskIndex < visibleTasks.length
          ? visibleTasks[taskIndex]
          : undefined,
    };
  });
  const newTaskSlotIndex = Math.max(
    0,
    Math.min(newTaskInsertIndex ?? middleSlotIndex, baseSlots.length),
  );
  const slots = isCreatingTask
    ? [
        ...baseSlots.slice(0, newTaskSlotIndex),
        {
          key: NEW_TASK_SLOT_KEY,
          preset: orbitCardPresets[newTaskSlotIndex % orbitCardPresets.length],
          task: undefined,
        },
        ...baseSlots.slice(newTaskSlotIndex),
      ]
    : baseSlots;
  const targetFocusSlotIndex = isCreatingTask ? newTaskSlotIndex : middleSlotIndex;
  const focusedSlotIndex = slots.findIndex((slot) => slot.key === focusedSlotKey);
  const focusedSlot =
    focusedSlotIndex >= 0 ? slots[focusedSlotIndex] : undefined;
  const focusedTask = focusedSlot?.task;
  const addTaskButtonSize = isDesktopLayout
    ? DESKTOP_ADD_TASK_BUTTON_SIZE
    : MOBILE_ADD_TASK_BUTTON_SIZE;
  const addTaskIconLength = Math.round(addTaskButtonSize * 0.5);
  const addTaskIconThickness = Math.max(
    2,
    Math.round(addTaskButtonSize * 0.03125),
  );
  const addTaskRingInset = Math.max(6, Math.round(addTaskButtonSize * 0.094));
  const isEditing = Boolean(editingKey);

  const getSwipeStep = (deltaX: number) => {
    const absDelta = Math.abs(deltaX);

    if (absDelta < SWIPE_SNAP_DISTANCE) {
      return 0;
    }

    return 1;
  };

  const snapToSwipe = (deltaX: number) => {
    if (slots.length === 0) {
      return;
    }

    const baseIndex =
      focusedSlotIndex >= 0 ? focusedSlotIndex : Math.floor(slots.length / 2);
    const steps = getSwipeStep(deltaX);
    const direction = deltaX > 0 ? -1 : 1;
    const targetIndex = steps === 0
      ? baseIndex
      : Math.max(0, Math.min(slots.length - 1, baseIndex + direction * steps));

    focusSlotAtIndex(targetIndex);
  };

  useEffect(() => {
    itemRefs.current.length = slots.length;
  }, [slots.length]);

  const findNearestPendingTask = () => {
    if (slots.length === 0) {
      return null;
    }

    const startIndex = focusedSlotIndex >= 0
      ? focusedSlotIndex
      : Math.floor(slots.length / 2);

    for (let offset = 0; offset < slots.length; offset += 1) {
      const forwardIndex = startIndex + offset;
      const backwardIndex = startIndex - offset;

      if (forwardIndex < slots.length) {
        const forwardTask = slots[forwardIndex]?.task;

        if (forwardTask?.status === "pending") {
          return forwardTask;
        }
      }

      if (offset > 0 && backwardIndex >= 0) {
        const backwardTask = slots[backwardIndex]?.task;

        if (backwardTask?.status === "pending") {
          return backwardTask;
        }
      }
    }

    return null;
  };

  const focusSlotAtIndex = (slotIndex: number) => {
    const track = trackRef.current;
    const item = itemRefs.current[slotIndex];

    if (!track || !item) {
      return;
    }

    const itemCenter = item.offsetLeft + item.offsetWidth / 2;

    track.scrollTo({
      behavior: "smooth",
      left: itemCenter - track.clientWidth / 2,
    });
  };

  const handleCompleteTask = async (task: Task, direction: "up" | "down") => {
    if (isBusy || task.status === "completed") {
      return;
    }

    setIsCardActionPending(true);
    setMessage("");

    try {
      if (onboardingActive) {
        // In onboarding, just animate and update local state — no API call
        setBanishCardState({ direction, taskId: task.id });
        await wait(BANISH_DURATION_MS);
        setTasks((currentTasks) =>
          currentTasks.map((ct) =>
            ct.id === task.id ? { ...ct, status: "completed" as const, completed_at: new Date().toISOString() } : ct,
          ),
        );
        window.dispatchEvent(new CustomEvent("onboarding-action", { detail: { action: "swiped-up" } }));
      } else {
        const updatedTask = await toggleTaskStatus(task.id);
        setBanishCardState({ direction, taskId: task.id });
        await wait(BANISH_DURATION_MS);
        setTasks((currentTasks) =>
          currentTasks.map((currentTask) =>
            currentTask.id === updatedTask.id ? updatedTask : currentTask,
          ),
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to complete task.",
      );
    } finally {
      setBanishCardState(null);
      setIsCardActionPending(false);
    }
  };

  const handleDeleteFocusedTask = async (task: Task) => {
    if (isBusy) {
      return;
    }

    setIsCardActionPending(true);
    setMessage("");

    try {
      if (onboardingActive) {
        // In onboarding — no API call, just animate locally
        setBanishCardState({ direction: "down", taskId: task.id });
        await wait(BANISH_DURATION_MS);
        setTasks((currentTasks) =>
          currentTasks.filter((ct) => ct.id !== task.id),
        );
        window.dispatchEvent(new CustomEvent("onboarding-action", { detail: { action: "swiped-down" } }));
      } else {
        await deleteTask(task.id);
        setBanishCardState({ direction: "down", taskId: task.id });
        await wait(BANISH_DURATION_MS);
        setTasks((currentTasks) =>
          currentTasks.filter((currentTask) => currentTask.id !== task.id),
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete task.");
    } finally {
      setBanishCardState(null);
      setIsCardActionPending(false);
    }
  };

  const handleFocusedCardPointerDown =
    (slotKey: string, task: Task) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (editingKey || focusedSlotKey !== slotKey || isBusy) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      clearPressCardState();

      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const nextPressCardState: PressCardState = {
        hasHorizontalScrollIntent: false,
        pointerId: event.pointerId,
        slotKey,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startScrollLeft: trackRef.current?.scrollLeft ?? 0,
        startTime: Date.now(),
        target: event.currentTarget,
        task,
      };

      pressCardStateRef.current = nextPressCardState;
    };

  const handleFocusedCardPointerMove =
    (slotKey: string, _task: Task) => (event: React.PointerEvent<HTMLDivElement>) => {
      const pressCardState = pressCardStateRef.current;

      if (
        !pressCardState ||
        pressCardState.pointerId !== event.pointerId ||
        pressCardState.slotKey !== slotKey
      ) {
        return;
      }

      const deltaX = event.clientX - pressCardState.startClientX;
      const deltaY = event.clientY - pressCardState.startClientY;

      if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
        pressCardState.hasHorizontalScrollIntent = true;
      }

      if (pressCardState.hasHorizontalScrollIntent) {
        setGestureCardState((currentState) =>
          currentState?.slotKey === slotKey ? null : currentState,
        );
        const track = trackRef.current;

        if (track) {
          event.preventDefault();
          track.scrollLeft = pressCardState.startScrollLeft - deltaX;
        }

        return;
      }

      if (Math.abs(deltaY) <= 6 || Math.abs(deltaY) < Math.abs(deltaX)) {
        setGestureCardState((currentState) =>
          currentState?.slotKey === slotKey ? null : currentState,
        );
        return;
      }

      const clampedOffsetY = Math.max(
        -MAX_VERTICAL_GESTURE_OFFSET,
        Math.min(MAX_VERTICAL_GESTURE_OFFSET, deltaY * 0.78),
      );

      setGestureCardState({
        direction: clampedOffsetY < 0 ? "up" : "down",
        intensity: Math.min(1, Math.abs(clampedOffsetY) / SWIPE_COMPLETE_THRESHOLD),
        offsetY: clampedOffsetY,
        slotKey,
      });
    };

  const handleFocusedCardPointerUp =
    (_slotKey: string, task: Task) => async (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      const pressCardState = pressCardStateRef.current;

      if (
        !pressCardState ||
        pressCardState.pointerId !== event.pointerId ||
        pressCardState.slotKey !== _slotKey
      ) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const deltaX = event.clientX - pressCardState.startClientX;
      const deltaY = event.clientY - pressCardState.startClientY;
      const durationMs = Date.now() - pressCardState.startTime;

      if (
        Math.abs(deltaY) >= SWIPE_COMPLETE_THRESHOLD &&
        Math.abs(deltaY) > Math.abs(deltaX) * 1.15
      ) {
        clearPressCardState();

        if (deltaY < 0 && task.status === "pending") {
          await handleCompleteTask(task, "up");
        } else if (deltaY > 0) {
          if (window.confirm("Delete this task permanently?")) {
            await handleDeleteFocusedTask(task);
          }
        }
        return;
      }

      // Double-tap detection: simple tap with no movement
      const isSimpleTap = Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && durationMs < 500;
      if (isSimpleTap) {
        const now = Date.now();
        const since = now - lastDoubleTapRef.current;
        if (since < 400 && since > 30) {
          lastDoubleTapRef.current = 0;
          clearPressCardState();
          handleStartEdit(_slotKey, task);
          return;
        }
        lastDoubleTapRef.current = now;
      }

      snapToSwipe(deltaX);
      clearPressCardState();
    };

  const handleFocusedCardPointerCancel = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    clearPressCardState();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        editingKey ||
        isBusy ||
        isEditableKeyboardTarget(event.target)
      ) {
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (focusedSlotIndex < 0) {
          return;
        }

        const nextSlotIndex =
          event.key === "ArrowLeft"
            ? Math.max(0, focusedSlotIndex - 1)
            : Math.min(slots.length - 1, focusedSlotIndex + 1);

        if (nextSlotIndex === focusedSlotIndex) {
          return;
        }

        event.preventDefault();
        focusSlotAtIndex(nextSlotIndex);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const pendingTask =
          focusedTask?.status === "pending"
            ? focusedTask
            : findNearestPendingTask();

        if (!pendingTask) {
          return;
        }

        event.preventDefault();
        void handleCompleteTask(
          pendingTask,
          event.key === "ArrowUp" ? "up" : "down",
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingKey, focusedSlotIndex, focusedTask, isBusy, slots.length, visibleTaskSignature]);

  const handleSaveRef = useRef(handleSave);
  const handleCancelEditRef = useRef(handleCancelEdit);
  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleCancelEditRef.current = handleCancelEdit;
  });

  // Click-outside confirmation while editing
  useEffect(() => {
    if (!editingKey) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-card-interactive]")) return;
      const choice = window.confirm("Save this task before leaving?");
      if (choice) { void handleSaveRef.current(focusedTask); }
      else { handleCancelEditRef.current(); }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [editingKey, focusedTask]);

  useEffect(() => {
    if (editingKey) {
      return;
    }

    let frameId = 0;

    frameId = window.requestAnimationFrame(() => {
      focusSlotAtIndex(targetFocusSlotIndex);
    });

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [editingKey, selectedFilter, targetFocusSlotIndex, visibleTaskSignature]);

  const focusSlotAtIndexRef = useRef(focusSlotAtIndex);
  const slotsRef = useRef(slots);
  useEffect(() => {
    focusSlotAtIndexRef.current = focusSlotAtIndex;
    slotsRef.current = slots;
  });

  useEffect(() => {
    const handleFocusTask = (e: Event) => {
      const customEvent = e as CustomEvent;
      const taskId = customEvent.detail?.taskId;
      if (!taskId) return;
      const slotIndex = slotsRef.current.findIndex((s) => s.task?.id === taskId);
      if (slotIndex >= 0) {
        focusSlotAtIndexRef.current(slotIndex);
      }
    };
    window.addEventListener("onboarding-focus-task", handleFocusTask);
    return () => window.removeEventListener("onboarding-focus-task", handleFocusTask);
  }, []);

  useEffect(() => {
    if (editingKey !== NEW_TASK_SLOT_KEY) {
      return;
    }

    let frameId = 0;

    frameId = window.requestAnimationFrame(() => {
      focusSlotAtIndex(targetFocusSlotIndex);
    });

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [editingKey, targetFocusSlotIndex]);

  const handleOrbitAdd = () => {
    if (isBusy || focusedSlotIndex < 0) {
      return;
    }

    if (focusedSlot && !focusedSlot.task) {
      setNewTaskInsertIndex(null);
      setFocusedSlotKey(focusedSlot.key);
      setEditingKey(focusedSlot.key);
      setDraft(emptyDraft);
      setMessage("");
      return;
    }

    setNewTaskInsertIndex(focusedSlotIndex);
    setFocusedSlotKey(NEW_TASK_SLOT_KEY);
    setEditingKey(NEW_TASK_SLOT_KEY);
    setDraft(emptyDraft);
    setMessage("");
  };

  return (
    <section className="flex w-full justify-center pt-6 md:pt-8" style={{ background: "transparent" }}>
      <div className="w-full max-w-[980px]">
        {message && !editingKey ? (
          <p className="mx-auto mb-3 max-w-[320px] rounded-[8px] border border-cyan-100/15 bg-cyan-100/10 px-3 py-2 text-center text-sm text-cyan-50">
            {message}
          </p>
        ) : null}

        <div
          ref={trackRef}
          className="orbit-scrollbar relative z-20 flex h-[580px] snap-x snap-mandatory items-start gap-5 overflow-x-auto overflow-y-visible px-[calc(50%-110px)] pt-[clamp(5rem,12vw,5.75rem)] pb-8 md:h-[500px] md:px-[calc(50%-120px)] lg:h-[590px] lg:gap-8 lg:px-[calc(50%-130px)]"
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {slots.map(({ key, preset, task }, index) => {
            const isFocusedCard = focusedSlotKey === key;
            const isBanishingCard = Boolean(
              task && banishCardState?.taskId === task.id,
            );
            const isGestureCard = Boolean(
              gestureCardState && gestureCardState.slotKey === key && !isBanishingCard,
            );
            const gestureDirection = isGestureCard
              ? gestureCardState?.direction
              : undefined;
            const gestureGlowColor = gestureDirection === "up"
              ? "rgba(45,212,191,0.42)"
              : "rgba(251,113,133,0.4)";
            const banishGlowColor = banishCardState?.direction === "up"
              ? "rgba(45,212,191,0.42)"
              : "rgba(251,113,133,0.42)";
            const isEmptySlot = !task;
            const shouldEnableFocusedCardGestures =
              Boolean(task) && isFocusedCard && editingKey !== key;

            return (
              <div
                key={key}
                data-slot-empty={task ? "false" : "true"}
                data-slot-key={key}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                className="shrink-0 snap-center snap-always will-change-transform"
                onPointerCancel={
                  shouldEnableFocusedCardGestures
                    ? handleFocusedCardPointerCancel
                    : undefined
                }
                onPointerDown={
                  shouldEnableFocusedCardGestures && task
                    ? handleFocusedCardPointerDown(key, task)
                    : undefined
                }
                onPointerMove={
                  shouldEnableFocusedCardGestures && task
                    ? handleFocusedCardPointerMove(key, task)
                    : undefined
                }
                onPointerUp={
                  shouldEnableFocusedCardGestures && task
                    ? handleFocusedCardPointerUp(key, task)
                    : undefined
                }
                style={
                  {
                    "--orbit-banish-rotate": isBanishingCard
                      ? banishCardState?.direction === "up"
                        ? "-11deg"
                        : "11deg"
                      : "0deg",
                    "--orbit-banish-scale": isBanishingCard ? "0.72" : "1",
                    "--orbit-banish-x": isBanishingCard
                      ? banishCardState?.direction === "up"
                        ? "22px"
                        : "-22px"
                      : "0px",
                    "--orbit-banish-y": isBanishingCard
                      ? banishCardState?.direction === "up"
                        ? "-228px"
                        : "228px"
                      : "0px",
                    "--orbit-gesture-y": isGestureCard
                      ? `${gestureCardState?.offsetY ?? 0}px`
                      : "0px",
                    "--orbit-y": "0px",
                    "--orbit-scale-x": "0.8",
                    "--orbit-scale-y": "0.8",
                    "--orbit-rotate": "0deg",
                    "--orbit-opacity": "0.38",
                    cursor: shouldEnableFocusedCardGestures
                      ? "grab"
                      : undefined,
                    filter: isBanishingCard
                      ? `blur(14px) saturate(1.35) brightness(1.45) drop-shadow(0 0 34px ${banishGlowColor})`
                      : isGestureCard
                        ? `drop-shadow(0 ${gestureDirection === "up" ? "-12px" : "12px"}px ${18 + (gestureCardState?.intensity ?? 0) * 28}px ${gestureGlowColor})`
                      : isEmptySlot
                        ? "drop-shadow(0 18px 36px rgba(94,234,212,0.24))"
                        : "none",
                    opacity: isBanishingCard ? 0.04 : "var(--orbit-opacity)",
                    touchAction: shouldEnableFocusedCardGestures ? "none" : undefined,
                    transform:
                      "translateY(var(--orbit-y)) scaleX(var(--orbit-scale-x)) scaleY(var(--orbit-scale-y)) rotate(var(--orbit-rotate)) translateY(var(--orbit-gesture-y)) translate(var(--orbit-banish-x), var(--orbit-banish-y)) rotate(var(--orbit-banish-rotate)) scale(var(--orbit-banish-scale))",
                    transition:
                      isBanishingCard
                        ? "transform 340ms cubic-bezier(0.16, 0.84, 0.22, 1), opacity 320ms ease-out, filter 320ms ease-out"
                        : isGestureCard
                          ? "transform 40ms linear, opacity 120ms ease-out, filter 120ms ease-out"
                          : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, filter 220ms ease",
                  } as OrbitStyle
                }
              >
                <div className="w-[220px] md:w-[240px] lg:w-[260px]">
                  <OrbitCard
                    draft={draft}
                    errorMessage={editingKey === key ? message : undefined}
                    isFocused={isFocusedCard}
                    isEditing={editingKey === key}
                    onCancelEdit={handleCancelEdit}
                    onChangeDraft={setDraft}
                    onSave={() => void handleSave(task)}
                    onStartAdd={() => handleStartAdd(key)}
                    onStartEdit={() => {
                      if (task) {
                        handleStartEdit(key, task);
                      }
                    }}
                    preset={preset}
                    task={task}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {!isEditing && (
          <div
            className="fixed inset-x-0 bottom-30 z-20 flex flex-col items-center md:bottom-40"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <button
              aria-label="Add a task"
              className="group relative flex items-center justify-center rounded-full border border-cyan-100/25 bg-[radial-gradient(circle_at_30%_30%,rgba(103,232,249,0.16),rgba(7,16,30,0.97)_68%)] shadow-[0_0_28px_rgba(103,232,249,0.16)] transition duration-200 hover:scale-105 hover:border-cyan-100/40 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isBusy || !focusedSlot}
              onClick={handleOrbitAdd}
              style={{
                height: `${addTaskButtonSize}px`,
                width: `${addTaskButtonSize}px`,
              }}
              type="button"
            >
              <span
                className="absolute rounded-full border border-cyan-100/12"
                style={{ inset: `${addTaskRingInset}px` }}
              />
              <>
                <span
                  className="absolute rounded-full bg-cyan-50 shadow-[0_0_10px_rgba(236,243,255,0.8)]"
                  style={{
                    height: `${addTaskIconLength}px`,
                    width: `${addTaskIconThickness}px`,
                  }}
                />
                <span
                  className="absolute rounded-full bg-cyan-50 shadow-[0_0_10px_rgba(236,243,255,0.8)]"
                  style={{
                    height: `${addTaskIconThickness}px`,
                    width: `${addTaskIconLength}px`,
                  }}
                />
              </>
            </button>
            <p
              className={
                "mt-2 text-center text-xs font-semibold tracking-[0.18em] text-cyan-100/58 uppercase"
              }
            >
              Add Task
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

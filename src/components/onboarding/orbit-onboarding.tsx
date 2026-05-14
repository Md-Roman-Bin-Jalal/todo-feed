"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ONBOARDING_STEPS,
  ONBOARDING_TASKS,
  isOnboardingComplete,
  markOnboardingComplete,
  type OnboardingStep,
  type OnboardingSubStep,
} from "@/lib/onboarding/onboarding-data";

type OrbitOnboardingProps = {
  children: ReactNode;
  onComplete: () => void;
};

type OnboardingState = {
  stepIndex: number;
  subStep: OnboardingSubStep;
  tasks: typeof ONBOARDING_TASKS;
  hasScrolled: boolean;
  hasSwipedUp: boolean;
  hasSwipedDown: boolean;
  hasAddedTask: boolean;
  hasEdited: boolean;
  hasScrolledCompass: boolean;
};

const INITIAL_STATE: OnboardingState = {
  stepIndex: 0,
  subStep: "intro",
  tasks: [...ONBOARDING_TASKS],
  hasScrolled: false,
  hasSwipedUp: false,
  hasSwipedDown: false,
  hasAddedTask: false,
  hasEdited: false,
  hasScrolledCompass: false,
};

export function OrbitOnboarding({ children, onComplete }: OrbitOnboardingProps) {
  const [active, setActive] = useState(false);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      setActive(true);
      // Wait a tick for deck to mount, then focus the first target task
      setTimeout(() => {
        const firstStepConfig = ONBOARDING_STEPS[0];
        if (firstStepConfig?.targetTaskId) {
          window.dispatchEvent(
            new CustomEvent("onboarding-focus-task", {
              detail: { taskId: firstStepConfig.targetTaskId },
            }),
          );
        }
      }, 500);
    }
  }, []);

  const currentStepConfig = ONBOARDING_STEPS[state.stepIndex];
  const totalSteps = ONBOARDING_STEPS.length;

  const advanceToNextStep = useCallback(() => {
    setShowConfirm(true);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => {
      setShowConfirm(false);
      setState((prev) => {
        const next = prev.stepIndex + 1;
        if (next >= totalSteps) {
          setTimeout(() => {
            markOnboardingComplete();
            setActive(false);
            onComplete();
          }, 0);
          return prev;
        }

        const nextStepConfig = ONBOARDING_STEPS[next];
        if (nextStepConfig?.targetTaskId) {
          window.dispatchEvent(
            new CustomEvent("onboarding-focus-task", {
              detail: { taskId: nextStepConfig.targetTaskId },
            }),
          );
        }

        return { ...prev, stepIndex: next, subStep: "intro" };
      });
    }, 900);
  }, [totalSteps, onComplete]);

  const handleSkip = useCallback(() => {
    markOnboardingComplete();
    setActive(false);
    onComplete();
  }, [onComplete]);

  const handleStartAction = useCallback(() => {
    setState((prev) => ({ ...prev, subStep: "action" }));
  }, []);

  // Provide onboarding context to children via data attributes + global event system
  useEffect(() => {
    if (!active) return;

    const handler = (e: CustomEvent) => {
      const detail = e.detail as { action: string };
      const step = ONBOARDING_STEPS[state.stepIndex];
      if (!step) return;

      if (step.id === "scroll" && detail.action === "scrolled") {
        setState((prev) => ({ ...prev, hasScrolled: true }));
        advanceToNextStep();
      }
      if (step.id === "swipeUp" && detail.action === "swiped-up") {
        setState((prev) => ({ ...prev, hasSwipedUp: true }));
        advanceToNextStep();
      }
      if (step.id === "swipeDown" && detail.action === "swiped-down") {
        setState((prev) => ({ ...prev, hasSwipedDown: true }));
        advanceToNextStep();
      }
      if (step.id === "add" && detail.action === "task-added") {
        setState((prev) => ({ ...prev, hasAddedTask: true }));
        advanceToNextStep();
      }
      if (step.id === "edit" && detail.action === "edited") {
        setState((prev) => ({ ...prev, hasEdited: true }));
        advanceToNextStep();
      }
      if (step.id === "compass" && detail.action === "compass-scrolled") {
        setState((prev) => ({ ...prev, hasScrolledCompass: true }));
        advanceToNextStep();
      }
    };

    window.addEventListener("onboarding-action" as any, handler as any);
    return () => window.removeEventListener("onboarding-action" as any, handler as any);
  }, [active, state.stepIndex, advanceToNextStep]);

  if (!active) return <>{children}</>;

  const stepNum = state.stepIndex + 1;
  const hintType = currentStepConfig?.hintType ?? "swipe-horizontal";
  const isIntro = state.subStep === "intro";

  return (
    <div className="relative" data-onboarding-active="true" data-onboarding-step={currentStepConfig?.id ?? ""}>
      {children}

      {/* Instruction overlay */}
      {isIntro && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-[360px] rounded-[20px] border border-cyan-100/20 bg-[#0a1628]/95 px-6 py-8 text-center shadow-[0_0_60px_rgba(103,232,249,0.15)]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-100/50">
              Step {stepNum} of {totalSteps}
            </p>
            <div className="mb-4 text-4xl">
              {hintType === "swipe-horizontal" && "↔️"}
              {hintType === "swipe-up" && "⬆️"}
              {hintType === "swipe-down" && "⬇️"}
              {hintType === "tap-add" && "➕"}
              {hintType === "double-tap" && "👆"}
              {hintType === "scroll-compass" && "🧭"}
            </div>
            <h2 className="mb-2 text-xl font-bold text-cyan-50">
              {currentStepConfig?.title}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-cyan-100/65">
              {currentStepConfig?.description}
            </p>
            <button
              className="h-11 w-full rounded-[10px] bg-cyan-100 text-sm font-bold text-[#07101e] transition hover:bg-cyan-50 active:scale-[0.97]"
              onClick={handleStartAction}
              type="button"
            >
              Got it, let me try!
            </button>
          </div>
        </div>
      )}

      {/* Confirmed flash */}
      {showConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
          <div className="onboarding-confirm-flash rounded-full bg-cyan-100/20 px-8 py-4 text-center backdrop-blur-sm">
            <span className="text-3xl">✅</span>
            <p className="mt-1 text-sm font-bold text-cyan-50">Nice work!</p>
          </div>
        </div>
      )}

      {/* Animated hint overlay (visible during action sub-step) */}
      {!isIntro && !showConfirm && (
        <div className="fixed inset-0 z-[250] pointer-events-none">
          {/* 
            HAND GESTURE POSITIONS 
            You can manually tweak these values (top, bottom, left, transform) 
            to adjust exactly where the hand appears on screen. 
          */}
          {hintType === "swipe-horizontal" && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "3rem", filter: "drop-shadow(0 0 18px rgba(103,232,249,0.6))" }}>
              <span className="onboarding-hint-horizontal inline-block">👆</span>
            </div>
          )}
          
          {hintType === "swipe-up" && (
            <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "3rem", filter: "drop-shadow(0 0 18px rgba(103,232,249,0.6))" }}>
              <span className="onboarding-hint-up inline-block">👆</span>
            </div>
          )}
          
          {hintType === "swipe-down" && (
            <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "3rem", filter: "drop-shadow(0 0 18px rgba(103,232,249,0.6))" }}>
              <span className="onboarding-hint-down inline-block">👇</span>
            </div>
          )}
          
          {hintType === "tap-add" && (
            <div style={{ position: "absolute", bottom: "12%", left: "50%", transform: "translate(-50%, 0)", fontSize: "3rem", filter: "drop-shadow(0 0 18px rgba(103,232,249,0.6))" }}>
              <span className="onboarding-hint-tap inline-block">👇</span>
            </div>
          )}
          
          {hintType === "double-tap" && (
            <div style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "3rem", filter: "drop-shadow(0 0 18px rgba(103,232,249,0.6))" }}>
              <span className="onboarding-hint-double-tap inline-block">👆</span>
            </div>
          )}
          
          {hintType === "scroll-compass" && (
            <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "3rem", filter: "drop-shadow(0 0 18px rgba(103,232,249,0.6))" }}>
              <span className="onboarding-hint-horizontal inline-block">👆</span>
            </div>
          )}
        </div>
      )}

      {/* Instruction banner (during action) */}
      {!isIntro && !showConfirm && (
        <div className="fixed bottom-24 inset-x-0 z-[260] flex justify-center pointer-events-none">
          <div className="mx-4 rounded-full border border-cyan-100/25 bg-[#0a1628]/90 px-5 py-2.5 backdrop-blur-md shadow-[0_0_30px_rgba(103,232,249,0.12)]">
            <p className="text-xs font-bold text-cyan-50 text-center">
              <span className="text-cyan-100/50 mr-2">{stepNum}/{totalSteps}</span>
              {currentStepConfig?.description}
            </p>
          </div>
        </div>
      )}

      {/* Skip button — always visible */}
      <button
        className="fixed bottom-6 right-6 z-[310] rounded-full border border-cyan-100/20 bg-[#0a1628]/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-cyan-100/60 backdrop-blur-sm transition hover:border-cyan-100/40 hover:text-cyan-50"
        onClick={handleSkip}
        type="button"
      >
        Skip
      </button>

      {/* Progress dots */}
      <div className="fixed bottom-8 inset-x-0 z-[310] flex justify-center gap-2 pointer-events-none">
        {ONBOARDING_STEPS.map((step, i) => (
          <span
            key={step.id}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === state.stepIndex
                ? "w-6 bg-cyan-100 shadow-[0_0_12px_rgba(103,232,249,0.5)]"
                : i < state.stepIndex
                  ? "w-2 bg-cyan-100/60"
                  : "w-2 bg-cyan-100/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Dispatch an onboarding action event from anywhere in the app.
 */
export function dispatchOnboardingAction(action: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("onboarding-action", { detail: { action } })
  );
}

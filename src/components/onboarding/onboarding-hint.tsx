"use client";

import type { CSSProperties } from "react";

type OnboardingHintProps = {
  type:
    | "swipe-horizontal"
    | "swipe-up"
    | "swipe-down"
    | "tap-add"
    | "double-tap"
    | "scroll-compass";
  visible: boolean;
};

/**
 * An animated hand / arrow hint overlay that shows the user what gesture to perform.
 * Positioned absolutely — parent should be `position: relative`.
 */
export function OnboardingHint({ type, visible }: OnboardingHintProps) {
  if (!visible) return null;

  const baseStyle: CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    zIndex: 200,
    fontSize: "2.5rem",
    filter: "drop-shadow(0 0 18px rgba(103,232,249,0.5))",
  };

  if (type === "swipe-horizontal") {
    return (
      <div
        style={{
          ...baseStyle,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <span className="onboarding-hint-horizontal" style={{ display: "inline-block" }}>
          👆
        </span>
      </div>
    );
  }

  if (type === "swipe-up") {
    return (
      <div
        style={{
          ...baseStyle,
          left: "50%",
          bottom: "14%",
          transform: "translateX(-50%)",
        }}
      >
        <span className="onboarding-hint-up" style={{ display: "inline-block" }}>
          👆
        </span>
      </div>
    );
  }

  if (type === "swipe-down") {
    return (
      <div
        style={{
          ...baseStyle,
          left: "50%",
          top: "14%",
          transform: "translateX(-50%)",
        }}
      >
        <span className="onboarding-hint-down" style={{ display: "inline-block" }}>
          👇
        </span>
      </div>
    );
  }

  if (type === "tap-add") {
    return (
      <div
        style={{
          ...baseStyle,
          left: "50%",
          bottom: "2%",
          transform: "translateX(-50%)",
        }}
      >
        <span className="onboarding-hint-tap" style={{ display: "inline-block" }}>
          👇
        </span>
      </div>
    );
  }

  if (type === "double-tap") {
    return (
      <div
        style={{
          ...baseStyle,
          left: "50%",
          top: "44%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <span className="onboarding-hint-double-tap" style={{ display: "inline-block" }}>
          👆
        </span>
      </div>
    );
  }

  if (type === "scroll-compass") {
    return (
      <div
        style={{
          ...baseStyle,
          left: "50%",
          top: "0",
          transform: "translate(-50%, -120%)",
          fontSize: "2rem",
        }}
      >
        <span className="onboarding-hint-horizontal" style={{ display: "inline-block" }}>
          👆
        </span>
      </div>
    );
  }

  return null;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { OrbitAuthGate } from "@/components/auth/orbit-auth-gate";
import { OrbitCardDeck } from "@/components/cards/orbit-card-deck";
import { OrbitCompass } from "@/components/navigation/orbit-compass";
import { OrbitOnboarding, dispatchOnboardingAction } from "@/components/onboarding/orbit-onboarding";
import {
  isOnboardingComplete,
  ONBOARDING_TASKS,
} from "@/lib/onboarding/onboarding-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createTask } from "@/lib/tasks/api-client";
import type { OrbitTaskFilter } from "@/lib/tasks/view";

export default function Home() {
  const [selectedFilter, setSelectedFilter] = useState<OrbitTaskFilter>("pending");
  const [selectedFilterCardCount, setSelectedFilterCardCount] = useState(0);
  const [onboardingActive, setOnboardingActive] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const compassScrollCountRef = useRef(0);
  const lastScrollFilterRef = useRef(selectedFilter);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      setOnboardingActive(true);
    } else {
      setOnboardingDone(true);
    }
  }, []);

  const hasCreatedWelcomeTaskRef = useRef(false);

  const handleOnboardingComplete = useCallback(async () => {
    setOnboardingActive(false);
    setOnboardingDone(true);
    
    if (hasCreatedWelcomeTaskRef.current) return;
    hasCreatedWelcomeTaskRef.current = true;
    
    // Create a single welcome task in the real DB. 
    // The deck will automatically fetch this because onboardingActive becomes false.
    try {
      await createTask({
        title: "Welcome! 🚀",
        description: "You're all set. Start adding your todos!",
        priority: "low",
        due_date: "",
      });
    } catch (err) {
      console.error("Failed to create welcome task:", err);
    }
  }, []);

  // Track compass scrolling for onboarding
  const handleCompassSelect = useCallback(
    (filter: OrbitTaskFilter) => {
      if (onboardingActive && filter !== lastScrollFilterRef.current) {
        compassScrollCountRef.current += 1;
        lastScrollFilterRef.current = filter;
        if (compassScrollCountRef.current >= 2) {
          dispatchOnboardingAction("compass-scrolled");
        }
      }
      setSelectedFilter(filter);
    },
    [onboardingActive],
  );

  const mainContent = (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1120px] flex-col items-center justify-start px-4 py-4 lg:px-8">
      <div className="flex w-full flex-col items-center gap-[clamp(1.25rem,4vw,2.25rem)]">
        <OrbitCompass
          onSelect={handleCompassSelect}
          selectedCount={selectedFilterCardCount}
          selectedFilter={selectedFilter}
        />
        <OrbitCardDeck
          onVisibleCountChange={setSelectedFilterCardCount}
          selectedFilter={selectedFilter}
          onboardingActive={onboardingActive}
          onboardingTasks={onboardingActive ? ONBOARDING_TASKS : undefined}
        />
      </div>

      <button
        onClick={async () => {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
        }}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/20 bg-[rgba(8,12,22,0.8)] text-xl text-cyan-100/60 shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all hover:bg-[rgba(8,12,22,0.95)] hover:text-cyan-50 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] active:scale-95"
        title="Log out"
        type="button"
      >
        🚪
      </button>
    </main>
  );

  return (
    <OrbitAuthGate>
      {onboardingActive ? (
        <OrbitOnboarding onComplete={handleOnboardingComplete}>
          {mainContent}
        </OrbitOnboarding>
      ) : (
        mainContent
      )}
    </OrbitAuthGate>
  );
}

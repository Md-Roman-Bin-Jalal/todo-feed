"use client";

import { useEffect, useRef } from "react";

import {
  orbitTaskFilters,
  type OrbitTaskFilter,
} from "@/lib/tasks/view";

type CompassVariant = "mobile" | "desktop";
const compassLoopCount = 3;

type OrbitCompassRailProps = {
  selectedFilter: OrbitTaskFilter;
  selectedCount: number;
  variant: CompassVariant;
  onSelect: (filter: OrbitTaskFilter) => void;
};

function OrbitCompassRail({
  selectedFilter,
  selectedCount,
  variant,
  onSelect,
}: OrbitCompassRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dragStateRef = useRef({
    activePointerId: -1,
    startClientX: 0,
    startScrollLeft: 0,
  });
  const repeatedFilters = Array.from(
    { length: orbitTaskFilters.length * compassLoopCount },
    (_item, index) => orbitTaskFilters[index % orbitTaskFilters.length],
  );

  const centerFilterInMiddleLoop = (
    filter: OrbitTaskFilter,
    behavior: ScrollBehavior,
  ) => {
    const track = trackRef.current;
    const baseFilterIndex = orbitTaskFilters.findIndex(
      (item) => item.id === filter,
    );
    const loopedFilterIndex = baseFilterIndex + orbitTaskFilters.length;
    const item = itemRefs.current[loopedFilterIndex];

    if (!track || !item || track.clientWidth === 0) {
      return;
    }

    track.scrollTo({
      behavior,
      left: item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2,
    });
  };

  useEffect(() => {
    centerFilterInMiddleLoop(selectedFilter, "auto");
  }, [selectedFilter]);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    let frameId = 0;

    const syncSelectedFilter = () => {
      if (track.clientWidth === 0) {
        return;
      }

      const trackCenter = track.scrollLeft + track.clientWidth / 2;
      let closestFilter: OrbitTaskFilter = "all";
      let closestLoopIndex = orbitTaskFilters.length;
      let closestDistance = Number.POSITIVE_INFINITY;

      repeatedFilters.forEach((filter, index) => {
        const item = itemRefs.current[index];

        if (!item) {
          return;
        }

        const itemCenter = item.offsetLeft + item.offsetWidth / 2;
        const distance = Math.abs(itemCenter - trackCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestFilter = filter.id;
          closestLoopIndex = index;
        }
      });

      onSelect(closestFilter);

      if (
        closestLoopIndex < orbitTaskFilters.length ||
        closestLoopIndex >= orbitTaskFilters.length * 2
      ) {
        centerFilterInMiddleLoop(closestFilter, "auto");
      }
    };

    const queueSync = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        syncSelectedFilter();
        frameId = 0;
      });
    };

    queueSync();
    track.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("resize", queueSync);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      track.removeEventListener("scroll", queueSync);
      window.removeEventListener("resize", queueSync);
    };
  }, [onSelect]);

  const scrollFilterToCenter = (filter: OrbitTaskFilter) => {
    onSelect(filter);
    centerFilterInMiddleLoop(filter, "smooth");
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    const track = trackRef.current;

    if (!track) {
      return;
    }

    dragStateRef.current = {
      activePointerId: event.pointerId,
      startClientX: event.clientX,
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

    track.scrollLeft =
      dragState.startScrollLeft - (event.clientX - dragState.startClientX);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;

    if (!track || dragStateRef.current.activePointerId !== event.pointerId) {
      return;
    }

    track.releasePointerCapture(event.pointerId);
    dragStateRef.current.activePointerId = -1;
  };

  const isDesktop = variant === "desktop";

  return (
    <div
      className={
        isDesktop
          ? "relative mx-auto h-[88px] w-full max-w-[680px]"
          : "relative mx-auto h-[82px] w-full max-w-[360px]"
      }
    >
      <div className="pointer-events-none absolute left-2 right-2 top-5 h-px bg-[linear-gradient(90deg,transparent,rgba(126,238,255,0.7),rgba(255,255,255,0.75),rgba(126,238,255,0.7),transparent)]" />
      <div className="pointer-events-none absolute left-2 top-[17px] h-2 w-2 rotate-45 border-b border-l border-cyan-100/70" />
      <div className="pointer-events-none absolute right-2 top-[17px] h-2 w-2 rotate-45 border-r border-t border-cyan-100/70" />
      <div className="pointer-events-none absolute left-7 right-7 top-[13px] flex justify-between">
        {[0, 1, 2, 3, 4].map((tick) => (
          <span
            key={tick}
            className="h-4 w-px rounded-full bg-cyan-100/45 shadow-[0_0_12px_rgba(103,232,249,0.42)]"
          />
        ))}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-cyan-100/55 bg-[#07101e] text-sm font-bold text-cyan-50 shadow-[0_0_22px_rgba(103,232,249,0.3)]">
        {selectedCount}
      </div>

      <div
        ref={trackRef}
        className={
          isDesktop
            ? "orbit-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto px-[calc(50%-64px)] pt-12 pb-3 lg:cursor-grab"
            : "orbit-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-48px)] pt-12 pb-3"
        }
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {repeatedFilters.map((filter, index) => {
          const isSelected = selectedFilter === filter.id;

          return (
            <button
              key={`${filter.id}-${index}`}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              className={
                isDesktop
                  ? "h-8 w-32 shrink-0 snap-center touch-pan-x select-none border-0 bg-transparent px-2 text-center text-sm font-semibold text-cyan-100/55 transition duration-200 hover:text-cyan-50 data-[selected=true]:scale-110 data-[selected=true]:text-cyan-50"
                  : "h-8 w-24 shrink-0 snap-center touch-pan-x select-none border-0 bg-transparent px-2 text-center text-xs font-semibold text-cyan-100/55 transition duration-200 data-[selected=true]:scale-110 data-[selected=true]:text-cyan-50"
              }
              data-selected={isSelected}
              onClick={() => scrollFilterToCenter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type OrbitCompassProps = {
  selectedFilter: OrbitTaskFilter;
  selectedCount: number;
  onSelect: (filter: OrbitTaskFilter) => void;
};

export function OrbitCompass({
  selectedFilter,
  selectedCount,
  onSelect,
}: OrbitCompassProps) {
  return (
    <section aria-label="Task filter compass" className="w-full pt-6 md:pt-9">
      <div className="block md:hidden">
        <OrbitCompassRail
          selectedFilter={selectedFilter}
          selectedCount={selectedCount}
          variant="mobile"
          onSelect={onSelect}
        />
      </div>

      <div className="hidden md:block">
        <OrbitCompassRail
          selectedFilter={selectedFilter}
          selectedCount={selectedCount}
          variant="desktop"
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}

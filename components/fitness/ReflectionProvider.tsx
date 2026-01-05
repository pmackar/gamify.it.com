'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ReflectionPrompt, ReflectionData, REFLECTION_PROMPT_EVENT } from './ReflectionPrompt';

interface WorkoutStats {
  duration: number;
  exerciseCount: number;
  setCount: number;
  prsHit: number;
}

interface ReflectionContextType {
  showReflection: (workoutId: string, stats?: WorkoutStats) => void;
  lastReflection: ReflectionData | null;
}

const ReflectionContext = createContext<ReflectionContextType | null>(null);

export function useReflection() {
  const context = useContext(ReflectionContext);
  if (!context) {
    throw new Error('useReflection must be used within ReflectionProvider');
  }
  return context;
}

export function ReflectionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | undefined>();
  const [lastReflection, setLastReflection] = useState<ReflectionData | null>(null);

  const showReflection = useCallback((workoutId: string, stats?: WorkoutStats) => {
    setCurrentWorkoutId(workoutId);
    setWorkoutStats(stats);
    setIsOpen(true);
  }, []);

  const handleSubmit = useCallback(async (data: ReflectionData) => {
    setLastReflection(data);
    setIsOpen(false);

    // Save reflection to server
    if (currentWorkoutId) {
      try {
        await fetch('/api/fitness/reflection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workoutId: currentWorkoutId,
            reflection: data,
          }),
        });
      } catch (error) {
        console.error('Failed to save reflection:', error);
      }
    }

    setCurrentWorkoutId(null);
    setWorkoutStats(undefined);
  }, [currentWorkoutId]);

  const handleSkip = useCallback(() => {
    setIsOpen(false);
    setCurrentWorkoutId(null);
    setWorkoutStats(undefined);
  }, []);

  // Listen for reflection prompt events
  useEffect(() => {
    const handleEvent = (event: CustomEvent<{ workoutId: string; stats?: WorkoutStats }>) => {
      if (event.detail?.workoutId) {
        showReflection(event.detail.workoutId, event.detail.stats);
      }
    };

    window.addEventListener(REFLECTION_PROMPT_EVENT, handleEvent as EventListener);
    return () => {
      window.removeEventListener(REFLECTION_PROMPT_EVENT, handleEvent as EventListener);
    };
  }, [showReflection]);

  return (
    <ReflectionContext.Provider value={{ showReflection, lastReflection }}>
      {children}
      {isOpen && (
        <ReflectionPrompt
          onSubmit={handleSubmit}
          onSkip={handleSkip}
          workoutStats={workoutStats}
        />
      )}
    </ReflectionContext.Provider>
  );
}

// Helper to dispatch reflection prompt
export function dispatchReflectionPrompt(workoutId: string, stats?: WorkoutStats) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REFLECTION_PROMPT_EVENT, {
      detail: { workoutId, stats }
    }));
  }
}

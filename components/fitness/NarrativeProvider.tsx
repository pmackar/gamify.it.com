'use client';

import { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { useFitnessStore } from '@/lib/fitness/store';
import { RivalEncounterProvider, dispatchRivalEncounter } from './RivalEncounterPopup';
import { ShowdownProvider, dispatchShowdown } from './ShowdownModal';
import type { RivalRelationship, EncounterRecord, NarrativeSettings } from '@/lib/fitness/types';

// Event for workout completion (fired by the fitness app)
export const WORKOUT_COMPLETED_EVENT = 'workout-completed';

export function dispatchWorkoutCompleted() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WORKOUT_COMPLETED_EVENT));
  }
}

interface NarrativeContextType {
  isInitialized: boolean;
  triggerEncounter: (rivalId?: string) => Promise<void>;
  triggerShowdown: () => Promise<void>;
  getRival: (rivalId: string) => RivalRelationship | undefined;
  settings: NarrativeSettings | null;
}

const NarrativeContext = createContext<NarrativeContextType | null>(null);

export function useNarrative() {
  const context = useContext(NarrativeContext);
  if (!context) {
    throw new Error('useNarrative must be used within NarrativeProvider');
  }
  return context;
}

interface Props {
  children: ReactNode;
}

function NarrativeProviderInner({ children }: Props) {
  const store = useFitnessStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize narrative engine on mount
  useEffect(() => {
    const init = async () => {
      await store.initNarrativeEngine();
      setIsInitialized(true);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get a rival by ID
  const getRival = useCallback(
    (rivalId: string): RivalRelationship | undefined => {
      return store.narrativeEngine?.rivals.find((r) => r.id === rivalId);
    },
    [store.narrativeEngine]
  );

  // Get rival name for display
  const getRivalName = useCallback((rival: RivalRelationship): string => {
    if (rival.rivalType === 'ai_phantom' && rival.phantomConfig) {
      return rival.phantomConfig.name || 'Shadow Self';
    }
    // For friend rivals, we'd need to fetch the name
    return 'Rival';
  }, []);

  // Trigger an encounter with a specific rival (or random if not specified)
  const triggerEncounter = useCallback(
    async (rivalId?: string) => {
      const engine = store.narrativeEngine;
      if (!engine || engine.rivals.length === 0) return;

      // Select rival
      const rival = rivalId
        ? engine.rivals.find((r) => r.id === rivalId)
        : engine.rivals[Math.floor(Math.random() * engine.rivals.length)];

      if (!rival) return;

      try {
        const res = await fetch('/api/fitness/narrative/encounters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rivalId: rival.id }),
        });

        if (res.ok) {
          const encounterResult = await res.json();

          // Build encounter record for local state
          const encounter: EncounterRecord = {
            id: encounterResult.id,
            rivalId: rival.id,
            rivalType: rival.rivalType,
            winner: encounterResult.winner,
            winningMargin: encounterResult.winningMargin,
            dominantFactor: encounterResult.dominantFactor,
            userMetrics: encounterResult.userMetrics,
            rivalMetrics: encounterResult.rivalMetrics,
            respectDelta: encounterResult.respectDelta,
            heatDelta: encounterResult.heatDelta,
            encounterDate: encounterResult.encounterDate,
          };

          // Update local state
          store.recordEncounter(encounter);
          store.updateRivalStats(rival.id, {
            respectLevel: encounterResult.newRespectLevel,
            rivalryHeat: encounterResult.newRivalryHeat,
            winStreak: encounterResult.winStreak,
            encounterCount: rival.encounterCount + 1,
            lastEncounterDate: encounter.encounterDate,
            headToHead: {
              userWins:
                rival.headToHead.userWins + (encounterResult.winner === 'user' ? 1 : 0),
              rivalWins:
                rival.headToHead.rivalWins + (encounterResult.winner === 'rival' ? 1 : 0),
              ties: rival.headToHead.ties + (encounterResult.winner === 'tie' ? 1 : 0),
            },
          });

          // Dispatch UI event if popups are enabled
          if (engine.settings.notificationPreferences.encounterPopups) {
            dispatchRivalEncounter({
              encounter,
              rival: {
                ...rival,
                respectLevel: encounterResult.newRespectLevel,
                rivalryHeat: encounterResult.newRivalryHeat,
                winStreak: encounterResult.winStreak,
              },
              rivalName: getRivalName(rival),
            });
          }
        }
      } catch (error) {
        console.error('Failed to trigger encounter:', error);
      }
    },
    [store, getRivalName]
  );

  // Trigger weekly showdown against all rivals
  const triggerShowdown = useCallback(async () => {
    const engine = store.narrativeEngine;
    if (!engine || engine.rivals.length === 0) return;

    try {
      const res = await fetch('/api/fitness/narrative/showdown', {
        method: 'POST',
      });

      if (res.ok) {
        const showdownResult = await res.json();

        // Dispatch UI event if showdowns are enabled
        if (engine.settings.notificationPreferences.weeklyShowdowns) {
          dispatchShowdown(showdownResult);
        }

        // Refresh rival data
        await store.initNarrativeEngine();
      }
    } catch (error) {
      console.error('Failed to trigger showdown:', error);
    }
  }, [store]);

  // Listen for workout completion events
  useEffect(() => {
    const handleWorkoutCompleted = () => {
      if (store.shouldTriggerEncounter()) {
        triggerEncounter();
      }
    };

    window.addEventListener(WORKOUT_COMPLETED_EVENT, handleWorkoutCompleted);
    return () => {
      window.removeEventListener(WORKOUT_COMPLETED_EVENT, handleWorkoutCompleted);
    };
  }, [store, triggerEncounter]);

  const contextValue: NarrativeContextType = {
    isInitialized,
    triggerEncounter,
    triggerShowdown,
    getRival,
    settings: store.narrativeEngine?.settings || null,
  };

  return (
    <NarrativeContext.Provider value={contextValue}>
      {children}
    </NarrativeContext.Provider>
  );
}

// Composite provider that includes all narrative UI components
export function NarrativeProvider({ children }: Props) {
  return (
    <RivalEncounterProvider>
      <ShowdownProvider>
        <NarrativeProviderInner>{children}</NarrativeProviderInner>
      </ShowdownProvider>
    </RivalEncounterProvider>
  );
}

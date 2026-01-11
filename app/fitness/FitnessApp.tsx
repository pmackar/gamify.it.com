'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import localFont from 'next/font/local';
import { useFitnessStore } from '@/lib/fitness/store';

const modernThrash = localFont({
  src: '../../public/Fonts/Modern Thrash Slant.woff2',
  display: 'swap',
  variable: '--font-modern-thrash',
});
import { EXERCISES, DEFAULT_COMMANDS, getExerciseById, MILESTONES, GENERAL_ACHIEVEMENTS, matchExerciseFromCSV, calculateSetXP, PREBUILT_PROGRAMS, getExerciseSubstitutes, getExerciseTier } from '@/lib/fitness/data';
import { CommandSuggestion, Workout, WorkoutExercise, Set as SetType, TemplateExercise, Program, ProgramWeek, ProgramDay, ProgressionRule, ExerciseWeightConfig, WeightBasis } from '@/lib/fitness/types';
import { useNavBar } from '@/components/NavBarContext';
import FriendsWorkoutFeed from './components/FriendsWorkoutFeed';
import FitnessLeaderboard from './components/FitnessLeaderboard';
import { StreakDangerBanner } from '@/components/fitness/StreakDangerBanner';
import { WeeklyWinsModal } from '@/components/fitness/WeeklyWinsModal';
import { AlmostThereCard } from '@/components/fitness/AlmostThereCard';
import { AccountabilityCard } from '@/components/fitness/AccountabilityCard';
import { DailyChallengeCard } from '@/components/fitness/DailyChallengeCard';
import { NarrativeProvider } from '@/components/fitness/NarrativeProvider';
import { RivalSettingsPanel } from '@/components/fitness/RivalSettingsPanel';
import { FriendRivalryScoreboard } from '@/components/fitness/FriendRivalryScoreboard';

interface Particle { id: number; x: number; y: number; size: number; color: string; speed: number; opacity: number; delay: number; }

const PixelParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const colors = ['#FF6B6B', '#FFD700', '#ff8f8f', '#5CC9F5', '#34c759'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 3 + 2, color: colors[Math.floor(Math.random() * colors.length)], speed: Math.random() * 20 + 15, opacity: Math.random() * 0.3 + 0.1, delay: Math.random() * 10 });
    }
    setParticles(newParticles);
  }, []);
  return (
    <div className="particles-container">
      {particles.map((p) => (<div key={p.id} className="pixel-particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.size}px`, height: `${p.size}px`, backgroundColor: p.color, opacity: p.opacity, animationDuration: `${p.speed}s`, animationDelay: `${p.delay}s` }} />))}
    </div>
  );
};

const MUSCLE_CATEGORIES = [
  { id: 'chest', name: 'Chest', icon: '🫁' },
  { id: 'back', name: 'Back', icon: '🔙' },
  { id: 'shoulders', name: 'Shoulders', icon: '🎯' },
  { id: 'biceps', name: 'Biceps', icon: '💪' },
  { id: 'triceps', name: 'Triceps', icon: '🦾' },
  { id: 'quads', name: 'Quads', icon: '🦵' },
  { id: 'hamstrings', name: 'Hamstrings', icon: '🦿' },
  { id: 'glutes', name: 'Glutes', icon: '🍑' },
  { id: 'calves', name: 'Calves', icon: '🦶' },
  { id: 'core', name: 'Core', icon: '🎯' },
];

export default function FitnessApp() {
  const store = useFitnessStore();
  const [mounted, setMounted] = useState(false);
  const { setCenterContent, setOnLogoClick } = useNavBar();
  const [query, setQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showSetPanel, setShowSetPanel] = useState(false);
  // Inline editing state (Option A prototype)
  const [expandedExerciseIdx, setExpandedExerciseIdx] = useState<number | null>(null);
  const [inlineWeights, setInlineWeights] = useState<Record<string, number>>({});
  const [inlineReps, setInlineReps] = useState<Record<string, number>>({});
  const [inlineRpe, setInlineRpe] = useState<Record<string, number | null>>({});
  const [inlineWarmup, setInlineWarmup] = useState<Record<string, boolean>>({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  // Voice logging state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [setWeight, setSetWeight] = useState(135);
  const [setReps, setSetReps] = useState(8);
  const [setRpe, setSetRpe] = useState<number | null>(null);
  const [setIsWarmup, setSetIsWarmup] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [showExerciseNotes, setShowExerciseNotes] = useState(false);
  const [showProgressChart, setShowProgressChart] = useState(false);
  const [chartExerciseId, setChartExerciseId] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'maxWeight' | 'e1rm' | 'totalVolume'>('maxWeight');
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState(135);
  const [plateCalcBar, setPlateCalcBar] = useState(45);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [summaryPeriod, setSummaryPeriod] = useState<7 | 30>(7);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [addingExerciseToTemplate, setAddingExerciseToTemplate] = useState(false);
  // Workout Summary Modal state
  const [showWorkoutSummary, setShowWorkoutSummary] = useState(false);
  const [workoutSummaryData, setWorkoutSummaryData] = useState<{
    totalXP: number;
    totalSets: number;
    totalVolume: number;
    duration: number;
    prsHit: Array<{ exerciseName: string; weight: number; reps: number }>;
    exercises: Array<{ name: string; sets: number; volume: number }>;
    previousVolume?: number;
  } | null>(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  // History filtering state
  const [historyMuscleFilter, setHistoryMuscleFilter] = useState<string | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyShowCount, setHistoryShowCount] = useState(20);
  const [historyViewMode, setHistoryViewMode] = useState<'list' | 'calendar'>('list');

  // Undo stack for set/exercise deletions
  const [undoItem, setUndoItem] = useState<{
    type: 'set' | 'exercise';
    exerciseIdx: number;
    setIdx?: number;
    data: unknown;
    exerciseName: string;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', targetDate: '' });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [confirmDeleteCampaign, setConfirmDeleteCampaign] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [mobileFabOpen, setMobileFabOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const [searchingExercises, setSearchingExercises] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [programsTab, setProgramsTab] = useState<'my' | 'library'>('my');
  const [exerciseDetailId, setExerciseDetailId] = useState<string | null>(null);
  const [exerciseDetailReturnView, setExerciseDetailReturnView] = useState<string>('home');
  const [viewingMuscleGroup, setViewingMuscleGroup] = useState<string | null>(null);
  const [editingCustomExercise, setEditingCustomExercise] = useState<{ id: string; name: string; muscle: string; tier: number } | null>(null);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [substituteSearchQuery, setSubstituteSearchQuery] = useState('');
  const [confirmDeleteExercise, setConfirmDeleteExercise] = useState<{ idx: number; name: string } | null>(null);
  const [creatingCustomExercise, setCreatingCustomExercise] = useState<{
    name: string;
    muscle: string;
    tier: number;
    context: 'workout' | 'template' | 'program' | 'picker' | 'substitute';
  } | null>(null);
  const [strengthProgressExercise, setStrengthProgressExercise] = useState<string | null>(null);
  const [strengthProgressRange, setStrengthProgressRange] = useState<'30d' | '90d' | '1y' | 'all'>('all');
  const [analyticsProgressRange, setAnalyticsProgressRange] = useState<'ytd' | '90d' | '365d' | 'all' | 'custom'>('ytd');
  const [analyticsShowAllExercises, setAnalyticsShowAllExercises] = useState(false);
  const [analyticsCustomDateStart, setAnalyticsCustomDateStart] = useState<string>('');
  const [analyticsCustomDateEnd, setAnalyticsCustomDateEnd] = useState<string>('');
  const [showEditPicker, setShowEditPicker] = useState<'exercise' | 'template' | 'program' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const rpeInputRef = useRef<HTMLInputElement>(null);
  const setPanelContentRef = useRef<HTMLDivElement>(null);
  const keyboardTriggerRef = useRef<HTMLInputElement>(null);
  const pendingPanelOpenRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, unmapped: [] as string[] });
  const [editingBodyStats, setEditingBodyStats] = useState(false);
  const [showRivalSettings, setShowRivalSettings] = useState(false);
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(10);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bodyWeight, setBodyWeight] = useState(0);
  const [unifiedProfile, setUnifiedProfile] = useState<{ level: number; xp: number; xpToNext: number } | null>(null);

  // Touch drag state for mobile reordering
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [touchDragOverIndex, setTouchDragOverIndex] = useState<number | null>(null);
  const touchDragCloneRef = useRef<HTMLDivElement | null>(null);
  const touchDragStartY = useRef<number>(0);
  const exerciseListRef = useRef<HTMLDivElement | null>(null);
  const inlineWeightInputRef = useRef<HTMLInputElement | null>(null);

  // Swipe gesture hint state (first-time user education)
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const hasShownSwipeHint = useRef(false);

  // Touch drag state for program wizard goal priorities
  const [goalTouchDragIndex, setGoalTouchDragIndex] = useState<number | null>(null);
  const [goalTouchDragOverIndex, setGoalTouchDragOverIndex] = useState<number | null>(null);
  const goalTouchDragCloneRef = useRef<HTMLDivElement | null>(null);
  const goalPriorityListRef = useRef<HTMLDivElement | null>(null);

  // Program wizard - inline workout creation
  const [creatingWorkoutForDay, setCreatingWorkoutForDay] = useState<number | null>(null);
  const [editingWorkoutTemplateId, setEditingWorkoutTemplateId] = useState<string | null>(null); // Track if editing existing
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [newWorkoutExercises, setNewWorkoutExercises] = useState<{
    exerciseId: string;
    exerciseName: string;
    targetSets: number;
    minReps: number;
    maxReps: number;
    perSetReps?: { min: number; max: number }[];  // For advanced per-set mode
  }[]>([]);
  const [newWorkoutMuscleGroups, setNewWorkoutMuscleGroups] = useState<string[]>([]);
  const [addingExerciseToNewWorkout, setAddingExerciseToNewWorkout] = useState(false);
  const [newWorkoutExerciseSearch, setNewWorkoutExerciseSearch] = useState('');
  const [showWorkoutAdvancedMode, setShowWorkoutAdvancedMode] = useState(false);
  // Program wizard - advanced progression mode
  const [showAdvancedProgression, setShowAdvancedProgression] = useState(false);

  useEffect(() => {
    setMounted(true);
    store.loadState();
    store.fetchFromServer();
    // Fetch unified profile for accurate level display
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.apps?.fitness) {
          setUnifiedProfile({
            level: data.apps.fitness.level,
            xp: data.apps.fitness.xp,
            xpToNext: data.apps.fitness.xpToNext
          });
        }
      })
      .catch(() => {});

    // Online/offline detection
    const handleOnline = () => store.setOnlineStatus(true);
    const handleOffline = () => store.setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
                              (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        // Parse weight x reps patterns like "135 times 8", "225 by 5", "185 x 10"
        const patterns = [
          /(\d+)\s*(?:times|x|by)\s*(\d+)/,
          /(\d+)\s+(\d+)/,
        ];
        for (const pattern of patterns) {
          const match = transcript.match(pattern);
          if (match) {
            const weight = parseInt(match[1]);
            const reps = parseInt(match[2]);
            if (weight > 0 && weight < 2000 && reps > 0 && reps < 100) {
              setSetWeight(weight);
              setSetReps(reps);
              store.showToast(`Got it: ${weight} × ${reps}`);
              break;
            }
          }
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        store.showToast('Voice not recognized. Try again.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Set logo click handler to navigate to home view
  useEffect(() => {
    setOnLogoClick(() => () => {
      store.setView('home');
    });
    return () => {
      setOnLogoClick(null);
    };
  }, [setOnLogoClick, store]);

  const startVoiceRecognition = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Track keyboard height for modal positioning
  // When keyboard opens and we have a pending panel open, show the panel
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const heightDiff = window.innerHeight - viewport.height;
      const newKeyboardHeight = heightDiff > 100 ? heightDiff : 0;

      setKeyboardHeight(newKeyboardHeight);

      // Toggle keyboard-open class on body for CSS-based scroll control
      if (newKeyboardHeight > 0) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }

      // If we were waiting for keyboard to open before showing panel, show it now
      if (newKeyboardHeight > 0 && pendingPanelOpenRef.current) {
        pendingPanelOpenRef.current = false;
        setShowSetPanel(true);
      }
    };

    viewport.addEventListener('resize', handleResize);
    return () => {
      viewport.removeEventListener('resize', handleResize);
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  // Transfer focus to weight input when panel opens (keyboard already open)
  useEffect(() => {
    if (showSetPanel && weightInputRef.current) {
      // Small delay to let panel render, then transfer focus
      const timer = setTimeout(() => {
        weightInputRef.current?.focus({ preventScroll: true });
        weightInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showSetPanel]);

  // Auto-focus weight input when expanding inline editor
  useEffect(() => {
    if (expandedExerciseIdx !== null && inlineWeightInputRef.current) {
      // Small delay to let the expanded view render
      const timer = setTimeout(() => {
        inlineWeightInputRef.current?.focus({ preventScroll: true });
        // Show swipe hint on first expansion
        if (!hasShownSwipeHint.current && store.currentWorkout?.exercises[expandedExerciseIdx]?.sets.length > 0) {
          hasShownSwipeHint.current = true;
          setShowSwipeHint(true);
          setTimeout(() => setShowSwipeHint(false), 3000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [expandedExerciseIdx]);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('reptura-theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
      setIsDarkMode(false);
    }
  }, []);

  // Prevent scroll jumps when switching between inputs in set panel
  // iOS Safari scrolls the window when focusing inputs - block at document level
  useEffect(() => {
    if (!showSetPanel) return;

    // Simple scroll reset - window.scrollTo handles iOS scroll-into-view
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (setPanelContentRef.current) {
        setPanelContentRef.current.scrollTop = 0;
      }
    };

    // On focus change, reset scroll with delays for iOS timing
    const handleFocusIn = () => {
      resetScroll();
      setTimeout(resetScroll, 50);
      setTimeout(resetScroll, 150);
    };

    // Reset on any window scroll
    const handleScroll = () => resetScroll();

    // Block touchmove only within set panel
    const handleTouchMove = (e: TouchEvent) => {
      const panel = document.querySelector('.set-panel');
      if (panel?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showSetPanel]);

  // Show onboarding for new users
  useEffect(() => {
    if (mounted && !store.hasCompletedOnboarding && store.workouts.length === 0) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, store.hasCompletedOnboarding, store.workouts.length]);

  // Sync to server on page unload
  useEffect(() => {
    const handleUnload = () => {
      const state = useFitnessStore.getState();
      if (state.pendingSync) {
        navigator.sendBeacon('/api/fitness/sync', JSON.stringify({
          data: {
            profile: state.profile,
            workouts: state.workouts,
            records: state.records,
            achievements: state.achievements,
            customExercises: state.customExercises,
            templates: state.templates,
            campaigns: state.campaigns,
          },
        }));
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Close desktop menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopMenuOpen && desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node)) {
        setDesktopMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [desktopMenuOpen]);

  // Rest timer countdown
  useEffect(() => {
    if (store.restTimerRunning) {
      restTimerRef.current = setInterval(() => {
        store.tickRestTimer();
      }, 1000);
    } else {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
    }
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    };
  }, [store.restTimerRunning]);

  // Play sound when rest timer completes
  useEffect(() => {
    if (store.restTimerSeconds === 0 && !store.restTimerRunning && restTimerRef.current === null) {
      // Timer just finished - could play a sound here
      // For now, just show a toast
    }
  }, [store.restTimerSeconds, store.restTimerRunning]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Escape - navigate back or blur
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSetPanel) {
          setShowSetPanel(false);
        } else if (showSaveModal) {
          setShowSaveModal(false);
        } else if (editingBodyStats) {
          setEditingBodyStats(false);
        } else if (creatingCampaign) {
          setCreatingCampaign(false);
        } else if (addingGoal) {
          setAddingGoal(false);
        } else if (inInput) {
          (target as HTMLInputElement).blur();
        } else if (store.currentView !== 'home' && store.currentView !== 'workout') {
          store.setView('home');
        }
        return;
      }

      // Don't trigger other shortcuts when in input
      if (inInput) return;

      // "n" to focus command input
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSetPanel, showSaveModal, editingBodyStats, creatingCampaign, addingGoal, store.currentView]);

  // Timer effect - uses timestamp for accuracy even when tab is backgrounded
  useEffect(() => {
    if (store.currentWorkout && store.currentView === 'workout') {
      // Update timer immediately when entering workout
      store.updateTimerFromStart();

      // Update every second
      timerRef.current = setInterval(() => {
        store.updateTimerFromStart();
      }, 1000);

      // Handle visibility change - update timer when tab regains focus
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          store.updateTimerFromStart();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [store.currentWorkout, store.currentView]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  // Update navbar content during workout
  useEffect(() => {
    if (store.currentWorkout && store.currentView === 'workout') {
      const totalSets = store.currentWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
      setCenterContent(
        <div className="nav-workout-status">
          <div className="nav-workout-timer">
            <span className="nav-workout-dot" />
            {formatTime(store.workoutSeconds)}
          </div>
          <span className="nav-workout-sets">{totalSets} sets</span>
          <button
            className="nav-workout-finish"
            onClick={() => setShowSaveModal(true)}
          >
            FINISH
          </button>
        </div>
      );
    } else {
      setCenterContent(null);
    }
  }, [store.currentWorkout, store.currentView, store.workoutSeconds, setCenterContent]);

  // Clean up navbar content on unmount
  useEffect(() => {
    return () => setCenterContent(null);
  }, [setCenterContent]);

  // Focus mobile input when FAB opens
  useEffect(() => {
    if (mobileFabOpen && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [mobileFabOpen]);

  const getTotalSets = () => {
    if (!store.currentWorkout) return 0;
    return store.currentWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  };

  // Calculate current workout stats for floating display
  const getWorkoutStats = useCallback(() => {
    if (!store.currentWorkout) return { volume: 0, sets: 0, xp: 0 };
    const exercises = store.currentWorkout.exercises;
    let volume = 0;
    let sets = 0;
    let xp = 0;
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (!set.isWarmup) {
          volume += set.weight * set.reps;
        }
        sets++;
        xp += set.xp || 0;
      }
    }
    return { volume, sets, xp };
  }, [store.currentWorkout]);

  // Generate calendar heatmap data for last 12 weeks
  const getCalendarHeatmapData = useCallback(() => {
    const workouts = store.workouts || [];
    const today = new Date();
    const weeks: { date: Date; count: number; volume: number }[][] = [];

    // Go back 12 weeks (84 days)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83);
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Create a map of date string -> workout count and volume
    const workoutMap = new Map<string, { count: number; volume: number }>();
    for (const workout of workouts) {
      const date = new Date(workout.startTime);
      const dateKey = date.toISOString().split('T')[0];
      const existing = workoutMap.get(dateKey) || { count: 0, volume: 0 };
      const volume = workout.exercises.reduce((sum, ex) =>
        sum + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0
      );
      workoutMap.set(dateKey, {
        count: existing.count + 1,
        volume: existing.volume + volume
      });
    }

    // Build 12 weeks of data (7 days each)
    let currentDate = new Date(startDate);
    for (let week = 0; week < 12; week++) {
      const weekData: { date: Date; count: number; volume: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const data = workoutMap.get(dateKey) || { count: 0, volume: 0 };
        weekData.push({
          date: new Date(currentDate),
          count: data.count,
          volume: data.volume
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(weekData);
    }

    return weeks;
  }, [store.workouts]);

  // Get recently used exercises from workout history
  const getRecentlyUsedExercises = useCallback(() => {
    const workouts = store.profile.workouts || [];
    const exerciseLastUsed = new Map<string, Date>();

    // Get the last 20 workouts to find recently used exercises
    const recentWorkouts = workouts.slice(-20);
    for (const workout of recentWorkouts) {
      const workoutDate = new Date(workout.date || workout.startTime);
      for (const ex of workout.exercises || []) {
        const existing = exerciseLastUsed.get(ex.name);
        if (!existing || workoutDate > existing) {
          exerciseLastUsed.set(ex.name, workoutDate);
        }
      }
    }

    // Sort by most recent and take top 8
    const sorted = Array.from(exerciseLastUsed.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .slice(0, 8)
      .map(([name]) => name);

    return sorted;
  }, [store.profile.workouts]);

  const getSuggestions = useCallback((): CommandSuggestion[] => {
    const q = query.toLowerCase().trim();
    const results: CommandSuggestion[] = [];

    // Adding campaign goal mode - show exercises to pick
    if (addingGoal) {
      const matchingExercises = EXERCISES.filter(ex =>
        !q || ex.name.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q)
      ).slice(0, 8);

      for (const ex of matchingExercises) {
        results.push({
          type: 'add-campaign-goal',
          id: ex.id,
          title: ex.name,
          subtitle: store.records[ex.id] ? `Current PR: ${store.records[ex.id]} lbs` : ex.muscle,
          icon: '🎯'
        });
      }
      results.push({ type: 'cancel-add-goal', id: 'cancel', title: 'Cancel', subtitle: 'Go back', icon: '←' });
      return results;
    }

    if (store.currentWorkout && store.currentView === 'workout') {
      const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
      // Delimiters: x X * - × + , : ; ! or whitespace
      // Format: weight [delim] reps [delim] rpe (optional)
      const delimPattern = '[xX\\*\\-×\\+,:;!\\s]';
      const setMatch = query.match(new RegExp(`^(\\d+\\.?\\d*)\\s*${delimPattern}\\s*(\\d+)(?:\\s*${delimPattern}\\s*(\\d+\\.?\\d*))?$`));

      if (setMatch && currentEx) {
        const weight = parseFloat(setMatch[1]);
        const reps = parseInt(setMatch[2]);
        const rpe = setMatch[3] ? parseFloat(setMatch[3]) : undefined;
        const rpeDisplay = rpe ? ` @ RPE ${rpe}` : '';
        results.push({
          type: 'log-set-direct',
          id: currentEx.id,
          title: `${weight} × ${reps}${rpeDisplay}`,
          subtitle: `Press Enter to log for ${currentEx.name}`,
          icon: '💪',
          meta: `Set ${currentEx.sets.length + 1}`,
          weight, reps, rpe
        });
        return results;
      }

      if (!q) {
        results.push({ type: 'add-exercise', id: 'add', title: 'Add Exercise', subtitle: 'Browse by muscle', icon: '➕' });
        results.push({ type: 'finish', id: 'finish', title: 'Finish Workout', subtitle: `${getTotalSets()} sets logged`, icon: '✅' });
        results.push({ type: 'cancel-workout', id: 'cancel', title: 'Cancel', subtitle: 'Discard workout', icon: '✕' });
        return results;
      }

      const matchingExercises = [...EXERCISES, ...store.customExercises]
        .filter(ex => ex.name.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q))
        .slice(0, 6);

      for (const ex of matchingExercises) {
        const inWorkout = store.currentWorkout.exercises.some(e => e.id === ex.id);
        results.push({
          type: inWorkout ? 'select-exercise' : 'add-exercise-quick',
          id: ex.id,
          title: ex.name,
          subtitle: inWorkout ? 'Select' : ex.muscle,
          icon: inWorkout ? '→' : '➕'
        });
      }

      // Always show "Create custom exercise" option at the bottom when searching
      if (q.length > 1 && !/^\d/.test(query)) {
        results.push({
          type: 'new-exercise',
          id: query,
          title: `Create: "${query}"`,
          subtitle: 'Add custom exercise',
          icon: '✨'
        });
      }

      if ('done'.startsWith(q) || 'finish'.startsWith(q)) {
        results.push({ type: 'finish', id: 'finish', title: 'Finish Workout', subtitle: `${getTotalSets()} sets`, icon: '✅' });
      }
      if ('cancel'.startsWith(q) || 'exit'.startsWith(q)) {
        results.push({ type: 'cancel-workout', id: 'cancel', title: 'Cancel Workout', subtitle: 'Discard', icon: '✕' });
      }

      return results.slice(0, 8);
    }

    if (!q) {
      if (store.currentWorkout && store.currentView !== 'workout') {
        const totalSets = store.currentWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        return [
          { type: 'resume', id: 'resume', title: 'Resume Workout', subtitle: `${totalSets} sets logged`, icon: '▶️' },
          ...DEFAULT_COMMANDS.slice(1).map(cmd => ({ type: 'command', ...cmd }))
        ];
      }
      return DEFAULT_COMMANDS.map(cmd => ({ type: 'command', ...cmd }));
    }

    if ('blank'.startsWith(q) || ('start'.startsWith(q) && q.length <= 5)) results.push({ type: 'command', ...DEFAULT_COMMANDS[0] });
    if ('choose'.startsWith(q) || 'library'.startsWith(q) || 'pick'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[1] });
    if ('templates'.startsWith(q) || 'plan'.startsWith(q) || 'routines'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[2] });
    if ('programs'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[3] });
    if ('history'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[4] });
    if ('analytics'.startsWith(q) || 'stats'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[5] });
    if ('exercises'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[6] });
    if ('profile'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[7] });
    if ('coach'.startsWith(q) || 'ai'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[8] });
    if ('social'.startsWith(q) || 'friends'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[9] });
    if ('campaigns'.startsWith(q) || 'goals'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[10] });
    if ('achievements'.startsWith(q) || 'badges'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[11] });
    if ('import'.startsWith(q) || 'csv'.startsWith(q) || 'strong'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[12] });
    if ('reset'.startsWith(q) || 'erase'.startsWith(q) || 'clear'.startsWith(q) || 'wipe'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[13] });

    // Edit commands
    if ('edit'.startsWith(q) || 'modify'.startsWith(q) || 'change'.startsWith(q)) {
      if (store.customExercises.length > 0) {
        results.push({ type: 'edit-menu', id: 'edit-exercise', title: 'Edit Custom Exercise', subtitle: `${store.customExercises.length} custom exercises`, icon: '✏️' });
      }
      if (store.templates.length > 0) {
        results.push({ type: 'edit-menu', id: 'edit-template', title: 'Edit Template', subtitle: `${store.templates.length} templates`, icon: '📝' });
      }
      if (store.programs.length > 0) {
        results.push({ type: 'edit-menu', id: 'edit-program', title: 'Edit Program', subtitle: `${store.programs.length} programs`, icon: '📅' });
      }
    }

    // Show custom exercises when in edit exercise mode
    if (showEditPicker === 'exercise') {
      for (const ex of store.customExercises) {
        if (!q || ex.name.toLowerCase().includes(q)) {
          const tierLabel = ex.tier === 1 ? 'T1' : ex.tier === 2 ? 'T2' : 'T3';
          results.push({ type: 'edit-custom-exercise', id: ex.id, title: ex.name, subtitle: `${ex.muscle} • ${tierLabel}`, icon: '✏️' });
        }
      }
      return results.slice(0, 10);
    }

    for (const template of store.templates) {
      if (template.name.toLowerCase().includes(q)) {
        results.push({ type: 'template', id: template.id, title: template.name, subtitle: `${template.exercises.length} exercises`, icon: '📝' });
      }
    }

    const matchingExercises = EXERCISES
      .filter(ex => ex.name.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q))
      .slice(0, 5);

    for (const ex of matchingExercises) {
      results.push({ type: 'exercise', id: ex.id, title: ex.name, subtitle: `Start with ${ex.muscle}`, icon: '🏋️' });
    }

    return results.slice(0, 8);
  }, [query, store.currentWorkout, store.currentView, store.currentExerciseIndex, store.records, store.templates, store.customExercises, store.programs, addingGoal, searchingExercises, showEditPicker]);

  const suggestions = getSuggestions();

  const executeCommand = (suggestion: CommandSuggestion) => {
    switch (suggestion.type) {
      case 'command':
        if (suggestion.id === 'workout') store.startWorkout();
        else if (suggestion.id === 'choose-workout') store.setView('templates');
        else if (suggestion.id === 'templates') store.setView('templates');
        else if (suggestion.id === 'history') store.setView('history');
        else if (suggestion.id === 'profile') store.setView('profile');
        else if (suggestion.id === 'social') store.setView('social');
        else if (suggestion.id === 'coach') store.setView('coach');
        else if (suggestion.id === 'campaigns') store.setView('campaigns');
        else if (suggestion.id === 'achievements') store.setView('achievements');
        else if (suggestion.id === 'programs') store.setView('programs');
        else if (suggestion.id === 'analytics') store.setView('analytics');
        else if (suggestion.id === 'exercises') setShowExercisePicker(true);
        else if (suggestion.id === 'import') fileInputRef.current?.click();
        else if (suggestion.id === 'reset') {
          if (confirm('Are you sure you want to erase ALL fitness data? This cannot be undone.')) {
            store.eraseAllData();
          }
        }
        break;
      case 'template': store.startWorkoutFromTemplate(suggestion.id); break;
      case 'exercise': store.startWorkoutWithExercise(suggestion.id); break;
      case 'log-set-direct':
        if (suggestion.weight && suggestion.reps) store.logSet(suggestion.weight, suggestion.reps, suggestion.rpe);
        break;
      case 'add-exercise':
        // Show fullscreen exercise picker
        setShowExercisePicker(true);
        setSelectedCategory(null);
        break;
      case 'add-exercise-quick':
        store.addExerciseToWorkout(suggestion.id);
        setSearchingExercises(false);
        break;
      case 'new-exercise':
        setCreatingCustomExercise({
          name: suggestion.id,
          muscle: 'other',
          tier: 3,
          context: 'workout'
        });
        break;
      case 'select-exercise':
        const idx = store.currentWorkout?.exercises.findIndex(e => e.id === suggestion.id);
        if (idx !== undefined && idx >= 0) store.selectExercise(idx);
        break;
      case 'finish': setShowSaveModal(true); return;
      case 'cancel-workout': if (confirm('Discard this workout?')) store.cancelWorkout(); break;
      case 'resume': store.setView('workout'); break;
      case 'history': store.setView('history'); break;
      case 'edit-menu':
        if (suggestion.id === 'edit-exercise') {
          setShowEditPicker('exercise');
          setQuery('');
        } else if (suggestion.id === 'edit-template') {
          store.setView('templates');
        } else if (suggestion.id === 'edit-program') {
          store.setView('programs');
        }
        break;
      case 'edit-custom-exercise':
        const customEx = store.customExercises.find(e => e.id === suggestion.id);
        if (customEx) {
          setEditingCustomExercise({ ...customEx, tier: customEx.tier || 3 });
        }
        setShowEditPicker(null);
        break;
      case 'add-campaign-goal':
        if (selectedCampaignId) {
          const exercise = getExerciseById(suggestion.id);
          if (exercise) {
            addGoalToCampaign(selectedCampaignId, suggestion.id, exercise.name);
          }
        }
        setAddingGoal(false);
        break;
      case 'cancel-add-goal':
        setAddingGoal(false);
        break;
    }
    setQuery('');
    setSelectedSuggestion(0);
  };

  // Campaign functions
  const addGoalToCampaign = (campaignId: string, exerciseId: string, exerciseName: string) => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const targetWeight = prompt(`Target weight for ${exerciseName} (lbs):`, '225');
    if (!targetWeight) return;

    const newGoal = {
      exerciseId,
      exerciseName,
      targetWeight: parseInt(targetWeight),
      currentPR: store.records[exerciseId] || 0,
      isAchieved: (store.records[exerciseId] || 0) >= parseInt(targetWeight)
    };

    // Update the campaign with the new goal
    const updatedCampaigns = store.campaigns.map(c =>
      c.id === campaignId
        ? { ...c, goals: [...c.goals, newGoal] }
        : c
    );

    // We need to update the store directly - for now just show toast
    store.showToast(`Goal added: ${exerciseName} ${targetWeight} lbs`);
  };

  const saveCampaign = () => {
    if (!campaignForm.title.trim() || !campaignForm.targetDate) {
      store.showToast('Please fill in title and target date');
      return;
    }

    const newCampaign = {
      id: Date.now().toString(),
      title: campaignForm.title,
      description: campaignForm.description,
      targetDate: campaignForm.targetDate,
      goals: [],
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    store.addCampaign(newCampaign);
    setCreatingCampaign(false);
    setCampaignForm({ title: '', description: '', targetDate: '' });
    setSelectedCampaignId(newCampaign.id);
    store.showToast('Campaign created!');
  };

  const openSetPanel = (exerciseIdx?: number, setIdx?: number) => {
    if (!store.currentWorkout) return;
    // Guard against rapid clicks - skip if panel already open or pending
    if (showSetPanel || pendingPanelOpenRef.current) return;

    const exIdx = exerciseIdx ?? store.currentExerciseIndex;
    const currentEx = store.currentWorkout.exercises[exIdx];
    if (!currentEx) return;

    if (setIdx !== undefined) {
      // Editing existing set
      const set = currentEx.sets[setIdx];
      setSetWeight(set.weight);
      setSetReps(set.reps);
      setSetRpe(set.rpe || null);
      setSetIsWarmup(set.isWarmup || false);
      setEditingSetIndex(setIdx);
      store.selectExercise(exIdx);
    } else {
      // Adding new set - prioritize values in this order:
      // 1. Last set from current workout (for quick successive logging)
      // 2. Progression-aware target (calculates based on program rules + history)
      // 3. Previous workout for this exercise
      // 4. Personal record (for weight)
      // 5. Defaults
      const lastSet = currentEx.sets[currentEx.sets.length - 1];
      const lastWorkoutEx = store.getLastWorkoutForExercise(currentEx.id);
      const lastWorkoutSet = lastWorkoutEx?.sets[lastWorkoutEx.sets.length - 1];

      // Get progression-aware target from store (handles all progression types)
      const templateReps = (currentEx as { _targetReps?: string })._targetReps;
      const progressionTarget = store.calculateProgressionTarget(currentEx.id, templateReps);
      const hasTarget = progressionTarget.weight || progressionTarget.reps;

      // Parse target reps (handles "8-12" format, takes lower bound)
      const parseTargetReps = (reps?: string): number | null => {
        if (!reps) return null;
        const match = reps.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      // Weight priority: current workout > progression target > previous workout > PR > default
      const weight = lastSet?.weight
        || (hasTarget ? progressionTarget.weight : null)
        || lastWorkoutSet?.weight
        || store.records[currentEx.id]
        || 135;

      // Reps priority: current workout > progression target > previous workout > default
      const reps = lastSet?.reps
        || (hasTarget ? parseTargetReps(progressionTarget.reps) : null)
        || lastWorkoutSet?.reps
        || 8;

      // RPE priority: current workout > progression target > previous workout > null
      const rpe = lastSet?.rpe
        || (hasTarget ? progressionTarget.rpe : null)
        || lastWorkoutSet?.rpe
        || null;

      setSetWeight(weight);
      setSetReps(reps);
      setSetRpe(rpe);
      setSetIsWarmup(false);  // New sets default to working sets
      setEditingSetIndex(null);
    }

    // Trigger keyboard first, then show panel once keyboard is open
    // This prevents iOS scroll issues when keyboard animates open
    if (keyboardTriggerRef.current && keyboardHeight === 0) {
      pendingPanelOpenRef.current = true;
      keyboardTriggerRef.current.focus();
      // Fallback: if keyboard doesn't open within 300ms (desktop, or already open), show panel anyway
      setTimeout(() => {
        if (pendingPanelOpenRef.current) {
          pendingPanelOpenRef.current = false;
          setShowSetPanel(true);
        }
      }, 300);
    } else {
      // Keyboard already open or not available, show immediately
      setShowSetPanel(true);
    }
  };

  const handleLogSet = () => {
    if (editingSetIndex !== null) {
      // Update existing set
      store.updateSet(editingSetIndex, setWeight, setReps, setRpe || undefined, setIsWarmup);
      setEditingSetIndex(null);
      setShowSetPanel(false);
    } else {
      // Log new set - keep panel open for quick successive set logging
      store.logSet(setWeight, setReps, setRpe || undefined, setIsWarmup);
      // Start rest timer after logging a working set
      if (!setIsWarmup) {
        store.startRestTimer();
      }
    }
  };

  // Repeat last set helper
  const handleRepeatLastSet = () => {
    if (!store.currentWorkout) return;
    const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
    if (!currentEx || currentEx.sets.length === 0) return;

    const lastSet = currentEx.sets[currentEx.sets.length - 1];
    store.logSet(lastSet.weight, lastSet.reps, lastSet.rpe, lastSet.isWarmup);
    if (!lastSet.isWarmup) {
      store.startRestTimer();
    }
  };

  const handleRemoveSet = (exerciseIdx: number, setIdx: number) => {
    if (!store.currentWorkout) return;
    const exercise = store.currentWorkout.exercises[exerciseIdx];
    if (!exercise) return;

    const deletedSet = exercise.sets[setIdx];
    const exerciseName = exercise.name;

    // Save for undo
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoItem({
      type: 'set',
      exerciseIdx,
      setIdx,
      data: { ...deletedSet },
      exerciseName,
    });

    store.removeSet(exerciseIdx, setIdx);
    setShowSetPanel(false);

    // Auto-dismiss after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 5000);
  };

  const handleRemoveExercise = (idx: number) => {
    if (!store.currentWorkout) return;
    const exercise = store.currentWorkout.exercises[idx];
    if (!exercise) return;

    // Show confirmation dialog
    setConfirmDeleteExercise({ idx, name: exercise.name });
  };

  const confirmRemoveExercise = () => {
    if (!confirmDeleteExercise || !store.currentWorkout) return;
    const { idx } = confirmDeleteExercise;
    const exercise = store.currentWorkout.exercises[idx];
    if (!exercise) {
      setConfirmDeleteExercise(null);
      return;
    }

    // Save for undo
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoItem({
      type: 'exercise',
      exerciseIdx: idx,
      data: { ...exercise, sets: [...exercise.sets] },
      exerciseName: exercise.name,
    });

    store.removeExercise(idx);
    setConfirmDeleteExercise(null);

    // If we had the expanded exercise, collapse it
    if (expandedExerciseIdx === idx) {
      setExpandedExerciseIdx(null);
    } else if (expandedExerciseIdx !== null && expandedExerciseIdx > idx) {
      setExpandedExerciseIdx(expandedExerciseIdx - 1);
    }

    // Auto-dismiss undo after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (!undoItem || !store.currentWorkout) return;

    if (undoItem.type === 'set') {
      // Restore set
      store.restoreSet(undoItem.exerciseIdx, undoItem.setIdx!, undoItem.data as SetType);
    } else {
      // Restore exercise
      store.restoreExercise(undoItem.exerciseIdx, undoItem.data as WorkoutExercise);
    }

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoItem(null);
  };

  const dismissUndo = () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoItem(null);
  };

  // Touch drag handlers for mobile reordering (exercises)
  const handleTouchDragStart = (idx: number, e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    touchDragStartY.current = touch.clientY;
    setTouchDragIndex(idx);
    setTouchDragOverIndex(idx);

    // Create visual clone
    const target = e.currentTarget.closest('.exercise-pill') as HTMLElement;
    if (target) {
      const clone = target.cloneNode(true) as HTMLDivElement;
      clone.classList.add('touch-drag-clone');
      clone.style.position = 'fixed';
      clone.style.left = `${target.getBoundingClientRect().left}px`;
      clone.style.top = `${touch.clientY - 30}px`;
      clone.style.width = `${target.offsetWidth}px`;
      clone.style.zIndex = '9999';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '0.9';
      clone.style.transform = 'scale(1.02)';
      clone.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
      document.body.appendChild(clone);
      touchDragCloneRef.current = clone;
      target.classList.add('dragging');
    }

    // Add global touch event listeners for move and end
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);
    document.addEventListener('touchcancel', handleGlobalTouchEnd);
  };

  const handleGlobalTouchMove = (e: TouchEvent) => {
    if (touchDragIndex === null) return;
    e.preventDefault();

    const touch = e.touches[0];

    // Move clone
    if (touchDragCloneRef.current) {
      touchDragCloneRef.current.style.top = `${touch.clientY - 30}px`;
    }

    // Find which exercise we're over
    if (exerciseListRef.current) {
      const pills = exerciseListRef.current.querySelectorAll('.exercise-pill');
      pills.forEach((pill, idx) => {
        const rect = pill.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          setTouchDragOverIndex(idx);
          pill.classList.add('drag-over');
        } else {
          pill.classList.remove('drag-over');
        }
      });
    }
  };

  const handleGlobalTouchEnd = () => {
    // Remove global listeners
    document.removeEventListener('touchmove', handleGlobalTouchMove);
    document.removeEventListener('touchend', handleGlobalTouchEnd);
    document.removeEventListener('touchcancel', handleGlobalTouchEnd);

    if (touchDragIndex !== null && touchDragOverIndex !== null && touchDragIndex !== touchDragOverIndex) {
      store.reorderExercises(touchDragIndex, touchDragOverIndex);
    }

    // Cleanup
    if (touchDragCloneRef.current) {
      touchDragCloneRef.current.remove();
      touchDragCloneRef.current = null;
    }
    document.querySelectorAll('.exercise-pill.dragging, .exercise-pill.drag-over').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    setTouchDragIndex(null);
    setTouchDragOverIndex(null);
  };

  // Touch drag handlers for program wizard goal priorities
  const handleGoalTouchDragStart = (idx: number, e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setGoalTouchDragIndex(idx);
    setGoalTouchDragOverIndex(idx);

    // Create visual clone
    const target = e.currentTarget.closest('.goal-priority-item') as HTMLElement;
    if (target) {
      const clone = target.cloneNode(true) as HTMLDivElement;
      clone.classList.add('touch-drag-clone');
      clone.style.position = 'fixed';
      clone.style.left = `${target.getBoundingClientRect().left}px`;
      clone.style.top = `${touch.clientY - 20}px`;
      clone.style.width = `${target.offsetWidth}px`;
      clone.style.zIndex = '9999';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '0.9';
      clone.style.transform = 'scale(1.02)';
      clone.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
      document.body.appendChild(clone);
      goalTouchDragCloneRef.current = clone;
      target.classList.add('dragging');
    }

    // Add global touch event listeners
    document.addEventListener('touchmove', handleGoalGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGoalGlobalTouchEnd);
    document.addEventListener('touchcancel', handleGoalGlobalTouchEnd);
  };

  const handleGoalGlobalTouchMove = (e: TouchEvent) => {
    if (goalTouchDragIndex === null) return;
    e.preventDefault();

    const touch = e.touches[0];

    // Move clone
    if (goalTouchDragCloneRef.current) {
      goalTouchDragCloneRef.current.style.top = `${touch.clientY - 20}px`;
    }

    // Find which goal we're over
    if (goalPriorityListRef.current) {
      const items = goalPriorityListRef.current.querySelectorAll('.goal-priority-item');
      items.forEach((item, idx) => {
        const rect = item.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          setGoalTouchDragOverIndex(idx);
          item.classList.add('drag-over');
        } else {
          item.classList.remove('drag-over');
        }
      });
    }
  };

  const handleGoalGlobalTouchEnd = () => {
    // Remove global listeners
    document.removeEventListener('touchmove', handleGoalGlobalTouchMove);
    document.removeEventListener('touchend', handleGoalGlobalTouchEnd);
    document.removeEventListener('touchcancel', handleGoalGlobalTouchEnd);

    if (goalTouchDragIndex !== null && goalTouchDragOverIndex !== null && goalTouchDragIndex !== goalTouchDragOverIndex) {
      // Reorder goal priorities
      const currentPriorities = store.programWizardData?.goalPriorities || ['strength', 'hypertrophy', 'endurance', 'general'];
      const newPriorities = [...currentPriorities];
      const [removed] = newPriorities.splice(goalTouchDragIndex, 1);
      newPriorities.splice(goalTouchDragOverIndex, 0, removed);
      store.updateProgramWizardData({ goalPriorities: newPriorities, goal: newPriorities[0] as Program['goal'] });
    }

    // Cleanup
    if (goalTouchDragCloneRef.current) {
      goalTouchDragCloneRef.current.remove();
      goalTouchDragCloneRef.current = null;
    }
    document.querySelectorAll('.goal-priority-item.dragging, .goal-priority-item.drag-over').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    setGoalTouchDragIndex(null);
    setGoalTouchDragOverIndex(null);
  };

  const handleFinishWorkout = async (saveTemplate: boolean) => {
    if (saveTemplate && templateName.trim()) store.saveTemplate(templateName.trim());

    // Capture workout summary data BEFORE finishing
    const workout = store.currentWorkout;
    if (workout) {
      const startTime = new Date(workout.startTime).getTime();
      const duration = Math.floor((Date.now() - startTime) / 1000);

      // Calculate PRs hit during this workout
      const prsHit: Array<{ exerciseName: string; weight: number; reps: number }> = [];
      workout.exercises.forEach(ex => {
        const previousPR = store.records[ex.id] || 0;
        ex.sets.forEach(set => {
          if (!set.isWarmup && set.weight > previousPR) {
            // Check if we already have a higher PR for this exercise in prsHit
            const existingIdx = prsHit.findIndex(p => p.exerciseName === ex.name);
            if (existingIdx === -1 || prsHit[existingIdx].weight < set.weight) {
              if (existingIdx !== -1) prsHit.splice(existingIdx, 1);
              prsHit.push({ exerciseName: ex.name, weight: set.weight, reps: set.reps });
            }
          }
        });
      });

      // Calculate exercise-level stats
      const exercises = workout.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets.filter(s => !s.isWarmup).length,
        volume: ex.sets.filter(s => !s.isWarmup).reduce((sum, s) => sum + s.weight * s.reps, 0)
      }));

      // Calculate total volume
      const totalVolume = exercises.reduce((sum, ex) => sum + ex.volume, 0);
      const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);

      // Get previous similar workout volume for comparison
      const muscleGroups = [...new Set(workout.exercises.map(ex => {
        const exerciseData = getExerciseById(ex.id);
        return exerciseData?.muscle || 'other';
      }))];
      const recentWorkouts = store.workouts.slice(0, 20);
      const similarWorkout = recentWorkouts.find(w => {
        const wMuscles = [...new Set(w.exercises.map(ex => {
          const exerciseData = getExerciseById(ex.id);
          return exerciseData?.muscle || 'other';
        }))];
        return muscleGroups.some(m => wMuscles.includes(m));
      });
      const previousVolume = similarWorkout
        ? similarWorkout.exercises.reduce((sum, ex) =>
            sum + ex.sets.filter(s => !s.isWarmup).reduce((s, set) => s + set.weight * set.reps, 0), 0)
        : undefined;

      setWorkoutSummaryData({
        totalXP: workout.totalXP,
        totalSets,
        totalVolume,
        duration,
        prsHit,
        exercises,
        previousVolume
      });
    }

    await store.finishWorkout();
    setShowSaveModal(false);
    setTemplateName('');

    // Show workout summary modal
    setShowWorkoutSummary(true);

    // Refresh unified profile to show updated level/XP
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.apps?.fitness) {
          setUnifiedProfile({
            level: data.apps.fitness.level,
            xp: data.apps.fitness.xp,
            xpToNext: data.apps.fitness.xpToNext
          });
        }
      })
      .catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestion(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Tab') { e.preventDefault(); e.shiftKey ? setSelectedSuggestion(prev => Math.max(prev - 1, 0)) : setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1)); }
    else if (e.key === 'Enter' && suggestions[selectedSuggestion]) { e.preventDefault(); executeCommand(suggestions[selectedSuggestion]); }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // CSV Import function
  const handleCSVImport = async (file: File) => {
    setImporting(true);
    setImportProgress({ current: 0, total: 0, unmapped: [] });

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      // Find column indices
      const dateIdx = headers.findIndex(h => h.toLowerCase() === 'date');
      const exerciseIdx = headers.findIndex(h => h.toLowerCase().includes('exercise name'));
      const weightIdx = headers.findIndex(h => h.toLowerCase() === 'weight');
      const repsIdx = headers.findIndex(h => h.toLowerCase() === 'reps');
      const rpeIdx = headers.findIndex(h => h.toLowerCase() === 'rpe');
      const durationIdx = headers.findIndex(h => h.toLowerCase() === 'duration');

      if (dateIdx === -1 || exerciseIdx === -1 || weightIdx === -1 || repsIdx === -1) {
        store.showToast('Invalid CSV format. Required: Date, Exercise Name, Weight, Reps');
        setImporting(false);
        return;
      }

      // Parse CSV rows
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let inQuotes = false;
      let currentField = '';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        if (!inQuotes) {
          currentRow.push(currentField.trim());
          if (currentRow.length > 0 && currentRow[0]) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        } else {
          currentField += '\n';
        }
      }

      setImportProgress(prev => ({ ...prev, total: rows.length }));

      // Group rows by workout (same date)
      const workoutMap = new Map<string, { date: string; duration?: string; rows: typeof rows }>();
      const unmappedExercises = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const dateStr = row[dateIdx];
        if (!dateStr) continue;

        // Parse date - Strong format: "2016-07-27 15:00:55"
        const workoutKey = dateStr; // Group by exact timestamp

        if (!workoutMap.has(workoutKey)) {
          workoutMap.set(workoutKey, {
            date: dateStr,
            duration: durationIdx >= 0 ? row[durationIdx] : undefined,
            rows: []
          });
        }
        workoutMap.get(workoutKey)!.rows.push(row);

        setImportProgress(prev => ({ ...prev, current: i + 1 }));
      }

      // Convert to Workout objects
      const workouts: Workout[] = [];

      for (const [, workoutData] of workoutMap) {
        const exerciseMap = new Map<string, WorkoutExercise>();

        for (const row of workoutData.rows) {
          const csvExerciseName = row[exerciseIdx];
          const weight = parseFloat(row[weightIdx]) || 0;
          const reps = parseInt(row[repsIdx]) || 0;
          const rpe = rpeIdx >= 0 && row[rpeIdx] ? parseFloat(row[rpeIdx]) : undefined;

          if (!csvExerciseName || reps === 0) continue;

          // Try to match exercise, or create custom exercise
          let exerciseId = matchExerciseFromCSV(csvExerciseName);
          let exerciseName = csvExerciseName;
          let isCustom = false;

          if (!exerciseId) {
            // Create custom exercise ID from name
            exerciseId = csvExerciseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            exerciseName = csvExerciseName.trim();
            isCustom = true;

            // Track that this was an unmapped exercise (for logging)
            unmappedExercises.add(csvExerciseName);

            // Add to custom exercises if not already there
            const existingCustom = store.customExercises.find(e => e.id === exerciseId);
            if (!existingCustom) {
              store.addCustomExercise(csvExerciseName.trim());
            }
          } else {
            const exercise = getExerciseById(exerciseId);
            exerciseName = exercise?.name || csvExerciseName;
          }

          if (!exerciseMap.has(exerciseId)) {
            exerciseMap.set(exerciseId, {
              id: exerciseId,
              name: exerciseName,
              sets: [],
              isCustom
            });
          }

          const xp = calculateSetXP(exerciseId, weight, reps);
          const set: SetType = {
            weight,
            reps,
            rpe,
            timestamp: workoutData.date,
            xp
          };

          exerciseMap.get(exerciseId)!.sets.push(set);
        }

        if (exerciseMap.size > 0) {
          // Parse duration string like "2h", "1h 11m", "50m"
          let durationSeconds = 0;
          if (workoutData.duration) {
            const hourMatch = workoutData.duration.match(/(\d+)\s*h/);
            const minMatch = workoutData.duration.match(/(\d+)\s*m/);
            if (hourMatch) durationSeconds += parseInt(hourMatch[1]) * 3600;
            if (minMatch) durationSeconds += parseInt(minMatch[1]) * 60;
          }

          const exercises = Array.from(exerciseMap.values());
          const totalXP = exercises.reduce((sum, ex) =>
            sum + ex.sets.reduce((setSum, s) => setSum + (s.xp || 0), 0), 0
          );

          const workout: Workout = {
            id: `import_${new Date(workoutData.date).getTime()}`,
            exercises,
            startTime: workoutData.date,
            endTime: workoutData.date,
            duration: durationSeconds,
            totalXP,
            source: 'csv'  // Mark as CSV import so it doesn't count toward leaderboards
          };

          workouts.push(workout);
        }
      }

      // Import the workouts
      if (workouts.length > 0) {
        store.importWorkouts(workouts);
      }

      setImportProgress(prev => ({ ...prev, unmapped: Array.from(unmappedExercises) }));

      if (unmappedExercises.size > 0) {
        console.log('Created custom exercises:', Array.from(unmappedExercises));
        store.showToast(`Imported ${workouts.length} workouts. Created ${unmappedExercises.size} custom exercises.`);
      } else if (workouts.length > 0) {
        store.showToast(`Imported ${workouts.length} workouts`);
      }

    } catch (error) {
      console.error('Import error:', error);
      store.showToast('Error importing CSV file');
    } finally {
      setImporting(false);
    }
  };

  const openBodyStatsEditor = () => {
    // Initialize form with current values
    const totalInches = store.profile.height || 70; // Default 5'10"
    setHeightFeet(Math.floor(totalInches / 12));
    setHeightInches(totalInches % 12);
    setBodyWeight(store.profile.bodyWeight || 0);
    setEditingBodyStats(true);
  };

  const handleSaveBodyStats = () => {
    const totalInches = (heightFeet * 12) + heightInches;
    store.updateBodyStats(totalInches, bodyWeight || undefined);
    setEditingBodyStats(false);
  };

  if (!mounted) return <div className="min-h-screen" style={{ background: 'var(--theme-bg-base)' }} />;

  return (
    <NarrativeProvider>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;500;600;700&display=swap');

        .fitness-app {
          /* Reptura Theme - Uses universal theme system */
          /* App-specific accent from globals.css */
          --accent: var(--app-fitness);
          --accent-dark: var(--app-fitness-dark);
          --accent-glow: var(--app-fitness-glow);
          --accent-rgb: 248, 113, 113; /* RGB values for rgba() usage */

          /* Map local vars to theme system for dark/light/terminal support */
          --bg-primary: var(--theme-bg-base);
          --bg-secondary: var(--theme-bg-elevated);
          --bg-tertiary: var(--theme-bg-tertiary);
          --bg-card: var(--theme-bg-card);
          --bg-card-hover: var(--theme-bg-card-hover);
          --bg-elevated: var(--theme-bg-elevated);
          --text-primary: var(--theme-text-primary);
          --text-secondary: var(--theme-text-secondary);
          --text-tertiary: var(--theme-text-muted);
          --border: var(--theme-border);
          --border-light: var(--theme-border-light);
          --gold: var(--theme-gold);
          --gold-glow: var(--theme-gold-glow);
          --teal: var(--theme-success);
          --teal-glow: rgba(95, 191, 138, 0.3);
          --success: var(--theme-success);
          --warning: var(--theme-gold);
          --danger: var(--theme-danger);

          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          background: linear-gradient(180deg, var(--theme-bg-base) 0%, var(--theme-bg-elevated) 50%, var(--theme-bg-base) 100%);
          min-height: 100vh;
          min-height: 100dvh;
          position: relative;
        }

        .fitness-app * { box-sizing: border-box; margin: 0; padding: 0; }

        /* CRT Scanlines */
        .fitness-app::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px);
          pointer-events: none;
          z-index: 1000;
        }

        /* Pixel Particles */
        .particles-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }
        .pixel-particle {
          position: absolute;
          animation: float-up linear infinite;
        }
        @keyframes float-up {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }

        /* Main Content - full width matching navbar padding */
        .content-area {
          padding-top: calc(var(--content-top, 100px) + env(safe-area-inset-top, 0px));
          padding-bottom: 200px;
          min-height: 100vh;
          min-height: 100dvh;
          position: relative;
          z-index: 2;
          padding-left: 16px;
          padding-right: 16px;
        }

        /* Premium Command Bar - Desktop Only */
        .command-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 16px 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 50;
        }

        @media (max-width: 768px) {
          .command-bar {
            display: none;
          }
        }

        .command-bar-inner {
          max-width: 600px;
          margin: 0 auto;
          background: rgba(15,15,20,0.92);
          backdrop-filter: blur(24px);
          border: 1px solid var(--border-light);
          border-radius: 20px;
          padding: 12px;
          box-shadow: 0 -4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset;
          transition: all 0.2s ease;
        }
        .command-bar-inner.collapsed {
          padding: 8px;
          border-radius: 16px;
        }
        .command-bar-inner.collapsed .command-input {
          padding: 12px 16px;
        }

        .suggestions {
          margin-bottom: 8px;
          max-height: 240px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: var(--border-light) transparent;
          overscroll-behavior: contain;
          position: relative;
        }
        .suggestions::-webkit-scrollbar { width: 4px; }
        .suggestions::-webkit-scrollbar-track { background: transparent; }
        .suggestions::-webkit-scrollbar-thumb {
          background: var(--border-light);
          border-radius: 2px;
        }
        .suggestions::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }

        .suggestion {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }
        .suggestion:hover {
          background: var(--bg-card-hover);
          border-color: var(--border);
        }
        .suggestion.selected {
          background: var(--accent-glow);
          border-color: rgba(255, 107, 107, 0.3);
        }

        .suggestion-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 16px;
          flex-shrink: 0;
        }

        .suggestion-text { flex: 1; min-width: 0; }
        .suggestion-title {
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .suggestion-subtitle {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .suggestion-meta {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--accent);
          background: var(--bg-card);
          padding: 4px 8px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .command-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(20, 20, 25, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 1rem;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
        }
        .command-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .command-input::placeholder {
          color: var(--text-tertiary);
        }

        /* Desktop Plus Menu */
        .command-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .desktop-plus-menu {
          position: relative;
        }
        .desktop-plus-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 300;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .desktop-plus-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-light);
        }
        .desktop-plus-btn.open {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
          transform: rotate(45deg);
        }
        .desktop-menu-dropdown {
          position: absolute;
          bottom: 54px;
          left: 0;
          background: rgba(15,15,20,0.96);
          backdrop-filter: blur(24px);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 8px;
          min-width: 220px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5);
          animation: desktop-menu-in 0.15s ease;
          z-index: 100;
        }
        @keyframes desktop-menu-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .desktop-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.1s ease;
          text-align: left;
        }
        .desktop-menu-item:hover {
          background: var(--bg-card-hover);
        }
        .desktop-menu-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
        }
        .desktop-menu-text {
          flex: 1;
          font-weight: 400;
        }

        /* Floating Workout Stats */
        .floating-workout-stats {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 12px 16px;
          margin: 0 16px 12px 16px;
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 107, 107, 0.05) 100%);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }
        .workout-stat {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .workout-stat-icon {
          font-size: 14px;
        }
        .workout-stat-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .workout-stat.xp-stat .workout-stat-value {
          color: var(--gold);
        }
        @media (max-width: 400px) {
          .floating-workout-stats {
            padding: 10px 12px;
            margin: 0 12px 10px 12px;
          }
          .workout-stat-value {
            font-size: 12px;
          }
        }

        /* Undo Toast */
        .undo-toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(40, 40, 45, 0.95);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .undo-toast-message {
          font-size: 13px;
          color: var(--text);
        }
        .undo-toast-btn {
          padding: 6px 14px;
          background: var(--xp-color);
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        }
        .undo-toast-btn:hover {
          background: var(--gold);
        }
        .undo-toast-dismiss {
          padding: 4px 8px;
          background: transparent;
          border: none;
          font-size: 18px;
          color: var(--text-dim);
          cursor: pointer;
          transition: color 0.2s;
        }
        .undo-toast-dismiss:hover {
          color: var(--text);
        }
        @media (max-width: 500px) {
          .undo-toast {
            bottom: 140px;
            width: calc(100% - 32px);
            max-width: 320px;
          }
        }

        /* Exercise Pills */
        .exercises-container {
          padding: 16px;
        }

        .exercise-pill {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .exercise-pill:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-light);
        }
        .exercise-pill.active {
          border-color: var(--accent);
          background: var(--accent-glow);
          box-shadow: 0 0 24px var(--accent-glow);
        }

        .exercise-number {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .exercise-pill.active .exercise-number {
          background: var(--accent);
          color: white;
        }

        .exercise-info { flex: 1; min-width: 0; }
        .exercise-name {
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .exercise-target {
          font-size: 11px;
          font-weight: 500;
          color: var(--accent);
          background: rgba(139, 92, 246, 0.15);
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }
        .exercise-sets {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .set-badge {
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          min-height: 32px;
          display: inline-flex;
          align-items: center;
        }
        .set-badge.pr {
          background: rgba(255,215,0,0.15);
          color: var(--gold);
        }
        .set-badge.empty {
          color: var(--text-tertiary);
          font-style: italic;
        }
        .set-badge.clickable {
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 36px;
          padding: 8px 14px;
        }
        .set-badge.clickable:hover {
          background: var(--bg-elevated);
          transform: scale(1.02);
        }
        .set-badge.clickable:active {
          transform: scale(0.98);
        }
        /* Inline add set button */
        .inline-add-set-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          min-height: 36px;
          background: var(--accent-glow);
          border: 1px dashed var(--accent);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .inline-add-set-btn:hover {
          background: rgba(255, 107, 107, 0.2);
          border-style: solid;
        }
        .inline-add-set-btn:active {
          transform: scale(0.98);
        }

        /* Drag handle */
        .drag-handle {
          cursor: grab;
          color: var(--text-tertiary);
          font-size: 14px;
          padding: 4px;
          opacity: 0.4;
          transition: opacity 0.15s;
          user-select: none;
          letter-spacing: -2px;
          flex-shrink: 0;
        }
        .drag-handle:hover { opacity: 1; }
        .drag-handle:active { cursor: grabbing; }

        /* Remove exercise button - min 44x44 touch target */
        .exercise-remove-btn {
          background: none;
          border: none;
          min-width: 44px;
          min-height: 44px;
          padding: 12px;
          font-size: 16px;
          cursor: pointer;
          opacity: 0.4;
          color: var(--error);
          transition: all 0.15s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          margin: -8px -4px -8px 0;
        }
        .exercise-remove-btn:hover {
          opacity: 1;
          background: rgba(255, 107, 107, 0.1);
        }
        .exercise-remove-btn:active {
          transform: scale(0.95);
          background: rgba(255, 107, 107, 0.2);
        }

        /* ===== INLINE EDITING (Option A Prototype) ===== */
        .exercise-card-expanded {
          background: var(--bg-card);
          border: 1px solid var(--accent);
          border-radius: 16px;
          margin-bottom: 10px;
          overflow: hidden;
          box-shadow: 0 0 20px var(--accent-glow);
        }

        .exercise-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border);
        }

        .exercise-card-title {
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .exercise-card-actions {
          display: flex;
          gap: 8px;
        }

        .exercise-card-action-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .exercise-card-action-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-light);
        }

        .exercise-card-target {
          padding: 10px 16px;
          background: rgba(139, 92, 246, 0.1);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .target-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-tertiary);
        }

        .target-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
        }

        /* Set Table */
        .inline-set-table {
          width: 100%;
          padding: 0;
        }

        .inline-set-header {
          display: grid;
          grid-template-columns: 60px 32px 1fr 1fr 50px 32px 40px;
          gap: 4px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
        }

        .inline-set-header span {
          text-align: center;
        }

        .inline-set-header span:first-child {
          text-align: left;
        }

        .inline-set-row {
          display: grid;
          grid-template-columns: 60px 32px 1fr 1fr 50px 32px 40px;
          gap: 4px;
          padding: 8px 12px;
          align-items: center;
          border-bottom: 1px solid var(--border-light);
          transition: background 0.15s;
        }

        .inline-set-row:last-child {
          border-bottom: none;
        }

        .inline-set-row.completed {
          background: rgba(34, 197, 94, 0.08);
        }

        .inline-prev {
          font-size: 12px;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          transition: all 0.15s;
          text-align: left;
        }

        .inline-prev:hover {
          background: var(--bg-elevated);
          color: var(--text-secondary);
        }

        .inline-prev:active {
          background: var(--accent-glow);
          color: var(--accent);
        }

        .inline-prev.no-prev {
          color: var(--text-quaternary);
          cursor: default;
        }

        .inline-prev.no-prev:hover {
          background: transparent;
          color: var(--text-quaternary);
        }

        .inline-set-num {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: center;
        }

        .inline-input {
          width: 100%;
          padding: 10px 8px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          outline: none;
          transition: all 0.15s;
          -webkit-appearance: none;
          -moz-appearance: textfield;
        }

        .inline-input::-webkit-inner-spin-button,
        .inline-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .inline-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .inline-input.filled {
          background: var(--bg-elevated);
        }

        .inline-check-btn {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 2px solid var(--border);
          border-radius: 12px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--text-tertiary);
        }

        .inline-check-btn:hover {
          background: rgba(34, 197, 94, 0.15);
          border-color: #22c55e;
          color: #22c55e;
        }

        .inline-check-btn.checked {
          background: #22c55e;
          border-color: #22c55e;
          color: white;
        }

        .inline-add-row {
          display: flex;
          justify-content: center;
          padding: 12px;
          border-top: 1px solid var(--border);
        }

        .inline-add-set {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: transparent;
          border: 1px dashed var(--border);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }

        .inline-add-set:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-glow);
        }

        .inline-collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 8px;
          background: var(--bg-tertiary);
          border: none;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--text-tertiary);
          cursor: pointer;
          transition: all 0.15s;
        }

        .inline-collapse-btn:hover {
          background: var(--bg-elevated);
          color: var(--text-secondary);
        }

        @media (max-width: 400px) {
          .inline-set-header {
            grid-template-columns: 48px 28px 1fr 1fr 42px 28px 36px;
            gap: 3px;
            padding: 6px 8px;
            font-size: 8px;
          }
          .inline-set-row {
            grid-template-columns: 48px 28px 1fr 1fr 42px 28px 36px;
            gap: 3px;
            padding: 6px 8px;
          }
          .inline-prev {
            font-size: 10px;
            padding: 4px 4px;
          }
          .inline-input {
            padding: 8px 2px;
            font-size: 14px;
          }
          .inline-input.inline-rpe {
            font-size: 12px;
          }
          .inline-check-btn {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }
        }

        /* Inline RPE input styling */
        .inline-input.inline-rpe {
          font-size: 14px;
        }

        /* Inline warmup checkbox */
        .inline-warmup-check {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          cursor: pointer;
        }
        .inline-warmup-check input {
          display: none;
        }
        .inline-warmup-indicator {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: transparent;
          transition: all 0.15s;
          background: var(--bg-card);
        }
        .inline-warmup-check input:checked + .inline-warmup-indicator {
          border-color: var(--accent);
          background: var(--accent-glow);
          color: var(--accent);
        }

        /* Quick actions row */
        .inline-quick-actions {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          border-top: 1px solid var(--border);
        }
        .inline-copy-last-btn {
          flex: 1;
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--accent);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          min-height: 44px;
        }
        .inline-copy-last-btn:hover {
          background: var(--accent-glow);
          border-color: var(--accent);
        }
        .inline-copy-last-btn:active {
          transform: scale(0.98);
        }

        /* Swipe gesture hint animation */
        .swipe-hint-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }
        .swipe-hint-hand {
          font-size: 48px;
          animation: swipeHintAnim 1.5s ease-in-out infinite;
        }
        .swipe-hint-text {
          color: white;
          font-size: 16px;
          font-weight: 600;
          margin-top: 16px;
          text-align: center;
        }
        @keyframes swipeHintAnim {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(60px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Swipeable row (for inline set removal) */
        .inline-set-row.swipeable {
          position: relative;
          transition: transform 0.2s ease, opacity 0.2s ease;
          touch-action: pan-y;
        }

        .inline-set-row.swipeable::before {
          content: 'Remove';
          position: absolute;
          right: 100%;
          top: 0;
          bottom: 0;
          width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--danger);
          color: white;
          font-size: 12px;
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .inline-set-row.swipeable:hover::before {
          opacity: 0.3;
        }

        /* Drag states */
        .exercise-pill.dragging {
          opacity: 0.5;
          border: 2px dashed var(--accent);
        }
        .exercise-pill.drag-over {
          border: 2px solid var(--accent);
          background: var(--bg-elevated);
        }

        /* Touch drag clone for mobile */
        .touch-drag-clone {
          background: var(--bg-secondary);
          border: 2px solid var(--accent);
          border-radius: 12px;
        }
        .touch-drag-clone .drag-handle {
          opacity: 1;
          color: var(--accent);
        }

        /* Make drag handle larger touch target on mobile */
        @media (pointer: coarse) {
          .drag-handle {
            padding: 12px 8px;
            margin: -8px 0;
            touch-action: none;
          }
        }

        /* RPE input styling */
        .rpe-divider { font-size: 18px; }
        .input-group-small input {
          width: 50px !important;
          font-size: 20px !important;
        }

        /* Remove set button */
        .remove-set-btn {
          width: 100%;
          padding: 10px;
          margin-top: 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-tertiary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .remove-set-btn:hover {
          border-color: var(--error);
          color: var(--error);
        }

        /* Set Panel */
        .set-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 9998;
        }

        .set-panel {
          position: fixed;
          bottom: max(var(--keyboard-height, 0px), env(safe-area-inset-bottom, 0px));
          left: 0;
          right: 0;
          max-height: calc(100dvh - env(safe-area-inset-top, 0px) - max(var(--keyboard-height, 0px), env(safe-area-inset-bottom, 0px)));
          background: var(--bg-elevated);
          border-radius: 20px 20px 0 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.25s ease-out;
          overflow: hidden;
          transition: bottom 0.15s ease-out, max-height 0.15s ease-out;
        }

        .set-panel-content {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 16px;
        }

        /* Disable scrolling when keyboard is open */
        .keyboard-open,
        .keyboard-open body {
          overflow: hidden;
          touch-action: none;
        }

        .keyboard-open .set-panel,
        .keyboard-open .set-panel-content {
          overflow: hidden;
          touch-action: none;
        }

        @media (min-width: 768px) {
          .set-panel {
            top: auto;
            bottom: 0;
            max-width: 500px;
            max-height: 85vh;
            left: 50%;
            transform: translateX(-50%);
          }
          .set-panel-content {
            padding: 24px;
          }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (min-width: 768px) {
          @keyframes slideUp {
            from { transform: translate(-50%, 100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        }

        .set-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border-light);
          flex-shrink: 0;
        }
        .set-panel-title {
          font-weight: 600;
          font-size: 16px;
          color: var(--text-primary);
        }
        .close-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 18px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .close-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }

        .set-inputs {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        @media (min-width: 768px) {
          .set-inputs {
            gap: 16px;
          }
        }
        .input-group {
          text-align: center;
          flex-shrink: 0;
        }
        .input-group input {
          width: 80px;
          padding: 12px 8px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          outline: none;
          transition: all 0.2s;
          -webkit-appearance: none;
          -moz-appearance: textfield;
        }
        .input-group input::-webkit-inner-spin-button,
        .input-group input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        @media (min-width: 768px) {
          .input-group input {
            width: 100px;
            padding: 14px 12px;
            font-size: 28px;
          }
        }
        .input-group input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .input-group-small input {
          width: 60px;
        }
        @media (min-width: 768px) {
          .input-group-small input {
            width: 70px;
          }
        }
        .input-label {
          font-size: 10px;
          color: var(--text-tertiary);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .input-divider {
          font-size: 20px;
          color: var(--text-tertiary);
          font-weight: 300;
        }
        @media (min-width: 768px) {
          .input-divider {
            font-size: 24px;
          }
        }
        .rpe-divider {
          margin-left: 4px;
        }

        /* Actions Row - Combined warmup + log button */
        .set-actions-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .warmup-toggle-inline {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .warmup-toggle-inline input {
          display: none;
        }
        .warmup-check-box {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-radius: 4px;
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .warmup-toggle-inline input:checked + .warmup-check-box {
          background: var(--accent);
          border-color: var(--accent);
        }
        .warmup-toggle-inline input:checked + .warmup-check-box::after {
          content: '✓';
          color: #000;
          font-size: 12px;
          font-weight: 700;
        }
        .warmup-label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .log-set-btn {
          flex: 1;
          padding: 14px 20px;
          background: var(--accent);
          border: none;
          border-radius: 12px;
          color: #000;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .log-set-btn:hover {
          filter: brightness(1.1);
        }
        .log-set-btn:active {
          transform: scale(0.98);
        }

        /* Set Panel Header Actions */
        .set-panel-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .note-indicator {
          font-size: 14px;
          opacity: 0.7;
        }

        /* Target Prescription */
        .target-prescription {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 10px 12px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }
        .target-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .target-values {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .target-weight {
          color: var(--accent);
        }
        .target-reps {
          color: var(--text-primary);
        }
        .target-rpe {
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Previous Workout Section */
        .prev-workout-section {
          margin-bottom: 10px;
          padding: 10px;
          background: var(--bg-card);
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .prev-workout-label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .prev-workout-sets {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .prev-set-badge {
          padding: 6px 10px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .prev-set-badge:hover {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        .prev-set-badge.warmup {
          opacity: 0.6;
          border-style: dashed;
        }
        .prev-set-badge .warmup-w {
          font-size: 10px;
          margin-right: 4px;
          opacity: 0.7;
        }
        .prev-set-badge.current {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
          cursor: default;
        }
        .prev-set-badge.current:hover {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }
        .prev-workout-section.this-time {
          margin-top: 0;
          border-top: none;
          padding-top: 0;
        }
        .prev-workout-section.this-time .prev-workout-label {
          color: var(--accent);
        }

        /* Exercise Notes Section */
        .exercise-notes-section {
          margin-bottom: 10px;
        }
        .notes-toggle {
          width: 100%;
          padding: 8px 10px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
        }
        .notes-toggle:hover {
          background: var(--bg-card);
        }
        .exercise-notes-input {
          width: 100%;
          margin-top: 6px;
          padding: 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 13px;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        .exercise-notes-input:focus {
          border-color: var(--accent);
        }
        .exercise-notes-input::placeholder {
          color: var(--text-tertiary);
        }

        /* Repeat Last Set Button */
        .repeat-set-btn {
          width: 100%;
          margin-top: 8px;
          padding: 10px;
          background: transparent;
          border: 1px dashed var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .repeat-set-btn:hover {
          background: var(--bg-card);
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Remove Set Button */
        .remove-set-btn {
          width: 100%;
          margin-top: 6px;
          padding: 8px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-tertiary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .remove-set-btn:hover {
          background: rgba(255,107,107,0.1);
          color: #ff6b6b;
        }

        /* Rest Timer */
        .rest-timer-section {
          margin-top: 12px;
          padding: 12px;
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .rest-timer-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .rest-timer-label {
          font-size: 11px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rest-timer-time {
          font-size: 26px;
          font-weight: 700;
          color: var(--accent);
          font-variant-numeric: tabular-nums;
        }
        .rest-timer-skip {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .rest-timer-skip:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .rest-timer-bar {
          height: 4px;
          background: var(--bg-elevated);
          border-radius: 2px;
          overflow: hidden;
        }
        .rest-timer-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 1s linear;
        }

        /* Rest Timer Presets */
        .rest-timer-presets {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .rest-presets-label {
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .rest-preset-btn {
          padding: 5px 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .rest-preset-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .rest-preset-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }

        /* Chart Button */
        .chart-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .chart-btn:hover {
          opacity: 1;
        }

        /* Minimize Button */
        .minimize-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 14px;
          opacity: 0.7;
          transition: opacity 0.15s;
          color: var(--text-secondary);
        }
        .minimize-btn:hover {
          opacity: 1;
        }

        /* Set Actions Buttons Container */
        .set-actions-buttons {
          display: flex;
          gap: 8px;
          flex: 1;
        }

        /* Next Exercise Button */
        .next-exercise-btn {
          padding: 14px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .next-exercise-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }
        .next-exercise-btn:active {
          transform: scale(0.98);
        }

        /* Chart Modal */
        .chart-modal {
          max-width: 380px;
        }
        .chart-metric-tabs {
          display: flex;
          gap: 4px;
          margin: 16px 0;
          padding: 4px;
          background: var(--bg-secondary);
          border-radius: 8px;
        }
        .chart-metric-tab {
          flex: 1;
          padding: 8px 12px;
          background: none;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .chart-metric-tab:hover {
          color: var(--text-primary);
        }
        .chart-metric-tab.active {
          background: var(--accent);
          color: white;
        }
        .chart-container {
          margin: 16px 0;
        }
        .progress-chart {
          width: 100%;
          height: auto;
        }
        .chart-line {
          stroke: var(--accent);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .chart-point {
          fill: var(--accent);
          stroke: var(--bg-primary);
          stroke-width: 2;
        }
        .chart-point-label {
          fill: var(--text-primary);
          font-size: 10px;
          font-weight: 600;
        }
        .chart-label {
          fill: var(--text-tertiary);
          font-size: 10px;
        }
        .chart-grid {
          stroke: var(--border);
          stroke-width: 1;
          stroke-dasharray: 4 4;
        }
        .chart-empty {
          text-align: center;
          padding: 32px 16px;
        }
        .chart-empty-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .chart-empty-text {
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
        }
        .chart-empty-hint {
          color: var(--text-tertiary);
          font-size: 12px;
          margin-top: 4px;
        }

        /* Superset Styles */
        .exercise-pill.superset {
          border-left: 3px solid var(--accent);
        }
        .exercise-pill.superset.superset-cont {
          margin-top: -4px;
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }
        .superset-badge {
          position: absolute;
          top: -8px;
          right: 32px;
          background: var(--accent);
          color: white;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .superset-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .superset-btn:hover {
          opacity: 1;
        }
        .superset-btn.active {
          opacity: 1;
        }

        /* Plate Calculator */
        .plate-calc-btn {
          background: none;
          border: none;
          padding: 0 4px;
          cursor: pointer;
          font-size: 12px;
          opacity: 0.6;
          transition: opacity 0.15s;
          margin-left: 4px;
        }
        .plate-calc-btn:hover {
          opacity: 1;
        }

        /* Voice Input Button */
        .voice-input-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          margin-bottom: 16px;
          background: var(--bg-card);
          border: 1px dashed var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .voice-input-btn:hover {
          border-color: var(--accent);
          color: var(--text-primary);
          background: var(--bg-card-hover);
        }
        .voice-input-btn.listening {
          border-color: #ef4444;
          border-style: solid;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          animation: voicePulse 1.5s ease-in-out infinite;
        }
        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        .voice-icon {
          font-size: 16px;
        }
        .voice-label {
          font-weight: 500;
        }

        .plate-calc-modal {
          max-width: 340px;
        }
        .plate-calc-inputs {
          margin: 16px 0;
        }
        .plate-calc-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .plate-calc-input-group label {
          flex: 0 0 100px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .plate-calc-input-group input {
          flex: 1;
          padding: 10px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
          text-align: center;
        }
        .plate-calc-input-group span {
          font-size: 13px;
          color: var(--text-tertiary);
        }
        .plate-calc-bar-options {
          display: flex;
          gap: 6px;
        }
        .plate-calc-bar-btn {
          padding: 8px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .plate-calc-bar-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .plate-calc-bar-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        .plate-calc-result {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .plate-calc-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        .plate-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          margin-bottom: 12px;
        }
        .plate-bar-end {
          width: 8px;
          height: 24px;
          background: #555;
          border-radius: 2px;
        }
        .plate-collar {
          width: 6px;
          height: 20px;
          background: #777;
          border-radius: 2px;
        }
        .plate {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          color: white;
          border-radius: 2px;
        }
        .plate-45 {
          width: 14px;
          height: 60px;
          background: #1a5f2a;
        }
        .plate-35 {
          width: 12px;
          height: 52px;
          background: #c4a700;
        }
        .plate-25 {
          width: 11px;
          height: 44px;
          background: #1a3f5f;
        }
        .plate-10 {
          width: 10px;
          height: 36px;
          background: #5f1a1a;
        }
        .plate-5 {
          width: 8px;
          height: 28px;
          background: #444;
        }
        .plate-2-5 {
          width: 6px;
          height: 22px;
          background: #666;
          font-size: 7px;
        }
        .plate-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        .plate-count {
          padding: 4px 10px;
          background: var(--bg-tertiary);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .plate-calc-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          border-radius: 8px;
          padding: 12px;
          color: #ff6b6b;
          font-size: 13px;
          text-align: center;
        }
        .plate-calc-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .plate-calc-actions .modal-btn {
          flex: 1;
        }

        /* Onboarding Modal */
        .onboarding-overlay {
          background: rgba(0, 0, 0, 0.85);
        }
        .onboarding-modal {
          max-width: 340px;
          text-align: center;
          padding: 32px 24px 24px;
        }
        .onboarding-icon {
          font-size: 56px;
          margin-bottom: 16px;
          animation: bounce 1s ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .onboarding-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 12px;
        }
        .onboarding-content {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .onboarding-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .onboarding-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border);
          cursor: pointer;
          transition: all 0.2s;
        }
        .onboarding-dot.active {
          background: var(--accent);
          transform: scale(1.2);
        }
        .onboarding-dot:hover {
          background: var(--text-tertiary);
        }
        .onboarding-actions {
          display: flex;
          gap: 10px;
        }
        .onboarding-actions .modal-btn {
          flex: 1;
        }
        .onboarding-skip {
          margin-top: 16px;
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 13px;
          cursor: pointer;
          padding: 8px;
          transition: color 0.15s;
        }
        .onboarding-skip:hover {
          color: var(--text-secondary);
        }

        /* Summary Card */
        .summary-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          margin: 20px 0;
        }
        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .summary-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .summary-period-toggle {
          display: flex;
          gap: 4px;
          padding: 3px;
          background: var(--bg-secondary);
          border-radius: 8px;
        }
        .period-btn {
          padding: 6px 12px;
          background: none;
          border: none;
          border-radius: 6px;
          color: var(--text-tertiary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .period-btn.active {
          background: var(--accent);
          color: white;
        }
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .summary-stat {
          text-align: center;
        }
        .summary-stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: var(--accent);
        }
        .summary-stat-label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }
        .summary-top-exercises {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin-bottom: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .summary-top-label {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-right: 4px;
        }
        .summary-top-exercise {
          padding: 4px 8px;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 11px;
          color: var(--text-secondary);
        }
        .summary-share-btn {
          width: 100%;
          padding: 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .summary-share-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Profile Link Button */
        .profile-link-btn {
          width: 100%;
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 16px;
        }

        .profile-link-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }

        .profile-link-icon {
          font-size: 24px;
        }

        .profile-link-text {
          flex: 1;
          text-align: left;
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .profile-link-arrow {
          font-size: 20px;
          color: var(--text-tertiary);
        }

        /* Export Button */
        .export-btn {
          width: 100%;
          padding: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .export-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Warmup indicator on set badges */
        .set-badge.warmup {
          opacity: 0.6;
          border-style: dashed;
        }
        .warmup-indicator {
          font-size: 9px;
          margin-right: 3px;
          opacity: 0.7;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          bottom: var(--keyboard-height, 0px);
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          transition: bottom 0.15s ease-out;
        }

        .modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-light);
          border-radius: 24px;
          padding: 28px;
          width: 100%;
          max-width: 380px;
          max-height: calc(100% - 40px);
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
        }

        .modal-header {
          font-weight: 700;
          font-size: 20px;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .modal-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .modal-input {
          width: 100%;
          padding: 14px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 15px;
          outline: none;
          margin-bottom: 20px;
          transition: all 0.2s;
        }
        .modal-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .modal-input::placeholder { color: var(--text-tertiary); }

        .modal-actions {
          display: flex;
          gap: 10px;
        }
        .modal-btn {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }
        .modal-btn.secondary {
          background: var(--bg-card);
          color: var(--text-secondary);
        }
        .modal-btn.secondary:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .modal-btn.primary {
          background: var(--accent);
          color: white;
        }
        .modal-btn.primary:hover {
          filter: brightness(1.1);
        }
        .modal-btn.danger {
          background: #ef4444;
          color: white;
        }
        .modal-btn.danger:hover {
          background: #dc2626;
        }

        /* Confirmation Modal */
        .confirm-modal-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }
        .confirm-modal-message {
          font-size: 15px;
          color: var(--text-secondary);
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .confirm-modal-exercise-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Workout Summary Modal */
        .workout-summary-modal {
          text-align: center;
          max-width: 420px;
        }
        .summary-celebration {
          font-size: 48px;
          margin-bottom: 8px;
          animation: celebrationBounce 0.6s ease-out;
        }
        @keyframes celebrationBounce {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .summary-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .summary-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
        .summary-xp-container {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 107, 107, 0.1));
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .summary-xp-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .summary-xp-value {
          font-size: 48px;
          font-weight: 800;
          color: #FFD700;
          line-height: 1;
          animation: xpCountUp 1s ease-out;
        }
        @keyframes xpCountUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .summary-xp-suffix {
          font-size: 20px;
          font-weight: 600;
          color: #FFD700;
          margin-left: 4px;
        }
        .summary-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .summary-stat {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 8px;
        }
        .summary-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .summary-stat-label {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .summary-prs-section {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.1));
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
        }
        .summary-prs-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .summary-pr-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .summary-pr-item:last-child {
          border-bottom: none;
        }
        .summary-pr-name {
          font-size: 14px;
          color: var(--text-secondary);
        }
        .summary-pr-value {
          font-size: 14px;
          font-weight: 700;
          color: #FFD700;
        }
        .summary-volume-comparison {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .volume-comparison-label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .volume-comparison-change {
          font-size: 15px;
          font-weight: 700;
        }
        .volume-comparison-change.positive {
          color: #4ade80;
        }
        .volume-comparison-change.negative {
          color: #f87171;
        }
        .summary-share-btn {
          width: 100%;
          padding: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .summary-share-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }
        .summary-done-btn {
          width: 100%;
          padding: 16px;
          background: var(--accent);
          border: none;
          border-radius: 12px;
          color: #000;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .summary-done-btn:hover {
          filter: brightness(1.1);
        }

        /* Quick Templates Section */
        .quick-templates-section {
          padding: 0 16px 16px;
        }
        .quick-templates-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .quick-template-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          min-height: 48px;
        }
        .quick-template-card:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }
        .quick-template-card:active {
          transform: scale(0.98);
        }
        .template-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: 10px;
        }
        .template-info {
          flex: 1;
          min-width: 0;
        }
        .template-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .template-meta {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .template-arrow {
          font-size: 18px;
          color: var(--accent);
          font-weight: 600;
        }

        /* Progressive Overload Indicator */
        .overload-indicator {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 4px;
          margin-left: 4px;
        }
        .overload-indicator.up {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.15);
        }
        .overload-indicator.down {
          color: #f87171;
          background: rgba(248, 113, 113, 0.15);
        }
        .overload-indicator.pr {
          color: #FFD700;
          background: rgba(255, 215, 0, 0.15);
        }

        /* Exercise History Preview */
        .exercise-history-preview {
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .history-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .history-preview-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .history-preview-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .history-preview-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
        }
        .history-preview-date {
          color: var(--text-tertiary);
        }
        .history-preview-sets {
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Workout Notes */
        .workout-note-input {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: inherit;
          resize: none;
          min-height: 60px;
          margin-top: 8px;
        }
        .workout-note-input::placeholder {
          color: var(--text-quaternary);
        }
        .workout-note-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .exercise-note-btn {
          padding: 6px 10px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-tertiary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .exercise-note-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .exercise-note-btn.has-note {
          border-color: var(--accent);
          background: var(--accent-glow);
          color: var(--accent);
        }

        /* Offline/Sync Indicator */
        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .sync-indicator.syncing {
          color: var(--accent);
          border-color: var(--accent);
        }
        .sync-indicator.offline {
          color: #f59e0b;
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }
        .sync-icon {
          font-size: 12px;
        }
        .sync-icon.spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Superset Visual Improvements */
        .superset-connector {
          position: absolute;
          left: 8px;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%);
          border-radius: 2px;
        }
        .exercise-pill.superset {
          margin-left: 16px;
          border-left: 3px solid var(--accent);
        }
        .superset-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: var(--accent-glow);
          border: 1px solid var(--accent);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 6px;
        }

        /* Quick Access Row */
        .quick-access-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 0 16px 24px;
        }
        .quick-access-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .quick-access-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        .quick-access-icon {
          font-size: 24px;
        }
        .quick-access-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .see-all-btn {
          padding: 8px 14px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .see-all-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* View Content */
        .view-content { padding: 16px; }

        .view-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .back-btn {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 18px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .back-btn:hover {
          background: var(--bg-card-hover);
        }
        .view-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Profile Card */
        .profile-hero {
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%);
          border: 1px solid var(--border-light);
          border-radius: 24px;
          padding: 32px;
          text-align: center;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .profile-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 100px;
          background: radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%);
          pointer-events: none;
        }

        .profile-level-ring {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, var(--accent) 0%, #ff8f8f 100%);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 8px 32px var(--accent-glow);
          position: relative;
        }
        .profile-level-label {
          font-size: 10px;
          font-weight: 600;
          opacity: 0.9;
          letter-spacing: 1px;
        }
        .profile-level-value {
          font-size: 36px;
          font-weight: 800;
          line-height: 1;
        }
        .profile-name {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
        .profile-xp {
          color: var(--text-secondary);
          font-size: 14px;
        }
        .profile-xp span {
          color: var(--accent);
          font-weight: 600;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 12px;
          text-align: center;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 700;
          color: var(--accent);
          line-height: 1;
        }
        .stat-label {
          font-size: 10px;
          color: var(--text-tertiary);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Body Stats */
        .body-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
          cursor: pointer;
        }
        .body-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
          position: relative;
        }
        .body-stat-card:hover {
          border-color: var(--accent);
          background: var(--bg-card-hover);
        }
        .body-stat-icon {
          font-size: 24px;
          flex-shrink: 0;
        }
        .body-stat-content {
          flex: 1;
          min-width: 0;
        }
        .body-stat-label {
          font-size: 11px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .body-stat-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .weight-trend {
          position: absolute;
          top: 8px;
          right: 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .trend-up { color: #FF6B6B; }
        .trend-down { color: var(--success); }
        .trend-same { color: var(--text-tertiary); }

        /* Body Stats Modal */
        .body-stats-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .body-stats-modal-content {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 340px;
        }
        .body-stats-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 20px;
          text-align: center;
        }
        .body-stats-field {
          margin-bottom: 20px;
        }
        .body-stats-field-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .body-stats-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .body-stats-input {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          text-align: center;
          -webkit-appearance: none;
        }
        .body-stats-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .body-stats-unit {
          font-size: 14px;
          color: var(--text-tertiary);
          min-width: 30px;
        }
        .body-stats-actions {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        .body-stats-btn {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .body-stats-btn-cancel {
          background: var(--bg-secondary);
          color: var(--text-secondary);
        }
        .body-stats-btn-save {
          background: var(--accent);
          color: white;
        }
        .body-stats-btn-save:hover {
          filter: brightness(1.1);
        }

        /* PR Section */
        .section-title {
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pr-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .pr-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          position: relative;
          transition: all 0.15s;
        }
        .pr-card.clickable {
          cursor: pointer;
        }
        .pr-card.clickable:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }
        .pr-card.imported {
          border-color: rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.05);
        }
        .pr-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 4px;
        }
        .pr-exercise {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
          flex: 1;
        }
        .pr-actions {
          display: flex;
          gap: 4px;
        }
        .pr-edit-btn, .pr-delete-btn {
          background: none;
          border: none;
          padding: 2px;
          font-size: 12px;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.15s;
        }
        .pr-edit-btn:hover, .pr-delete-btn:hover {
          opacity: 1;
        }
        .pr-delete-btn:hover {
          opacity: 1;
          filter: brightness(1.2);
        }
        .pr-weight {
          font-size: 20px;
          font-weight: 700;
          color: var(--gold);
        }
        .pr-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        .pr-date {
          font-size: 10px;
          color: var(--text-secondary);
          opacity: 0.7;
        }
        .pr-imported-badge {
          font-size: 10px;
        }
        .pr-progress {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid var(--border);
        }
        .pr-progress-value {
          font-size: 12px;
          font-weight: 600;
          color: #22c55e;
        }
        .pr-progress-percent {
          font-size: 10px;
          color: var(--text-secondary);
          margin-left: 4px;
        }
        .section-action-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          font-size: 14px;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.15s;
          margin-left: 8px;
        }
        .section-action-btn:hover {
          opacity: 1;
        }

        /* Workout Cards */
        /* History Filters */
        .history-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }
        .history-count {
          font-size: 13px;
          color: var(--text-tertiary);
        }
        .history-view-toggle {
          display: flex;
          gap: 4px;
          background: var(--bg-card);
          padding: 4px;
          border-radius: 8px;
        }
        .view-toggle-btn {
          width: 32px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .view-toggle-btn:hover {
          background: var(--surface-hover);
        }
        .view-toggle-btn.active {
          background: var(--accent);
        }

        /* Calendar Heatmap */
        .calendar-heatmap-container {
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
        }
        .calendar-heatmap-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .calendar-heatmap-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .calendar-heatmap-legend {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .legend-label {
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .legend-cell {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }
        .calendar-heatmap {
          display: flex;
          gap: 4px;
        }
        .calendar-day-labels {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-right: 4px;
        }
        .calendar-day-labels span {
          height: 16px;
          font-size: 10px;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
        }
        .calendar-weeks {
          display: flex;
          gap: 4px;
          flex: 1;
          overflow-x: auto;
        }
        .calendar-week {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .calendar-day {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }
        .calendar-day:hover {
          border-color: var(--text);
          transform: scale(1.1);
        }
        .calendar-day.today {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent);
        }
        .calendar-day.future {
          opacity: 0.3;
          cursor: default;
        }
        .calendar-stats {
          display: flex;
          justify-content: space-around;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        .calendar-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .calendar-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent);
        }
        .calendar-stat-label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .history-filters {
          margin-bottom: 20px;
        }
        .history-search {
          width: 100%;
          padding: 12px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 15px;
          margin-bottom: 12px;
          outline: none;
        }
        .history-search:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .history-search::placeholder {
          color: var(--text-tertiary);
        }
        .history-date-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
          background: var(--bg-card);
          border-radius: 10px;
          padding: 4px;
        }
        .history-date-tab {
          flex: 1;
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .history-date-tab:hover {
          color: var(--text-primary);
        }
        .history-date-tab.active {
          background: var(--accent);
          color: #000;
        }
        .history-muscle-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .history-muscle-chips::-webkit-scrollbar {
          display: none;
        }
        .muscle-filter-chip {
          flex-shrink: 0;
          padding: 8px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          text-transform: capitalize;
        }
        .muscle-filter-chip:hover {
          border-color: var(--accent);
          color: var(--text-primary);
        }
        .muscle-filter-chip.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }
        .load-more-btn {
          width: 100%;
          padding: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 8px;
        }
        .load-more-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }

        .workout-card {
          background: rgba(30, 30, 40, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .workout-card:hover {
          background: rgba(40, 40, 50, 0.8);
          border-color: rgba(255, 107, 107, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .workout-date {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .workout-summary {
          font-size: 0.9375rem;
          color: var(--text-secondary);
        }
        .workout-xp {
          color: var(--accent);
          font-weight: 600;
        }
        .workout-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .auto-complete-badge {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-tertiary);
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .workout-exercises-list {
          font-size: 13px;
          color: var(--text-tertiary);
          margin-top: 8px;
          line-height: 1.4;
        }
        .workout-muscle-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .muscle-tag {
          font-size: 11px;
          font-weight: 500;
          color: var(--accent);
          background: rgba(255, 107, 107, 0.15);
          padding: 3px 10px;
          border-radius: 12px;
          text-transform: capitalize;
        }

        /* Achievement Cards */
        .achievement-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.2s;
        }
        .achievement-card.unlocked {
          background: rgba(255,215,0,0.05);
          border-color: rgba(255,215,0,0.2);
        }
        .achievement-icon {
          font-size: 32px;
          flex-shrink: 0;
        }
        .achievement-info { flex: 1; }
        .achievement-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .achievement-desc {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .achievement-check {
          color: var(--success);
          font-size: 18px;
        }
        .achievement-progress {
          margin-top: 8px;
        }
        .achievement-progress-bar {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .achievement-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--xp-color), var(--gold));
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .achievement-progress-text {
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .achievement-card.locked {
          opacity: 0.7;
        }
        .achievement-card.locked:hover {
          opacity: 0.85;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        .empty-icon {
          font-size: 56px;
          margin-bottom: 16px;
          opacity: 0.8;
        }
        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .empty-subtitle {
          font-size: 14px;
          color: var(--text-tertiary);
          max-width: 260px;
          margin: 0 auto;
          line-height: 1.5;
        }

        /* Home Hero */
        /* Home Hero - Glass Card */
        .home-hero {
          padding: 24px 16px 32px;
        }
        .hero-card {
          background: var(--theme-bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--theme-border-light);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .home-icon {
          font-size: 56px;
          margin-bottom: 1rem;
          filter: drop-shadow(0 4px 12px var(--app-fitness-glow));
        }
        .home-title {
          font-family: var(--font-modern-thrash), 'Press Start 2P', monospace;
          font-size: 2.5rem;
          font-weight: 400;
          color: var(--app-fitness);
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px var(--app-fitness-glow);
          letter-spacing: 0.05em;
        }
        .home-subtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.65rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          letter-spacing: 0.02em;
        }
        .home-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 1.5rem;
        }
        .home-stat {
          background: var(--theme-bg-tertiary);
          border: 1px solid var(--theme-border);
          border-radius: 12px;
          padding: 1rem 0.75rem;
        }
        .home-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent);
        }
        .home-stat-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 4px;
        }

        .hero-tap-hint {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 16px;
          opacity: 0.6;
          transition: opacity 0.15s, color 0.15s;
        }

        .hero-tap-hint:hover {
          opacity: 1;
          color: var(--accent);
        }

        /* Start Workout Button - Primary CTA */
        .start-workout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 18px 24px;
          margin: 20px 0 24px;
          background: linear-gradient(135deg, var(--accent) 0%, #ff8a8a 100%);
          border: none;
          border-radius: 16px;
          color: #000;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4), 0 0 0 0 rgba(255, 107, 107, 0);
          position: relative;
          overflow: hidden;
        }
        .start-workout-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .start-workout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(255, 107, 107, 0.5), 0 0 0 4px rgba(255, 107, 107, 0.15);
        }
        .start-workout-btn:hover::before {
          opacity: 1;
        }
        .start-workout-btn:active {
          transform: translateY(0) scale(0.98);
        }
        .start-workout-icon {
          font-size: 24px;
          font-weight: 300;
          line-height: 1;
        }
        .start-workout-text {
          letter-spacing: 0.02em;
        }
        @media (min-width: 768px) {
          .start-workout-btn {
            max-width: 320px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        /* Section Headers */
        .section-header {
          margin-bottom: 1rem;
          padding: 0 16px;
        }
        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Milestones Carousel */
        .milestones-carousel-section {
          padding: 0 16px 24px;
        }

        .milestones-carousel {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 4px 0;
        }

        .milestones-carousel::-webkit-scrollbar {
          display: none;
        }

        .milestone-progress-card {
          flex: 0 0 280px;
          scroll-snap-align: start;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .milestone-progress-card:hover {
          transform: translateY(-2px);
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 0 4px 20px rgba(168, 85, 247, 0.2);
        }

        .milestone-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .milestone-info {
          flex: 1;
          min-width: 0;
        }

        .milestone-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .milestone-exercise {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }

        .milestone-progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .milestone-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a855f7 0%, #ec4899 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .milestone-progress-text {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .milestone-xp {
          font-size: 14px;
          font-weight: 700;
          color: #FFD700;
          flex-shrink: 0;
        }

        .recent-section {
          padding: 0 16px;
        }
        .friends-section {
          padding: 24px 16px;
        }
        .recent-header {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        /* Exercise Picker Modal */
        .exercise-picker-overlay {
          position: fixed;
          inset: 0;
          bottom: var(--keyboard-height, 0px);
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          flex-direction: column;
          padding: env(safe-area-inset-top, 20px) 0 env(safe-area-inset-bottom, 20px);
          transition: bottom 0.15s ease-out;
        }

        .exercise-picker-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }

        .exercise-picker-back {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 18px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .exercise-picker-back:hover {
          background: var(--bg-card-hover);
        }

        .exercise-picker-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .exercise-picker-search {
          padding: 0 16px 16px;
        }

        .exercise-picker-search .exercise-search-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-primary);
          font-size: 16px;
        }

        .exercise-picker-search .exercise-search-input::placeholder {
          color: var(--text-muted);
        }

        .exercise-picker-search .exercise-search-input:focus {
          outline: none;
          border-color: var(--theme-primary);
        }

        .exercise-picker-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .category-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .category-card:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-light);
          transform: translateY(-2px);
        }

        .category-card:active {
          transform: translateY(0);
        }

        .category-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .category-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .category-count {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        .exercise-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .exercise-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .exercise-item:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-light);
        }

        .exercise-item.in-workout {
          border-color: var(--accent);
          background: var(--accent-glow);
        }

        .exercise-item-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: 10px;
          font-size: 18px;
        }

        .exercise-item.in-workout .exercise-item-icon {
          background: var(--accent);
          color: white;
        }

        .exercise-item-info {
          flex: 1;
        }

        .exercise-item-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .exercise-item-equipment {
          font-size: 12px;
          color: var(--text-tertiary);
          text-transform: capitalize;
        }

        .exercise-item-check {
          color: var(--accent);
          font-size: 18px;
        }

        .exercise-info-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .exercise-info-btn:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .exercise-item.create-custom,
        .exercise-option.create-custom {
          border-top: 1px dashed var(--border);
          margin-top: 8px;
          padding-top: 16px;
        }

        .exercise-item.create-custom .exercise-item-icon,
        .exercise-option.create-custom .exercise-name {
          color: var(--theme-primary);
        }

        .exercise-item.create-custom:hover,
        .exercise-option.create-custom:hover {
          background: var(--theme-primary-alpha);
          border-color: var(--theme-primary);
        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 220px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          z-index: 200;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: toastIn 0.3s ease-out;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Undo Toast */
        .undo-toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(30, 30, 40, 0.95);
          border: 1px solid var(--border);
          border-radius: 12px;
          z-index: 300;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: undoToastIn 0.3s ease-out;
          backdrop-filter: blur(8px);
        }
        .undo-toast-message {
          font-size: 13px;
          color: var(--text-primary);
        }
        .undo-toast-btn {
          padding: 6px 12px;
          background: var(--accent);
          border: none;
          border-radius: 6px;
          color: #000;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .undo-toast-btn:hover {
          filter: brightness(1.1);
        }
        .undo-toast-dismiss {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          font-size: 16px;
          cursor: pointer;
        }
        .undo-toast-dismiss:hover {
          color: var(--text-secondary);
        }
        @keyframes undoToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Sync Status Indicator */
        .sync-indicator {
          position: fixed;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          z-index: 150;
          animation: syncIndicatorIn 0.3s ease-out;
          backdrop-filter: blur(8px);
        }
        .sync-indicator.offline {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
        }
        .sync-indicator.syncing {
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #3b82f6;
        }
        .sync-indicator.error {
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #f59e0b;
        }
        .sync-indicator.pending {
          background: rgba(107, 114, 128, 0.2);
          border: 1px solid rgba(107, 114, 128, 0.4);
          color: #9ca3af;
        }
        .sync-icon {
          font-size: 14px;
        }
        .sync-indicator.syncing .sync-icon {
          animation: syncSpin 1s linear infinite;
        }
        @keyframes syncIndicatorIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes syncSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Campaign Styles */
        .create-btn {
          width: 100%;
          padding: 14px;
          background: var(--bg-card);
          border: 1px dashed var(--border-light);
          border-radius: 14px;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .create-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
          color: var(--accent);
        }

        .campaign-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .campaign-card:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-light);
        }

        .campaign-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .campaign-title {
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
        }
        .campaign-badge {
          font-size: 11px;
          padding: 4px 8px;
          background: var(--bg-tertiary);
          border-radius: 6px;
          color: var(--text-secondary);
        }
        .campaign-badge.overdue {
          background: rgba(255,107,107,0.15);
          color: var(--accent);
        }

        .campaign-progress {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .progress-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .progress-text {
          font-size: 12px;
          color: var(--text-tertiary);
          flex-shrink: 0;
        }

        /* Goal Cards */
        .goal-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .goal-card.achieved {
          background: rgba(52,199,89,0.08);
          border-color: rgba(52,199,89,0.2);
        }
        .goal-info { flex: 1; }
        .goal-exercise {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .goal-target {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .goal-check {
          color: var(--success);
          font-size: 18px;
          font-weight: 600;
        }

        /* Template List Styles */
        .template-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }
        .template-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .template-info {
          flex: 1;
          min-width: 0;
        }
        .template-name {
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .default-badge {
          font-size: 9px;
          padding: 2px 5px;
          background: var(--accent);
          color: #fff;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .template-meta {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .template-description {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .template-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .template-action-btn {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .template-action-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-light);
        }
        .template-action-btn.start {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .template-action-btn.start:hover {
          filter: brightness(1.1);
        }
        .template-action-btn.delete:hover {
          background: rgba(255,107,107,0.15);
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Template Editor Styles */
        .template-editor {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .template-name-input {
          flex: 1;
          font-size: 17px;
          font-weight: 600;
          background: transparent;
          border: none;
          color: var(--text-primary);
          outline: none;
          padding: 4px 0;
        }
        .template-name-input::placeholder {
          color: var(--text-tertiary);
        }
        .template-editor-section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .editor-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .exercise-count {
          font-size: 12px;
          padding: 2px 8px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          color: var(--text-tertiary);
        }
        .editor-textarea {
          width: 100%;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
          color: var(--text-primary);
          resize: none;
          outline: none;
          font-family: inherit;
        }
        .editor-textarea:focus {
          border-color: var(--accent);
        }
        .empty-exercises {
          text-align: center;
          padding: 32px;
          color: var(--text-tertiary);
          font-size: 13px;
        }
        .empty-exercises .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .template-exercises {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .template-exercise-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .exercise-drag-handle {
          color: var(--text-tertiary);
          cursor: grab;
          padding: 4px;
          font-size: 14px;
        }
        .exercise-content {
          flex: 1;
          min-width: 0;
        }
        .exercise-content .exercise-name {
          font-weight: 500;
          font-size: 14px;
          color: var(--text-primary);
        }
        .exercise-targets {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
        }
        .target-input {
          width: 50px;
          padding: 6px 8px;
          font-size: 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          text-align: center;
        }
        .target-input:focus {
          border-color: var(--accent);
          outline: none;
        }
        .target-input.sets { width: 45px; }
        .target-input.reps { width: 55px; }
        .target-separator {
          color: var(--text-tertiary);
          font-size: 12px;
        }
        .target-rpe {
          font-size: 11px;
          color: var(--accent);
          margin-left: 6px;
        }
        .remove-exercise-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          font-size: 14px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .remove-exercise-btn:hover {
          background: rgba(255,107,107,0.15);
          color: var(--accent);
        }
        .add-exercise-btn {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
          background: transparent;
          border: 2px dashed var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .add-exercise-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: rgba(255,107,107,0.05);
        }
        .template-editor-actions {
          display: flex;
          gap: 12px;
        }
        .editor-btn {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .editor-btn.primary {
          background: var(--accent);
          color: #fff;
        }
        .editor-btn.primary:hover {
          filter: brightness(1.1);
        }

        /* Exercise Picker Modal */
        .exercise-picker-modal {
          max-height: 70vh;
          display: flex;
          flex-direction: column;
        }
        .exercise-search-input {
          width: 100%;
          padding: 12px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 15px;
          color: var(--text-primary);
          margin: 12px 0;
          outline: none;
        }
        .exercise-search-input:focus {
          border-color: var(--accent);
        }
        .exercise-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .exercise-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .exercise-option:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }
        .exercise-option .exercise-name {
          font-weight: 500;
          font-size: 14px;
          color: var(--text-primary);
        }
        .exercise-option .exercise-muscle {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        /* ===== PROGRAMS ===== */
        .program-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
        }

        .program-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .program-card.active {
          border-color: var(--accent);
          background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.1) 0%, var(--surface) 100%);
        }

        .program-info {
          flex: 1;
        }

        .program-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .program-name {
          font-weight: 600;
          font-size: 16px;
          color: var(--text-primary);
        }

        .active-badge {
          background: var(--accent);
          color: #000;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }

        .program-meta {
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 8px;
        }

        .program-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .program-description {
          font-size: 13px;
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }

        .program-progress {
          margin-top: 4px;
        }

        .progress-bar-container {
          height: 6px;
          background: var(--surface-hover);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .program-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .program-action-btn {
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .program-action-btn:hover {
          background: var(--surface-active);
          border-color: var(--text-tertiary);
        }

        .program-action-btn.primary {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
          font-weight: 600;
        }

        .program-action-btn.primary:hover {
          filter: brightness(1.1);
        }

        .program-action-btn.danger {
          color: #ef4444;
        }

        .program-action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        /* ===== PROGRAM DETAIL VIEW ===== */
        .program-detail-view {
          padding: 16px;
        }

        .program-detail-summary {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .program-detail-summary .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .program-detail-summary .summary-label {
          color: var(--text-secondary);
          font-size: 13px;
        }

        .program-detail-summary .summary-value {
          color: var(--accent);
          font-weight: 600;
          font-size: 14px;
        }

        .program-detail-summary .program-progress-bar {
          height: 8px;
          background: var(--surface-hover);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .program-detail-summary .progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 4px;
        }

        .program-detail-summary .summary-meta {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .program-schedule {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .program-week {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .program-week.current {
          border-color: var(--accent);
          border-width: 2px;
        }

        .program-week.past {
          opacity: 0.6;
        }

        .week-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--surface-hover);
          border-bottom: 1px solid var(--border);
        }

        .week-label {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }

        .current-badge {
          background: var(--accent);
          color: #000;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }

        .completed-badge {
          color: var(--success, #4ECDC4);
          font-size: 14px;
        }

        .week-days {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
          padding: 12px;
        }

        .day-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .day-card:hover:not(:disabled) {
          border-color: var(--accent);
          background: rgba(255, 215, 0, 0.05);
        }

        .day-card:disabled {
          cursor: default;
          opacity: 0.5;
        }

        .day-card.rest {
          opacity: 0.5;
        }

        .day-card.completed {
          background: rgba(78, 205, 196, 0.1);
          border-color: var(--success, #4ECDC4);
        }

        .day-card.today {
          border-color: var(--accent);
          border-width: 2px;
          background: rgba(255, 215, 0, 0.15);
        }

        .day-card .day-number {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .day-card .day-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .day-card .check {
          color: var(--success, #4ECDC4);
        }

        .day-card .today-label {
          font-size: 9px;
          color: var(--accent);
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .day-card .start-hint {
          font-size: 10px;
          color: var(--text-tertiary);
          margin-top: 6px;
        }

        .day-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }

        .day-action-btn {
          flex: 1;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }

        .day-action-btn.start {
          background: var(--accent);
          color: #000;
        }

        .day-action-btn.start:hover {
          filter: brightness(1.1);
        }

        .day-action-btn.skip {
          background: var(--surface-hover);
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }

        .day-action-btn.skip:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: #ef4444;
        }

        .program-detail-actions {
          display: flex;
          gap: 12px;
          padding: 16px 0;
        }

        .program-detail-actions .action-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
        }

        .program-detail-actions .action-btn.secondary:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        .program-detail-actions .action-btn.danger {
          color: #ef4444;
        }

        .program-detail-actions .action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        /* ===== PROGRAM WIZARD ===== */
        .program-wizard {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: calc(100vh - 200px);
        }

        .wizard-header {
          text-align: center;
        }

        .wizard-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .wizard-steps {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
        }

        .wizard-step-indicator {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          background: var(--surface-hover);
          color: var(--text-tertiary);
          border: 2px solid var(--border);
          transition: all 0.2s ease;
        }

        .wizard-step-indicator.active {
          background: var(--accent);
          color: #000;
          border-color: var(--accent);
        }

        .wizard-step-indicator.completed {
          background: var(--accent);
          color: #000;
          border-color: var(--accent);
        }

        .wizard-content {
          flex: 1;
        }

        .wizard-step {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .wizard-step h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .wizard-hint {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          font-size: 15px;
          color: var(--text-primary);
          width: 100%;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .option-btn {
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text-primary);
        }

        .option-btn:hover {
          border-color: var(--accent);
          background: var(--surface-hover);
        }

        .option-btn.selected {
          border-color: var(--accent);
          background: var(--accent);
          color: white;
          box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
        }

        .option-btn.selected span {
          color: white;
        }

        /* Goal Priority List */
        .goal-priority-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .goal-priority-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: grab;
          transition: all 0.15s ease;
        }

        .goal-priority-item:hover {
          border-color: var(--accent);
          background: var(--surface-hover);
        }

        .goal-priority-item:active {
          cursor: grabbing;
        }

        .goal-priority-rank {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
          min-width: 20px;
        }

        .goal-priority-handle {
          color: var(--text-secondary);
          opacity: 0.5;
          padding: 8px;
          margin: -8px 0;
          touch-action: none;
        }

        .goal-priority-item.dragging {
          opacity: 0.5;
          border: 2px dashed var(--accent);
        }

        .goal-priority-item.drag-over {
          border: 2px solid var(--accent);
          background: var(--bg-elevated);
        }

        .goal-priority-icon {
          font-size: 18px;
        }

        .goal-priority-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          flex: 1;
        }

        .goal-exclude-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 14px;
          padding: 4px 8px;
          cursor: pointer;
          opacity: 0.5;
          transition: all 0.15s ease;
          border-radius: 4px;
        }

        .goal-exclude-btn:hover {
          opacity: 1;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .excluded-goals-section {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 8px;
          border-top: 1px dashed var(--border);
          margin-top: 8px;
        }

        .excluded-label {
          font-size: 12px;
          color: var(--text-tertiary);
          font-style: italic;
        }

        .goal-priority-item.excluded {
          opacity: 0.5;
          background: transparent;
          border-style: dashed;
          cursor: pointer;
          padding: 8px 12px;
        }

        .goal-priority-item.excluded .goal-priority-name {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }

        .goal-priority-item.excluded:hover {
          opacity: 0.8;
          border-color: var(--success);
        }

        .goal-readd-hint {
          font-size: 11px;
          color: var(--success);
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .goal-priority-item.excluded:hover .goal-readd-hint {
          opacity: 1;
        }

        .option-btn .option-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          display: block;
        }

        .option-btn .option-desc {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }

        .option-row {
          display: flex;
          gap: 8px;
        }

        .option-row .form-input {
          flex: 1;
        }

        /* Week Structure */
        .week-structure {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .week-structure.enhanced {
          gap: 0;
        }

        .day-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }

        .day-row.enhanced {
          flex-direction: column;
          align-items: stretch;
          padding: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin-bottom: 8px;
          gap: 8px;
        }

        .day-row.enhanced.rest {
          opacity: 0.6;
        }

        .day-row:last-child {
          border-bottom: none;
        }

        .day-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .day-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
          width: 36px;
          text-transform: uppercase;
        }

        .day-name-input {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          padding: 6px 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .day-name-input:focus {
          outline: none;
          border-bottom-color: var(--accent);
        }

        .day-name-input::placeholder {
          color: var(--text-muted);
        }

        .day-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .day-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          width: 100px;
        }

        .day-select {
          flex: 1;
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          color: var(--text-primary);
          cursor: pointer;
        }

        .day-select:focus {
          outline: none;
          border-color: var(--accent);
        }

        .day-select-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .day-select-row .day-select {
          flex: 1;
        }

        .day-edit-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s ease;
        }

        .day-edit-btn:hover {
          border-color: var(--accent);
          background: var(--surface-hover);
        }

        .day-muscle-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .muscle-tag {
          font-size: 10px;
          padding: 3px 8px;
          background: rgba(255, 215, 0, 0.15);
          color: var(--accent);
          border-radius: 10px;
          text-transform: capitalize;
        }

        /* Body Part Distribution */
        .body-part-distribution {
          margin-top: 20px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .distribution-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .distribution-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .distribution-total {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .distribution-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .distribution-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .distribution-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          width: 65px;
          flex-shrink: 0;
        }

        .distribution-bar-container {
          flex: 1;
          height: 12px;
          background: var(--bg);
          border-radius: 6px;
          overflow: hidden;
        }

        .distribution-bar {
          height: 100%;
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .distribution-value {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
          min-width: 55px;
          text-align: right;
        }

        .distribution-percent {
          font-weight: 400;
          color: var(--text-tertiary);
        }

        /* Workout Builder Modal */
        .workout-builder-modal {
          max-width: 480px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
        }

        .workout-builder-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .muscle-tag-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .muscle-tag-btn {
          padding: 6px 12px;
          font-size: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .muscle-tag-btn:hover {
          border-color: var(--accent);
        }

        .muscle-tag-btn.selected {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }

        .empty-exercises-mini {
          padding: 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
          background: var(--surface);
          border-radius: 8px;
          border: 1px dashed var(--border);
        }

        .workout-builder-exercises {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .builder-exercise-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .builder-exercise-item .exercise-info {
          flex: 1;
        }

        .builder-exercise-item .exercise-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          display: block;
          margin-bottom: 4px;
        }

        .builder-exercise-item .exercise-config {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 13px;
        }

        .mini-input {
          width: 40px;
          padding: 4px 6px;
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 13px;
          color: var(--text-primary);
          text-align: center;
        }

        .mini-input.sets {
          width: 44px;
        }

        .mini-input.reps-min,
        .mini-input.reps-max {
          width: 44px;
        }

        @media (min-width: 768px) {
          .mini-input.reps-min,
          .mini-input.reps-max {
            width: 56px;
            padding: 6px 8px;
            font-size: 14px;
          }
        }

        .mini-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .config-separator {
          color: var(--text-muted);
          font-size: 12px;
          flex-shrink: 0;
        }

        .config-label {
          color: var(--text-muted);
          font-size: 11px;
          margin-left: 2px;
        }

        .advanced-indicator {
          color: var(--accent);
          font-size: 12px;
        }

        .advanced-mode-toggle {
          margin-bottom: 8px;
        }

        .advanced-mode-toggle .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .advanced-mode-toggle input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
        }

        .advanced-mode-toggle .toggle-text {
          color: var(--text-primary);
          font-weight: 500;
        }

        .advanced-mode-toggle .toggle-hint {
          color: var(--text-muted);
          font-size: 11px;
        }

        .builder-exercise-item {
          flex-direction: column;
          align-items: stretch;
        }

        .builder-exercise-item .exercise-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .builder-exercise-item .exercise-info {
          flex: 1;
        }

        .builder-exercise-item .exercise-name {
          display: block;
          margin-bottom: 4px;
        }

        .per-set-config {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed var(--border);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .set-config-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-left: 8px;
        }

        .set-config-row .set-label {
          width: 50px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .remove-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
        }

        .remove-btn:hover {
          color: #ff6b6b;
        }

        /* Progression Options */
        .progression-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progression-option {
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .progression-option:hover {
          border-color: var(--accent);
          background: var(--surface-hover);
        }

        .progression-option.selected {
          border-color: var(--accent);
          background: var(--accent);
          box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
        }

        .progression-option.selected .progression-name,
        .progression-option.selected .progression-desc {
          color: white;
        }

        .progression-option .option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .progression-option .option-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .progression-option .option-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .progression-option.selected .option-check {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }

        .progression-option .option-description {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .progression-config {
          margin-top: 16px;
          padding: 16px;
          background: var(--surface-hover);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .progression-config h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .config-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .config-row label {
          font-size: 13px;
          color: var(--text-secondary);
          flex: 1;
        }

        .config-row input {
          width: 80px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px;
          font-size: 14px;
          color: var(--text-primary);
          text-align: center;
        }

        .config-row input:focus {
          outline: none;
          border-color: var(--accent);
        }

        /* Cycle Type Selector */
        .cycle-type-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .cycle-type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 12px;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }

        .cycle-type-btn:hover {
          border-color: var(--accent);
          background: var(--surface-hover);
        }

        .cycle-type-btn.selected {
          border-color: var(--accent);
          background: var(--accent);
        }

        .cycle-type-btn .cycle-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .cycle-type-btn .cycle-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .cycle-type-btn.selected .cycle-name {
          color: #000;
        }

        .cycle-type-btn .cycle-desc {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .cycle-type-btn.selected .cycle-desc {
          color: rgba(0, 0, 0, 0.7);
        }

        .microcycle-length {
          margin-top: 16px;
          padding: 16px;
          background: var(--surface-hover);
          border-radius: 10px;
        }

        .microcycle-length label {
          font-size: 13px;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 8px;
        }

        .length-selector {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .length-selector input[type="range"] {
          flex: 1;
          accent-color: var(--accent);
        }

        .length-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--accent);
          min-width: 60px;
        }

        /* Microcycle day label styling */
        .day-label.micro {
          width: 50px;
          font-size: 11px;
        }

        /* Per-exercise progression */
        .per-exercise-toggle {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--text-primary);
          cursor: pointer;
        }

        .toggle-label input[type="checkbox"] {
          accent-color: var(--accent);
          width: 18px;
          height: 18px;
        }

        .per-exercise-config {
          margin-top: 16px;
          background: var(--surface);
          border-radius: 8px;
          overflow: hidden;
        }

        .exercise-ranges-header {
          display: flex;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--surface-hover);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .exercise-range-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
        }

        .exercise-range-row:last-child {
          border-bottom: none;
        }

        .exercise-range-row .exercise-name {
          font-size: 13px;
          color: var(--text-primary);
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .range-inputs {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
        }

        .form-input.mini {
          width: 48px;
          padding: 6px;
          font-size: 13px;
          text-align: center;
        }

        @media (min-width: 768px) {
          .form-input.mini {
            width: 64px;
            padding: 8px 10px;
            font-size: 14px;
          }

          .range-inputs {
            gap: 10px;
          }
        }

        .form-input.tiny {
          width: 32px;
          padding: 4px;
          font-size: 12px;
          text-align: center;
        }

        /* Advanced mode toggle */
        .advanced-mode-toggle {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .advanced-toggle-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 12px;
          cursor: pointer;
          padding: 8px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .advanced-toggle-btn:hover {
          color: var(--accent);
        }

        .advanced-toggle-btn.expanded {
          color: var(--accent);
        }

        /* Per-set configuration */
        .per-set-config {
          margin-top: 12px;
          padding: 12px;
          background: rgba(255, 215, 0, 0.05);
          border-radius: 8px;
        }

        .config-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .exercise-sets-config {
          margin-bottom: 16px;
        }

        .exercise-sets-config:last-child {
          margin-bottom: 0;
        }

        .exercise-sets-header {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .sets-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .set-range-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 8px;
          background: var(--surface);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .set-label {
          color: var(--text-secondary);
          margin-right: 4px;
        }

        /* Review progression details */
        .review-progression-type {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .review-progression-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .review-progression-details span {
          font-size: 12px;
          color: var(--text-secondary);
          padding: 4px 10px;
          background: var(--surface-hover);
          border-radius: 12px;
        }

        .per-exercise-badge,
        .advanced-badge {
          background: rgba(255, 215, 0, 0.15) !important;
          color: var(--accent) !important;
        }

        /* Weight Configuration Section */
        .weight-config-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }

        .weight-config-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .weight-config-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .weight-config-list {
          background: var(--surface);
          border-radius: 8px;
          overflow: hidden;
        }

        .weight-config-header {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          padding: 10px 12px;
          background: var(--surface-hover);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .weight-config-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          padding: 12px;
          border-bottom: 1px solid var(--border);
          align-items: center;
        }

        .weight-config-row:last-child {
          border-bottom: none;
        }

        .weight-config-row .exercise-name {
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .weight-basis-selector {
          display: flex;
          gap: 2px;
          background: var(--bg-secondary);
          border-radius: 6px;
          padding: 2px;
        }

        .weight-basis-btn {
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .weight-basis-btn:hover {
          color: var(--text-secondary);
        }

        .weight-basis-btn.active {
          background: var(--accent);
          color: var(--bg-primary);
        }

        .weight-config-inputs {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 120px;
        }

        .weight-config-inputs .form-input {
          width: 60px;
          padding: 6px 8px;
          font-size: 13px;
          text-align: center;
        }

        .weight-config-inputs .unit {
          font-size: 12px;
          color: var(--text-muted);
        }

        .weight-config-inputs .pr-display {
          font-size: 12px;
          color: var(--text-secondary);
          padding: 6px 10px;
          background: var(--surface-hover);
          border-radius: 4px;
        }

        .weight-config-inputs .working-weight {
          font-size: 11px;
          color: var(--accent);
        }

        .percentage-input {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .percentage-input .form-input {
          width: 50px;
        }

        @media (max-width: 480px) {
          .weight-config-header {
            display: none;
          }

          .weight-config-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .weight-config-row .exercise-name {
            font-weight: 500;
          }

          .weight-basis-selector {
            justify-content: center;
          }

          .weight-config-inputs {
            justify-content: center;
          }
        }

        /* Review Section */
        .review-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
        }

        .review-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .review-name {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .review-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .review-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .review-schedule {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .review-day {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }

        .review-day:last-child {
          border-bottom: none;
        }

        .review-day .day-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          width: 100px;
        }

        .review-day .day-value {
          font-size: 14px;
          color: var(--text-primary);
        }

        .review-day .day-value.rest {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .review-progression {
          font-size: 14px;
          color: var(--text-primary);
        }

        /* Wizard Actions */
        .wizard-actions {
          display: flex;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .wizard-btn {
          flex: 1;
          padding: 14px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }

        .wizard-btn.secondary {
          background: var(--surface-hover);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .wizard-btn.secondary:hover {
          background: var(--surface-active);
        }

        .wizard-btn.primary {
          background: var(--accent);
          color: #000;
        }

        .wizard-btn.primary:hover {
          filter: brightness(1.1);
        }

        .wizard-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Active Program Dashboard */
        .active-program-widget {
          background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.15) 0%, var(--surface) 100%);
          border: 1px solid var(--accent);
          border-radius: 12px;
          padding: 16px;
          margin: 16px;
        }

        .active-program-widget.compact {
          padding: 12px;
        }

        .widget-header-compact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .widget-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .widget-icon {
          font-size: 1.5rem;
        }

        .widget-title-compact {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .widget-subtitle-compact {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .view-program-btn {
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--accent);
          cursor: pointer;
          white-space: nowrap;
        }

        .view-program-btn:hover {
          background: var(--surface);
          border-color: var(--accent);
        }

        .todays-session {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: 12px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
        }

        .todays-session:not(:disabled):hover {
          border-color: var(--accent);
          background: rgba(var(--accent-rgb), 0.1);
        }

        .todays-session.rest {
          cursor: default;
        }

        .todays-session.completed {
          opacity: 0.7;
          cursor: default;
        }

        .session-info {
          flex: 1;
        }

        .session-label {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .session-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .session-start {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
        }

        .session-done {
          font-size: 12px;
          color: var(--success, #4ECDC4);
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .widget-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .widget-program-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .widget-week {
          font-size: 13px;
          color: var(--text-secondary);
          background: var(--surface-hover);
          padding: 4px 10px;
          border-radius: 12px;
        }

        .widget-today {
          margin-bottom: 12px;
        }

        .widget-today-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .widget-today-workout {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .widget-today-rest {
          font-size: 16px;
          color: var(--text-tertiary);
          font-style: italic;
        }

        .widget-start-btn {
          width: 100%;
          padding: 12px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #000;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .widget-start-btn:hover {
          filter: brightness(1.1);
        }

        .widget-upcoming {
          margin-top: 12px;
        }

        .widget-upcoming-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .widget-workout-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .widget-workout-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: all 0.15s ease;
        }

        .widget-workout-item:hover:not(:disabled) {
          border-color: var(--accent);
          background: rgba(255, 215, 0, 0.05);
        }

        .widget-workout-item.today {
          border-color: var(--accent);
          border-width: 2px;
          background: rgba(255, 215, 0, 0.15);
          padding: 14px 14px;
          transform: scale(1.02);
        }

        .widget-workout-item.today .day-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
        }

        .widget-workout-item.today .workout-item-name {
          font-size: 16px;
          font-weight: 700;
        }

        .widget-workout-item.rest {
          opacity: 0.5;
          cursor: default;
        }

        .widget-workout-item.completed {
          opacity: 0.7;
          background: rgba(76, 175, 80, 0.1);
          border-color: rgba(76, 175, 80, 0.3);
          cursor: default;
        }

        .widget-workout-item.completed .workout-item-name {
          text-decoration: line-through;
          color: var(--text-secondary);
        }

        .completed-check {
          color: #4caf50;
          font-size: 16px;
          font-weight: bold;
          margin-right: 4px;
        }

        .widget-workout-item:disabled {
          cursor: default;
        }

        .workout-item-day {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 60px;
        }

        .workout-item-day .day-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .workout-item-day .today-badge {
          font-size: 9px;
          font-weight: 700;
          color: var(--accent);
          background: rgba(255, 215, 0, 0.2);
          padding: 2px 5px;
          border-radius: 4px;
        }

        .workout-item-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .workout-item-week {
          font-size: 10px;
          color: var(--text-tertiary);
          background: var(--surface-hover);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* ===== PROGRAMS TABS & LIBRARY ===== */
        /* Library Section Tabs (Exercises/Templates/Programs) */
        .library-tabs {
          display: flex;
          gap: 0;
          margin: 0 16px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 4px;
        }
        .library-tab {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: transparent;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .library-tab:hover {
          color: var(--text-primary);
        }
        .library-tab.active {
          background: var(--accent);
          color: #000;
        }

        .programs-tabs {
          display: flex;
          gap: 4px;
          margin: 0 16px 16px;
          background: var(--surface);
          border-radius: 10px;
          padding: 4px;
        }

        .programs-tab {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .programs-tab.active {
          background: var(--accent);
          color: #000;
        }

        .programs-tab:hover:not(.active) {
          background: var(--surface-hover);
        }

        .empty-action-btn {
          margin-top: 16px;
          padding: 12px 24px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          cursor: pointer;
        }

        .empty-action-btn:hover {
          filter: brightness(1.1);
        }

        .program-library {
          padding: 16px;
        }

        .library-intro {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 16px;
          text-align: center;
        }

        .library-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .library-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 12px;
        }

        .library-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .library-info {
          flex: 1;
          min-width: 0;
        }

        .library-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .library-author {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-bottom: 6px;
        }

        .library-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .library-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .library-tag {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 12px;
          background: var(--surface-hover);
          color: var(--text-secondary);
          text-transform: capitalize;
        }

        .library-tag.difficulty-beginner {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .library-tag.difficulty-intermediate {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .library-tag.difficulty-advanced {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .library-import-btn {
          flex-shrink: 0;
          align-self: center;
          padding: 10px 20px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .library-import-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .library-import-btn.imported {
          background: var(--surface-hover);
          color: var(--text-tertiary);
          cursor: default;
        }

        .library-import-btn:disabled {
          opacity: 0.7;
        }

        /* ===== ANALYTICS ===== */
        .analytics-view {
          /* No extra padding - view-content provides it */
        }

        .analytics-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          overflow: hidden;
        }

        .summary-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .summary-stats {
          display: flex;
          justify-content: space-evenly;
          align-items: center;
        }

        .summary-stat {
          text-align: center;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .summary-stat .stat-value {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
        }

        .summary-stat .stat-label {
          font-size: 8px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          white-space: nowrap;
        }

        .analytics-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .analytics-section .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .analytics-section .section-subtitle {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-bottom: 12px;
        }

        /* Volume Chart */
        .volume-chart-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .volume-chart {
          display: flex;
          align-items: flex-end;
          height: 100px;
          gap: 6px;
        }

        .chart-bar-container {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: flex-end;
        }

        .chart-bar {
          width: 100%;
          background: linear-gradient(180deg, var(--accent) 0%, rgba(var(--accent-rgb), 0.6) 100%);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          transition: height 0.3s ease;
        }

        .chart-labels {
          display: flex;
          gap: 6px;
        }

        .chart-label {
          flex: 1;
          font-size: 9px;
          color: var(--text-tertiary);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chart-legend {
          font-size: 11px;
          color: var(--text-tertiary);
          text-align: center;
          margin-top: 8px;
        }

        /* Muscle Distribution */
        .muscle-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .muscle-bar-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .muscle-name {
          font-size: 12px;
          color: var(--text-secondary);
          width: 80px;
          text-transform: capitalize;
        }

        .muscle-bar-container {
          flex: 1;
          height: 12px;
          background: var(--surface-hover);
          border-radius: 6px;
          overflow: hidden;
        }

        .muscle-bar {
          height: 100%;
          background: var(--accent);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .muscle-percent {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          width: 35px;
          text-align: right;
        }

        /* Strength Cards */
        .strength-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .strength-card {
          background: var(--surface-hover);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }

        .strength-name {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .strength-pr {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .strength-gain {
          font-size: 12px;
          color: #22c55e;
          font-weight: 600;
        }

        /* Progress Range Selector */
        .progress-range-selector {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .range-btn {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .range-btn:hover {
          border-color: var(--accent);
        }

        .range-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }

        .custom-date-picker {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .date-input {
          padding: 8px 12px;
          font-size: 13px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
        }

        .date-separator {
          color: var(--text-tertiary);
          font-size: 12px;
        }

        /* Enhanced Strength Cards */
        .strength-cards.expanded {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .strength-cards.expanded .strength-card {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          padding: 12px 14px;
        }

        .strength-tier {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          color: #000;
          flex-shrink: 0;
        }

        .strength-info {
          flex: 1;
          min-width: 0;
        }

        .strength-info .strength-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .strength-meta {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .strength-stats {
          text-align: right;
          flex-shrink: 0;
        }

        .strength-stats .strength-pr {
          font-size: 15px;
        }

        .strength-stats .strength-gain {
          font-size: 11px;
        }

        .show-all-btn {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
          font-size: 13px;
          font-weight: 500;
          background: transparent;
          border: 1px dashed var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .show-all-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        /* ===== EXERCISE LIBRARY VIEW ===== */
        .exercises-library-view {
          padding: 16px;
          padding-bottom: 100px;
        }

        .exercise-search-container {
          margin-bottom: 12px;
        }

        .exercise-search-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 16px;
          outline: none;
        }

        .exercise-search-input:focus {
          border-color: var(--accent);
        }

        .muscle-filter-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 12px;
          margin-bottom: 12px;
          -webkit-overflow-scrolling: touch;
        }

        .muscle-filter-btn {
          flex-shrink: 0;
          padding: 8px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .muscle-filter-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        /* Recently Used Section */
        .recently-used-section {
          margin-bottom: 16px;
          padding: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        .recently-used-header {
          margin-bottom: 10px;
        }
        .recently-used-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .recently-used-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .recently-used-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .recently-used-item:hover {
          border-color: var(--accent);
          background: var(--accent-glow);
        }
        .recently-used-name {
          font-size: 13px;
          color: var(--text);
        }
        .recently-used-pr {
          font-size: 11px;
          color: var(--gold);
          font-weight: 600;
        }

        .exercise-library-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .exercise-group {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .exercise-group-header {
          padding: 12px 16px;
          background: var(--surface-hover);
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border);
        }

        .exercise-count {
          color: var(--text-tertiary);
          font-weight: 400;
          font-size: 13px;
        }

        .exercise-library-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid var(--border-light);
        }

        .exercise-library-item:last-child {
          border-bottom: none;
        }

        .exercise-library-item:hover {
          background: var(--surface-hover);
        }

        .exercise-item-info {
          flex: 1;
        }

        .exercise-item-name {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .exercise-item-pr {
          font-size: 12px;
          color: var(--accent);
        }

        .exercise-item-arrow {
          color: var(--text-tertiary);
          font-size: 18px;
        }

        /* ===== EXERCISE DETAIL VIEW ===== */
        .exercise-detail-view {
          padding: 16px;
        }

        .exercise-info-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .exercise-muscle-group {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .muscle-icon {
          font-size: 24px;
        }

        .exercise-info-card .muscle-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          width: auto;
        }

        .equipment-badge {
          background: var(--surface-hover);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .exercise-info-card .tier-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .exercise-info-card .tier-1 {
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
          border: 1px solid rgba(255, 215, 0, 0.3);
        }

        .exercise-info-card .tier-2 {
          background: rgba(95, 191, 138, 0.2);
          color: #5fbf8a;
          border: 1px solid rgba(95, 191, 138, 0.3);
        }

        .exercise-info-card .tier-3 {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }

        .custom-badge {
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
          font-size: 10px;
          font-weight: 500;
          padding: 3px 6px;
          border-radius: 4px;
          margin-left: auto;
        }

        .edit-exercise-btn {
          background: transparent;
          border: none;
          font-size: 16px;
          padding: 4px 8px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .edit-exercise-btn:hover {
          opacity: 1;
        }

        .secondary-muscles {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        .secondary-label {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .secondary-muscle {
          background: rgba(var(--accent-rgb), 0.15);
          color: var(--accent);
          font-size: 11px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .exercise-stats-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .exercise-stats-card .card-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .stats-grid.stats-grid-3col {
          grid-template-columns: repeat(3, 1fr);
        }

        .stat-item {
          text-align: center;
          padding: 8px;
          background: var(--surface-hover);
          border-radius: 8px;
        }

        .stat-item .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--accent);
          display: block;
        }

        .stat-item .stat-label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        .last-workout {
          font-size: 12px;
          color: var(--text-tertiary);
          text-align: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .exercise-tips-card,
        .exercise-mistakes-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .exercise-tips-card .card-title,
        .exercise-mistakes-card .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .exercise-tips-card .title-icon {
          color: #22c55e;
          font-size: 16px;
        }

        .exercise-mistakes-card .title-icon {
          color: #f59e0b;
          font-size: 16px;
        }

        .tips-list,
        .mistakes-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tip-item,
        .mistake-item {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          padding: 8px 12px;
          background: var(--surface-hover);
          border-radius: 8px;
          position: relative;
          padding-left: 28px;
        }

        .tip-item::before {
          content: '✓';
          position: absolute;
          left: 10px;
          color: #22c55e;
          font-weight: 600;
        }

        .mistake-item::before {
          content: '✗';
          position: absolute;
          left: 10px;
          color: #f59e0b;
          font-weight: 600;
        }

        .start-exercise-btn {
          width: 100%;
          padding: 14px;
          background: var(--accent);
          color: white;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 8px;
        }

        .start-exercise-btn:active {
          transform: scale(0.98);
        }

        .add-to-workout-btn {
          width: 100%;
          padding: 14px;
          background: var(--success);
          color: white;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 8px;
        }

        .add-to-workout-btn:active {
          transform: scale(0.98);
        }

        /* ===== CLICKABLE MUSCLE BARS ===== */
        .muscle-bar-row.clickable {
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 6px 8px;
          margin: -6px -8px;
          border-radius: 8px;
        }

        .muscle-bar-row.clickable:hover {
          background: var(--surface-hover);
        }

        .muscle-arrow {
          font-size: 16px;
          color: var(--text-tertiary);
          margin-left: 4px;
        }

        /* ===== MUSCLE GROUP MODAL ===== */
        .muscle-group-modal {
          max-height: 70vh;
          display: flex;
          flex-direction: column;
        }

        .muscle-group-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .muscle-group-exercise {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--surface-hover);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .muscle-group-exercise:hover {
          background: var(--border);
        }

        .muscle-group-exercise.custom {
          border: 1px dashed var(--accent);
        }

        .muscle-group-exercise-info {
          flex: 1;
          min-width: 0;
        }

        .muscle-group-exercise-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .custom-badge {
          font-size: 10px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(var(--accent-rgb), 0.2);
          color: var(--accent);
        }

        .muscle-group-exercise-equipment {
          font-size: 12px;
          color: var(--text-tertiary);
          text-transform: capitalize;
        }

        .muscle-group-exercise-pr {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          white-space: nowrap;
        }

        .edit-muscle-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
        }

        .edit-muscle-btn:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .muscle-group-empty {
          text-align: center;
          padding: 24px;
          color: var(--text-tertiary);
          font-size: 13px;
        }

        .muscle-group-empty p {
          margin: 4px 0;
        }

        /* ===== SUBSTITUTE EXERCISE MODAL (Full Screen) ===== */
        .substitute-fullscreen {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(20, 20, 30, 0.95) 0%,
            rgba(30, 25, 40, 0.92) 50%,
            rgba(20, 20, 30, 0.95) 100%
          );
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          animation: slideInFromRight 0.25s ease-out;
          padding-top: env(safe-area-inset-top, 0px);
        }

        .substitute-fullscreen::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 50% at 50% 0%,
            rgba(255, 107, 107, 0.08) 0%,
            transparent 60%
          );
          pointer-events: none;
        }

        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .substitute-fullscreen-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .substitute-back-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--text-secondary);
        }

        .substitute-back-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }

        .substitute-header-text {
          flex: 1;
        }

        .substitute-header-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .substitute-header-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .substitute-fullscreen-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .substitute-fullscreen-search {
          position: sticky;
          top: 0;
          background: var(--bg-base);
          padding-bottom: 12px;
          z-index: 1;
        }

        .substitute-modal {
          width: 100%;
          max-width: 360px;
        }

        .substitute-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 16px 0;
        }

        .substitute-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .substitute-option:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent);
        }

        .substitute-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .substitute-info {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        .no-substitutes {
          padding: 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .substitute-section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin: 16px 0 8px 0;
        }

        .substitute-search-container {
          margin-bottom: 8px;
        }

        .substitute-search-input {
          width: 100%;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }

        .substitute-search-input:focus {
          border-color: var(--accent);
        }

        .substitute-search-input::placeholder {
          color: var(--text-muted);
        }

        .substitute-list.search-results {
          max-height: 200px;
          overflow-y: auto;
          margin-top: 0;
        }

        .substitute-no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .substitute-create-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 16px;
          background: rgba(95, 191, 138, 0.15);
          border: 1px dashed rgba(95, 191, 138, 0.4);
          border-radius: 10px;
          color: #5fbf8a;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 8px;
        }

        .substitute-create-btn:hover {
          background: rgba(95, 191, 138, 0.25);
          border-color: #5fbf8a;
        }

        .substitute-create-icon {
          font-size: 16px;
          font-weight: 700;
        }

        /* ===== EDIT EXERCISE MODAL ===== */
        .edit-exercise-modal {
          width: 100%;
          max-width: 360px;
        }

        .muscle-select-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }

        .muscle-select-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          background: var(--surface-hover);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .muscle-select-btn:hover {
          background: var(--border);
        }

        .muscle-select-btn.selected {
          border-color: var(--accent);
          background: rgba(var(--accent-rgb), 0.15);
        }

        .muscle-select-icon {
          font-size: 20px;
        }

        .muscle-select-name {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .muscle-select-btn.selected .muscle-select-name {
          color: var(--accent);
        }

        .tier-select-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }

        .tier-select-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--surface);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tier-select-btn:hover {
          background: var(--surface-hover);
          border-color: var(--tier-color, var(--border));
        }

        .tier-select-btn.selected {
          background: color-mix(in srgb, var(--tier-color, var(--accent)) 15%, transparent);
          border-color: var(--tier-color, var(--accent));
        }

        .tier-select-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          background: color-mix(in srgb, var(--tier-color, var(--accent)) 20%, transparent);
          color: var(--tier-color, var(--accent));
          min-width: 80px;
          text-align: center;
        }

        .tier-select-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .tier-select-btn.selected .tier-select-badge {
          background: var(--tier-color, var(--accent));
          color: #000;
        }

        .tier-select-btn.selected .tier-select-desc {
          color: var(--text-primary);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .modal-btn.secondary {
          flex: 1;
          background: var(--surface-hover);
          color: var(--text-secondary);
        }

        .modal-btn.primary {
          flex: 1;
          background: var(--accent);
          color: white;
        }

        /* ===== STRENGTH PROGRESS ===== */
        .strength-card.clickable {
          cursor: pointer;
          position: relative;
        }

        .strength-card.clickable:hover {
          background: var(--border);
        }

        .strength-arrow {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          color: var(--text-tertiary);
        }

        .strength-progress-modal {
          width: 100%;
          max-width: 400px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .time-range-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          padding: 4px;
          background: var(--surface-hover);
          border-radius: 8px;
        }

        .range-btn {
          flex: 1;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .range-btn.active {
          background: var(--accent);
          color: white;
        }

        .progress-stats {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .progress-stat {
          flex: 1;
          text-align: center;
          padding: 12px 8px;
          background: var(--surface-hover);
          border-radius: 8px;
        }

        .progress-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .progress-stat-value.positive {
          color: #22c55e;
        }

        .progress-stat-label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-top: 2px;
        }

        .progress-chart-container {
          margin-bottom: 16px;
        }

        .progress-chart {
          display: flex;
          align-items: flex-end;
          height: 140px;
          gap: 4px;
          padding: 8px 0;
        }

        .progress-bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .progress-bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--accent) 0%, rgba(var(--accent-rgb), 0.6) 100%);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          position: relative;
        }

        .progress-bar-label {
          font-size: 9px;
          font-weight: 600;
          color: white;
          padding: 2px;
          opacity: 0.9;
        }

        .progress-bar-date {
          font-size: 8px;
          color: var(--text-tertiary);
          margin-top: 4px;
          white-space: nowrap;
        }

        .chart-hint {
          font-size: 11px;
          color: var(--text-tertiary);
          text-align: center;
          margin-top: 8px;
        }

        .no-sessions {
          text-align: center;
          padding: 32px;
          color: var(--text-tertiary);
          font-size: 14px;
        }

        .no-sessions p {
          margin: 4px 0;
        }

        .sessions-list {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .sessions-list h4 {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .session-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }

        .session-row:last-child {
          border-bottom: none;
        }

        .session-date {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .session-stats {
          display: flex;
          gap: 12px;
        }

        .session-weight {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
        }

        .session-sets,
        .session-volume {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        /* ===== LIGHT MODE POLISH ===== */
        :global(html.light) .fitness-app {
          background: linear-gradient(180deg, var(--theme-bg-base) 0%, var(--theme-bg-elevated) 50%, var(--theme-bg-base) 100%);
        }
        :global(html.light) .fitness-app::before { display: none; }
        :global(html.light) .command-bar-inner {
          background: rgba(255,255,255,0.95);
          box-shadow: 0 -4px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05) inset;
        }
        :global(html.light) .suggestion:hover { background: var(--theme-bg-tertiary); }
        :global(html.light) .suggestion-icon { background: var(--theme-bg-elevated); border-color: var(--theme-border); }
        :global(html.light) .command-input {
          background: var(--theme-bg-base) !important;
          border-color: var(--theme-border) !important;
        }
        :global(html.light) .workout-card {
          background: var(--theme-bg-card);
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        :global(html.light) .exercise-card {
          background: var(--theme-bg-elevated);
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        :global(html.light) .set-badge {
          background: var(--theme-bg-tertiary);
          border-color: var(--theme-border);
        }
        :global(html.light) .pixel-particle { opacity: 0.3 !important; }
        :global(html.light) .milestone-card {
          background: var(--theme-bg-card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        :global(html.light) .set-panel {
          background: rgba(255,255,255,0.98);
          box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
        }
        :global(html.light) .set-input-wrapper input {
          background: var(--theme-bg-base) !important;
        }
        :global(html.light) .exercise-picker-modal {
          background: var(--theme-bg-elevated);
        }
        :global(html.light) .category-card {
          background: var(--theme-bg-card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        :global(html.light) .category-card:hover {
          background: var(--theme-bg-card-hover);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        :global(html.light) .hero-card {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        :global(html.light) .home-stat {
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .content-area {
            padding-top: calc(var(--content-top, 90px) + env(safe-area-inset-top, 0px));
            padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
          }
        }

        /* Mobile FAB and Command Bar - only visible on mobile */
        .mobile-fab-fitness,
        .mobile-command-bar {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-fab-fitness {
            display: block;
            position: fixed;
            bottom: max(24px, env(safe-area-inset-bottom, 24px));
            right: 20px;
            z-index: 100;
          }

          .fab-btn-fitness {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
            border: none;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 20px var(--accent-glow), 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
            font-size: 24px;
          }

          .fab-btn-fitness:active {
            transform: scale(0.95);
          }

          .fab-btn-fitness.fab-open {
            background: var(--bg-secondary);
            border: 2px solid var(--border);
            color: var(--text-tertiary);
            transform: rotate(45deg);
          }

          .fab-menu-fitness {
            position: absolute;
            bottom: 68px;
            right: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            animation: fab-fitness-in 0.2s ease;
          }

          @keyframes fab-fitness-in {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .fab-item-fitness {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 18px;
            min-height: 48px;
            background: var(--bg-secondary);
            border: 2px solid var(--border);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transition: all 0.15s ease;
          }

          .fab-item-fitness:active {
            transform: scale(0.98);
            background: var(--bg-tertiary);
          }

          .fab-item-fitness .fab-icon {
            font-size: 18px;
          }

          /* Mobile Command Bar */
          .mobile-command-bar {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 12px 16px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            z-index: 101;
            animation: mobile-bar-in 0.2s ease;
          }

          @keyframes mobile-bar-in {
            from {
              opacity: 0;
              transform: translateY(100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .mobile-command-inner {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .mobile-suggestions {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 200px;
            overflow-y: auto;
          }

          .mobile-suggestion {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .mobile-suggestion.selected {
            background: var(--accent);
            border-color: var(--accent);
          }

          .mobile-suggestion-icon {
            font-size: 16px;
          }

          .mobile-suggestion-title {
            font-size: 14px;
            color: var(--text-primary);
          }

          .mobile-input-row {
            display: flex;
            gap: 8px;
          }

          .mobile-command-input {
            flex: 1;
            padding: 14px 16px;
            background: var(--bg-primary);
            border: 2px solid var(--border);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 16px;
            font-family: inherit;
            outline: none;
          }

          .mobile-command-input:focus {
            border-color: var(--accent);
          }

          .mobile-command-input::placeholder {
            color: var(--text-tertiary);
          }

          .mobile-close-btn {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-tertiary);
            border: 2px solid var(--border);
            border-radius: 12px;
            color: var(--text-secondary);
            font-size: 18px;
            cursor: pointer;
          }

          .mobile-close-btn:active {
            background: var(--bg-primary);
          }

          /* Mobile Bottom Navigation */
          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            padding: 8px 0;
            padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
            z-index: 90;
            justify-content: space-around;
          }

          .mobile-nav-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 8px 16px;
            min-height: 48px;
            min-width: 48px;
            background: transparent;
            border: none;
            color: var(--text-tertiary);
            font-size: 10px;
            cursor: pointer;
            transition: color 0.15s;
          }

          .mobile-nav-btn.active {
            color: var(--accent);
          }

          .mobile-nav-btn:active {
            color: var(--accent);
          }

          .mobile-nav-icon {
            font-size: 20px;
          }

          .mobile-nav-label {
            font-weight: 500;
          }

          /* Adjust FAB position when bottom nav is present */
          .mobile-fab-fitness {
            bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>

      <div className={`fitness-app text-white ${modernThrash.variable}`} style={{ '--keyboard-height': `${keyboardHeight}px` } as React.CSSProperties}>
        {/* Hidden input to trigger keyboard before showing set panel */}
        <input
          ref={keyboardTriggerRef}
          type="number"
          inputMode="decimal"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            height: 0,
            width: 0,
            padding: 0,
            border: 'none',
            overflow: 'hidden',
          }}
        />
        <PixelParticles />
        {/* Main Content */}
        <main className="content-area" style={{ paddingTop: 'var(--content-top, 100px)' }}>

          {/* Workout View */}
          {store.currentView === 'workout' && store.currentWorkout && (
            <>
            {/* Floating Workout Stats */}
            {store.currentWorkout.exercises.length > 0 && (
              <div className="floating-workout-stats" role="status" aria-live="polite" aria-label="Workout statistics">
                <div className="workout-stat">
                  <span className="workout-stat-icon" aria-hidden="true">⏱</span>
                  <span className="workout-stat-value">{formatTime(store.workoutSeconds)}</span>
                </div>
                <div className="workout-stat">
                  <span className="workout-stat-icon">🏋️</span>
                  <span className="workout-stat-value">
                    {getWorkoutStats().volume >= 1000
                      ? `${(getWorkoutStats().volume / 1000).toFixed(1)}k`
                      : getWorkoutStats().volume} lbs
                  </span>
                </div>
                <div className="workout-stat">
                  <span className="workout-stat-icon">📊</span>
                  <span className="workout-stat-value">{getWorkoutStats().sets} sets</span>
                </div>
                <div
                  className="workout-stat xp-stat"
                  onClick={() => {
                    const stats = getWorkoutStats();
                    const breakdown = [
                      'XP Breakdown:',
                      `• Base: ${stats.sets} sets × 10 = ${stats.sets * 10} XP`,
                      `• Volume bonus: ${Math.floor(stats.volume / 1000)} × 5 = ${Math.floor(stats.volume / 1000) * 5} XP`,
                      stats.xp > stats.sets * 10 + Math.floor(stats.volume / 1000) * 5 ? '• PR bonus included!' : '',
                    ].filter(Boolean).join('\n');
                    alert(breakdown);
                  }}
                  title="Tap for XP breakdown"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="workout-stat-icon">✨</span>
                  <span className="workout-stat-value">{getWorkoutStats().xp} XP</span>
                </div>
              </div>
            )}
            <div className="exercises-container" ref={exerciseListRef}>
              {store.currentWorkout.exercises.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💪</div>
                  <div className="empty-title">Ready to lift?</div>
                  <div className="empty-subtitle">Search for an exercise below to start building your workout</div>
                </div>
              ) : (
                store.currentWorkout.exercises.map((exercise, idx) => {
                  const isInSuperset = !!exercise.supersetGroup;
                  const prevInSameSuperset = idx > 0 &&
                    store.currentWorkout!.exercises[idx - 1].supersetGroup === exercise.supersetGroup &&
                    exercise.supersetGroup;
                  const nextInSameSuperset = idx < store.currentWorkout!.exercises.length - 1 &&
                    store.currentWorkout!.exercises[idx + 1].supersetGroup === exercise.supersetGroup &&
                    exercise.supersetGroup;

                  // Get previous workout data for this exercise
                  const lastWorkoutEx = store.getLastWorkoutForExercise(exercise.id);
                  const progressionTarget = store.calculateProgressionTarget(exercise.id, (exercise as { _targetReps?: string })?._targetReps);

                  // EXPANDED INLINE EDITING VIEW
                  if (expandedExerciseIdx === idx) {
                    // Get prescribed sets count from template/program
                    const targetSets = (exercise as { _targetSets?: number })?._targetSets || 3;
                    const existingSets = exercise.sets.length;
                    // Show max of: existing sets, or prescribed sets (with at least 1 empty row for input)
                    const rowsToShow = Math.max(existingSets + 1, targetSets);

                    return (
                      <div key={exercise.id + idx} className="exercise-card-expanded">
                        {/* Header */}
                        <div className="exercise-card-header">
                          <div className="exercise-card-title">
                            <span>{exercise.name}</span>
                          </div>
                          <div className="exercise-card-actions">
                            <button
                              className="exercise-card-action-btn"
                              onClick={() => setShowSubstituteModal(true)}
                              title="Substitute"
                            >🔄</button>
                            <button
                              className="exercise-card-action-btn"
                              onClick={() => {
                                setChartExerciseId(exercise.id);
                                setShowProgressChart(true);
                              }}
                              title="Progress"
                            >📈</button>
                            <button
                              className="exercise-card-action-btn"
                              onClick={() => handleRemoveExercise(idx)}
                              title="Remove"
                              style={{ color: 'var(--error)' }}
                            >✕</button>
                          </div>
                        </div>

                        {/* Target Prescription */}
                        {progressionTarget && (progressionTarget.weight || progressionTarget.reps) && (
                          <div className="exercise-card-target">
                            <span className="target-label">Target:</span>
                            <span className="target-value">
                              {targetSets && `${targetSets} sets × `}
                              {progressionTarget.weight && `${progressionTarget.weight} lbs`}
                              {progressionTarget.weight && progressionTarget.reps && ' × '}
                              {progressionTarget.reps && `${progressionTarget.reps} reps`}
                            </span>
                          </div>
                        )}

                        {/* Exercise History Preview - last 3 sessions */}
                        {(() => {
                          const historyData = store.getExerciseProgressData(exercise.id).slice(-3).reverse();
                          if (historyData.length === 0) return null;
                          return (
                            <div className="exercise-history-preview">
                              <div className="history-preview-header">
                                <span className="history-preview-title">Recent Sessions</span>
                              </div>
                              <div className="history-preview-list">
                                {historyData.map((session, i) => (
                                  <div key={i} className="history-preview-item">
                                    <span className="history-preview-date">
                                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="history-preview-sets">
                                      {session.maxWeight} lbs × {Math.round(session.totalVolume / session.maxWeight)} reps
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Set Table */}
                        <div className="inline-set-table">
                          <div className="inline-set-header">
                            <span>PREV</span>
                            <span>SET</span>
                            <span>LBS</span>
                            <span>REPS</span>
                            <span>@RPE</span>
                            <span>W</span>
                            <span>✓</span>
                          </div>

                          {/* Render rows - completed sets + empty prescribed rows */}
                          {Array.from({ length: rowsToShow }).map((_, setIdx) => {
                            const existingSet = exercise.sets[setIdx];
                            const prevSet = lastWorkoutEx?.sets[setIdx];
                            const inputKey = `${exercise.id}-${setIdx}`;
                            const lastLoggedSet = exercise.sets[exercise.sets.length - 1];
                            const defaultWeight = progressionTarget?.weight || prevSet?.weight || lastLoggedSet?.weight || 135;
                            const defaultReps = parseInt(progressionTarget?.reps?.split('-')[0] || '') || prevSet?.reps || lastLoggedSet?.reps || 8;

                            // Completed set row
                            if (existingSet) {
                              return (
                                <div
                                  key={setIdx}
                                  className="inline-set-row completed swipeable"
                                  onTouchStart={(e) => {
                                    const touch = e.touches[0];
                                    (e.currentTarget as HTMLElement).dataset.startX = String(touch.clientX);
                                  }}
                                  onTouchMove={(e) => {
                                    const startX = parseFloat((e.currentTarget as HTMLElement).dataset.startX || '0');
                                    const currentX = e.touches[0].clientX;
                                    const diff = currentX - startX;
                                    if (diff > 0) {
                                      (e.currentTarget as HTMLElement).style.transform = `translateX(${Math.min(diff, 100)}px)`;
                                      (e.currentTarget as HTMLElement).style.opacity = String(1 - diff / 150);
                                    }
                                  }}
                                  onTouchEnd={(e) => {
                                    const startX = parseFloat((e.currentTarget as HTMLElement).dataset.startX || '0');
                                    const endX = e.changedTouches[0].clientX;
                                    const diff = endX - startX;
                                    if (diff > 80) {
                                      // Swipe right detected - remove set
                                      store.removeSet(idx, setIdx);
                                      store.showToast('Set removed');
                                    } else {
                                      (e.currentTarget as HTMLElement).style.transform = '';
                                      (e.currentTarget as HTMLElement).style.opacity = '';
                                    }
                                  }}
                                >
                                  <div className={`inline-prev ${prevSet ? '' : 'no-prev'}`}>
                                    {prevSet ? `${prevSet.weight}×${prevSet.reps}` : '—'}
                                  </div>
                                  <div className="inline-set-num">{setIdx + 1}</div>
                                  <div style={{ textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                    {existingSet.weight}
                                    {/* Progressive Overload Indicator */}
                                    {prevSet && existingSet.weight > prevSet.weight && (
                                      <span className={`overload-indicator ${existingSet.weight >= (store.records[exercise.id] || 0) ? 'pr' : 'up'}`}>
                                        {existingSet.weight >= (store.records[exercise.id] || 0) ? '🏆' : '↑'}
                                      </span>
                                    )}
                                    {prevSet && existingSet.weight < prevSet.weight && (
                                      <span className="overload-indicator down">↓</span>
                                    )}
                                  </div>
                                  <div style={{ textAlign: 'center', fontWeight: 600 }}>{existingSet.reps}</div>
                                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    {existingSet.rpe ? `@${existingSet.rpe}` : '—'}
                                  </div>
                                  <div style={{ textAlign: 'center', fontSize: 12, color: existingSet.isWarmup ? 'var(--accent)' : 'var(--text-quaternary)' }}>
                                    {existingSet.isWarmup ? 'W' : '—'}
                                  </div>
                                  <button
                                    className="inline-check-btn checked"
                                    onClick={() => {
                                      // Uncheck = remove this set
                                      store.removeSet(idx, setIdx);
                                      store.showToast('Set removed');
                                    }}
                                    title="Tap to remove set"
                                  >
                                    ✓
                                  </button>
                                </div>
                              );
                            }

                            // Empty row for input (prescribed or extra)
                            return (
                              <div key={setIdx} className="inline-set-row">
                                <div
                                  className={`inline-prev ${prevSet ? '' : 'no-prev'}`}
                                  onClick={() => {
                                    if (prevSet) {
                                      setInlineWeights(w => ({ ...w, [inputKey]: prevSet.weight }));
                                      setInlineReps(r => ({ ...r, [inputKey]: prevSet.reps }));
                                      store.showToast('Copied from last session');
                                    }
                                  }}
                                  title={prevSet ? 'Tap to copy' : ''}
                                >
                                  {prevSet ? `${prevSet.weight}×${prevSet.reps}` : '—'}
                                </div>
                                <div className="inline-set-num">{setIdx + 1}</div>
                                <input
                                  ref={setIdx === existingSets ? inlineWeightInputRef : undefined}
                                  type="number"
                                  inputMode="decimal"
                                  className={`inline-input ${inlineWeights[inputKey] ? 'filled' : ''}`}
                                  value={inlineWeights[inputKey] ?? ''}
                                  placeholder={String(defaultWeight)}
                                  onChange={(e) => setInlineWeights(w => ({ ...w, [inputKey]: Number(e.target.value) }))}
                                />
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  className={`inline-input ${inlineReps[inputKey] ? 'filled' : ''}`}
                                  value={inlineReps[inputKey] ?? ''}
                                  placeholder={String(defaultReps)}
                                  onChange={(e) => setInlineReps(r => ({ ...r, [inputKey]: Number(e.target.value) }))}
                                />
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  className={`inline-input inline-rpe ${inlineRpe[inputKey] ? 'filled' : ''}`}
                                  value={inlineRpe[inputKey] ?? ''}
                                  placeholder="—"
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  onChange={(e) => setInlineRpe(r => ({ ...r, [inputKey]: e.target.value ? Number(e.target.value) : null }))}
                                />
                                <label className="inline-warmup-check">
                                  <input
                                    type="checkbox"
                                    checked={inlineWarmup[inputKey] ?? false}
                                    onChange={(e) => setInlineWarmup(w => ({ ...w, [inputKey]: e.target.checked }))}
                                  />
                                  <span className="inline-warmup-indicator">W</span>
                                </label>
                                <button
                                  className="inline-check-btn"
                                  onClick={() => {
                                    const weight = inlineWeights[inputKey] || defaultWeight;
                                    const reps = inlineReps[inputKey] || defaultReps;
                                    const rpe = inlineRpe[inputKey] ?? undefined;
                                    const isWarmup = inlineWarmup[inputKey] ?? false;
                                    // Select this exercise and log the set
                                    store.selectExercise(idx);
                                    store.logSet(weight, reps, rpe, isWarmup);
                                    // Clear inputs for this row
                                    setInlineWeights(w => {
                                      const next = { ...w };
                                      delete next[inputKey];
                                      return next;
                                    });
                                    setInlineReps(r => {
                                      const next = { ...r };
                                      delete next[inputKey];
                                      return next;
                                    });
                                    setInlineRpe(r => {
                                      const next = { ...r };
                                      delete next[inputKey];
                                      return next;
                                    });
                                    setInlineWarmup(w => {
                                      const next = { ...w };
                                      delete next[inputKey];
                                      return next;
                                    });
                                  }}
                                >
                                  ✓
                                </button>
                              </div>
                            );
                          })}

                          {/* Add more sets button if all prescribed are filled */}
                          {existingSets >= targetSets && (
                            <div className="inline-add-row">
                              <button
                                className="inline-add-set"
                                onClick={() => {
                                  // Focus will shift to the new empty row automatically
                                }}
                              >
                                + Add Set
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Quick actions row */}
                        {exercise.sets.length > 0 && (
                          <div className="inline-quick-actions">
                            <button
                              className="inline-copy-last-btn"
                              onClick={() => {
                                const lastSet = exercise.sets[exercise.sets.length - 1];
                                if (lastSet) {
                                  store.selectExercise(idx);
                                  store.logSet(lastSet.weight, lastSet.reps, lastSet.rpe, lastSet.isWarmup);
                                  store.showToast(`Logged ${lastSet.weight}×${lastSet.reps}`);
                                }
                              }}
                            >
                              ↩ Copy Last ({exercise.sets[exercise.sets.length - 1].weight}×{exercise.sets[exercise.sets.length - 1].reps})
                            </button>
                          </div>
                        )}

                        {/* Workout Notes Field */}
                        <textarea
                          className="workout-note-input"
                          placeholder="Add notes for this exercise... (form cues, feelings, etc.)"
                          value={store.exerciseNotes?.[exercise.id] || ''}
                          onChange={(e) => store.setExerciseNote(exercise.id, e.target.value)}
                          rows={2}
                        />

                        {/* Collapse button */}
                        <button
                          className="inline-collapse-btn"
                          onClick={() => setExpandedExerciseIdx(null)}
                        >
                          ▲ Collapse
                        </button>
                      </div>
                    );
                  }

                  // COLLAPSED PILL VIEW (existing)
                  return (
                  <div key={exercise.id + idx} style={{ position: 'relative' }}>
                    {/* Superset Label - show for first exercise in superset */}
                    {isInSuperset && !prevInSameSuperset && (
                      <div className="superset-label">
                        🔗 Superset {exercise.supersetGroup}
                      </div>
                    )}
                    {/* Superset Connector Line */}
                    {isInSuperset && nextInSameSuperset && (
                      <div className="superset-connector" />
                    )}
                  <div
                    className={`exercise-pill ${idx === store.currentExerciseIndex ? 'active' : ''} ${isInSuperset ? 'superset' : ''} ${prevInSameSuperset ? 'superset-cont' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx));
                      e.currentTarget.classList.add('dragging');
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove('dragging');
                      document.querySelectorAll('.exercise-pill.drag-over').forEach(el => el.classList.remove('drag-over'));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('drag-over');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('drag-over');
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                      if (fromIdx !== idx) {
                        store.reorderExercises(fromIdx, idx);
                      }
                    }}
                    onClick={() => {
                      store.selectExercise(idx);
                      setExpandedExerciseIdx(idx); // Use inline editing instead of modal
                    }}
                  >
                    <div
                      className="drag-handle"
                      title="Drag to reorder"
                      onTouchStart={(e) => handleTouchDragStart(idx, e)}
                    >⋮⋮</div>
                    <div className="exercise-number">{idx + 1}</div>
                    <div className="exercise-info">
                      <div className="exercise-name">
                        {exercise.name}
                        {/* Show target prescription from program/template */}
                        {((exercise as { _targetReps?: string })._targetReps || (exercise as { _targetWeight?: number })._targetWeight) && (
                          <span className="exercise-target">
                            {(exercise as { _targetWeight?: number })._targetWeight && `${(exercise as { _targetWeight?: number })._targetWeight} lbs`}
                            {(exercise as { _targetWeight?: number })._targetWeight && (exercise as { _targetReps?: string })._targetReps && ' × '}
                            {(exercise as { _targetReps?: string })._targetReps && `${(exercise as { _targetReps?: string })._targetReps} reps`}
                          </span>
                        )}
                      </div>
                      <div className="exercise-sets">
                        {exercise.sets.length === 0 ? (
                          <button
                            className="inline-add-set-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              store.selectExercise(idx);
                              setExpandedExerciseIdx(idx);
                            }}
                          >
                            + Log Set
                          </button>
                        ) : (
                          <>
                            {exercise.sets.map((set, setIdx) => (
                              <span
                                key={setIdx}
                                className={`set-badge clickable ${set.isWarmup ? 'warmup' : ''} ${!set.isWarmup && set.weight >= (store.records[exercise.id] || 0) ? 'pr' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.selectExercise(idx);
                                  setExpandedExerciseIdx(idx);
                                }}
                              >
                                {set.isWarmup && <span className="warmup-indicator">W</span>}
                                {set.weight}×{set.reps}{set.rpe ? ` @${set.rpe}` : ''}
                              </span>
                            ))}
                            <button
                              className="inline-add-set-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                store.selectExercise(idx);
                                setExpandedExerciseIdx(idx);
                              }}
                            >
                              +
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isInSuperset && !prevInSameSuperset && (
                      <span className="superset-badge" title="Superset">SS</span>
                    )}
                    <button
                      className="exercise-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExercise(idx);
                      }}
                      title="Remove exercise"
                    >
                      ✕
                    </button>
                  </div>
                  </div>
                  );
                })
              )}
            </div>
            </>
          )}

          {/* Profile View */}
          {store.currentView === 'profile' && (
            <div className="view-content">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')} aria-label="Go back to home">←</button>
                <span className="view-title">Profile</span>
              </div>

              <div className="profile-hero">
                <div className="profile-level-ring">
                  <span className="profile-level-label">LEVEL</span>
                  <span className="profile-level-value">{unifiedProfile?.level ?? store.profile.level}</span>
                </div>
                <div className="profile-name">{store.profile.name}</div>
                <div className="profile-xp">
                  <span>{(unifiedProfile?.xp ?? store.profile.xp).toLocaleString()}</span> XP
                  {unifiedProfile && <span style={{ opacity: 0.6 }}> / {unifiedProfile.xpToNext}</span>}
                </div>
                {/* Offline/Sync Indicator */}
                <div className={`sync-indicator ${store.pendingSync ? 'syncing' : ''} ${!store.isOnline ? 'offline' : ''}`}>
                  <span className={`sync-icon ${store.pendingSync && store.isOnline ? 'spinning' : ''}`}>
                    {!store.isOnline ? '📴' : store.pendingSync ? '🔄' : '☁️'}
                  </span>
                  <span>
                    {!store.isOnline ? 'Offline' : store.pendingSync ? 'Syncing...' : 'Synced'}
                  </span>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{store.profile.totalWorkouts}</div>
                  <div className="stat-label">Workouts</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{store.profile.totalSets}</div>
                  <div className="stat-label">Total Sets</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{Math.floor(store.profile.totalVolume / 1000)}K</div>
                  <div className="stat-label">Volume</div>
                </div>
              </div>

              {/* Weekly/Monthly Summary */}
              {(() => {
                const stats = store.getSummaryStats(summaryPeriod);
                const formatDuration = (s: number) => s > 0 ? `${Math.floor(s / 60)} min` : '--';

                const handleShareSummary = async () => {
                  const periodLabel = summaryPeriod === 7 ? 'This Week' : 'This Month';
                  const text = `Reptura - ${periodLabel}

📊 ${stats.workouts} workouts
🏋️ ${stats.totalSets} sets
💪 ${Math.round(stats.totalVolume).toLocaleString()} lbs volume
⭐ ${stats.totalXP.toLocaleString()} XP earned
⏱️ ${formatDuration(stats.avgDuration)} avg workout

${stats.topExercises.length > 0 ? `Top exercises:\n${stats.topExercises.slice(0, 3).map(e => `• ${e.name} (${e.sets} sets)`).join('\n')}` : ''}

gamify.it.com/fitness`;

                  if (navigator.share) {
                    try { await navigator.share({ text }); } catch {}
                  } else {
                    await navigator.clipboard.writeText(text);
                    store.showToast('Summary copied!');
                  }
                };

                return (
                  <div className="summary-card">
                    <div className="summary-header">
                      <span className="summary-title">Summary</span>
                      <div className="summary-period-toggle">
                        <button
                          className={`period-btn ${summaryPeriod === 7 ? 'active' : ''}`}
                          onClick={() => setSummaryPeriod(7)}
                        >
                          Week
                        </button>
                        <button
                          className={`period-btn ${summaryPeriod === 30 ? 'active' : ''}`}
                          onClick={() => setSummaryPeriod(30)}
                        >
                          Month
                        </button>
                      </div>
                    </div>
                    <div className="summary-stats">
                      <div className="summary-stat">
                        <span className="summary-stat-value">{stats.workouts}</span>
                        <span className="summary-stat-label">Workouts</span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-stat-value">{stats.totalSets}</span>
                        <span className="summary-stat-label">Sets</span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-stat-value">{Math.round(stats.totalVolume / 1000)}K</span>
                        <span className="summary-stat-label">Volume</span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-stat-value">{stats.totalXP}</span>
                        <span className="summary-stat-label">XP</span>
                      </div>
                    </div>
                    {stats.topExercises.length > 0 && (
                      <div className="summary-top-exercises">
                        <span className="summary-top-label">Top exercises:</span>
                        {stats.topExercises.slice(0, 3).map((ex, i) => (
                          <span key={i} className="summary-top-exercise">
                            {ex.name} ({ex.sets})
                          </span>
                        ))}
                      </div>
                    )}
                    <button className="summary-share-btn" onClick={handleShareSummary}>
                      Share Summary
                    </button>
                  </div>
                );
              })()}

              <div className="section-title">Body Stats</div>
              <div className="body-stats-row" onClick={openBodyStatsEditor}>
                <div className="body-stat-card">
                  <div className="body-stat-icon">📏</div>
                  <div className="body-stat-content">
                    <div className="body-stat-label">Height</div>
                    <div className="body-stat-value">
                      {store.profile.height
                        ? `${Math.floor(store.profile.height / 12)}'${store.profile.height % 12}"`
                        : 'Tap to set'}
                    </div>
                  </div>
                </div>
                <div className="body-stat-card">
                  <div className="body-stat-icon">⚖️</div>
                  <div className="body-stat-content">
                    <div className="body-stat-label">Weight</div>
                    <div className="body-stat-value">
                      {store.profile.bodyWeight
                        ? `${store.profile.bodyWeight} lbs`
                        : 'Tap to set'}
                    </div>
                  </div>
                  {store.profile.weightHistory && store.profile.weightHistory.length > 1 && (
                    <div className="weight-trend">
                      {(() => {
                        const history = store.profile.weightHistory;
                        const latest = history[history.length - 1].weight;
                        const previous = history[history.length - 2].weight;
                        const diff = latest - previous;
                        if (diff > 0) return <span className="trend-up">+{diff.toFixed(1)}</span>;
                        if (diff < 0) return <span className="trend-down">{diff.toFixed(1)}</span>;
                        return <span className="trend-same">→</span>;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="section-title">
                Personal Records
                <button
                  className="section-action-btn"
                  onClick={() => store.recalculatePRsFromHistory()}
                  title="Recalculate PRs from workout history"
                >
                  🔄
                </button>
              </div>
              <div className="pr-grid">
                {Object.entries(store.records)
                  .filter(([id]) => EXERCISES.some(e => e.id === id) || store.customExercises.some(e => e.id === id))
                  .sort((a, b) => {
                    // Prioritize squat, bench, deadlift at the top
                    const priority = ['squat', 'bench', 'deadlift'];
                    const aIdx = priority.indexOf(a[0]);
                    const bIdx = priority.indexOf(b[0]);
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                    if (aIdx !== -1) return -1;
                    if (bIdx !== -1) return 1;
                    // Then sort by weight
                    return b[1] - a[1];
                  })
                  .slice(0, 12)
                  .map(([id, weight]) => {
                    const exercise = getExerciseById(id) || store.customExercises.find(e => e.id === id);
                    const meta = store.recordsMeta[id];
                    const progress = meta?.firstWeight ? weight - meta.firstWeight : 0;
                    const progressPercent = meta?.firstWeight ? Math.round((progress / meta.firstWeight) * 100) : 0;
                    const reps = meta?.reps || 1;

                    return (
                      <div
                        key={id}
                        className={`pr-card clickable ${meta?.imported ? 'imported' : ''}`}
                        onClick={() => {
                          setExerciseDetailId(id);
                          setExerciseDetailReturnView('profile');
                          store.setView('exercise-detail');
                        }}
                      >
                        <div className="pr-header">
                          <div className="pr-exercise">{exercise?.name || id}</div>
                          <div className="pr-actions">
                            <button
                              className="pr-edit-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newWeight = prompt(`Edit PR for ${exercise?.name || id}:`, String(weight));
                                if (newWeight && !isNaN(Number(newWeight))) {
                                  store.editPR(id, Number(newWeight));
                                }
                              }}
                              title="Edit PR"
                            >
                              ✏️
                            </button>
                            <button
                              className="pr-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete PR for ${exercise?.name || id}?`)) {
                                  store.deletePR(id);
                                }
                              }}
                              title="Delete PR"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="pr-weight">{weight} x {reps}</div>
                        <div className="pr-meta">
                          {meta?.date && !meta?.imported && (
                            <span className="pr-date">
                              {new Date(meta.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                            </span>
                          )}
                          {meta?.imported && <span className="pr-imported-badge">📥</span>}
                        </div>
                        {progress > 0 && (
                          <div className="pr-progress">
                            <span className="pr-progress-value">+{progress} lbs</span>
                            <span className="pr-progress-percent">(+{progressPercent}%)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Analytics Link */}
              <button
                className="profile-link-btn"
                onClick={() => store.setView('analytics')}
              >
                <span className="profile-link-icon">📊</span>
                <span className="profile-link-text">Analytics Dashboard</span>
                <span className="profile-link-arrow">›</span>
              </button>

              {/* Rival System Link */}
              <button
                className="profile-link-btn"
                onClick={() => setShowRivalSettings(true)}
              >
                <span className="profile-link-icon">⚔️</span>
                <span className="profile-link-text">Rival System</span>
                <span className="profile-link-arrow">›</span>
              </button>

              {/* Light Mode Toggle */}
              <button
                className="profile-link-btn theme-toggle"
                onClick={() => {
                  const newIsDark = !isDarkMode;
                  setIsDarkMode(newIsDark);
                  if (newIsDark) {
                    document.documentElement.classList.remove('light');
                    localStorage.setItem('reptura-theme', 'dark');
                  } else {
                    document.documentElement.classList.add('light');
                    localStorage.setItem('reptura-theme', 'light');
                  }
                }}
              >
                <span className="profile-link-icon">{isDarkMode ? '☀️' : '🌙'}</span>
                <span className="profile-link-text">{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                <span className="profile-link-arrow">›</span>
              </button>

              {/* Export Data */}
              <div className="section-title">Data</div>
              <button
                className="export-btn"
                onClick={() => {
                  const csv = store.exportWorkoutsCSV();
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `reptura-export-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  store.showToast('Workout history exported!');
                }}
              >
                📥 Export All Workouts (CSV)
              </button>
            </div>
          )}

          {/* History View */}
          {store.currentView === 'history' && (
            <div className="view-content">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')} aria-label="Go back to home">←</button>
                <span className="view-title">History</span>
                <div className="history-header-right">
                  <span className="history-count">{store.workouts.length} workouts</span>
                  <div className="history-view-toggle" role="group" aria-label="View type">
                    <button
                      className={`view-toggle-btn ${historyViewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setHistoryViewMode('list')}
                      title="List view"
                      aria-label="Show list view"
                      aria-pressed={historyViewMode === 'list'}
                    >
                      ☰
                    </button>
                    <button
                      className={`view-toggle-btn ${historyViewMode === 'calendar' ? 'active' : ''}`}
                      onClick={() => setHistoryViewMode('calendar')}
                      title="Calendar view"
                      aria-label="Show calendar heatmap view"
                      aria-pressed={historyViewMode === 'calendar'}
                    >
                      📅
                    </button>
                  </div>
                </div>
              </div>

              {/* History Filters */}
              {store.workouts.length > 0 && (
                <div className="history-filters">
                  {/* Search */}
                  <input
                    type="text"
                    className="history-search"
                    placeholder="Search exercises..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    aria-label="Search workout history by exercise name"
                  />

                  {/* Date Filter Tabs */}
                  <div className="history-date-tabs" role="group" aria-label="Filter by time period">
                    {(['all', '7d', '30d', '90d'] as const).map(period => (
                      <button
                        key={period}
                        className={`history-date-tab ${historyDateFilter === period ? 'active' : ''}`}
                        onClick={() => setHistoryDateFilter(period)}
                        aria-pressed={historyDateFilter === period}
                      >
                        {period === 'all' ? 'All' : period}
                      </button>
                    ))}
                  </div>

                  {/* Muscle Filter Chips */}
                  <div className="history-muscle-chips">
                    <button
                      className={`muscle-filter-chip ${historyMuscleFilter === null ? 'active' : ''}`}
                      onClick={() => setHistoryMuscleFilter(null)}
                    >
                      All
                    </button>
                    {['chest', 'back', 'shoulders', 'arms', 'legs', 'core'].map(muscle => (
                      <button
                        key={muscle}
                        className={`muscle-filter-chip ${historyMuscleFilter === muscle ? 'active' : ''}`}
                        onClick={() => setHistoryMuscleFilter(historyMuscleFilter === muscle ? null : muscle)}
                      >
                        {muscle}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {store.workouts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">No workouts yet</div>
                  <div className="empty-subtitle">Complete your first workout to see it here</div>
                </div>
              ) : historyViewMode === 'calendar' ? (
                /* Calendar Heatmap View */
                <div className="calendar-heatmap-container">
                  <div className="calendar-heatmap-header">
                    <span className="calendar-heatmap-title">Last 12 Weeks</span>
                    <div className="calendar-heatmap-legend">
                      <span className="legend-label">Less</span>
                      <span className="legend-cell" style={{ background: 'var(--bg-card)' }}></span>
                      <span className="legend-cell" style={{ background: 'rgba(255, 107, 107, 0.3)' }}></span>
                      <span className="legend-cell" style={{ background: 'rgba(255, 107, 107, 0.5)' }}></span>
                      <span className="legend-cell" style={{ background: 'rgba(255, 107, 107, 0.7)' }}></span>
                      <span className="legend-cell" style={{ background: 'var(--accent)' }}></span>
                      <span className="legend-label">More</span>
                    </div>
                  </div>
                  <div className="calendar-heatmap">
                    <div className="calendar-day-labels">
                      <span></span>
                      <span>Mon</span>
                      <span></span>
                      <span>Wed</span>
                      <span></span>
                      <span>Fri</span>
                      <span></span>
                    </div>
                    <div className="calendar-weeks">
                      {getCalendarHeatmapData().map((week, weekIdx) => (
                        <div key={weekIdx} className="calendar-week">
                          {week.map((day, dayIdx) => {
                            const intensity = day.count === 0 ? 0 :
                              day.count === 1 ? 1 :
                              day.count === 2 ? 2 :
                              day.count >= 3 ? 3 : 0;
                            const isToday = day.date.toDateString() === new Date().toDateString();
                            const isFuture = day.date > new Date();
                            return (
                              <div
                                key={dayIdx}
                                className={`calendar-day ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                                style={{
                                  background: isFuture ? 'transparent' :
                                    intensity === 0 ? 'var(--bg-card)' :
                                    intensity === 1 ? 'rgba(255, 107, 107, 0.3)' :
                                    intensity === 2 ? 'rgba(255, 107, 107, 0.6)' :
                                    'var(--accent)'
                                }}
                                title={`${day.date.toLocaleDateString()}: ${day.count} workout${day.count !== 1 ? 's' : ''}${day.volume ? ` (${Math.round(day.volume / 1000)}k lbs)` : ''}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="calendar-stats">
                    <div className="calendar-stat">
                      <span className="calendar-stat-value">
                        {store.workouts.filter(w => {
                          const date = new Date(w.startTime);
                          const cutoff = new Date();
                          cutoff.setDate(cutoff.getDate() - 84);
                          return date >= cutoff;
                        }).length}
                      </span>
                      <span className="calendar-stat-label">workouts</span>
                    </div>
                    <div className="calendar-stat">
                      <span className="calendar-stat-value">
                        {(() => {
                          const workouts = store.workouts.filter(w => {
                            const date = new Date(w.startTime);
                            const cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - 84);
                            return date >= cutoff;
                          });
                          const uniqueDays = new Set(workouts.map(w => new Date(w.startTime).toDateString()));
                          return uniqueDays.size;
                        })()}
                      </span>
                      <span className="calendar-stat-label">active days</span>
                    </div>
                    <div className="calendar-stat">
                      <span className="calendar-stat-value">
                        {Math.round(store.workouts.filter(w => {
                          const date = new Date(w.startTime);
                          const cutoff = new Date();
                          cutoff.setDate(cutoff.getDate() - 84);
                          return date >= cutoff;
                        }).length / 12 * 10) / 10}
                      </span>
                      <span className="calendar-stat-label">per week avg</span>
                    </div>
                  </div>
                </div>
              ) : (
                (() => {
                  // Apply filters
                  let filtered = store.workouts;

                  // Date filter
                  if (historyDateFilter !== 'all') {
                    const days = parseInt(historyDateFilter);
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - days);
                    filtered = filtered.filter(w => new Date(w.startTime) >= cutoff);
                  }

                  // Muscle filter
                  if (historyMuscleFilter) {
                    filtered = filtered.filter(w =>
                      w.exercises.some(ex => {
                        const exerciseData = getExerciseById(ex.id) || EXERCISES.find(e => e.name === ex.name);
                        return exerciseData?.muscle === historyMuscleFilter;
                      })
                    );
                  }

                  // Search filter
                  if (historySearchQuery.trim()) {
                    const query = historySearchQuery.toLowerCase();
                    filtered = filtered.filter(w =>
                      w.exercises.some(ex => ex.name.toLowerCase().includes(query))
                    );
                  }

                  const displayed = filtered.slice(0, historyShowCount);
                  const hasMore = filtered.length > historyShowCount;

                  if (filtered.length === 0) {
                    return (
                      <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <div className="empty-title">No matching workouts</div>
                        <div className="empty-subtitle">Try adjusting your filters</div>
                      </div>
                    );
                  }

                  return (
                    <>
                      {displayed.map(workout => {
                  // Get unique muscle groups from exercises
                  const muscleGroups = [...new Set(workout.exercises.map(ex => {
                    const exerciseData = getExerciseById(ex.id) || EXERCISES.find(e => e.name === ex.name);
                    return exerciseData?.muscle || 'other';
                  }))];
                  // Get exercise names (limit to first 4)
                  const exerciseNames = workout.exercises.slice(0, 4).map(ex => ex.name);
                  const moreCount = workout.exercises.length - 4;

                  return (
                    <div
                      key={workout.id}
                      className="workout-card"
                      onClick={() => store.showWorkoutDetail(workout.id)}
                    >
                      <div className="workout-card-header">
                        <div className="workout-date">{formatDate(workout.startTime)}</div>
                        {workout.autoCompleted && (
                          <span className="auto-complete-badge" title="Auto-completed due to inactivity">Auto</span>
                        )}
                      </div>
                      <div className="workout-summary">
                        {workout.exercises.length} exercises · {workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} sets
                        <span className="workout-xp"> · +{workout.totalXP} XP</span>
                      </div>
                      <div className="workout-exercises-list">
                        {exerciseNames.join(', ')}{moreCount > 0 ? ` +${moreCount} more` : ''}
                      </div>
                      <div className="workout-muscle-tags">
                        {muscleGroups.map(muscle => (
                          <span key={muscle} className="muscle-tag">{muscle}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                      {/* Load More Button */}
                      {hasMore && (
                        <button
                          className="load-more-btn"
                          onClick={() => setHistoryShowCount(prev => prev + 20)}
                        >
                          Load More ({filtered.length - historyShowCount} remaining)
                        </button>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          )}

          {/* Workout Detail View */}
          {store.currentView === 'workout-detail' && store.selectedWorkoutId && (
            <WorkoutDetailView
              workout={store.workouts.find(w => w.id === store.selectedWorkoutId)!}
              records={store.records}
              onBack={() => store.setView('history')}
              onRepeat={(workout) => {
                store.startWorkout();
                workout.exercises.forEach(ex => store.addExerciseToWorkout(ex.id));
              }}
              onEdit={(workoutId) => store.editWorkout(workoutId)}
              onDelete={(workoutId) => store.deleteWorkout(workoutId)}
              onUpdateTimes={(workoutId, startTime, endTime) => store.updateWorkoutTimes(workoutId, startTime, endTime)}
            />
          )}

          {/* Achievements View */}
          {store.currentView === 'achievements' && (
            <div className="view-content">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')} aria-label="Go back to home">←</button>
                <span className="view-title">Achievements</span>
              </div>

              {/* General Achievements */}
              {GENERAL_ACHIEVEMENTS.map(achievement => {
                const unlocked = store.achievements.includes(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <span className="achievement-icon">{achievement.icon}</span>
                    <div className="achievement-info">
                      <div className="achievement-name">{achievement.name}</div>
                      <div className="achievement-desc">
                        {achievement.description} · +{achievement.xp} XP
                      </div>
                    </div>
                    {unlocked && <span className="achievement-check">✓</span>}
                  </div>
                );
              })}

              {/* Milestone Achievements Section Title */}
              <div className="section-title" style={{ marginTop: '24px', marginBottom: '12px' }}>Strength Milestones</div>

              {/* Milestone Achievements */}
              {Object.entries(MILESTONES).flatMap(([exerciseId, milestones]) =>
                milestones.map(milestone => {
                  const key = `${exerciseId}_${milestone.weight}`;
                  const unlocked = store.achievements.includes(key);
                  const exercise = getExerciseById(exerciseId);
                  const currentPR = store.records[exerciseId] || 0;
                  const progressPercent = Math.min((currentPR / milestone.weight) * 100, 100);
                  const remaining = milestone.weight - currentPR;
                  return (
                    <div
                      key={key}
                      className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
                    >
                      <span className="achievement-icon">{milestone.icon}</span>
                      <div className="achievement-info">
                        <div className="achievement-name">{milestone.name}</div>
                        <div className="achievement-desc">
                          {exercise?.name} · {milestone.weight} lbs · +{milestone.xp} XP
                        </div>
                        {!unlocked && (
                          <div className="achievement-progress">
                            <div className="achievement-progress-bar">
                              <div
                                className="achievement-progress-fill"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <div className="achievement-progress-text">
                              {currentPR > 0
                                ? `${currentPR} / ${milestone.weight} lbs (${remaining} to go)`
                                : `0 / ${milestone.weight} lbs`
                              }
                            </div>
                          </div>
                        )}
                      </div>
                      {unlocked && <span className="achievement-check">✓</span>}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Campaigns View */}
          {store.currentView === 'campaigns' && (
            <div className="view-content">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')} aria-label="Go back to home">←</button>
                <span className="view-title">Campaigns</span>
              </div>

              <button
                className="create-btn"
                onClick={() => setCreatingCampaign(true)}
              >
                + New Campaign
              </button>

              {store.campaigns.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎯</div>
                  <div className="empty-title">No campaigns yet</div>
                  <div className="empty-subtitle">Create a campaign to set fitness goals with target dates</div>
                </div>
              ) : (
                <>
                  {store.campaigns.filter(c => !c.isCompleted).length > 0 && (
                    <>
                      <div className="section-title" style={{ marginTop: '20px' }}>Active</div>
                      {store.campaigns.filter(c => !c.isCompleted).map(campaign => {
                        const totalGoals = campaign.goals.length;
                        const achievedGoals = campaign.goals.filter(g => g.isAchieved).length;
                        const progress = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;
                        const daysLeft = Math.ceil((new Date(campaign.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                        return (
                          <div
                            key={campaign.id}
                            className="campaign-card"
                            onClick={() => setSelectedCampaignId(campaign.id)}
                          >
                            <div className="campaign-header">
                              <span className="campaign-title">{campaign.title}</span>
                              <span className={`campaign-badge ${daysLeft < 0 ? 'overdue' : ''}`}>
                                {daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}
                              </span>
                            </div>
                            <div className="campaign-progress">
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="progress-text">{achievedGoals}/{totalGoals} goals</span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Social View */}
          {store.currentView === 'social' && (
            <SocialView onBack={() => store.setView('home')} />
          )}

          {/* Coach View */}
          {store.currentView === 'coach' && (
            <CoachView onBack={() => store.setView('home')} />
          )}

          {/* Exercise Library View (part of Library section) */}
          {store.currentView === 'exercises' && (
            <div className="view-content exercises-library-view">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')} aria-label="Go back to home">←</button>
                <span className="view-title">Library</span>
              </div>

              {/* Library Section Tabs */}
              <div className="library-tabs">
                <button
                  className="library-tab active"
                  onClick={() => store.setView('exercises')}
                >
                  Exercises
                </button>
                <button
                  className="library-tab"
                  onClick={() => store.setView('templates')}
                >
                  Templates
                </button>
                <button
                  className="library-tab"
                  onClick={() => store.setView('programs')}
                >
                  Programs
                </button>
              </div>

              {/* Search */}
              <div className="exercise-search-container">
                <input
                  type="text"
                  className="exercise-search-input"
                  placeholder="Search exercises..."
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                />
              </div>

              {/* Muscle Group Filter */}
              <div className="muscle-filter-row">
                <button
                  className={`muscle-filter-btn ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </button>
                {MUSCLE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    className={`muscle-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>

              {/* Recently Used Section */}
              {!pickerSearchQuery && !selectedCategory && getRecentlyUsedExercises().length > 0 && (
                <div className="recently-used-section">
                  <div className="recently-used-header">
                    <span className="recently-used-title">Recently Used</span>
                  </div>
                  <div className="recently-used-list">
                    {getRecentlyUsedExercises().map(name => {
                      const exercise = EXERCISES.find(e => e.name === name) ||
                        store.customExercises.find(e => e.name === name);
                      if (!exercise) return null;
                      const pr = store.records[exercise.id];
                      return (
                        <div
                          key={exercise.id}
                          className="recently-used-item"
                          onClick={() => {
                            setSelectedExerciseId(exercise.id);
                            store.setView('exercise-detail');
                          }}
                        >
                          <span className="recently-used-name">{exercise.name}</span>
                          {pr && <span className="recently-used-pr">{pr} lbs</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Exercise List */}
              <div className="exercise-library-list">
                {(() => {
                  const allExercises = [...EXERCISES, ...store.customExercises.map(ce => ({
                    id: ce.id,
                    name: ce.name,
                    muscle: ce.muscle,
                    equipment: 'custom',
                    secondaryMuscles: [],
                    formTips: [],
                    commonMistakes: [],
                  }))];

                  const filteredExercises = allExercises.filter(ex => {
                    const matchesSearch = !pickerSearchQuery ||
                      ex.name.toLowerCase().includes(pickerSearchQuery.toLowerCase());
                    const matchesCategory = !selectedCategory || ex.muscle === selectedCategory;
                    return matchesSearch && matchesCategory;
                  });

                  // Group by muscle
                  const grouped: Record<string, typeof filteredExercises> = {};
                  filteredExercises.forEach(ex => {
                    if (!grouped[ex.muscle]) grouped[ex.muscle] = [];
                    grouped[ex.muscle].push(ex);
                  });

                  return Object.entries(grouped).map(([muscle, exercises]) => (
                    <div key={muscle} className="exercise-group">
                      <div className="exercise-group-header">
                        {MUSCLE_CATEGORIES.find(m => m.id === muscle)?.icon || '💪'} {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                        <span className="exercise-count">({exercises.length})</span>
                      </div>
                      {exercises.map(ex => {
                        const pr = store.records[ex.id];
                        const prMeta = store.recordsMeta[ex.id];
                        return (
                          <div
                            key={ex.id}
                            className="exercise-library-item"
                            onClick={() => {
                              setExerciseDetailId(ex.id);
                              setExerciseDetailReturnView('exercises');
                              store.setView('exercise-detail');
                            }}
                          >
                            <div className="exercise-item-info">
                              <div className="exercise-item-name">{ex.name}</div>
                              {pr && (
                                <div className="exercise-item-pr">PR: {pr} x {prMeta?.reps || 1}</div>
                              )}
                            </div>
                            <span className="exercise-item-arrow">›</span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Templates View (part of Library section) */}
          {store.currentView === 'templates' && (
            <div className="view-content">
              <div className="view-header">
                <span className="view-title">Library</span>
              </div>

              {/* Library Section Tabs */}
              <div className="library-tabs">
                <button
                  className="library-tab"
                  onClick={() => store.setView('exercises')}
                >
                  Exercises
                </button>
                <button
                  className="library-tab active"
                  onClick={() => store.setView('templates')}
                >
                  Templates
                </button>
                <button
                  className="library-tab"
                  onClick={() => store.setView('programs')}
                >
                  Programs
                </button>
              </div>

              <button
                className="create-btn"
                onClick={() => {
                  const id = store.createTemplate({
                    name: 'New Template',
                    exercises: [],
                  });
                  store.editTemplate(id);
                }}
              >
                + New Template
              </button>

              {store.templates.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">No templates yet</div>
                  <div className="empty-subtitle">Create a template to quickly start workouts</div>
                </div>
              ) : (
                <div className="template-list">
                  {store.templates.map(rawTemplate => {
                    const template = store.migrateTemplate(rawTemplate);
                    const exerciseCount = template.exercises.length;
                    const muscleGroups = [...new Set(
                      template.exercises.map(ex => {
                        const exercise = getExerciseById(ex.exerciseId);
                        return exercise?.muscle || 'Other';
                      })
                    )].slice(0, 3);

                    return (
                      <div key={template.id} className="template-card">
                        <div className="template-info">
                          <div className="template-name">
                            {template.isDefault && <span className="default-badge">Default</span>}
                            {template.name}
                          </div>
                          <div className="template-meta">
                            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                            {muscleGroups.length > 0 && ` • ${muscleGroups.join(', ')}`}
                          </div>
                          {template.description && (
                            <div className="template-description">{template.description}</div>
                          )}
                        </div>
                        <div className="template-actions">
                          <button
                            className="template-action-btn start"
                            onClick={() => store.startWorkoutFromTemplate(template.id)}
                          >
                            Start
                          </button>
                          <button
                            className="template-action-btn edit"
                            onClick={() => store.editTemplate(template.id)}
                          >
                            Edit
                          </button>
                          <button
                            className="template-action-btn duplicate"
                            onClick={() => store.duplicateTemplate(template.id)}
                            title="Duplicate"
                          >
                            ⧉
                          </button>
                          {!template.isDefault && (
                            <button
                              className="template-action-btn delete"
                              onClick={() => {
                                if (confirm('Delete this template?')) {
                                  store.deleteTemplate(template.id);
                                }
                              }}
                              title="Delete"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Template Editor View */}
          {store.currentView === 'template-editor' && store.editingTemplateId && (() => {
            const template = store.getTemplateById(store.editingTemplateId);
            if (!template) return null;

            return (
              <div className="view-content template-editor">
                <div className="view-header">
                  <button className="back-btn" onClick={() => store.editTemplate(null)}>←</button>
                  <input
                    type="text"
                    className="template-name-input"
                    value={template.name}
                    onChange={(e) => store.updateTemplate(template.id, { name: e.target.value })}
                    placeholder="Template name"
                  />
                </div>

                <div className="template-editor-section">
                  <label className="editor-label">Description (optional)</label>
                  <textarea
                    className="editor-textarea"
                    value={template.description || ''}
                    onChange={(e) => store.updateTemplate(template.id, { description: e.target.value })}
                    placeholder="Add a description..."
                    rows={2}
                  />
                </div>

                <div className="template-editor-section">
                  <div className="section-header">
                    <span className="editor-label">Exercises</span>
                    <span className="exercise-count">{template.exercises.length}</span>
                  </div>

                  {template.exercises.length === 0 ? (
                    <div className="empty-exercises">
                      <div className="empty-icon">🏋️</div>
                      <div>No exercises added yet</div>
                    </div>
                  ) : (
                    <div className="template-exercises">
                      {template.exercises.sort((a, b) => a.order - b.order).map((ex, idx) => (
                        <div key={`${ex.exerciseId}-${idx}`} className="template-exercise-item">
                          <div className="exercise-drag-handle">≡</div>
                          <div className="exercise-content">
                            <div className="exercise-name">{ex.exerciseName}</div>
                            <div className="exercise-targets">
                              <input
                                type="number"
                                className="target-input sets"
                                value={ex.targetSets}
                                onChange={(e) => {
                                  const newExercises = template.exercises.map((exercise, i) =>
                                    i === idx ? { ...exercise, targetSets: parseInt(e.target.value) || 1 } : exercise
                                  );
                                  store.updateTemplate(template.id, { exercises: newExercises });
                                }}
                                min={1}
                                max={20}
                              />
                              <span className="target-separator">×</span>
                              <input
                                type="text"
                                className="target-input reps"
                                value={ex.targetReps || ''}
                                onChange={(e) => {
                                  const newExercises = template.exercises.map((exercise, i) =>
                                    i === idx ? { ...exercise, targetReps: e.target.value } : exercise
                                  );
                                  store.updateTemplate(template.id, { exercises: newExercises });
                                }}
                                placeholder="8-12"
                              />
                              {ex.targetRpe && (
                                <span className="target-rpe">@RPE {ex.targetRpe}</span>
                              )}
                            </div>
                          </div>
                          <button
                            className="remove-exercise-btn"
                            onClick={() => {
                              const newExercises = template.exercises.filter((_, i) => i !== idx);
                              store.updateTemplate(template.id, { exercises: newExercises });
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="add-exercise-btn"
                    onClick={() => setAddingExerciseToTemplate(true)}
                  >
                    + Add Exercise
                  </button>
                </div>

                <div className="template-editor-actions">
                  <button
                    className="editor-btn primary"
                    onClick={() => store.startWorkoutFromTemplate(template.id)}
                  >
                    Start Workout
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Add Exercise to Template Modal */}
          {addingExerciseToTemplate && store.editingTemplateId && (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setAddingExerciseToTemplate(false)}>
              <div className="modal exercise-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">Add Exercise</div>
                <input
                  type="text"
                  className="exercise-search-input"
                  placeholder="Search exercises..."
                  value={exerciseSearchQuery}
                  onChange={(e) => setExerciseSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="exercise-list">
                  {[...EXERCISES, ...store.customExercises]
                    .filter(ex =>
                      ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
                      ex.muscle.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
                    )
                    .slice(0, 20)
                    .map(ex => (
                      <button
                        key={ex.id}
                        className="exercise-option"
                        onClick={() => {
                          const template = store.getTemplateById(store.editingTemplateId!);
                          if (template) {
                            const newExercise: TemplateExercise = {
                              exerciseId: ex.id,
                              exerciseName: ex.name,
                              order: template.exercises.length,
                              targetSets: 3,
                              targetReps: '8-12',
                            };
                            store.updateTemplate(template.id, {
                              exercises: [...template.exercises, newExercise]
                            });
                          }
                          setAddingExerciseToTemplate(false);
                          setExerciseSearchQuery('');
                        }}
                      >
                        <span className="exercise-name">{ex.name}</span>
                        <span className="exercise-muscle">{ex.muscle}</span>
                      </button>
                    ))
                  }
                  {/* Create custom exercise option */}
                  {exerciseSearchQuery.length > 1 && (
                    <button
                      className="exercise-option create-custom"
                      onClick={() => {
                        setCreatingCustomExercise({
                          name: exerciseSearchQuery.trim(),
                          muscle: 'other',
                          tier: 3,
                          context: 'template'
                        });
                      }}
                    >
                      <span className="exercise-name">✨ Create: &quot;{exerciseSearchQuery}&quot;</span>
                      <span className="exercise-muscle">Add custom exercise</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inline Workout Builder Modal (for Program Wizard) */}
          {creatingWorkoutForDay !== null && (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => {
              setCreatingWorkoutForDay(null);
              setEditingWorkoutTemplateId(null);
              setNewWorkoutName('');
              setNewWorkoutExercises([]);
              setNewWorkoutMuscleGroups([]);
              setShowWorkoutAdvancedMode(false);
            }}>
              <div className="modal workout-builder-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span>{editingWorkoutTemplateId ? 'Edit Workout' : 'Create Workout'}</span>
                  <button className="modal-close" onClick={() => {
                    setCreatingWorkoutForDay(null);
                    setEditingWorkoutTemplateId(null);
                    setNewWorkoutName('');
                    setNewWorkoutExercises([]);
                    setNewWorkoutMuscleGroups([]);
                    setShowWorkoutAdvancedMode(false);
                  }} aria-label="Close modal">✕</button>
                </div>

                <div className="workout-builder-content">
                  <div className="form-group">
                    <label>Workout Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newWorkoutName}
                      onChange={(e) => setNewWorkoutName(e.target.value)}
                      placeholder="e.g., Push Day, Upper Body"
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Body Parts (optional)</label>
                    <div className="muscle-tag-selector">
                      {MUSCLE_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          className={`muscle-tag-btn ${newWorkoutMuscleGroups.includes(cat.id) ? 'selected' : ''}`}
                          onClick={() => {
                            if (newWorkoutMuscleGroups.includes(cat.id)) {
                              setNewWorkoutMuscleGroups(newWorkoutMuscleGroups.filter(m => m !== cat.id));
                            } else {
                              setNewWorkoutMuscleGroups([...newWorkoutMuscleGroups, cat.id]);
                            }
                          }}
                        >
                          {cat.icon} {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="section-header">
                      <label>Exercises</label>
                      <span className="exercise-count">{newWorkoutExercises.length}</span>
                    </div>

                    {/* Advanced mode toggle */}
                    {newWorkoutExercises.length > 0 && (
                      <div className="advanced-mode-toggle">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            checked={showWorkoutAdvancedMode}
                            onChange={(e) => setShowWorkoutAdvancedMode(e.target.checked)}
                          />
                          <span className="toggle-text">Advanced Mode</span>
                          <span className="toggle-hint">(per-set rep ranges)</span>
                        </label>
                      </div>
                    )}

                    {newWorkoutExercises.length === 0 ? (
                      <div className="empty-exercises-mini">
                        <span>No exercises added yet</span>
                      </div>
                    ) : (
                      <div className="workout-builder-exercises">
                        {newWorkoutExercises.map((ex, idx) => (
                          <div key={`${ex.exerciseId}-${idx}`} className="builder-exercise-item">
                            <div className="exercise-row">
                              <div className="exercise-info">
                                <span className="exercise-name">{ex.exerciseName}</span>
                                <div className="exercise-config">
                                <input
                                  type="number"
                                  className="mini-input sets"
                                  value={ex.targetSets}
                                  onChange={(e) => {
                                    const newSets = parseInt(e.target.value) || 1;
                                    const updated = [...newWorkoutExercises];
                                    // Initialize per-set reps if advanced mode
                                    let perSetReps = ex.perSetReps;
                                    if (showWorkoutAdvancedMode) {
                                      perSetReps = Array.from({ length: newSets }, (_, i) =>
                                        ex.perSetReps?.[i] || { min: ex.minReps, max: ex.maxReps }
                                      );
                                    }
                                    updated[idx] = { ...ex, targetSets: newSets, perSetReps };
                                    setNewWorkoutExercises(updated);
                                  }}
                                  min={1}
                                  max={20}
                                />
                                <span className="config-separator">sets ×</span>
                                {!showWorkoutAdvancedMode ? (
                                  <>
                                    <input
                                      type="number"
                                      className="mini-input reps-min"
                                      value={ex.minReps}
                                      onChange={(e) => {
                                        const updated = [...newWorkoutExercises];
                                        updated[idx] = { ...ex, minReps: parseInt(e.target.value) || 1 };
                                        setNewWorkoutExercises(updated);
                                      }}
                                      min={1}
                                      max={50}
                                      title="Min reps"
                                    />
                                    <span className="config-separator">-</span>
                                    <input
                                      type="number"
                                      className="mini-input reps-max"
                                      value={ex.maxReps}
                                      onChange={(e) => {
                                        const updated = [...newWorkoutExercises];
                                        updated[idx] = { ...ex, maxReps: parseInt(e.target.value) || 1 };
                                        setNewWorkoutExercises(updated);
                                      }}
                                      min={1}
                                      max={50}
                                      title="Max reps"
                                    />
                                    <span className="config-label">reps</span>
                                  </>
                                ) : (
                                  <span className="advanced-indicator">per-set ▼</span>
                                )}
                                </div>
                              </div>
                              <button
                                className="remove-btn"
                                onClick={() => {
                                  setNewWorkoutExercises(newWorkoutExercises.filter((_, i) => i !== idx));
                                }}
                              >
                                ✕
                              </button>
                            </div>

                            {/* Per-set configuration in advanced mode */}
                            {showWorkoutAdvancedMode && (
                              <div className="per-set-config">
                                {Array.from({ length: ex.targetSets }, (_, setIdx) => {
                                  const setConfig = ex.perSetReps?.[setIdx] || { min: ex.minReps, max: ex.maxReps };
                                  return (
                                    <div key={setIdx} className="set-config-row">
                                      <span className="set-label">Set {setIdx + 1}:</span>
                                      <input
                                        type="number"
                                        className="mini-input reps-min"
                                        value={setConfig.min}
                                        onChange={(e) => {
                                          const updated = [...newWorkoutExercises];
                                          const perSetReps = [...(ex.perSetReps || Array.from({ length: ex.targetSets }, () => ({ min: ex.minReps, max: ex.maxReps })))];
                                          perSetReps[setIdx] = { ...perSetReps[setIdx], min: parseInt(e.target.value) || 1 };
                                          updated[idx] = { ...ex, perSetReps };
                                          setNewWorkoutExercises(updated);
                                        }}
                                        min={1}
                                        max={50}
                                      />
                                      <span>-</span>
                                      <input
                                        type="number"
                                        className="mini-input reps-max"
                                        value={setConfig.max}
                                        onChange={(e) => {
                                          const updated = [...newWorkoutExercises];
                                          const perSetReps = [...(ex.perSetReps || Array.from({ length: ex.targetSets }, () => ({ min: ex.minReps, max: ex.maxReps })))];
                                          perSetReps[setIdx] = { ...perSetReps[setIdx], max: parseInt(e.target.value) || 1 };
                                          updated[idx] = { ...ex, perSetReps };
                                          setNewWorkoutExercises(updated);
                                        }}
                                        min={1}
                                        max={50}
                                      />
                                      <span className="config-label">reps</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className="add-exercise-btn"
                      onClick={() => setAddingExerciseToNewWorkout(true)}
                    >
                      + Add Exercise
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    className="modal-btn secondary"
                    onClick={() => {
                      setCreatingWorkoutForDay(null);
                      setNewWorkoutName('');
                      setNewWorkoutExercises([]);
                      setNewWorkoutMuscleGroups([]);
                      setShowWorkoutAdvancedMode(false);
                    }}
                  >
                    Cancel
                  </button>
                  {editingWorkoutTemplateId ? (
                    // Edit mode - show Update and Save as New buttons
                    <>
                      <button
                        className="modal-btn"
                        disabled={!newWorkoutName.trim()}
                        onClick={() => {
                          // Save as new template
                          const templateId = store.createTemplate({
                            name: newWorkoutName.trim(),
                            exercises: newWorkoutExercises.map((ex, idx) => ({
                              exerciseId: ex.exerciseId,
                              exerciseName: ex.exerciseName,
                              order: idx,
                              targetSets: ex.targetSets,
                              targetReps: ex.minReps === ex.maxReps
                                ? `${ex.minReps}`
                                : `${ex.minReps}-${ex.maxReps}`,
                            })),
                            targetMuscleGroups: newWorkoutMuscleGroups,
                          });

                          // Update the program day to use new template
                          const weeks = store.programWizardData?.weeks || [];
                          const week1 = weeks[0] || { weekNumber: 1, days: [] };
                          const existingDay = week1.days.find(d => d.dayNumber === creatingWorkoutForDay);

                          const newDay: ProgramDay = {
                            dayNumber: creatingWorkoutForDay!,
                            name: existingDay?.name || newWorkoutName.trim(),
                            isRest: false,
                            templateId,
                          };

                          const updatedDays = week1.days.filter(d => d.dayNumber !== creatingWorkoutForDay);
                          updatedDays.push(newDay);
                          updatedDays.sort((a, b) => a.dayNumber - b.dayNumber);

                          const allWeeks: ProgramWeek[] = [];
                          for (let i = 1; i <= (store.programWizardData?.durationWeeks || 4); i++) {
                            allWeeks.push({
                              weekNumber: i,
                              days: updatedDays.map(d => ({ ...d })),
                              isDeload: i === (store.programWizardData?.durationWeeks || 4),
                            });
                          }
                          store.updateProgramWizardData({ weeks: allWeeks });

                          // Reset and close
                          setCreatingWorkoutForDay(null);
                          setEditingWorkoutTemplateId(null);
                          setNewWorkoutName('');
                          setNewWorkoutExercises([]);
                          setNewWorkoutMuscleGroups([]);
                          setShowWorkoutAdvancedMode(false);
                        }}
                      >
                        Save as New
                      </button>
                      <button
                        className="modal-btn primary"
                        disabled={!newWorkoutName.trim()}
                        onClick={() => {
                          // Update existing template
                          store.updateTemplate(editingWorkoutTemplateId, {
                            name: newWorkoutName.trim(),
                            exercises: newWorkoutExercises.map((ex, idx) => ({
                              exerciseId: ex.exerciseId,
                              exerciseName: ex.exerciseName,
                              order: idx,
                              targetSets: ex.targetSets,
                              targetReps: ex.minReps === ex.maxReps
                                ? `${ex.minReps}`
                                : `${ex.minReps}-${ex.maxReps}`,
                            })),
                            targetMuscleGroups: newWorkoutMuscleGroups,
                          });

                          store.showToast('Workout updated');

                          // Reset and close
                          setCreatingWorkoutForDay(null);
                          setEditingWorkoutTemplateId(null);
                          setNewWorkoutName('');
                          setNewWorkoutExercises([]);
                          setNewWorkoutMuscleGroups([]);
                          setShowWorkoutAdvancedMode(false);
                        }}
                      >
                        Update Existing
                      </button>
                    </>
                  ) : (
                    // Create mode - single create button
                    <button
                      className="modal-btn primary"
                      disabled={!newWorkoutName.trim()}
                      onClick={() => {
                        // Create the template - convert minReps/maxReps to targetReps string
                        const templateId = store.createTemplate({
                          name: newWorkoutName.trim(),
                          exercises: newWorkoutExercises.map((ex, idx) => ({
                            exerciseId: ex.exerciseId,
                            exerciseName: ex.exerciseName,
                            order: idx,
                            targetSets: ex.targetSets,
                            targetReps: ex.minReps === ex.maxReps
                              ? `${ex.minReps}`
                              : `${ex.minReps}-${ex.maxReps}`,
                          })),
                          targetMuscleGroups: newWorkoutMuscleGroups,
                        });

                        // Update the program day
                        const weeks = store.programWizardData?.weeks || [];
                        const week1 = weeks[0] || { weekNumber: 1, days: [] };
                        const existingDay = week1.days.find(d => d.dayNumber === creatingWorkoutForDay);

                        const newDay: ProgramDay = {
                          dayNumber: creatingWorkoutForDay!,
                          name: existingDay?.name || newWorkoutName.trim(),
                          isRest: false,
                          templateId,
                        };

                        const updatedDays = week1.days.filter(d => d.dayNumber !== creatingWorkoutForDay);
                        updatedDays.push(newDay);
                        updatedDays.sort((a, b) => a.dayNumber - b.dayNumber);

                        const allWeeks: ProgramWeek[] = [];
                        for (let i = 1; i <= (store.programWizardData?.durationWeeks || 4); i++) {
                          allWeeks.push({
                            weekNumber: i,
                            days: updatedDays.map(d => ({ ...d })),
                            isDeload: i === (store.programWizardData?.durationWeeks || 4),
                          });
                        }
                        store.updateProgramWizardData({ weeks: allWeeks });

                        // Reset and close
                        setCreatingWorkoutForDay(null);
                        setEditingWorkoutTemplateId(null);
                        setNewWorkoutName('');
                        setNewWorkoutExercises([]);
                        setNewWorkoutMuscleGroups([]);
                        setShowWorkoutAdvancedMode(false);
                      }}
                    >
                      Create Workout
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Exercise to New Workout Modal */}
          {addingExerciseToNewWorkout && (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setAddingExerciseToNewWorkout(false)}>
              <div className="modal exercise-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">Add Exercise</div>
                <input
                  type="text"
                  className="exercise-search-input"
                  placeholder="Search exercises..."
                  value={newWorkoutExerciseSearch}
                  onChange={(e) => setNewWorkoutExerciseSearch(e.target.value)}
                  autoFocus
                />
                <div className="exercise-list">
                  {[...EXERCISES, ...store.customExercises]
                    .filter(ex =>
                      ex.name.toLowerCase().includes(newWorkoutExerciseSearch.toLowerCase()) ||
                      ex.muscle.toLowerCase().includes(newWorkoutExerciseSearch.toLowerCase())
                    )
                    .slice(0, 20)
                    .map(ex => (
                      <button
                        key={ex.id}
                        className="exercise-option"
                        onClick={() => {
                          setNewWorkoutExercises([...newWorkoutExercises, {
                            exerciseId: ex.id,
                            exerciseName: ex.name,
                            targetSets: 3,
                            minReps: 8,
                            maxReps: 12,
                          }]);
                          setAddingExerciseToNewWorkout(false);
                          setNewWorkoutExerciseSearch('');
                        }}
                      >
                        <span className="exercise-name">{ex.name}</span>
                        <span className="exercise-muscle">{ex.muscle}</span>
                      </button>
                    ))
                  }
                  {/* Create custom exercise option */}
                  {newWorkoutExerciseSearch.length > 1 && (
                    <button
                      className="exercise-option create-custom"
                      onClick={() => {
                        setCreatingCustomExercise({
                          name: newWorkoutExerciseSearch.trim(),
                          muscle: 'other',
                          tier: 3,
                          context: 'program'
                        });
                      }}
                    >
                      <span className="exercise-name">✨ Create: &quot;{newWorkoutExerciseSearch}&quot;</span>
                      <span className="exercise-muscle">Add custom exercise</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Programs View (part of Library section) */}
          {store.currentView === 'programs' && (
            <div className="view-content">
              <div className="view-header">
                <span className="view-title">Library</span>
              </div>

              {/* Library Section Tabs */}
              <div className="library-tabs">
                <button
                  className="library-tab"
                  onClick={() => store.setView('exercises')}
                >
                  Exercises
                </button>
                <button
                  className="library-tab"
                  onClick={() => store.setView('templates')}
                >
                  Templates
                </button>
                <button
                  className="library-tab active"
                  onClick={() => store.setView('programs')}
                >
                  Programs
                </button>
              </div>

              {/* My Programs / Library Tabs */}
              <div className="programs-tabs">
                <button
                  className={`programs-tab ${programsTab === 'my' ? 'active' : ''}`}
                  onClick={() => setProgramsTab('my')}
                >
                  My Programs
                </button>
                <button
                  className={`programs-tab ${programsTab === 'library' ? 'active' : ''}`}
                  onClick={() => setProgramsTab('library')}
                >
                  Library
                </button>
              </div>

              {programsTab === 'my' ? (
                <>
                  <button
                    className="create-btn"
                    onClick={() => store.startProgramWizard()}
                  >
                    + New Program
                  </button>

                  {store.programs.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <div className="empty-title">No programs yet</div>
                      <div className="empty-subtitle">Create your own or import from the Library</div>
                      <button
                        className="empty-action-btn"
                        onClick={() => setProgramsTab('library')}
                      >
                        Browse Library →
                      </button>
                    </div>
                  ) : (
                    <div className="program-list">
                      {store.programs.map(program => {
                        const isActive = store.activeProgram?.programId === program.id;
                        const totalDays = program.durationWeeks * 7;
                        const completedDays = isActive && store.activeProgram
                          ? ((store.activeProgram.currentWeek - 1) * 7) + store.activeProgram.currentDay - 1
                          : 0;
                        const progress = Math.round((completedDays / totalDays) * 100);

                        return (
                          <div key={program.id} className={`program-card ${isActive ? 'active' : ''}`}>
                            <div className="program-info">
                              <div className="program-name">
                                {isActive && <span className="active-badge">Active</span>}
                                {program.name}
                              </div>
                              <div className="program-meta">
                                {program.durationWeeks} weeks • {program.difficulty} • {program.goal}
                              </div>
                              {isActive && store.activeProgram && (
                                <div className="program-progress">
                                  <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                                  </div>
                                  <span className="progress-text">
                                    Week {store.activeProgram.currentWeek}, Day {store.activeProgram.currentDay} • {progress}% complete
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="program-actions">
                              {isActive ? (
                                <>
                                  <button
                                    className="program-action-btn primary"
                                    onClick={() => store.startProgramWorkout()}
                                  >
                                    Today&apos;s Workout
                                  </button>
                                  <button
                                    className="program-action-btn"
                                    onClick={() => store.editProgram(program.id)}
                                    title="Edit program"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="program-action-btn"
                                    onClick={() => store.stopProgram()}
                                  >
                                    Stop
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="program-action-btn primary"
                                    onClick={() => store.startProgram(program.id)}
                                  >
                                    Start
                                  </button>
                                  <button
                                    className="program-action-btn"
                                    onClick={() => store.editProgram(program.id)}
                                    title="Edit program"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="program-action-btn"
                                    onClick={() => store.duplicateProgram(program.id)}
                                  >
                                    ⧉
                                  </button>
                                  <button
                                    className="program-action-btn danger"
                                    onClick={() => {
                                      if (confirm('Delete this program?')) {
                                        store.deleteProgram(program.id);
                                      }
                                    }}
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Library Tab */
                <div className="program-library">
                  <p className="library-intro">Popular training programs ready to use. One click to import.</p>
                  <div className="library-list">
                    {PREBUILT_PROGRAMS.map(prebuilt => {
                      const alreadyImported = store.programs.some(p => p.name === prebuilt.name);
                      return (
                        <div key={prebuilt.id} className="library-card">
                          <div className="library-icon">{prebuilt.icon}</div>
                          <div className="library-info">
                            <div className="library-name">{prebuilt.name}</div>
                            <div className="library-author">by {prebuilt.author}</div>
                            <div className="library-description">{prebuilt.description}</div>
                            <div className="library-meta">
                              <span className={`library-tag difficulty-${prebuilt.difficulty}`}>
                                {prebuilt.difficulty}
                              </span>
                              <span className="library-tag">{prebuilt.goal}</span>
                              <span className="library-tag">{prebuilt.daysPerWeek} days/wk</span>
                              <span className="library-tag">{prebuilt.durationWeeks} weeks</span>
                            </div>
                          </div>
                          <button
                            className={`library-import-btn ${alreadyImported ? 'imported' : ''}`}
                            onClick={() => {
                              if (!alreadyImported) {
                                store.importPrebuiltProgram(prebuilt.id);
                                setProgramsTab('my');
                              }
                            }}
                            disabled={alreadyImported}
                          >
                            {alreadyImported ? '✓ Imported' : 'Import'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Program Detail View - Full Schedule */}
          {store.currentView === 'program-detail' && store.activeProgram && (() => {
            const program = store.programs.find(p => p.id === store.activeProgram?.programId);
            if (!program) return null;

            const completedWorkouts = store.activeProgram.completedWorkouts || [];
            const currentWeek = store.activeProgram.currentWeek;
            const currentDay = store.activeProgram.currentDay;
            const totalDays = program.durationWeeks * (program.cycleLengthDays || 7);
            const completedDays = ((currentWeek - 1) * (program.cycleLengthDays || 7)) + currentDay - 1;
            const progress = Math.round((completedDays / totalDays) * 100);
            const isMicrocycle = program.cycleType === 'microcycle';
            const cycleLabel = isMicrocycle ? 'Microcycle' : 'Week';

            return (
              <div className="view-content program-detail-view">
                <div className="view-header">
                  <button className="back-btn" onClick={() => store.setView('home')} aria-label="Go back to home">←</button>
                  <span className="view-title">{program.name}</span>
                </div>

                {/* Progress Summary */}
                <div className="program-detail-summary">
                  <div className="summary-row">
                    <span className="summary-label">Progress</span>
                    <span className="summary-value">{cycleLabel} {currentWeek}, Day {currentDay}</span>
                  </div>
                  <div className="program-progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="summary-meta">{progress}% complete • {program.durationWeeks} {isMicrocycle ? 'microcycles' : 'weeks'} total</div>
                </div>

                {/* Week-by-Week Schedule */}
                <div className="program-schedule">
                  {program.weeks.map((week, weekIdx) => {
                    const isCurrentWeek = week.weekNumber === currentWeek;
                    const isPastWeek = week.weekNumber < currentWeek;

                    return (
                      <div key={week.weekNumber} className={`program-week ${isCurrentWeek ? 'current' : ''} ${isPastWeek ? 'past' : ''}`}>
                        <div className="week-header">
                          <span className="week-label">{cycleLabel} {week.weekNumber}</span>
                          {isCurrentWeek && <span className="current-badge">Current</span>}
                          {isPastWeek && <span className="completed-badge">✓</span>}
                        </div>
                        <div className="week-days">
                          {week.days.map((day) => {
                            const template = day.templateId ? store.getTemplateById(day.templateId) : null;
                            const workoutKey = `${week.weekNumber}-${day.dayNumber}`;
                            const isCompleted = completedWorkouts.includes(workoutKey);
                            const isToday = isCurrentWeek && day.dayNumber === currentDay;
                            const canStart = !day.isRest && template && !isCompleted;

                            return (
                              <div
                                key={day.dayNumber}
                                className={`day-card ${day.isRest ? 'rest' : ''} ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}`}
                              >
                                <div className="day-number">Day {day.dayNumber}</div>
                                <div className="day-name">
                                  {isCompleted && <span className="check">✓ </span>}
                                  {day.isRest ? '😴 Rest' : (template?.name || day.name)}
                                </div>
                                {isToday && !isCompleted && <div className="today-label">Today</div>}
                                {canStart && (
                                  <div className="day-actions">
                                    <button
                                      className="day-action-btn start"
                                      onClick={() => store.startProgramWorkoutForDay(week.weekNumber, day.dayNumber)}
                                    >
                                      Start
                                    </button>
                                    <button
                                      className="day-action-btn skip"
                                      onClick={() => {
                                        if (confirm('Skip this workout?')) {
                                          store.skipProgramWorkout(week.weekNumber, day.dayNumber);
                                        }
                                      }}
                                    >
                                      Skip
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="program-detail-actions">
                  <button
                    className="action-btn secondary"
                    onClick={() => store.setView('programs')}
                  >
                    All Programs
                  </button>
                  <button
                    className="action-btn danger"
                    onClick={() => {
                      if (confirm('Stop this program? Your progress will be saved.')) {
                        store.stopProgram();
                        store.setView('home');
                      }
                    }}
                  >
                    Stop Program
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Analytics View */}
          {store.currentView === 'analytics' && (() => {
            const volumeByWeek = store.getVolumeByWeek(8);
            const volumeByMuscle = store.getVolumeByMuscle();
            const weeklySummary = store.getWeeklySummary();
            const monthlySummary = store.getMonthlySummary();
            const maxVolume = Math.max(...volumeByWeek.map(w => w.volume), 1);

            // Get top 4 exercises by volume for strength progress
            const exerciseVolume: Record<string, number> = {};
            store.workouts.forEach(w => {
              w.exercises.forEach(ex => {
                ex.sets.forEach(s => {
                  if (!s.isWarmup) {
                    exerciseVolume[ex.id] = (exerciseVolume[ex.id] || 0) + s.weight * s.reps;
                  }
                });
              });
            });
            const topExercises = Object.entries(exerciseVolume)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([id]) => id);

            return (
              <div className="view-content analytics-view">
                <div className="view-header">
                  <button className="back-btn" onClick={() => store.setView('home')} aria-label="Go back to home">←</button>
                  <span className="view-title">Analytics</span>
                </div>

                {/* Summary Cards */}
                <div className="analytics-summary">
                  <div className="summary-card">
                    <div className="summary-label">This Week</div>
                    <div className="summary-stats">
                      <div className="summary-stat">
                        <span className="stat-value">{weeklySummary.workouts}</span>
                        <span className="stat-label">Workouts</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-value">{weeklySummary.sets}</span>
                        <span className="stat-label">Sets</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-value">{(weeklySummary.volume / 1000).toFixed(1)}k</span>
                        <span className="stat-label">Volume</span>
                      </div>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-label">This Month</div>
                    <div className="summary-stats">
                      <div className="summary-stat">
                        <span className="stat-value">{monthlySummary.workouts}</span>
                        <span className="stat-label">Workouts</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-value">{monthlySummary.sets}</span>
                        <span className="stat-label">Sets</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-value">{(monthlySummary.volume / 1000).toFixed(1)}k</span>
                        <span className="stat-label">Volume</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volume Chart */}
                <div className="analytics-section">
                  <h3 className="section-title">Volume Trend</h3>
                  <div className="volume-chart-wrapper">
                    <div className="volume-chart">
                      {volumeByWeek.map((week, idx) => (
                        <div key={idx} className="chart-bar-container">
                          <div
                            className="chart-bar"
                            style={{ height: `${(week.volume / maxVolume) * 100}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="chart-labels">
                      {volumeByWeek.map((week, idx) => (
                        <div key={idx} className="chart-label">{week.week}</div>
                      ))}
                    </div>
                  </div>
                  <div className="chart-legend">Volume (lbs) over last 8 weeks</div>
                </div>

                {/* Muscle Distribution */}
                <div className="analytics-section">
                  <h3 className="section-title">Muscle Distribution</h3>
                  <p className="section-subtitle">Last 30 days · Tap to view exercises</p>
                  <div className="muscle-bars">
                    {volumeByMuscle.slice(0, 8).map(({ muscle, percentage }) => (
                      <div
                        key={muscle}
                        className="muscle-bar-row clickable"
                        onClick={() => setViewingMuscleGroup(muscle.toLowerCase())}
                      >
                        <div className="muscle-name">{muscle}</div>
                        <div className="muscle-bar-container">
                          <div
                            className="muscle-bar"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="muscle-percent">{percentage}%</div>
                        <div className="muscle-arrow">›</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strength Progress */}
                {(() => {
                  // Calculate date range filter
                  const now = new Date();
                  let startDate: Date | null = null;
                  let endDate: Date = now;

                  if (analyticsProgressRange === 'ytd') {
                    startDate = new Date(now.getFullYear(), 0, 1);
                  } else if (analyticsProgressRange === '90d') {
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                  } else if (analyticsProgressRange === '365d') {
                    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                  } else if (analyticsProgressRange === 'custom' && analyticsCustomDateStart) {
                    startDate = new Date(analyticsCustomDateStart);
                    if (analyticsCustomDateEnd) endDate = new Date(analyticsCustomDateEnd);
                  }

                  // Filter workouts by date range
                  const filteredWorkouts = store.workouts.filter(w => {
                    const workoutDate = new Date(w.startTime);
                    if (startDate && workoutDate < startDate) return false;
                    if (workoutDate > endDate) return false;
                    return true;
                  });

                  // Calculate exercise frequency and volume within range
                  const exerciseStats: Record<string, { frequency: number; volume: number }> = {};
                  filteredWorkouts.forEach(w => {
                    w.exercises.forEach(ex => {
                      if (!exerciseStats[ex.id]) {
                        exerciseStats[ex.id] = { frequency: 0, volume: 0 };
                      }
                      exerciseStats[ex.id].frequency++;
                      ex.sets.forEach(s => {
                        if (!s.isWarmup) {
                          exerciseStats[ex.id].volume += s.weight * s.reps;
                        }
                      });
                    });
                  });

                  // Sort by tier first, then by frequency within tier
                  const sortedExercises = Object.entries(exerciseStats)
                    .map(([id, stats]) => ({
                      id,
                      tier: getExerciseTier(id, store.customExercises),
                      ...stats
                    }))
                    .sort((a, b) => {
                      if (a.tier !== b.tier) return a.tier - b.tier;
                      return b.frequency - a.frequency;
                    });

                  const displayExercises = analyticsShowAllExercises
                    ? sortedExercises
                    : sortedExercises.slice(0, 6);

                  const tierLabels: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };
                  const tierColors: Record<number, string> = { 1: '#FFD700', 2: '#5fbf8a', 3: '#6b7280' };

                  return sortedExercises.length > 0 && (
                    <div className="analytics-section">
                      <div className="section-header-row">
                        <div>
                          <h3 className="section-title">Strength Progress</h3>
                          <p className="section-subtitle">Sorted by tier, then frequency</p>
                        </div>
                      </div>

                      {/* Time Range Selector */}
                      <div className="progress-range-selector">
                        {[
                          { value: 'ytd', label: `${now.getFullYear()}` },
                          { value: '90d', label: '90 Days' },
                          { value: '365d', label: '365 Days' },
                          { value: 'all', label: 'All Time' },
                          { value: 'custom', label: 'Custom' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            className={`range-btn ${analyticsProgressRange === opt.value ? 'active' : ''}`}
                            onClick={() => setAnalyticsProgressRange(opt.value as typeof analyticsProgressRange)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Date Picker */}
                      {analyticsProgressRange === 'custom' && (
                        <div className="custom-date-picker">
                          <input
                            type="date"
                            value={analyticsCustomDateStart}
                            onChange={(e) => setAnalyticsCustomDateStart(e.target.value)}
                            className="date-input"
                          />
                          <span className="date-separator">to</span>
                          <input
                            type="date"
                            value={analyticsCustomDateEnd}
                            onChange={(e) => setAnalyticsCustomDateEnd(e.target.value)}
                            className="date-input"
                          />
                        </div>
                      )}

                      <div className="strength-cards expanded">
                        {displayExercises.map(({ id: exId, tier, frequency }) => {
                          const exercise = EXERCISES.find(e => e.id === exId) || store.customExercises.find(e => e.id === exId);

                          // Calculate improvement within the selected time range
                          // Find all sets for this exercise within the filtered workouts
                          const exerciseSets: { weight: number; date: Date }[] = [];
                          filteredWorkouts.forEach(w => {
                            const ex = w.exercises.find(e => e.id === exId);
                            if (ex) {
                              ex.sets.forEach(s => {
                                if (!s.isWarmup && s.weight > 0) {
                                  exerciseSets.push({ weight: s.weight, date: new Date(w.startTime) });
                                }
                              });
                            }
                          });

                          // Sort by date to find first and best in range
                          exerciseSets.sort((a, b) => a.date.getTime() - b.date.getTime());
                          const firstWeightInRange = exerciseSets[0]?.weight || 0;
                          const bestWeightInRange = Math.max(...exerciseSets.map(s => s.weight), 0);
                          const improvement = bestWeightInRange - firstWeightInRange;

                          return (
                            <div
                              key={exId}
                              className="strength-card clickable"
                              onClick={() => setStrengthProgressExercise(exId)}
                            >
                              <div className="strength-tier" style={{ backgroundColor: tierColors[tier] }}>
                                {tierLabels[tier]}
                              </div>
                              <div className="strength-info">
                                <div className="strength-name">{exercise?.name || exId}</div>
                                <div className="strength-meta">{frequency} sessions</div>
                              </div>
                              <div className="strength-stats">
                                <div className="strength-pr">{bestWeightInRange} lbs</div>
                                {improvement > 0 && (
                                  <div className="strength-gain">+{improvement} lbs</div>
                                )}
                              </div>
                              <div className="strength-arrow">›</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Show All / Show Less Toggle */}
                      {sortedExercises.length > 6 && (
                        <button
                          className="show-all-btn"
                          onClick={() => setAnalyticsShowAllExercises(!analyticsShowAllExercises)}
                        >
                          {analyticsShowAllExercises
                            ? `Show Less`
                            : `Show All ${sortedExercises.length} Exercises`}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {volumeByWeek.every(w => w.volume === 0) && (
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <div className="empty-title">No data yet</div>
                    <div className="empty-subtitle">Complete some workouts to see your analytics</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Exercise Detail View */}
          {store.currentView === 'exercise-detail' && exerciseDetailId && (() => {
            // Check both built-in and custom exercises
            const builtInExercise = EXERCISES.find(e => e.id === exerciseDetailId);
            const customExercise = store.customExercises.find(e => e.id === exerciseDetailId);
            const isCustom = !builtInExercise && !!customExercise;

            // Create unified exercise object
            const exercise = builtInExercise || (customExercise ? {
              id: customExercise.id,
              name: customExercise.name,
              muscle: customExercise.muscle,
              equipment: 'custom',
              secondaryMuscles: [],
              formTips: [],
              commonMistakes: [],
            } : null);

            if (!exercise) return null;

            // Get user's history with this exercise
            const exerciseWorkouts = store.workouts.filter(w =>
              w.exercises.some(ex => ex.id === exerciseDetailId)
            );
            const totalSessions = exerciseWorkouts.length;
            const currentPR = store.records[exerciseDetailId] || 0;

            // Calculate total volume and find best set (highest e1RM) for this exercise
            let totalVolume = 0;
            let totalSets = 0;
            let bestSet: { weight: number; reps: number; e1rm: number } | null = null;

            // Epley formula for estimated 1RM: weight * (1 + reps/30)
            const calcE1RM = (weight: number, reps: number) => {
              if (reps === 1) return weight;
              return Math.round(weight * (1 + reps / 30));
            };

            exerciseWorkouts.forEach(w => {
              w.exercises.filter(ex => ex.id === exerciseDetailId).forEach(ex => {
                ex.sets.forEach(s => {
                  if (!s.isWarmup) {
                    totalVolume += s.weight * s.reps;
                    totalSets++;

                    // Track best set by estimated 1RM
                    const e1rm = calcE1RM(s.weight, s.reps);
                    if (!bestSet || e1rm > bestSet.e1rm) {
                      bestSet = { weight: s.weight, reps: s.reps, e1rm };
                    }
                  }
                });
              });
            });

            // Get current estimated 1RM from most recent workout
            const lastWorkout = exerciseWorkouts[exerciseWorkouts.length - 1];
            const lastWorkoutDate = lastWorkout ? new Date(lastWorkout.startTime).toLocaleDateString() : null;

            let currentE1RM = 0;
            if (lastWorkout) {
              const lastEx = lastWorkout.exercises.find(ex => ex.id === exerciseDetailId);
              if (lastEx && lastEx.sets.length > 0) {
                // Find best e1RM from last workout
                lastEx.sets.forEach(s => {
                  if (!s.isWarmup) {
                    const e1rm = calcE1RM(s.weight, s.reps);
                    if (e1rm > currentE1RM) currentE1RM = e1rm;
                  }
                });
              }
            }

            // Get PR metadata for reps
            const prMeta = store.recordsMeta[exerciseDetailId];

            // Get tier for this exercise
            const exerciseTier = getExerciseTier(exerciseDetailId, store.customExercises);

            return (
              <div className="view-content exercise-detail-view">
                <div className="view-header">
                  <button className="back-btn" onClick={() => {
                    setExerciseDetailId(null);
                    // Return to where user came from, or workout if active
                    if (store.currentWorkout) {
                      store.setView('workout');
                      setShowExercisePicker(true);
                    } else {
                      store.setView(exerciseDetailReturnView as any);
                    }
                  }}>←</button>
                  <span className="view-title">{exercise.name}</span>
                  {isCustom && (
                    <button
                      className="edit-exercise-btn"
                      onClick={() => {
                        if (customExercise) {
                          setEditingCustomExercise({ ...customExercise, tier: customExercise.tier || 3 });
                        }
                      }}
                    >
                      ✏️
                    </button>
                  )}
                </div>

                {/* Exercise Info Card */}
                <div className="exercise-info-card">
                  <div className="exercise-muscle-group">
                    <span className="muscle-icon">
                      {MUSCLE_CATEGORIES.find(m => m.id === exercise.muscle)?.icon || '💪'}
                    </span>
                    <span className="muscle-name">{exercise.muscle.charAt(0).toUpperCase() + exercise.muscle.slice(1)}</span>
                    <span className="equipment-badge">{exercise.equipment}</span>
                    <span className={`tier-badge tier-${exerciseTier}`}>
                      T{exerciseTier}
                    </span>
                    {isCustom && <span className="custom-badge">Custom</span>}
                  </div>

                  {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                    <div className="secondary-muscles">
                      <span className="secondary-label">Also works:</span>
                      {exercise.secondaryMuscles.map(m => (
                        <span key={m} className="secondary-muscle">{m}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Your Stats */}
                <div className="exercise-stats-card">
                  <h3 className="card-title">Your Stats</h3>
                  <div className="stats-grid stats-grid-3col">
                    <div className="stat-item">
                      <div className="stat-value">{currentPR} x {prMeta?.reps || 1}</div>
                      <div className="stat-label">PR</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{bestSet ? `${bestSet.weight} x ${bestSet.reps}` : '-'}</div>
                      <div className="stat-label">Best Set</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{currentE1RM || bestSet?.e1rm || '-'}</div>
                      <div className="stat-label">Est. 1RM</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{totalSessions}</div>
                      <div className="stat-label">Sessions</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{totalSets}</div>
                      <div className="stat-label">Total Sets</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}</div>
                      <div className="stat-label">Volume</div>
                    </div>
                  </div>
                  {lastWorkoutDate && (
                    <div className="last-workout">Last performed: {lastWorkoutDate}</div>
                  )}
                </div>

                {/* Form Tips */}
                {exercise.formTips && exercise.formTips.length > 0 && (
                  <div className="exercise-tips-card">
                    <h3 className="card-title">
                      <span className="title-icon">✓</span>
                      Form Tips
                    </h3>
                    <ul className="tips-list">
                      {exercise.formTips.map((tip, idx) => (
                        <li key={idx} className="tip-item">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Common Mistakes */}
                {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
                  <div className="exercise-mistakes-card">
                    <h3 className="card-title">
                      <span className="title-icon">⚠</span>
                      Common Mistakes
                    </h3>
                    <ul className="mistakes-list">
                      {exercise.commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="mistake-item">{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Start Workout Button */}
                {!store.currentWorkout && (
                  <button
                    className="start-exercise-btn"
                    onClick={() => {
                      store.startWorkout();
                      store.addExerciseToWorkout(exercise.id);
                      setExerciseDetailId(null);
                    }}
                  >
                    Start Workout with {exercise.name}
                  </button>
                )}

                {/* Add to Active Workout Button */}
                {store.currentWorkout && (
                  <button
                    className="add-to-workout-btn"
                    onClick={() => {
                      const alreadyInWorkout = store.currentWorkout?.exercises.some(ex => ex.id === exercise.id);
                      if (alreadyInWorkout) {
                        store.showToast(`${exercise.name} already in workout`);
                      } else {
                        store.addExerciseToWorkout(exercise.id);
                        store.showToast(`Added ${exercise.name}`);
                      }
                      setExerciseDetailId(null);
                      store.setView('workout');
                    }}
                  >
                    {store.currentWorkout?.exercises.some(ex => ex.id === exercise.id)
                      ? `${exercise.name} Already Added`
                      : `Add ${exercise.name} to Workout`}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Program Wizard */}
          {store.currentView === 'program-wizard' && store.programWizardData && (
            <div className="view-content program-wizard">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.cancelProgramWizard()}>←</button>
                <span className="view-title">
                  {store.programWizardStep === 1 && (store.editingProgramId ? 'Edit Program' : 'New Program')}
                  {store.programWizardStep === 2 && 'Week Structure'}
                  {store.programWizardStep === 3 && 'Progression'}
                  {store.programWizardStep === 4 && 'Review'}
                </span>
                <span className="wizard-step">{store.programWizardStep}/4</span>
              </div>

              {/* Step 1: Basic Info */}
              {store.programWizardStep === 1 && (
                <div className="wizard-content">
                  <div className="form-group">
                    <label>Program Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={store.programWizardData.name || ''}
                      onChange={(e) => store.updateProgramWizardData({ name: e.target.value })}
                      placeholder="e.g., PPL Hypertrophy"
                    />
                  </div>

                  <div className="form-group">
                    <label>Goal Priority (drag to reorder, ✕ to exclude)</label>
                    <div className="goal-priority-list" ref={goalPriorityListRef}>
                      {/* Active priorities */}
                      {(store.programWizardData.goalPriorities || ['strength', 'hypertrophy', 'endurance', 'general']).map((goal, idx) => (
                        <div
                          key={goal}
                          draggable
                          className="goal-priority-item"
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', goal)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedGoal = e.dataTransfer.getData('text/plain');
                            if (draggedGoal !== goal) {
                              const currentPriorities = store.programWizardData?.goalPriorities || ['strength', 'hypertrophy', 'endurance', 'general'];
                              const filtered = currentPriorities.filter((g: string) => g !== draggedGoal);
                              filtered.splice(idx, 0, draggedGoal);
                              store.updateProgramWizardData({ goalPriorities: filtered, goal: filtered[0] as Program['goal'] });
                            }
                          }}
                        >
                          <span className="goal-priority-rank">{idx + 1}</span>
                          <span
                            className="goal-priority-handle"
                            onTouchStart={(e) => handleGoalTouchDragStart(idx, e)}
                          >⋮⋮</span>
                          <span className="goal-priority-icon">
                            {goal === 'strength' && '💪'}
                            {goal === 'hypertrophy' && '🏋️'}
                            {goal === 'endurance' && '🏃'}
                            {goal === 'general' && '⚡'}
                          </span>
                          <span className="goal-priority-name">{goal.charAt(0).toUpperCase() + goal.slice(1)}</span>
                          <button
                            className="goal-exclude-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentPriorities = store.programWizardData?.goalPriorities || ['strength', 'hypertrophy', 'endurance', 'general'];
                              const currentExcluded = store.programWizardData?.excludedGoals || [];
                              const newPriorities = currentPriorities.filter((g: string) => g !== goal);
                              store.updateProgramWizardData({
                                goalPriorities: newPriorities,
                                excludedGoals: [...currentExcluded, goal],
                                goal: (newPriorities[0] || 'general') as Program['goal']
                              });
                            }}
                            title="Exclude from priorities"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {/* Excluded goals */}
                      {(store.programWizardData.excludedGoals || []).length > 0 && (
                        <div className="excluded-goals-section">
                          <span className="excluded-label">Excluded:</span>
                          {(store.programWizardData.excludedGoals || []).map((goal: string) => (
                            <button
                              key={goal}
                              className="goal-priority-item excluded"
                              onClick={() => {
                                const currentPriorities = store.programWizardData?.goalPriorities || [];
                                const currentExcluded = store.programWizardData?.excludedGoals || [];
                                store.updateProgramWizardData({
                                  goalPriorities: [...currentPriorities, goal],
                                  excludedGoals: currentExcluded.filter((g: string) => g !== goal),
                                  goal: (currentPriorities[0] || goal) as Program['goal']
                                });
                              }}
                              title="Click to re-add"
                            >
                              <span className="goal-priority-icon">
                                {goal === 'strength' && '💪'}
                                {goal === 'hypertrophy' && '🏋️'}
                                {goal === 'endurance' && '🏃'}
                                {goal === 'general' && '⚡'}
                              </span>
                              <span className="goal-priority-name">{goal.charAt(0).toUpperCase() + goal.slice(1)}</span>
                              <span className="goal-readd-hint">+ Add</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Schedule Type</label>
                    <div className="cycle-type-selector">
                      <button
                        className={`cycle-type-btn ${(store.programWizardData.cycleType || 'weekly') === 'weekly' ? 'selected' : ''}`}
                        onClick={() => store.updateProgramWizardData({ cycleType: 'weekly', cycleLengthDays: 7 })}
                      >
                        <span className="cycle-icon">📅</span>
                        <span className="cycle-name">Weekly</span>
                        <span className="cycle-desc">7-day weeks (Mon-Sun)</span>
                      </button>
                      <button
                        className={`cycle-type-btn ${store.programWizardData.cycleType === 'microcycle' ? 'selected' : ''}`}
                        onClick={() => store.updateProgramWizardData({ cycleType: 'microcycle', cycleLengthDays: 5 })}
                      >
                        <span className="cycle-icon">🔄</span>
                        <span className="cycle-name">Microcycle</span>
                        <span className="cycle-desc">Custom length (3-10 days)</span>
                      </button>
                    </div>

                    {store.programWizardData.cycleType === 'microcycle' && (
                      <div className="microcycle-length">
                        <label>Cycle Length</label>
                        <div className="length-selector">
                          <input
                            type="range"
                            min={3}
                            max={10}
                            value={store.programWizardData.cycleLengthDays || 5}
                            onChange={(e) => store.updateProgramWizardData({ cycleLengthDays: parseInt(e.target.value) })}
                          />
                          <span className="length-value">{store.programWizardData.cycleLengthDays || 5} days</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Duration ({store.programWizardData.cycleType === 'microcycle' ? 'cycles' : 'weeks'})</label>
                    <div className="option-row">
                      {[4, 6, 8, 12].map(num => (
                        <button
                          key={num}
                          className={`option-btn small ${store.programWizardData.durationWeeks === num ? 'selected' : ''}`}
                          onClick={() => store.updateProgramWizardData({ durationWeeks: num })}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Difficulty</label>
                    <div className="option-row">
                      {(['beginner', 'intermediate', 'advanced'] as const).map(diff => (
                        <button
                          key={diff}
                          className={`option-btn ${store.programWizardData.difficulty === diff ? 'selected' : ''}`}
                          onClick={() => store.updateProgramWizardData({ difficulty: diff })}
                        >
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wizard-actions">
                    <button
                      className="wizard-btn primary"
                      onClick={() => store.setProgramWizardStep(2)}
                      disabled={!store.programWizardData.name}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Cycle Structure */}
              {store.programWizardStep === 2 && (() => {
                const isMicrocycle = store.programWizardData.cycleType === 'microcycle';
                const cycleLength = store.programWizardData.cycleLengthDays || 7;
                const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                // Generate day labels based on cycle type
                const dayLabels = isMicrocycle
                  ? Array.from({ length: cycleLength }, (_, i) => `Day ${i + 1}`)
                  : weekDays;

                return (
                  <div className="wizard-content">
                    <p className="wizard-hint">
                      {isMicrocycle
                        ? `Build your ${cycleLength}-day microcycle`
                        : 'Build your weekly schedule'}
                    </p>

                    <div className={`week-structure enhanced ${isMicrocycle ? 'microcycle' : ''}`}>
                      {dayLabels.map((dayLabel, idx) => {
                        const dayNumber = idx + 1;
                        const weeks = store.programWizardData.weeks || [];
                        const week1 = weeks[0] || { weekNumber: 1, days: [] };
                        const day = week1.days.find(d => d.dayNumber === dayNumber);
                        const template = day?.templateId ? store.templates.find(t => t.id === day.templateId) : null;
                        const muscleGroups = template?.targetMuscleGroups || [];

                        const updateDay = (updates: Partial<ProgramDay>) => {
                          const currentDay = day || { dayNumber, name: '', isRest: false };
                          const newDay: ProgramDay = { ...currentDay, ...updates };

                          const updatedDays = week1.days.filter(d => d.dayNumber !== dayNumber);
                          if (newDay.name || newDay.templateId || newDay.isRest) {
                            updatedDays.push(newDay);
                          }
                          updatedDays.sort((a, b) => a.dayNumber - b.dayNumber);

                          const allWeeks: ProgramWeek[] = [];
                          for (let i = 1; i <= (store.programWizardData.durationWeeks || 4); i++) {
                            allWeeks.push({
                              weekNumber: i,
                              days: updatedDays.map(d => ({ ...d })),
                              isDeload: i === (store.programWizardData.durationWeeks || 4),
                            });
                          }
                          store.updateProgramWizardData({ weeks: allWeeks });
                        };

                        return (
                          <div key={dayLabel} className={`day-row enhanced ${day?.isRest ? 'rest' : ''}`}>
                            <div className="day-header">
                              <span className={`day-label ${isMicrocycle ? 'micro' : ''}`}>{dayLabel}</span>
                              <input
                                type="text"
                                className="day-name-input"
                                value={day?.name || ''}
                                onChange={(e) => updateDay({ name: e.target.value })}
                                placeholder={day?.isRest ? 'Rest' : 'Workout name...'}
                              />
                            </div>

                            <div className="day-content">
                              <div className="day-select-row">
                                <select
                                  className="day-select"
                                  value={day?.isRest ? 'rest' : day?.templateId || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'create-new') {
                                      setCreatingWorkoutForDay(dayNumber);
                                      setEditingWorkoutTemplateId(null);
                                      setNewWorkoutName(day?.name || `${dayLabel} Workout`);
                                      setNewWorkoutExercises([]);
                                      setNewWorkoutMuscleGroups([]);
                                    } else {
                                      const isRest = value === 'rest';
                                      const templateId = isRest ? undefined : value || undefined;
                                      const selectedTemplate = templateId ? store.templates.find(t => t.id === templateId) : null;
                                      updateDay({
                                        isRest,
                                        templateId,
                                        name: day?.name || (isRest ? 'Rest' : (selectedTemplate?.name || ''))
                                      });
                                    }
                                  }}
                                >
                                  <option value="">-- Select Workout --</option>
                                  <option value="rest">🛌 Rest Day</option>
                                  <option value="create-new">➕ Create New Workout</option>
                                  {store.templates.length > 0 && (
                                    <optgroup label="Your Workouts">
                                      {store.templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                          {store.migrateTemplate(t).name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>

                                {/* Edit button when template selected */}
                                {template && !day?.isRest && (
                                  <button
                                    className="day-edit-btn"
                                    onClick={() => {
                                      const migrated = store.migrateTemplate(template);
                                      setCreatingWorkoutForDay(dayNumber);
                                      setEditingWorkoutTemplateId(template.id);
                                      setNewWorkoutName(migrated.name);
                                      setNewWorkoutMuscleGroups(migrated.targetMuscleGroups || []);
                                      // Parse exercises from template
                                      const exercises = migrated.exercises.map(ex => {
                                        const reps = ex.targetReps?.split('-') || ['8', '12'];
                                        return {
                                          exerciseId: ex.exerciseId,
                                          exerciseName: ex.exerciseName,
                                          targetSets: ex.targetSets || 3,
                                          minReps: parseInt(reps[0]) || 8,
                                          maxReps: parseInt(reps[1] || reps[0]) || 12,
                                        };
                                      });
                                      setNewWorkoutExercises(exercises);
                                    }}
                                    title="Edit workout"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>

                              {muscleGroups.length > 0 && (
                                <div className="day-muscle-tags">
                                  {muscleGroups.slice(0, 3).map(mg => (
                                    <span key={mg} className="muscle-tag">{mg}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Body Part Distribution Graph */}
                    {(() => {
                      // Calculate muscle group distribution
                      const muscleCount: Record<string, number> = {};
                      const weeks = store.programWizardData.weeks || [];
                      const week1 = weeks[0] || { weekNumber: 1, days: [] };

                      week1.days.forEach(day => {
                        if (day.templateId && !day.isRest) {
                          const template = store.templates.find(t => t.id === day.templateId);
                          template?.exercises.forEach(ex => {
                            const exercise = getExerciseById(ex.exerciseId);
                            if (exercise?.muscle) {
                              const muscle = exercise.muscle;
                              // Count sets, not just exercises
                              muscleCount[muscle] = (muscleCount[muscle] || 0) + (ex.targetSets || 1);
                            }
                          });
                        }
                      });

                      const totalSets = Object.values(muscleCount).reduce((a, b) => a + b, 0);
                      if (totalSets === 0) return null;

                      // Sort by count descending
                      const sortedMuscles = Object.entries(muscleCount)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8); // Show top 8

                      const muscleLabels: Record<string, string> = {
                        chest: 'Chest',
                        back: 'Back',
                        shoulders: 'Shoulders',
                        biceps: 'Biceps',
                        triceps: 'Triceps',
                        quads: 'Quads',
                        hamstrings: 'Hams',
                        glutes: 'Glutes',
                        calves: 'Calves',
                        core: 'Core',
                        forearms: 'Forearms',
                        traps: 'Traps',
                      };

                      const muscleColors: Record<string, string> = {
                        chest: '#ef4444',
                        back: '#3b82f6',
                        shoulders: '#f59e0b',
                        biceps: '#10b981',
                        triceps: '#8b5cf6',
                        quads: '#ec4899',
                        hamstrings: '#f97316',
                        glutes: '#06b6d4',
                        calves: '#84cc16',
                        core: '#6366f1',
                        forearms: '#14b8a6',
                        traps: '#a855f7',
                      };

                      return (
                        <div className="body-part-distribution">
                          <div className="distribution-header">
                            <span className="distribution-title">Volume Distribution</span>
                            <span className="distribution-total">{totalSets} sets/week</span>
                          </div>
                          <div className="distribution-bars">
                            {sortedMuscles.map(([muscle, count]) => {
                              const percent = Math.round((count / totalSets) * 100);
                              return (
                                <div key={muscle} className="distribution-row">
                                  <span className="distribution-label">{muscleLabels[muscle] || muscle}</span>
                                  <div className="distribution-bar-container">
                                    <div
                                      className="distribution-bar"
                                      style={{
                                        width: `${percent}%`,
                                        backgroundColor: muscleColors[muscle] || '#6b7280'
                                      }}
                                    />
                                  </div>
                                  <span className="distribution-value">{count} <span className="distribution-percent">({percent}%)</span></span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="deload-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={store.programWizardData.weeks?.[store.programWizardData.weeks.length - 1]?.isDeload || false}
                          onChange={(e) => {
                            const weeks = [...(store.programWizardData.weeks || [])];
                            if (weeks.length > 0) {
                              weeks[weeks.length - 1] = {
                                ...weeks[weeks.length - 1],
                                isDeload: e.target.checked,
                                name: e.target.checked ? (isMicrocycle ? 'Deload Cycle' : 'Deload Week') : undefined,
                              };
                              store.updateProgramWizardData({ weeks });
                            }
                          }}
                        />
                        Mark final {isMicrocycle ? 'cycle' : 'week'} as deload
                      </label>
                    </div>

                    <div className="wizard-actions">
                      <button className="wizard-btn secondary" onClick={() => store.setProgramWizardStep(1)}>
                        ← Back
                      </button>
                      <button
                        className="wizard-btn primary"
                        onClick={() => store.setProgramWizardStep(3)}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Progression */}
              {store.programWizardStep === 3 && (() => {
                const currentRule = store.programWizardData.progressionRules?.[0];
                const config = currentRule?.config as any;
                const isDoubleProgression = config?.type === 'double_progression';

                // Get all unique exercises from templates used in the program
                const programExercises: { id: string; name: string }[] = [];
                const seenExercises = new Set<string>();
                store.programWizardData.weeks?.[0]?.days.forEach(day => {
                  if (day.templateId) {
                    const template = store.templates.find(t => t.id === day.templateId);
                    template?.exercises.forEach(ex => {
                      if (!seenExercises.has(ex.exerciseId)) {
                        seenExercises.add(ex.exerciseId);
                        programExercises.push({ id: ex.exerciseId, name: ex.exerciseName });
                      }
                    });
                  }
                });

                return (
                  <div className="wizard-content">
                    <p className="wizard-hint">Choose how weights should progress</p>

                    <div className="form-group">
                      <label>Progression Type</label>
                      <div className="progression-options">
                        {[
                          { type: 'double_progression', name: 'Double Progression', desc: 'Increase reps until max, then add weight' },
                          { type: 'linear', name: 'Linear', desc: 'Add weight each successful session' },
                          { type: 'rpe_based', name: 'RPE Based', desc: 'Adjust weight based on perceived effort' },
                          { type: 'none', name: 'None', desc: 'No automatic progression' },
                        ].map(opt => {
                          const isSelected = config?.type === opt.type;

                          return (
                            <button
                              key={opt.type}
                              className={`progression-option ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                let newConfig: ProgressionRule['config'];
                                switch (opt.type) {
                                  case 'double_progression':
                                    newConfig = { type: 'double_progression', repRange: [8, 12], weightIncrement: 5 };
                                    break;
                                  case 'linear':
                                    newConfig = { type: 'linear', weightIncrement: 5, deloadThreshold: 3, deloadPercent: 0.1 };
                                    break;
                                  case 'rpe_based':
                                    newConfig = { type: 'rpe_based', targetRpe: 8, rpeRange: [7, 9], adjustmentPerPoint: 5 };
                                    break;
                                  default:
                                    newConfig = { type: 'none' };
                                }

                                const rule: ProgressionRule = {
                                  id: 'default',
                                  name: opt.name,
                                  config: newConfig,
                                };
                                store.updateProgramWizardData({ progressionRules: [rule] });
                                setShowAdvancedProgression(false);
                              }}
                            >
                              <div className="progression-name">{opt.name}</div>
                              <div className="progression-desc">{opt.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isDoubleProgression && (
                      <div className="progression-config">
                        <div className="form-row">
                          <label>Default Rep Range</label>
                          <div className="input-row">
                            <input
                              type="number"
                              className="form-input small"
                              value={config.repRange[0]}
                              onChange={(e) => {
                                const rules = [...(store.programWizardData.progressionRules || [])];
                                (rules[0].config as any).repRange[0] = parseInt(e.target.value) || 8;
                                store.updateProgramWizardData({ progressionRules: rules });
                              }}
                            />
                            <span>to</span>
                            <input
                              type="number"
                              className="form-input small"
                              value={config.repRange[1]}
                              onChange={(e) => {
                                const rules = [...(store.programWizardData.progressionRules || [])];
                                (rules[0].config as any).repRange[1] = parseInt(e.target.value) || 12;
                                store.updateProgramWizardData({ progressionRules: rules });
                              }}
                            />
                            <span>reps</span>
                          </div>
                        </div>
                        <div className="form-row">
                          <label>Weight Increment</label>
                          <div className="input-row">
                            <input
                              type="number"
                              className="form-input small"
                              value={config.weightIncrement}
                              onChange={(e) => {
                                const rules = [...(store.programWizardData.progressionRules || [])];
                                (rules[0].config as any).weightIncrement = parseInt(e.target.value) || 5;
                                store.updateProgramWizardData({ progressionRules: rules });
                              }}
                            />
                            <span>lbs</span>
                          </div>
                        </div>

                        {/* Per-exercise configuration toggle */}
                        {programExercises.length > 0 && (
                          <div className="per-exercise-toggle">
                            <label className="toggle-label">
                              <input
                                type="checkbox"
                                checked={config.perExercise || false}
                                onChange={(e) => {
                                  const rules = [...(store.programWizardData.progressionRules || [])];
                                  (rules[0].config as any).perExercise = e.target.checked;
                                  if (e.target.checked && !config.exerciseRanges) {
                                    // Auto-populate from workout templates
                                    const exerciseRanges: Record<string, { repRange: [number, number] }> = {};

                                    // Get all templates used in this program
                                    const days = store.programWizardData.weeks?.[0]?.days || [];
                                    for (const day of days) {
                                      if (day.templateId) {
                                        const template = store.templates.find(t => t.id === day.templateId);
                                        if (template) {
                                          for (const ex of template.exercises) {
                                            // Parse targetReps to get min/max
                                            const repsStr = ex.targetReps || '';
                                            let min = config.repRange[0];
                                            let max = config.repRange[1];

                                            if (repsStr.includes('-')) {
                                              const parts = repsStr.split('-').map(s => parseInt(s.trim()));
                                              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                                min = parts[0];
                                                max = parts[1];
                                              }
                                            } else if (repsStr) {
                                              const num = parseInt(repsStr);
                                              if (!isNaN(num)) {
                                                min = num;
                                                max = num;
                                              }
                                            }

                                            exerciseRanges[ex.exerciseId] = { repRange: [min, max] };
                                          }
                                        }
                                      }
                                    }

                                    (rules[0].config as any).exerciseRanges = exerciseRanges;
                                  }
                                  store.updateProgramWizardData({ progressionRules: rules });
                                }}
                              />
                              <span>Different rep ranges per exercise</span>
                            </label>
                          </div>
                        )}

                        {/* Per-exercise rep ranges */}
                        {config.perExercise && programExercises.length > 0 && (
                          <div className="per-exercise-config">
                            <div className="exercise-ranges-header">
                              <span>Exercise</span>
                              <span>Rep Range</span>
                            </div>
                            {programExercises.map(ex => {
                              const exRange = config.exerciseRanges?.[ex.id] || { repRange: [...config.repRange] };
                              return (
                                <div key={ex.id} className="exercise-range-row">
                                  <span className="exercise-name">{ex.name}</span>
                                  <div className="range-inputs">
                                    <input
                                      type="number"
                                      className="form-input mini"
                                      value={exRange.repRange[0]}
                                      onChange={(e) => {
                                        const rules = [...(store.programWizardData.progressionRules || [])];
                                        const ranges = { ...(rules[0].config as any).exerciseRanges };
                                        ranges[ex.id] = {
                                          ...ranges[ex.id],
                                          repRange: [parseInt(e.target.value) || 8, exRange.repRange[1]]
                                        };
                                        (rules[0].config as any).exerciseRanges = ranges;
                                        store.updateProgramWizardData({ progressionRules: rules });
                                      }}
                                    />
                                    <span>-</span>
                                    <input
                                      type="number"
                                      className="form-input mini"
                                      value={exRange.repRange[1]}
                                      onChange={(e) => {
                                        const rules = [...(store.programWizardData.progressionRules || [])];
                                        const ranges = { ...(rules[0].config as any).exerciseRanges };
                                        ranges[ex.id] = {
                                          ...ranges[ex.id],
                                          repRange: [exRange.repRange[0], parseInt(e.target.value) || 12]
                                        };
                                        (rules[0].config as any).exerciseRanges = ranges;
                                        store.updateProgramWizardData({ progressionRules: rules });
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}

                            {/* Advanced mode toggle for per-set */}
                            <div className="advanced-mode-toggle">
                              <button
                                className={`advanced-toggle-btn ${showAdvancedProgression ? 'expanded' : ''}`}
                                onClick={() => setShowAdvancedProgression(!showAdvancedProgression)}
                              >
                                {showAdvancedProgression ? '▼' : '▶'} Advanced: Per-set rep ranges
                              </button>
                            </div>

                            {showAdvancedProgression && (
                              <div className="per-set-config">
                                <p className="config-hint">Configure different rep targets for each set</p>
                                {programExercises.map(ex => {
                                  const template = store.programWizardData.weeks?.[0]?.days
                                    .map(d => d.templateId ? store.templates.find(t => t.id === d.templateId) : null)
                                    .find(t => t?.exercises.some(e => e.exerciseId === ex.id));
                                  const templateEx = template?.exercises.find(e => e.exerciseId === ex.id);
                                  const numSets = templateEx?.targetSets || 3;
                                  const setRanges = config.setRanges?.[ex.id]?.sets || [];

                                  return (
                                    <div key={ex.id} className="exercise-sets-config">
                                      <div className="exercise-sets-header">{ex.name}</div>
                                      <div className="sets-grid">
                                        {Array.from({ length: numSets }, (_, setIdx) => {
                                          const setRange = setRanges[setIdx] || { repRange: config.exerciseRanges?.[ex.id]?.repRange || config.repRange };
                                          return (
                                            <div key={setIdx} className="set-range-item">
                                              <span className="set-label">Set {setIdx + 1}</span>
                                              <input
                                                type="number"
                                                className="form-input tiny"
                                                value={setRange.repRange[0]}
                                                onChange={(e) => {
                                                  const rules = [...(store.programWizardData.progressionRules || [])];
                                                  const allSetRanges = { ...(rules[0].config as any).setRanges } || {};
                                                  const exSets = [...(allSetRanges[ex.id]?.sets || [])];
                                                  while (exSets.length < numSets) {
                                                    exSets.push({ repRange: [...config.repRange] });
                                                  }
                                                  exSets[setIdx] = { repRange: [parseInt(e.target.value) || 8, setRange.repRange[1]] };
                                                  allSetRanges[ex.id] = { sets: exSets };
                                                  (rules[0].config as any).setRanges = allSetRanges;
                                                  (rules[0].config as any).advancedMode = true;
                                                  store.updateProgramWizardData({ progressionRules: rules });
                                                }}
                                              />
                                              <span>-</span>
                                              <input
                                                type="number"
                                                className="form-input tiny"
                                                value={setRange.repRange[1]}
                                                onChange={(e) => {
                                                  const rules = [...(store.programWizardData.progressionRules || [])];
                                                  const allSetRanges = { ...(rules[0].config as any).setRanges } || {};
                                                  const exSets = [...(allSetRanges[ex.id]?.sets || [])];
                                                  while (exSets.length < numSets) {
                                                    exSets.push({ repRange: [...config.repRange] });
                                                  }
                                                  exSets[setIdx] = { repRange: [setRange.repRange[0], parseInt(e.target.value) || 12] };
                                                  allSetRanges[ex.id] = { sets: exSets };
                                                  (rules[0].config as any).setRanges = allSetRanges;
                                                  (rules[0].config as any).advancedMode = true;
                                                  store.updateProgramWizardData({ progressionRules: rules });
                                                }}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Weight Configuration Section */}
                    {programExercises.length > 0 && (
                      <div className="weight-config-section">
                        <h4>Starting Weights</h4>
                        <p className="weight-config-hint">
                          Choose how to determine starting weights for each exercise
                        </p>
                        <div className="weight-config-list">
                          <div className="weight-config-header">
                            <span>Exercise</span>
                            <span>Weight Basis</span>
                            <span>Value</span>
                          </div>
                          {programExercises.map(ex => {
                            const weightConfigs = store.programWizardData.exerciseWeightConfigs || [];
                            const exConfig = weightConfigs.find(c => c.exerciseId === ex.id) || {
                              exerciseId: ex.id,
                              weightBasis: 'auto' as const,
                            };
                            const pr = store.records[ex.id];
                            const workingWeight = exConfig.weightBasis === 'max' && exConfig.maxWeight
                              ? Math.round((exConfig.maxWeight * (exConfig.workingPercentage || 0.75)) / 5) * 5
                              : null;

                            const updateExConfig = (updates: Partial<typeof exConfig>) => {
                              const configs = [...(store.programWizardData.exerciseWeightConfigs || [])];
                              const idx = configs.findIndex(c => c.exerciseId === ex.id);
                              const newConfig = { ...exConfig, ...updates };
                              if (idx >= 0) {
                                configs[idx] = newConfig;
                              } else {
                                configs.push(newConfig);
                              }
                              store.updateProgramWizardData({ exerciseWeightConfigs: configs });
                            };

                            return (
                              <div key={ex.id} className="weight-config-row">
                                <span className="exercise-name">{ex.name}</span>
                                <div className="weight-basis-selector">
                                  <button
                                    className={`weight-basis-btn ${exConfig.weightBasis === 'auto' ? 'active' : ''}`}
                                    onClick={() => updateExConfig({ weightBasis: 'auto' })}
                                  >
                                    Auto
                                  </button>
                                  <button
                                    className={`weight-basis-btn ${exConfig.weightBasis === 'max' ? 'active' : ''}`}
                                    onClick={() => updateExConfig({ weightBasis: 'max', workingPercentage: exConfig.workingPercentage || 0.75 })}
                                  >
                                    Max
                                  </button>
                                  <button
                                    className={`weight-basis-btn ${exConfig.weightBasis === 'starting' ? 'active' : ''}`}
                                    onClick={() => updateExConfig({ weightBasis: 'starting' })}
                                  >
                                    Starting
                                  </button>
                                </div>
                                <div className="weight-config-inputs">
                                  {exConfig.weightBasis === 'auto' && (
                                    <span className="pr-display">
                                      {pr ? `PR: ${pr} lbs` : 'No PR'}
                                    </span>
                                  )}
                                  {exConfig.weightBasis === 'max' && (
                                    <>
                                      <input
                                        type="number"
                                        className="form-input"
                                        placeholder="1RM"
                                        value={exConfig.maxWeight || ''}
                                        onChange={(e) => updateExConfig({ maxWeight: parseInt(e.target.value) || undefined })}
                                      />
                                      <div className="percentage-input">
                                        <span className="unit">@</span>
                                        <input
                                          type="number"
                                          className="form-input"
                                          value={Math.round((exConfig.workingPercentage || 0.75) * 100)}
                                          onChange={(e) => updateExConfig({ workingPercentage: (parseInt(e.target.value) || 75) / 100 })}
                                        />
                                        <span className="unit">%</span>
                                      </div>
                                      {workingWeight && (
                                        <span className="working-weight">= {workingWeight} lbs</span>
                                      )}
                                    </>
                                  )}
                                  {exConfig.weightBasis === 'starting' && (
                                    <>
                                      <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Weight"
                                        value={exConfig.startingWeight || ''}
                                        onChange={(e) => updateExConfig({ startingWeight: parseInt(e.target.value) || undefined })}
                                      />
                                      <span className="unit">lbs</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="wizard-actions">
                      <button className="wizard-btn secondary" onClick={() => store.setProgramWizardStep(2)}>
                        ← Back
                      </button>
                      <button
                        className="wizard-btn primary"
                        onClick={() => store.setProgramWizardStep(4)}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Step 4: Review */}
              {store.programWizardStep === 4 && (() => {
                const isMicrocycle = store.programWizardData.cycleType === 'microcycle';
                const cycleLength = store.programWizardData.cycleLengthDays || 7;
                const config = store.programWizardData.progressionRules?.[0]?.config as any;

                return (
                  <div className="wizard-content">
                    <div className="review-section">
                      <h3>{store.programWizardData.name}</h3>
                      <div className="review-meta">
                        {store.programWizardData.durationWeeks} {isMicrocycle ? 'cycles' : 'weeks'} •{' '}
                        {isMicrocycle ? `${cycleLength}-day microcycle` : 'Weekly'} •{' '}
                        {store.programWizardData.difficulty} • {store.programWizardData.goal}
                      </div>
                    </div>

                    <div className="review-section">
                      <h4>Schedule</h4>
                      <div className="review-schedule">
                        {store.programWizardData.weeks?.[0]?.days.map(day => (
                          <div key={day.dayNumber} className="review-day">
                            <span className="day-label">
                              {isMicrocycle
                                ? `Day ${day.dayNumber}`
                                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day.dayNumber - 1]}
                            </span>
                            <span className={`day-value ${day.isRest ? 'rest' : ''}`}>
                              {day.isRest ? 'Rest' : day.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="review-section">
                      <h4>Progression</h4>
                      <p className="review-progression-type">
                        {store.programWizardData.progressionRules?.[0]?.name || 'None'}
                      </p>
                      {config?.type === 'double_progression' && (
                        <div className="review-progression-details">
                          <span>Default: {config.repRange[0]}-{config.repRange[1]} reps</span>
                          <span>+{config.weightIncrement} lbs on success</span>
                          {config.perExercise && (
                            <span className="per-exercise-badge">Per-exercise ranges</span>
                          )}
                          {config.advancedMode && (
                            <span className="advanced-badge">Per-set ranges</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Weight Configs Review */}
                    {store.programWizardData.exerciseWeightConfigs && store.programWizardData.exerciseWeightConfigs.length > 0 && (
                      <div className="review-section">
                        <h4>Starting Weights</h4>
                        <div className="review-progression-details" style={{ flexDirection: 'column', gap: '6px' }}>
                          {store.programWizardData.exerciseWeightConfigs
                            .filter(c => c.weightBasis !== 'auto')
                            .map(c => {
                              const exName = (() => {
                                // Find exercise name from templates
                                for (const day of store.programWizardData.weeks?.[0]?.days || []) {
                                  if (day.templateId) {
                                    const template = store.templates.find(t => t.id === day.templateId);
                                    const ex = template?.exercises.find(e => e.exerciseId === c.exerciseId);
                                    if (ex) return ex.exerciseName;
                                  }
                                }
                                return c.exerciseId;
                              })();

                              if (c.weightBasis === 'max' && c.maxWeight) {
                                const workingWeight = Math.round((c.maxWeight * (c.workingPercentage || 0.75)) / 5) * 5;
                                return (
                                  <span key={c.exerciseId}>
                                    {exName}: {c.maxWeight} lbs max @ {Math.round((c.workingPercentage || 0.75) * 100)}% = {workingWeight} lbs
                                  </span>
                                );
                              }
                              if (c.weightBasis === 'starting' && c.startingWeight) {
                                return (
                                  <span key={c.exerciseId}>
                                    {exName}: Start at {c.startingWeight} lbs
                                  </span>
                                );
                              }
                              return null;
                            })}
                        </div>
                      </div>
                    )}

                    <div className="wizard-actions">
                      <button className="wizard-btn secondary" onClick={() => store.setProgramWizardStep(3)}>
                        ← Back
                      </button>
                      <button
                        className="wizard-btn primary"
                        onClick={() => store.finishProgramWizard()}
                      >
                        Create Program
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Campaign Detail Modal */}
          {selectedCampaignId && !creatingCampaign && (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => { setSelectedCampaignId(null); setEditingCampaignId(null); setConfirmDeleteCampaign(false); }}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                {(() => {
                  const campaign = store.campaigns.find(c => c.id === selectedCampaignId);
                  if (!campaign) return null;
                  const daysLeft = Math.ceil((new Date(campaign.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isEditing = editingCampaignId === selectedCampaignId;

                  // Delete confirmation
                  if (confirmDeleteCampaign) {
                    return (
                      <>
                        <div className="modal-header">Delete Campaign?</div>
                        <div className="modal-subtitle">
                          This will permanently delete "{campaign.title}" and all its goals. This cannot be undone.
                        </div>
                        <div className="modal-actions">
                          <button
                            className="modal-btn secondary"
                            onClick={() => setConfirmDeleteCampaign(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="modal-btn"
                            style={{ background: '#dc2626', color: '#fff' }}
                            onClick={() => {
                              store.deleteCampaign(selectedCampaignId);
                              setSelectedCampaignId(null);
                              setConfirmDeleteCampaign(false);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    );
                  }

                  // Edit mode
                  if (isEditing) {
                    return (
                      <>
                        <div className="modal-header">Edit Campaign</div>
                        <input
                          type="text"
                          className="modal-input"
                          placeholder="Campaign name"
                          value={campaignForm.title}
                          onChange={e => setCampaignForm({ ...campaignForm, title: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              store.updateCampaign(selectedCampaignId, {
                                title: campaignForm.title,
                                description: campaignForm.description,
                                targetDate: campaignForm.targetDate
                              });
                              setEditingCampaignId(null);
                            }
                          }}
                          autoFocus
                        />
                        <input
                          type="text"
                          className="modal-input"
                          placeholder="Description (optional)"
                          value={campaignForm.description}
                          onChange={e => setCampaignForm({ ...campaignForm, description: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              store.updateCampaign(selectedCampaignId, {
                                title: campaignForm.title,
                                description: campaignForm.description,
                                targetDate: campaignForm.targetDate
                              });
                              setEditingCampaignId(null);
                            }
                          }}
                        />
                        <input
                          type="date"
                          className="modal-input"
                          value={campaignForm.targetDate}
                          onChange={e => setCampaignForm({ ...campaignForm, targetDate: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              store.updateCampaign(selectedCampaignId, {
                                title: campaignForm.title,
                                description: campaignForm.description,
                                targetDate: campaignForm.targetDate
                              });
                              setEditingCampaignId(null);
                            }
                          }}
                        />
                        <div className="modal-actions">
                          <button
                            className="modal-btn secondary"
                            onClick={() => setEditingCampaignId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="modal-btn primary"
                            onClick={() => {
                              if (!campaignForm.title.trim()) {
                                store.showToast('Title is required');
                                return;
                              }
                              store.updateCampaign(selectedCampaignId, {
                                title: campaignForm.title,
                                description: campaignForm.description,
                                targetDate: campaignForm.targetDate
                              });
                              setEditingCampaignId(null);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </>
                    );
                  }

                  // Normal view
                  return (
                    <>
                      <div className="modal-header">{campaign.title}</div>
                      <div className="modal-subtitle">
                        {daysLeft > 0 ? `${daysLeft} days remaining` : 'Campaign ended'}
                        {campaign.description && ` · ${campaign.description}`}
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <div className="section-title">Goals</div>
                        {campaign.goals.length === 0 ? (
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', padding: '16px 0' }}>
                            No goals yet. Add one below.
                          </div>
                        ) : (
                          campaign.goals.map((goal, idx) => (
                            <div key={idx} className={`goal-card ${goal.isAchieved ? 'achieved' : ''}`}>
                              <div className="goal-info">
                                <div className="goal-exercise">{goal.exerciseName}</div>
                                <div className="goal-target">
                                  Target: {goal.targetWeight} lbs
                                  {goal.currentPR > 0 && ` · PR: ${goal.currentPR} lbs`}
                                </div>
                              </div>
                              {goal.isAchieved && <span className="goal-check">✓</span>}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        <button
                          className="modal-btn"
                          style={{ background: '#dc2626', color: '#fff' }}
                          onClick={() => setConfirmDeleteCampaign(true)}
                        >
                          Delete
                        </button>
                        <button
                          className="modal-btn secondary"
                          onClick={() => {
                            setCampaignForm({
                              title: campaign.title || '',
                              description: campaign.description || '',
                              targetDate: campaign.targetDate || ''
                            });
                            setEditingCampaignId(selectedCampaignId);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="modal-btn primary"
                          onClick={() => {
                            setAddingGoal(true);
                            inputRef.current?.focus();
                          }}
                        >
                          Add Goal
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Create Campaign Modal */}
          {creatingCampaign && (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setCreatingCampaign(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">New Campaign</div>
                <div className="modal-subtitle">Set a goal with a deadline to stay motivated</div>

                <input
                  type="text"
                  className="modal-input"
                  placeholder="Campaign name (e.g., Bench 225 Club)"
                  value={campaignForm.title}
                  onChange={e => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveCampaign(); }}
                  autoFocus
                />

                <input
                  type="text"
                  className="modal-input"
                  placeholder="Description (optional)"
                  value={campaignForm.description}
                  onChange={e => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveCampaign(); }}
                />

                <input
                  type="date"
                  className="modal-input"
                  value={campaignForm.targetDate}
                  onChange={e => setCampaignForm({ ...campaignForm, targetDate: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveCampaign(); }}
                />

                <div className="modal-actions">
                  <button className="modal-btn secondary" onClick={() => setCreatingCampaign(false)}>Cancel</button>
                  <button className="modal-btn primary" onClick={saveCampaign}>Create</button>
                </div>
              </div>
            </div>
          )}

          {/* Home View */}
          {store.currentView === 'home' && !store.currentWorkout && (
            <>
              <div className="home-hero">
                <div className="hero-card">
                  <p className="home-subtitle">Every rep is part of your adventure</p>

                  {/* Primary CTA - Start Workout */}
                  <button
                    className="start-workout-btn"
                    onClick={() => store.startWorkout()}
                  >
                    <span className="start-workout-icon">+</span>
                    <span className="start-workout-text">Start Workout</span>
                  </button>

                  <div className="home-stats" onClick={() => store.setView('profile')} style={{ cursor: 'pointer' }}>
                    <div className="home-stat">
                      <div className="home-stat-value">{unifiedProfile?.level ?? store.profile.level}</div>
                      <div className="home-stat-label">LEVEL</div>
                    </div>
                    <div className="home-stat">
                      <div className="home-stat-value">{store.profile.totalWorkouts}</div>
                      <div className="home-stat-label">WORKOUTS</div>
                    </div>
                    <div className="home-stat">
                      <div className="home-stat-value" style={{ color: '#FFD700' }}>{(unifiedProfile?.xp ?? store.profile.xp).toLocaleString()}</div>
                      <div className="home-stat-label">XP</div>
                    </div>
                  </div>
                  <div className="hero-tap-hint" onClick={() => store.setView('profile')} style={{ cursor: 'pointer' }}>View Profile</div>
                </div>
              </div>

              {/* Today's Focus - Show ONE engaging card (Daily Challenge or Almost There) */}
              <DailyChallengeCard />

              {/* Active Program Widget - Compact */}
              {store.activeProgram && (() => {
                const todaysWorkout = store.getTodaysWorkout();
                const upcomingWorkouts = store.getUpcomingWorkouts(14);
                if (!todaysWorkout && upcomingWorkouts.length === 0) return null;

                const program = todaysWorkout?.program || store.programs.find(p => p.id === store.activeProgram?.programId);
                if (!program) return null;

                const totalDays = program.durationWeeks * (program.cycleLengthDays || 7);
                const completedDays = ((store.activeProgram.currentWeek - 1) * (program.cycleLengthDays || 7)) + store.activeProgram.currentDay - 1;
                const progress = Math.round((completedDays / totalDays) * 100);
                const isMicrocycle = program.cycleType === 'microcycle';
                const cycleLabel = isMicrocycle ? 'Microcycle' : 'Week';

                // Find next uncompleted workout (skip rest days)
                const nextWorkout = upcomingWorkouts.find(w => !w.isCompleted && !w.isRest && w.template);
                const todaySession = upcomingWorkouts.find(w => w.isToday);

                return (
                  <div className="active-program-widget compact">
                    <div className="widget-header-compact">
                      <div className="widget-header-left">
                        <span className="widget-icon">📋</span>
                        <div>
                          <div className="widget-title-compact">{program.name}</div>
                          <div className="widget-subtitle-compact">{cycleLabel} {store.activeProgram.currentWeek} • {progress}%</div>
                        </div>
                      </div>
                      <button
                        className="view-program-btn"
                        onClick={() => store.setView('program-detail')}
                      >
                        View Program
                      </button>
                    </div>

                    {/* Next Up - Show next uncompleted workout */}
                    {nextWorkout && (
                      <button
                        className={`todays-session ${nextWorkout.isToday ? 'today' : ''}`}
                        onClick={() => {
                          store.startProgramWorkoutForDay(nextWorkout.weekNumber, nextWorkout.dayNumber);
                        }}
                      >
                        <div className="session-info">
                          <div className="session-label">
                            {nextWorkout.isToday ? "Today's Session" : `Next Up (${cycleLabel} ${nextWorkout.weekNumber}, Day ${nextWorkout.dayNumber})`}
                          </div>
                          <div className="session-name">
                            {nextWorkout.workoutName}
                          </div>
                        </div>
                        <span className="session-start">Start →</span>
                      </button>
                    )}

                    {/* Show if today is rest or completed */}
                    {!nextWorkout && todaySession && (
                      <div className="todays-session rest" style={{ cursor: 'default' }}>
                        <div className="session-info">
                          <div className="session-label">Today</div>
                          <div className="session-name">
                            {todaySession.isRest ? '😴 Rest Day' : '✓ All caught up!'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Almost There - Upcoming Milestones Carousel (only show >= 95%) */}
              {(() => {
                const upcomingMilestones = store.getUpcomingMilestones().filter(m => m.progress >= 95);
                if (upcomingMilestones.length === 0) return null;

                return (
                  <div className="milestones-carousel-section">
                    <div className="section-header">
                      <p className="section-label">Almost There!</p>
                      <h2 className="section-title">Upcoming Milestones</h2>
                    </div>
                    <div className="milestones-carousel">
                      {upcomingMilestones.map((milestone) => (
                        <div
                          key={`${milestone.exerciseId}-${milestone.targetWeight}`}
                          className="milestone-progress-card"
                          onClick={() => {
                            setChartExerciseId(milestone.exerciseId);
                            setShowProgressChart(true);
                          }}
                        >
                          <div className="milestone-icon">{milestone.milestoneIcon}</div>
                          <div className="milestone-info">
                            <div className="milestone-name">{milestone.milestoneName}</div>
                            <div className="milestone-exercise">{milestone.exerciseName}</div>
                            <div className="milestone-progress-bar">
                              <div
                                className="milestone-progress-fill"
                                style={{ width: `${milestone.progress}%` }}
                              />
                            </div>
                            <div className="milestone-progress-text">
                              {milestone.currentPR}/{milestone.targetWeight} lbs
                            </div>
                          </div>
                          <div className="milestone-xp">+{milestone.xpReward} XP</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {store.workouts.length > 0 && (
                <div className="recent-section">
                  <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p className="section-label">Recent Activity</p>
                      <h2 className="section-title">Your Workouts</h2>
                    </div>
                    <button
                      className="see-all-btn"
                      onClick={() => store.setView('history')}
                    >
                      See All
                    </button>
                  </div>
                  {store.workouts.slice(0, 2).map(workout => (
                    <div
                      key={workout.id}
                      className="workout-card"
                      onClick={() => store.showWorkoutDetail(workout.id)}
                    >
                      <div className="workout-date">{formatDate(workout.startTime)}</div>
                      <div className="workout-summary">
                        {workout.exercises.map(e => e.name).slice(0, 3).join(', ')}
                        {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Templates Section */}
              {store.templates.length > 0 && !store.activeProgram && (
                <div className="quick-templates-section">
                  <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p className="section-label">Quick Start</p>
                      <h2 className="section-title">Your Templates</h2>
                    </div>
                    <button
                      className="see-all-btn"
                      onClick={() => store.setView('templates')}
                    >
                      See All
                    </button>
                  </div>
                  <div className="quick-templates-grid">
                    {store.templates.slice(0, 3).map(template => {
                      const lastUsed = store.workouts.find(w =>
                        w.exercises.length > 0 &&
                        template.exercises.length > 0 &&
                        w.exercises[0].id === template.exercises[0].exerciseId
                      );
                      return (
                        <button
                          key={template.id}
                          className="quick-template-card"
                          onClick={() => store.startWorkoutFromTemplate(template.id)}
                        >
                          <div className="template-icon">🏋️</div>
                          <div className="template-info">
                            <div className="template-name">{template.name}</div>
                            <div className="template-meta">
                              {template.exercises.length} exercises
                              {lastUsed && ` · ${Math.floor((Date.now() - new Date(lastUsed.startTime).getTime()) / (1000 * 60 * 60 * 24))}d ago`}
                            </div>
                          </div>
                          <span className="template-arrow">→</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Access Row */}
              <div className="quick-access-row">
                <button className="quick-access-btn" onClick={() => store.setView('social')}>
                  <span className="quick-access-icon">👥</span>
                  <span className="quick-access-label">Social</span>
                </button>
                <button className="quick-access-btn" onClick={() => store.setView('achievements')}>
                  <span className="quick-access-icon">🏆</span>
                  <span className="quick-access-label">Achievements</span>
                </button>
                <button className="quick-access-btn" onClick={() => store.setView('analytics')}>
                  <span className="quick-access-icon">📊</span>
                  <span className="quick-access-label">Analytics</span>
                </button>
              </div>
            </>
          )}
        </main>

        {/* Command Bar */}
        <div className="command-bar">
          <div className={`command-bar-inner ${inputFocused || query ? 'expanded' : 'collapsed'}`}>
            {(inputFocused || query) && (
              <div className="suggestions">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={suggestion.id + idx}
                    ref={idx === selectedSuggestion ? (el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) : undefined}
                    className={`suggestion ${idx === selectedSuggestion ? 'selected' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); executeCommand(suggestion); }}
                  >
                    <div className="suggestion-icon">{suggestion.icon}</div>
                    <div className="suggestion-text">
                      <div className="suggestion-title">{suggestion.title}</div>
                      <div className="suggestion-subtitle">{suggestion.subtitle}</div>
                    </div>
                    {suggestion.meta && <div className="suggestion-meta">{suggestion.meta}</div>}
                  </div>
                ))}
              </div>
            )}
            <div className="command-input-row">
              <div className="desktop-plus-menu" ref={desktopMenuRef}>
                <button
                  className={`desktop-plus-btn ${desktopMenuOpen ? 'open' : ''}`}
                  onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
                  aria-label="Quick actions menu"
                >
                  +
                </button>
                {desktopMenuOpen && (
                  <div className="desktop-menu-dropdown">
                    {DEFAULT_COMMANDS.slice(0, 8).map((cmd) => (
                      <button
                        key={cmd.id}
                        className="desktop-menu-item"
                        onClick={() => {
                          executeCommand({ type: 'command', ...cmd });
                          setDesktopMenuOpen(false);
                        }}
                      >
                        <span className="desktop-menu-icon">{cmd.icon}</span>
                        <span className="desktop-menu-text">{cmd.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                className="command-input"
                aria-label="Command input - log sets, search exercises, or navigate"
                placeholder={(() => {
                  if (addingGoal) return 'Search exercise for goal...';
                  if (searchingExercises) return 'Search exercises...';
                  // Active workout but viewing different screen
                  if (store.currentWorkout && store.currentView !== 'workout') {
                    return 'Resume workout...';
                  }
                  // In workout view
                  if (store.currentWorkout && store.currentView === 'workout') {
                    const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
                    if (currentEx) {
                      const lastSet = currentEx.sets[currentEx.sets.length - 1];
                      const weight = lastSet?.weight || store.records[currentEx.id] || 135;
                      const reps = lastSet?.reps || 8;
                      return `Log set: ${weight}x${reps}`;
                    }
                    return 'Search exercises...';
                  }
                  return 'What do you want to do?';
                })()}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedSuggestion(0); }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => { setInputFocused(false); setSearchingExercises(false); }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Command Bar */}
        {mobileFabOpen && (
          <div className="mobile-command-bar">
            <div className="mobile-command-inner">
              {suggestions.length > 0 && (
                <div className="mobile-suggestions">
                  {suggestions.slice(0, 5).map((suggestion, i) => (
                    <div
                      key={suggestion.id || i}
                      className={`mobile-suggestion ${i === selectedSuggestion ? 'selected' : ''}`}
                      onClick={() => { executeCommand(suggestion); setMobileFabOpen(false); setQuery(''); }}
                    >
                      <span className="mobile-suggestion-icon">{suggestion.icon}</span>
                      <span className="mobile-suggestion-title">{suggestion.title}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mobile-input-row">
                <input
                  ref={mobileInputRef}
                  type="text"
                  className="mobile-command-input"
                  placeholder={(() => {
                    if (store.currentWorkout && store.currentView === 'workout') {
                      const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
                      if (currentEx) {
                        const lastSet = currentEx.sets[currentEx.sets.length - 1];
                        const weight = lastSet?.weight || store.records[currentEx.id] || 135;
                        const reps = lastSet?.reps || 8;
                        return `Log: ${weight}x${reps}`;
                      }
                    }
                    return 'Search or command...';
                  })()}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedSuggestion(0); }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="mobile-close-btn"
                  onClick={() => { setMobileFabOpen(false); setQuery(''); }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile FAB */}
        <div className="mobile-fab-fitness">
          <button
            className={`fab-btn-fitness ${mobileFabOpen ? 'fab-open' : ''}`}
            onClick={() => setMobileFabOpen(!mobileFabOpen)}
            aria-label={mobileFabOpen ? 'Close menu' : 'Add new'}
            style={{ display: mobileFabOpen ? 'none' : 'flex' }}
          >
            +
          </button>
        </div>

        {/* Mobile Bottom Navigation - Simplified 4-tab structure */}
        <nav className="mobile-bottom-nav">
          <button
            className={`mobile-nav-btn ${store.currentView === 'home' || store.currentView === 'workout' ? 'active' : ''}`}
            onClick={() => store.setView(store.currentWorkout ? 'workout' : 'home')}
          >
            <span className="mobile-nav-icon">🏠</span>
            <span className="mobile-nav-label">Home</span>
          </button>
          <button
            className={`mobile-nav-btn ${['exercises', 'exercise-detail', 'templates', 'template-editor', 'programs', 'program-wizard', 'program-detail'].includes(store.currentView) ? 'active' : ''}`}
            onClick={() => {
              if (store.currentWorkout) {
                setShowExercisePicker(true);
              } else {
                store.setView('exercises');
              }
            }}
          >
            <span className="mobile-nav-icon">📚</span>
            <span className="mobile-nav-label">Library</span>
          </button>
          <button
            className={`mobile-nav-btn ${store.currentView === 'history' || store.currentView === 'workout-detail' ? 'active' : ''}`}
            onClick={() => store.setView('history')}
          >
            <span className="mobile-nav-icon">📋</span>
            <span className="mobile-nav-label">History</span>
          </button>
          <button
            className={`mobile-nav-btn ${['profile', 'achievements', 'analytics', 'campaigns', 'social'].includes(store.currentView) ? 'active' : ''}`}
            onClick={() => store.setView('profile')}
          >
            <span className="mobile-nav-icon">👤</span>
            <span className="mobile-nav-label">Profile</span>
          </button>
        </nav>

        {/* Set Panel */}
        {showSetPanel && store.currentWorkout && (() => {
          const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
          const currentIdx = store.currentExerciseIndex;
          const lastWorkoutEx = currentEx ? store.getLastWorkoutForExercise(currentEx.id) : null;
          const exerciseNote = currentEx ? store.exerciseNotes[currentEx.id] || '' : '';
          // Calculate progression-aware target
          const templateReps = (currentEx as { _targetReps?: string })?._targetReps;
          const progressionTarget = currentEx ? store.calculateProgressionTarget(currentEx.id, templateReps) : null;
          const isInSuperset = !!currentEx?.supersetGroup;
          const canLinkToPrev = currentIdx > 0;
          return (
          <>
            <div className="set-panel-overlay" onClick={() => setShowSetPanel(false)} />
            <div className="set-panel">
              <div className="set-panel-header">
                <span className="set-panel-title">{currentEx?.name}</span>
                <div className="set-panel-header-actions">
                  {canLinkToPrev && (
                    <button
                      className={`superset-btn ${isInSuperset ? 'active' : ''}`}
                      onClick={() => {
                        if (isInSuperset) {
                          store.unlinkSuperset(currentIdx);
                        } else {
                          store.linkSuperset(currentIdx);
                        }
                      }}
                      title={isInSuperset ? 'Unlink superset' : 'Link with previous exercise'}
                    >
                      {isInSuperset ? '🔗' : '⛓️'}
                    </button>
                  )}
                  <button
                    className="chart-btn"
                    onClick={() => setShowSubstituteModal(true)}
                    title="Substitute exercise"
                  >
                    🔄
                  </button>
                  <button
                    className="chart-btn"
                    onClick={() => {
                      if (currentEx) {
                        setChartExerciseId(currentEx.id);
                        setShowProgressChart(true);
                      }
                    }}
                    title="View progress chart"
                  >
                    📈
                  </button>
                  {exerciseNote && <span className="note-indicator" title="Has note">📝</span>}
                  <button className="minimize-btn" onClick={() => setShowSetPanel(false)} title="Minimize">▼</button>
                </div>
              </div>

              <div className="set-panel-content" ref={setPanelContentRef}>
              {/* Target Prescription from Program/Template with Progression */}
              {progressionTarget && (progressionTarget.weight || progressionTarget.reps) && (
                <div className="target-prescription">
                  <span className="target-label">Target:</span>
                  <span className="target-values">
                    {progressionTarget.weight && (
                      <span className="target-weight">{progressionTarget.weight} lbs</span>
                    )}
                    {progressionTarget.weight && progressionTarget.reps && ' × '}
                    {progressionTarget.reps && (
                      <span className="target-reps">{progressionTarget.reps} reps</span>
                    )}
                    {progressionTarget.rpe && (
                      <span className="target-rpe"> @RPE {progressionTarget.rpe}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Previous Workout Display */}
              {lastWorkoutEx && lastWorkoutEx.sets.length > 0 && editingSetIndex === null && (
                <div className="prev-workout-section">
                  <div className="prev-workout-label">Last time:</div>
                  <div className="prev-workout-sets">
                    {lastWorkoutEx.sets.map((s, i) => (
                      <button
                        key={i}
                        className={`prev-set-badge ${s.isWarmup ? 'warmup' : ''}`}
                        onClick={() => {
                          setSetWeight(s.weight);
                          setSetReps(s.reps);
                          if (s.rpe) setSetRpe(s.rpe);
                        }}
                        title="Click to use these values"
                      >
                        {s.isWarmup && <span className="warmup-w">W</span>}
                        {s.weight}×{s.reps}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Workout Sets Display */}
              {currentEx && currentEx.sets.length > 0 && editingSetIndex === null && (
                <div className="prev-workout-section this-time">
                  <div className="prev-workout-label">This time:</div>
                  <div className="prev-workout-sets">
                    {currentEx.sets.map((s, i) => (
                      <span
                        key={i}
                        className={`prev-set-badge current ${s.isWarmup ? 'warmup' : ''}`}
                      >
                        {s.isWarmup && <span className="warmup-w">W</span>}
                        {s.weight}×{s.reps}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise Notes */}
              <div className="exercise-notes-section">
                <button
                  className="notes-toggle"
                  onClick={() => setShowExerciseNotes(!showExerciseNotes)}
                >
                  {showExerciseNotes ? '▼' : '▶'} Notes {exerciseNote && '•'}
                </button>
                {showExerciseNotes && (
                  <textarea
                    className="exercise-notes-input"
                    placeholder="Add notes for this exercise..."
                    value={exerciseNote}
                    onChange={(e) => currentEx && store.setExerciseNote(currentEx.id, e.target.value)}
                    rows={2}
                  />
                )}
              </div>

              <div className="set-inputs">
                <div className="input-group">
                  <input
                    ref={weightInputRef}
                    type="number"
                    value={setWeight}
                    onChange={(e) => setSetWeight(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        repsInputRef.current?.focus({ preventScroll: true });
                        repsInputRef.current?.select();
                      }
                    }}
                    inputMode="decimal"
                  />
                  <div className="input-label">
                    lbs
                    <button
                      className="plate-calc-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setPlateCalcWeight(setWeight);
                        setShowPlateCalc(true);
                      }}
                      title="Plate calculator"
                    >
                      🧮
                    </button>
                  </div>
                </div>
                <div className="input-divider">×</div>
                <div className="input-group">
                  <input
                    ref={repsInputRef}
                    type="number"
                    value={setReps}
                    onChange={(e) => setSetReps(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rpeInputRef.current?.focus({ preventScroll: true });
                        rpeInputRef.current?.select();
                      }
                    }}
                    inputMode="numeric"
                  />
                  <div className="input-label">reps</div>
                </div>
                <div className="input-divider rpe-divider">@</div>
                <div className="input-group input-group-small">
                  <input
                    ref={rpeInputRef}
                    type="number"
                    value={setRpe || ''}
                    placeholder="–"
                    onChange={(e) => setSetRpe(e.target.value ? Number(e.target.value) : null)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLogSet();
                      }
                    }}
                    inputMode="decimal"
                    min={1}
                    max={10}
                    step={0.5}
                  />
                  <div className="input-label">rpe</div>
                </div>
              </div>

              {/* Actions Row - Warmup toggle + Log button */}
              <div className="set-actions-row">
                <label className="warmup-toggle-inline">
                  <input
                    type="checkbox"
                    checked={setIsWarmup}
                    onChange={(e) => setSetIsWarmup(e.target.checked)}
                  />
                  <span className="warmup-check-box" />
                  <span className="warmup-label">Warmup</span>
                </label>
                <div className="set-actions-buttons">
                  <button className="log-set-btn" onClick={handleLogSet}>
                    {editingSetIndex !== null ? 'Save Changes' : 'Log Set'}
                  </button>
                  {editingSetIndex === null && store.currentWorkout && store.currentExerciseIndex < store.currentWorkout.exercises.length - 1 && (
                    <button
                      className="next-exercise-btn"
                      onClick={() => {
                        store.selectExercise(store.currentExerciseIndex + 1);
                        setShowSetPanel(false);
                      }}
                      title="Go to next exercise"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>

              {/* Repeat Last Set Button */}
              {editingSetIndex === null && currentEx && currentEx.sets.length > 0 && (
                <button
                  className="repeat-set-btn"
                  onClick={handleRepeatLastSet}
                >
                  ↩ Repeat Last ({currentEx.sets[currentEx.sets.length - 1].weight}×{currentEx.sets[currentEx.sets.length - 1].reps})
                </button>
              )}

              {(editingSetIndex !== null || (currentEx?.sets.length ?? 0) > 0) && (
                <button
                  className="remove-set-btn"
                  onClick={() => {
                    if (editingSetIndex !== null) {
                      handleRemoveSet(store.currentExerciseIndex, editingSetIndex);
                    } else {
                      const sets = currentEx?.sets;
                      if (sets && sets.length > 0) {
                        handleRemoveSet(store.currentExerciseIndex, sets.length - 1);
                      }
                    }
                  }}
                >
                  {editingSetIndex !== null ? 'Delete This Set' : 'Remove Last Set'}
                </button>
              )}

              {/* Rest Timer */}
              {(store.restTimerRunning || store.restTimerSeconds > 0) && (
                <div className="rest-timer-section">
                  <div className="rest-timer-display">
                    <span className="rest-timer-label">Rest</span>
                    <span className="rest-timer-time">
                      {Math.floor(store.restTimerSeconds / 60)}:{(store.restTimerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                    <button className="rest-timer-skip" onClick={() => store.stopRestTimer()}>Skip</button>
                  </div>
                  <div className="rest-timer-bar">
                    <div
                      className="rest-timer-fill"
                      style={{ width: `${(store.restTimerSeconds / store.restTimerPreset) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rest Timer Presets */}
              {!store.restTimerRunning && store.restTimerSeconds === 0 && (
                <div className="rest-timer-presets">
                  <span className="rest-presets-label">Rest timer:</span>
                  {[60, 90, 120, 180].map(seconds => (
                    <button
                      key={seconds}
                      className={`rest-preset-btn ${store.restTimerPreset === seconds ? 'active' : ''}`}
                      onClick={() => store.setRestTimerPreset(seconds)}
                    >
                      {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                    </button>
                  ))}
                </div>
              )}
              </div>{/* end set-panel-content */}
            </div>
          </>
        );
        })()}

        {/* Save Template Modal */}
        {showSaveModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowSaveModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">Save as Template?</div>
              <div className="modal-subtitle">Save this workout to quickly start it again later.</div>
              <input
                type="text"
                className="modal-input"
                placeholder="Template name (e.g., Push Day)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFinishWorkout(true); }}
                autoFocus
              />
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => handleFinishWorkout(false)}>Skip</button>
                <button className="modal-btn primary" onClick={() => handleFinishWorkout(true)}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Workout Summary Modal */}
        {showWorkoutSummary && workoutSummaryData && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowWorkoutSummary(false)}>
            <div className="modal workout-summary-modal" onClick={(e) => e.stopPropagation()}>
              <div className="summary-celebration">
                {workoutSummaryData.prsHit.length > 0 ? '🏆' : '💪'}
              </div>
              <div className="summary-title">
                {workoutSummaryData.prsHit.length > 0 ? 'New PR!' : 'Workout Complete!'}
              </div>
              <div className="summary-subtitle">
                {Math.floor(workoutSummaryData.duration / 60)} min · {workoutSummaryData.exercises.length} exercises
              </div>

              {/* XP Earned */}
              <div className="summary-xp-container">
                <div className="summary-xp-label">XP Earned</div>
                <div>
                  <span className="summary-xp-value">+{workoutSummaryData.totalXP.toLocaleString()}</span>
                  <span className="summary-xp-suffix">XP</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="summary-stats-grid">
                <div className="summary-stat">
                  <div className="summary-stat-value">{workoutSummaryData.totalSets}</div>
                  <div className="summary-stat-label">Sets</div>
                </div>
                <div className="summary-stat">
                  <div className="summary-stat-value">{(workoutSummaryData.totalVolume / 1000).toFixed(1)}k</div>
                  <div className="summary-stat-label">Volume (lbs)</div>
                </div>
                <div className="summary-stat">
                  <div className="summary-stat-value">{workoutSummaryData.prsHit.length}</div>
                  <div className="summary-stat-label">PRs</div>
                </div>
              </div>

              {/* PRs Section */}
              {workoutSummaryData.prsHit.length > 0 && (
                <div className="summary-prs-section">
                  <div className="summary-prs-title">
                    <span>🥇</span> Personal Records
                  </div>
                  {workoutSummaryData.prsHit.map((pr, i) => (
                    <div key={i} className="summary-pr-item">
                      <span className="summary-pr-name">{pr.exerciseName}</span>
                      <span className="summary-pr-value">{pr.weight} × {pr.reps}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Volume Comparison */}
              {workoutSummaryData.previousVolume && workoutSummaryData.previousVolume > 0 && (
                <div className="summary-volume-comparison">
                  <span className="volume-comparison-label">vs. similar workout</span>
                  {(() => {
                    const change = ((workoutSummaryData.totalVolume - workoutSummaryData.previousVolume) / workoutSummaryData.previousVolume) * 100;
                    const isPositive = change >= 0;
                    return (
                      <span className={`volume-comparison-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}{change.toFixed(0)}% volume
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* Share Button */}
              <button
                className="summary-share-btn"
                onClick={() => {
                  const text = `Just crushed a ${Math.floor(workoutSummaryData.duration / 60)} min workout!\n\n💪 ${workoutSummaryData.totalSets} sets\n⚡ ${workoutSummaryData.totalXP.toLocaleString()} XP earned\n${workoutSummaryData.prsHit.length > 0 ? `🏆 ${workoutSummaryData.prsHit.length} new PR${workoutSummaryData.prsHit.length > 1 ? 's' : ''}!\n` : ''}\n#Reptura`;
                  if (navigator.share) {
                    navigator.share({ text });
                  } else {
                    navigator.clipboard.writeText(text);
                    store.showToast('Copied to clipboard!');
                  }
                }}
              >
                <span>📤</span> Share Workout
              </button>

              {/* Done Button */}
              <button
                className="summary-done-btn"
                onClick={() => {
                  setShowWorkoutSummary(false);
                  setWorkoutSummaryData(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Progress Chart Modal */}
        {showProgressChart && chartExerciseId && (() => {
          const progressData = store.getExerciseProgressData(chartExerciseId);
          const exerciseName = getExerciseById(chartExerciseId)?.name || 'Exercise';
          const currentPR = store.records[chartExerciseId] || 0;

          // Calculate chart dimensions
          const chartWidth = 300;
          const chartHeight = 150;
          const padding = { top: 20, right: 10, bottom: 30, left: 45 };
          const innerWidth = chartWidth - padding.left - padding.right;
          const innerHeight = chartHeight - padding.top - padding.bottom;

          // Get data for selected metric
          const values = progressData.map(d => d[chartMetric]);
          const minVal = values.length > 0 ? Math.min(...values) * 0.9 : 0;
          const maxVal = values.length > 0 ? Math.max(...values) * 1.1 : 100;

          // Generate path
          const getPath = () => {
            if (progressData.length === 0) return '';
            return progressData.map((d, i) => {
              const x = padding.left + (i / Math.max(progressData.length - 1, 1)) * innerWidth;
              const y = padding.top + innerHeight - ((d[chartMetric] - minVal) / (maxVal - minVal || 1)) * innerHeight;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');
          };

          // Get points for circles
          const getPoints = () => {
            return progressData.map((d, i) => ({
              x: padding.left + (i / Math.max(progressData.length - 1, 1)) * innerWidth,
              y: padding.top + innerHeight - ((d[chartMetric] - minVal) / (maxVal - minVal || 1)) * innerHeight,
              value: d[chartMetric],
              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }));
          };

          return (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowProgressChart(false)}>
              <div className="modal chart-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">{exerciseName}</div>
                <div className="modal-subtitle">
                  PR: {currentPR} lbs · {progressData.length} sessions
                </div>

                {/* Metric Selector */}
                <div className="chart-metric-tabs">
                  <button
                    className={`chart-metric-tab ${chartMetric === 'maxWeight' ? 'active' : ''}`}
                    onClick={() => setChartMetric('maxWeight')}
                  >
                    Max Weight
                  </button>
                  <button
                    className={`chart-metric-tab ${chartMetric === 'e1rm' ? 'active' : ''}`}
                    onClick={() => setChartMetric('e1rm')}
                  >
                    Est. 1RM
                  </button>
                  <button
                    className={`chart-metric-tab ${chartMetric === 'totalVolume' ? 'active' : ''}`}
                    onClick={() => setChartMetric('totalVolume')}
                  >
                    Volume
                  </button>
                </div>

                {progressData.length === 0 ? (
                  <div className="chart-empty">
                    <div className="chart-empty-icon">📊</div>
                    <div className="chart-empty-text">No data yet</div>
                    <div className="chart-empty-hint">Complete workouts with this exercise to see progress</div>
                  </div>
                ) : (
                  <div className="chart-container">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="progress-chart">
                      {/* Y-axis labels */}
                      <text x={padding.left - 5} y={padding.top} className="chart-label" textAnchor="end">
                        {chartMetric === 'totalVolume' ? `${Math.round(maxVal / 1000)}k` : Math.round(maxVal)}
                      </text>
                      <text x={padding.left - 5} y={padding.top + innerHeight} className="chart-label" textAnchor="end">
                        {chartMetric === 'totalVolume' ? `${Math.round(minVal / 1000)}k` : Math.round(minVal)}
                      </text>

                      {/* Grid lines */}
                      <line
                        x1={padding.left} y1={padding.top}
                        x2={padding.left + innerWidth} y2={padding.top}
                        className="chart-grid"
                      />
                      <line
                        x1={padding.left} y1={padding.top + innerHeight / 2}
                        x2={padding.left + innerWidth} y2={padding.top + innerHeight / 2}
                        className="chart-grid"
                      />
                      <line
                        x1={padding.left} y1={padding.top + innerHeight}
                        x2={padding.left + innerWidth} y2={padding.top + innerHeight}
                        className="chart-grid"
                      />

                      {/* Line */}
                      <path d={getPath()} className="chart-line" fill="none" />

                      {/* Points */}
                      {getPoints().map((point, i) => (
                        <g key={i}>
                          <circle cx={point.x} cy={point.y} r={4} className="chart-point" />
                          {/* Show label for first, last, and max */}
                          {(i === 0 || i === progressData.length - 1 || point.value === Math.max(...values)) && (
                            <text
                              x={point.x}
                              y={point.y - 8}
                              className="chart-point-label"
                              textAnchor="middle"
                            >
                              {chartMetric === 'totalVolume' ? `${Math.round(point.value / 1000)}k` : point.value}
                            </text>
                          )}
                        </g>
                      ))}

                      {/* X-axis labels */}
                      {progressData.length > 0 && (
                        <>
                          <text
                            x={padding.left}
                            y={chartHeight - 5}
                            className="chart-label"
                            textAnchor="start"
                          >
                            {new Date(progressData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </text>
                          <text
                            x={padding.left + innerWidth}
                            y={chartHeight - 5}
                            className="chart-label"
                            textAnchor="end"
                          >
                            {new Date(progressData[progressData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </text>
                        </>
                      )}
                    </svg>
                  </div>
                )}

                <button
                  className="modal-btn primary"
                  style={{ marginTop: '16px', width: '100%' }}
                  onClick={() => setShowProgressChart(false)}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}

        {/* Plate Calculator Modal */}
        {showPlateCalc && (() => {
          const PLATES = [45, 35, 25, 10, 5, 2.5];
          const weightPerSide = (plateCalcWeight - plateCalcBar) / 2;
          const plates: number[] = [];
          let remaining = weightPerSide;

          for (const plate of PLATES) {
            while (remaining >= plate) {
              plates.push(plate);
              remaining -= plate;
            }
          }

          const isValid = remaining === 0 && weightPerSide >= 0;

          return (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowPlateCalc(false)}>
              <div className="modal plate-calc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">Plate Calculator</div>
                <div className="modal-subtitle">Calculate plates needed per side</div>

                <div className="plate-calc-inputs">
                  <div className="plate-calc-input-group">
                    <label>Target Weight</label>
                    <input
                      type="number"
                      value={plateCalcWeight}
                      onChange={(e) => setPlateCalcWeight(Number(e.target.value))}
                      inputMode="decimal"
                    />
                    <span>lbs</span>
                  </div>
                  <div className="plate-calc-input-group">
                    <label>Bar Weight</label>
                    <div className="plate-calc-bar-options">
                      {[45, 35, 15].map(w => (
                        <button
                          key={w}
                          className={`plate-calc-bar-btn ${plateCalcBar === w ? 'active' : ''}`}
                          onClick={() => setPlateCalcBar(w)}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {!isValid ? (
                  <div className="plate-calc-error">
                    {weightPerSide < 0
                      ? 'Target weight must be greater than bar weight'
                      : `Cannot make ${weightPerSide} lbs with standard plates (${remaining} lbs remaining)`
                    }
                  </div>
                ) : (
                  <div className="plate-calc-result">
                    <div className="plate-calc-label">Per Side: {weightPerSide} lbs</div>
                    <div className="plate-visual">
                      <div className="plate-bar-end" />
                      {plates.map((plate, i) => (
                        <div
                          key={i}
                          className={`plate plate-${plate.toString().replace('.', '-')}`}
                          title={`${plate} lb`}
                        >
                          {plate}
                        </div>
                      ))}
                      <div className="plate-collar" />
                    </div>
                    <div className="plate-list">
                      {Object.entries(
                        plates.reduce((acc, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {} as Record<number, number>)
                      ).map(([plate, count]) => (
                        <span key={plate} className="plate-count">
                          {count}× {plate} lb
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="plate-calc-actions">
                  <button
                    className="modal-btn secondary"
                    onClick={() => setShowPlateCalc(false)}
                  >
                    Close
                  </button>
                  <button
                    className="modal-btn primary"
                    onClick={() => {
                      setSetWeight(plateCalcWeight);
                      setShowPlateCalc(false);
                    }}
                  >
                    Use Weight
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Onboarding Modal */}
        {showOnboarding && (() => {
          const steps = [
            {
              icon: '⚔️',
              title: 'Welcome to Reptura!',
              content: 'Turn your workouts into an RPG adventure. Track exercises, earn XP, level up, and conquer your fitness goals.',
            },
            {
              icon: '⭐',
              title: 'Earn XP Every Set',
              content: 'Every set earns XP based on weight × reps. Hit personal records for bonus XP and unlock achievements along the way!',
            },
            {
              icon: '📋',
              title: 'Programs & Templates',
              content: 'Create workout templates for quick logging. Build multi-week programs with progression rules to automate your training.',
            },
            {
              icon: '🎯',
              title: 'Campaigns & Goals',
              content: 'Set strength goals with target dates. Track your progress toward hitting new PRs and stay motivated.',
            },
            {
              icon: '📊',
              title: 'Analytics & Progress',
              content: 'View progress charts, estimated 1RM, volume trends, and muscle distribution. Tap any exercise for detailed history.',
            },
            {
              icon: '👥',
              title: 'Train With Friends',
              content: 'Connect with friends, compare on leaderboards, and see their recent workouts. Accountability makes gains!',
            },
            {
              icon: '🔥',
              title: 'Pro Tips',
              content: 'Use the rest timer between sets. Mark warmups (no XP). Add notes to exercises. Try the plate calculator!',
            },
            {
              icon: '🚀',
              title: 'Ready to Lift?',
              content: 'Type an exercise name below to start your first workout. Your quest begins now!',
            },
          ];

          const step = steps[onboardingStep];
          const isLast = onboardingStep === steps.length - 1;

          return (
            <div className="modal-overlay onboarding-overlay">
              <div className="modal onboarding-modal" onClick={(e) => e.stopPropagation()}>
                <div className="onboarding-icon">{step.icon}</div>
                <div className="onboarding-title">{step.title}</div>
                <div className="onboarding-content">{step.content}</div>

                <div className="onboarding-dots">
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`onboarding-dot ${i === onboardingStep ? 'active' : ''}`}
                      onClick={() => setOnboardingStep(i)}
                    />
                  ))}
                </div>

                <div className="onboarding-actions">
                  {onboardingStep > 0 && (
                    <button
                      className="modal-btn secondary"
                      onClick={() => setOnboardingStep(s => s - 1)}
                    >
                      Back
                    </button>
                  )}
                  <button
                    className="modal-btn primary"
                    onClick={() => {
                      if (isLast) {
                        store.completeOnboarding();
                        setShowOnboarding(false);
                      } else {
                        setOnboardingStep(s => s + 1);
                      }
                    }}
                  >
                    {isLast ? 'Start Training' : 'Next'}
                  </button>
                </div>

                <button
                  className="onboarding-skip"
                  onClick={() => {
                    store.completeOnboarding();
                    setShowOnboarding(false);
                  }}
                >
                  Skip tutorial
                </button>
              </div>
            </div>
          );
        })()}

        {/* Exercise Picker Modal */}
        {showExercisePicker && (
          <div className="exercise-picker-overlay">
            <div className="exercise-picker-header">
              <button
                className="exercise-picker-back"
                onClick={() => {
                  if (selectedCategory) {
                    setSelectedCategory(null);
                  } else if (pickerSearchQuery) {
                    setPickerSearchQuery('');
                  } else {
                    setShowExercisePicker(false);
                    setPickerSearchQuery('');
                  }
                }}
              >
                {selectedCategory || pickerSearchQuery ? '←' : '×'}
              </button>
              <div className="exercise-picker-title">
                {selectedCategory
                  ? MUSCLE_CATEGORIES.find(c => c.id === selectedCategory)?.name
                  : pickerSearchQuery
                    ? 'Search Results'
                    : 'Add Exercise'}
              </div>
            </div>
            {/* Search bar */}
            <div className="exercise-picker-search">
              <input
                type="text"
                className="exercise-search-input"
                placeholder="Search exercises or create custom..."
                value={pickerSearchQuery}
                onChange={(e) => {
                  setPickerSearchQuery(e.target.value);
                  setSelectedCategory(null);
                }}
              />
            </div>
            <div className="exercise-picker-content">
              {pickerSearchQuery ? (
                /* Search results mode */
                <div className="exercise-list">
                  {[...EXERCISES, ...store.customExercises]
                    .filter(ex =>
                      ex.name.toLowerCase().includes(pickerSearchQuery.toLowerCase()) ||
                      ex.muscle.toLowerCase().includes(pickerSearchQuery.toLowerCase())
                    )
                    .slice(0, 20)
                    .map((exercise) => {
                      const inWorkout = store.currentWorkout?.exercises.some(e => e.id === exercise.id);
                      const categoryIcon = MUSCLE_CATEGORIES.find(c => c.id === exercise.muscle)?.icon || '🏋️';
                      return (
                        <div
                          key={exercise.id}
                          className={`exercise-item ${inWorkout ? 'in-workout' : ''}`}
                          onClick={() => {
                            if (store.currentWorkout) {
                              // In active workout, add exercise
                              if (!inWorkout) {
                                store.addExerciseToWorkout(exercise.id);
                              }
                              setShowExercisePicker(false);
                              setSelectedCategory(null);
                              setPickerSearchQuery('');
                            } else {
                              // Not in workout - go to exercise detail page
                              setExerciseDetailId(exercise.id);
                              setExerciseDetailReturnView('home');
                              store.setView('exercise-detail');
                              setShowExercisePicker(false);
                              setPickerSearchQuery('');
                            }
                          }}
                        >
                          <div className="exercise-item-icon">{inWorkout ? '✓' : categoryIcon}</div>
                          <div className="exercise-item-info">
                            <div className="exercise-item-name">{exercise.name}</div>
                            <div className="exercise-item-equipment">{exercise.muscle}</div>
                          </div>
                          {inWorkout && <div className="exercise-item-check">Added</div>}
                        </div>
                      );
                    })}
                  {/* Create custom exercise option */}
                  {pickerSearchQuery.length > 1 && (
                    <div
                      className="exercise-item create-custom"
                      onClick={() => {
                        setCreatingCustomExercise({
                          name: pickerSearchQuery.trim(),
                          muscle: 'other',
                          tier: 3,
                          context: 'picker'
                        });
                      }}
                    >
                      <div className="exercise-item-icon">✨</div>
                      <div className="exercise-item-info">
                        <div className="exercise-item-name">Create: &quot;{pickerSearchQuery}&quot;</div>
                        <div className="exercise-item-equipment">Add custom exercise</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : !selectedCategory ? (
                <div className="category-grid">
                  {MUSCLE_CATEGORIES.map((category) => {
                    const count = [...EXERCISES, ...store.customExercises].filter(
                      ex => ex.muscle === category.id
                    ).length;
                    return (
                      <div
                        key={category.id}
                        className="category-card"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <div className="category-icon">{category.icon}</div>
                        <div className="category-name">{category.name}</div>
                        <div className="category-count">{count} exercises</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="exercise-list">
                  {[...EXERCISES, ...store.customExercises]
                    .filter(ex => ex.muscle === selectedCategory)
                    .map((exercise) => {
                      const inWorkout = store.currentWorkout?.exercises.some(e => e.id === exercise.id);
                      return (
                        <div
                          key={exercise.id}
                          className={`exercise-item ${inWorkout ? 'in-workout' : ''}`}
                          onClick={() => {
                            if (store.currentWorkout) {
                              // In active workout, add exercise
                              if (!inWorkout) {
                                store.addExerciseToWorkout(exercise.id);
                              }
                              setShowExercisePicker(false);
                              setSelectedCategory(null);
                              setPickerSearchQuery('');
                            } else {
                              // Not in workout - go to exercise detail page
                              setExerciseDetailId(exercise.id);
                              setExerciseDetailReturnView('home');
                              store.setView('exercise-detail');
                              setShowExercisePicker(false);
                              setSelectedCategory(null);
                              setPickerSearchQuery('');
                            }
                          }}
                        >
                          <div className="exercise-item-icon">
                            {inWorkout ? '✓' : MUSCLE_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                          </div>
                          <div className="exercise-item-info">
                            <div className="exercise-item-name">{exercise.name}</div>
                            <div className="exercise-item-equipment">{exercise.equipment}</div>
                          </div>
                          {inWorkout && <div className="exercise-item-check">Added</div>}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast */}
        {store.toastMessage && <div className="toast">{store.toastMessage}</div>}

        {/* Sync Status Indicator */}
        {(!store.isOnline || store.pendingSync) && (
          <div className={`sync-indicator ${!store.isOnline ? 'offline' : store.syncStatus === 'syncing' ? 'syncing' : store.syncStatus === 'error' ? 'error' : 'pending'}`}>
            <span className="sync-icon">
              {!store.isOnline ? '📵' : store.syncStatus === 'syncing' ? '🔄' : store.syncStatus === 'error' ? '⚠️' : '☁️'}
            </span>
            <span className="sync-text">
              {!store.isOnline
                ? 'Offline - changes saved locally'
                : store.syncStatus === 'syncing'
                  ? 'Syncing...'
                  : store.syncStatus === 'error'
                    ? `Sync failed (retry ${store.syncRetryCount}/5)`
                    : 'Pending sync'}
            </span>
          </div>
        )}

        {/* Hidden file input for CSV import */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleCSVImport(file);
              e.target.value = ''; // Reset for re-import
            }
          }}
        />

        {/* Import Progress Overlay */}
        {importing && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ textAlign: 'center' }}>
              <div className="modal-header">Importing Workouts...</div>
              <div className="modal-subtitle">
                Processing {importProgress.current.toLocaleString()} of {importProgress.total.toLocaleString()} rows
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginTop: '16px'
              }}>
                <div style={{
                  width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.2s ease'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Body Stats Modal */}
        {editingBodyStats && (
          <div className="body-stats-modal" onClick={() => setEditingBodyStats(false)}>
            <div className="body-stats-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="body-stats-modal-title">Edit Body Stats</div>

              <div className="body-stats-field">
                <div className="body-stats-field-label">📏 Height</div>
                <div className="body-stats-input-row">
                  <input
                    type="number"
                    className="body-stats-input"
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(Math.max(0, Math.min(9, parseInt(e.target.value) || 0)))}
                    min="0"
                    max="9"
                    inputMode="numeric"
                  />
                  <span className="body-stats-unit">ft</span>
                  <input
                    type="number"
                    className="body-stats-input"
                    value={heightInches}
                    onChange={(e) => setHeightInches(Math.max(0, Math.min(11, parseInt(e.target.value) || 0)))}
                    min="0"
                    max="11"
                    inputMode="numeric"
                  />
                  <span className="body-stats-unit">in</span>
                </div>
              </div>

              <div className="body-stats-field">
                <div className="body-stats-field-label">⚖️ Weight</div>
                <div className="body-stats-input-row">
                  <input
                    type="number"
                    className="body-stats-input"
                    value={bodyWeight || ''}
                    onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="0.1"
                    inputMode="decimal"
                  />
                  <span className="body-stats-unit">lbs</span>
                </div>
              </div>

              <div className="body-stats-actions">
                <button className="body-stats-btn body-stats-btn-cancel" onClick={() => setEditingBodyStats(false)}>
                  Cancel
                </button>
                <button className="body-stats-btn body-stats-btn-save" onClick={handleSaveBodyStats}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Muscle Group Exercises Modal */}
        {viewingMuscleGroup && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setViewingMuscleGroup(null)}>
            <div className="modal muscle-group-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span>{MUSCLE_CATEGORIES.find(c => c.id === viewingMuscleGroup)?.icon || '💪'} </span>
                {viewingMuscleGroup.charAt(0).toUpperCase() + viewingMuscleGroup.slice(1)} Exercises
              </div>
              <div className="muscle-group-list">
                {/* Standard exercises */}
                {EXERCISES.filter(ex => ex.muscle === viewingMuscleGroup).map(exercise => (
                  <div
                    key={exercise.id}
                    className="muscle-group-exercise"
                    onClick={() => {
                      setExerciseDetailReturnView(store.currentView);
                      setExerciseDetailId(exercise.id);
                      store.setView('exercise-detail');
                      setViewingMuscleGroup(null);
                    }}
                  >
                    <div className="muscle-group-exercise-info">
                      <div className="muscle-group-exercise-name">{exercise.name}</div>
                      <div className="muscle-group-exercise-equipment">{exercise.equipment}</div>
                    </div>
                    {store.records[exercise.id] && (
                      <div className="muscle-group-exercise-pr">PR: {store.records[exercise.id]} lbs</div>
                    )}
                  </div>
                ))}
                {/* Custom exercises in this muscle group */}
                {store.customExercises.filter(ex => ex.muscle === viewingMuscleGroup).map(exercise => (
                  <div key={exercise.id} className="muscle-group-exercise custom">
                    <div
                      className="muscle-group-exercise-info"
                      onClick={() => {
                        setEditingCustomExercise(exercise);
                      }}
                    >
                      <div className="muscle-group-exercise-name">
                        {exercise.name}
                        <span className="custom-badge">Custom</span>
                      </div>
                      <div className="muscle-group-exercise-equipment">Tap to edit category</div>
                    </div>
                    {store.records[exercise.id] && (
                      <div className="muscle-group-exercise-pr">PR: {store.records[exercise.id]} lbs</div>
                    )}
                    <button
                      className="edit-muscle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomExercise(exercise);
                      }}
                    >
                      ✎
                    </button>
                  </div>
                ))}
                {/* Show custom exercises from "other" category that might belong here */}
                {viewingMuscleGroup === 'other' && store.customExercises.filter(ex => ex.muscle === 'other').length === 0 && (
                  <div className="muscle-group-empty">
                    <p>No custom exercises in this category yet.</p>
                    <p>Custom exercises default here until you categorize them.</p>
                  </div>
                )}
              </div>
              <button className="modal-btn" onClick={() => setViewingMuscleGroup(null)}>Close</button>
            </div>
          </div>
        )}

        {/* Substitute Exercise Modal (Full Screen) */}
        {showSubstituteModal && store.currentWorkout && (() => {
          const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
          if (!currentEx) return null;

          const substituteIds = getExerciseSubstitutes(currentEx.id);
          const substitutes = substituteIds
            .map(id => [...EXERCISES, ...store.customExercises].find(e => e.id === id))
            .filter(Boolean) as { id: string; name: string; muscle: string; equipment?: string }[];

          // Search results from library
          const allExercises = [...EXERCISES, ...store.customExercises];
          const searchResults = substituteSearchQuery.trim().length >= 2
            ? allExercises.filter(ex =>
                ex.id !== currentEx.id &&
                !substituteIds.includes(ex.id) &&
                ex.name.toLowerCase().includes(substituteSearchQuery.toLowerCase())
              ).slice(0, 20)
            : [];

          return (
            <div className="substitute-fullscreen">
              {/* Header */}
              <div className="substitute-fullscreen-header">
                <button
                  className="substitute-back-btn"
                  onClick={() => { setShowSubstituteModal(false); setSubstituteSearchQuery(''); }}
                >
                  ←
                </button>
                <div className="substitute-header-text">
                  <div className="substitute-header-title">Substitute Exercise</div>
                  <div className="substitute-header-subtitle">Replace {currentEx.name}</div>
                </div>
              </div>

              {/* Content */}
              <div className="substitute-fullscreen-content">
                {/* Search - sticky at top */}
                <div className="substitute-fullscreen-search">
                  <input
                    type="text"
                    className="substitute-search-input"
                    placeholder="Search exercises..."
                    value={substituteSearchQuery}
                    onChange={e => setSubstituteSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Suggested Substitutes */}
                {substitutes.length > 0 && !substituteSearchQuery && (
                  <>
                    <div className="substitute-section-label">Suggested Substitutes</div>
                    <div className="substitute-list">
                      {substitutes.map(sub => (
                        <button
                          key={sub.id}
                          className="substitute-option"
                          onClick={() => {
                            store.substituteExercise(store.currentExerciseIndex, sub.id, sub.name);
                            setShowSubstituteModal(false);
                            setSubstituteSearchQuery('');
                          }}
                        >
                          <span className="substitute-name">{sub.name}</span>
                          <span className="substitute-info">{sub.equipment || sub.muscle}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <>
                    <div className="substitute-section-label">Search Results</div>
                    <div className="substitute-list">
                      {searchResults.map(ex => (
                        <button
                          key={ex.id}
                          className="substitute-option"
                          onClick={() => {
                            store.substituteExercise(store.currentExerciseIndex, ex.id, ex.name);
                            setShowSubstituteModal(false);
                            setSubstituteSearchQuery('');
                          }}
                        >
                          <span className="substitute-name">{ex.name}</span>
                          <span className="substitute-info">{ex.equipment || ex.muscle}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* No results - offer to create */}
                {substituteSearchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="substitute-no-results">
                    <div className="no-substitutes">No exercises found matching "{substituteSearchQuery}"</div>
                    <button
                      className="substitute-create-btn"
                      onClick={() => {
                        setCreatingCustomExercise({
                          name: substituteSearchQuery.trim(),
                          muscle: 'other',
                          tier: 3,
                          context: 'substitute'
                        });
                        setShowSubstituteModal(false);
                        setSubstituteSearchQuery('');
                      }}
                    >
                      <span className="substitute-create-icon">+</span>
                      Create "{substituteSearchQuery.trim()}"
                    </button>
                  </div>
                )}

                {/* Create new option when results exist */}
                {substituteSearchQuery.trim().length >= 2 && searchResults.length > 0 && (
                  <button
                    className="substitute-create-btn"
                    onClick={() => {
                      setCreatingCustomExercise({
                        name: substituteSearchQuery.trim(),
                        muscle: 'other',
                        tier: 3,
                        context: 'substitute'
                      });
                      setShowSubstituteModal(false);
                      setSubstituteSearchQuery('');
                    }}
                  >
                    <span className="substitute-create-icon">+</span>
                    Create new: "{substituteSearchQuery.trim()}"
                  </button>
                )}

                {/* Browse all when no search */}
                {!substituteSearchQuery && substitutes.length === 0 && (
                  <div className="no-substitutes">
                    Type to search for an exercise to substitute
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Edit Custom Exercise Modal */}
        {editingCustomExercise && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setEditingCustomExercise(null)}>
            <div className="modal edit-exercise-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">Edit Exercise</div>
              <div className="modal-subtitle">{editingCustomExercise.name}</div>

              <div className="form-group">
                <label>Muscle Group</label>
                <div className="muscle-select-grid">
                  {MUSCLE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      className={`muscle-select-btn ${editingCustomExercise.muscle === cat.id ? 'selected' : ''}`}
                      onClick={() => setEditingCustomExercise({
                        ...editingCustomExercise,
                        muscle: cat.id
                      })}
                    >
                      <span className="muscle-select-icon">{cat.icon}</span>
                      <span className="muscle-select-name">{cat.name}</span>
                    </button>
                  ))}
                  <button
                    className={`muscle-select-btn ${editingCustomExercise.muscle === 'other' ? 'selected' : ''}`}
                    onClick={() => setEditingCustomExercise({
                      ...editingCustomExercise,
                      muscle: 'other'
                    })}
                  >
                    <span className="muscle-select-icon">❓</span>
                    <span className="muscle-select-name">Other</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Exercise Tier</label>
                <div className="tier-select-grid">
                  {[
                    { tier: 1, label: 'T1 Primary', desc: 'Major compound lifts', color: '#FFD700' },
                    { tier: 2, label: 'T2 Secondary', desc: 'Supporting compounds', color: '#5fbf8a' },
                    { tier: 3, label: 'T3 Accessory', desc: 'Isolation exercises', color: '#9ca3af' }
                  ].map(t => (
                    <button
                      key={t.tier}
                      className={`tier-select-btn ${(editingCustomExercise.tier || 3) === t.tier ? 'selected' : ''}`}
                      style={{ '--tier-color': t.color } as React.CSSProperties}
                      onClick={() => setEditingCustomExercise({
                        ...editingCustomExercise,
                        tier: t.tier
                      })}
                    >
                      <span className="tier-select-badge">{t.label}</span>
                      <span className="tier-select-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setEditingCustomExercise(null)}>
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                  onClick={() => {
                    store.updateCustomExercise(editingCustomExercise.id, {
                      muscle: editingCustomExercise.muscle,
                      tier: editingCustomExercise.tier || 3
                    });
                    setEditingCustomExercise(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Custom Exercise Modal */}
        {creatingCustomExercise && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setCreatingCustomExercise(null)}>
            <div className="modal edit-exercise-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">Create Custom Exercise</div>
              <div className="modal-subtitle">{creatingCustomExercise.name}</div>

              <div className="form-group">
                <label>Select Body Part</label>
                <div className="muscle-select-grid">
                  {MUSCLE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      className={`muscle-select-btn ${creatingCustomExercise.muscle === cat.id ? 'selected' : ''}`}
                      onClick={() => setCreatingCustomExercise({
                        ...creatingCustomExercise,
                        muscle: cat.id
                      })}
                    >
                      <span className="muscle-select-icon">{cat.icon}</span>
                      <span className="muscle-select-name">{cat.name}</span>
                    </button>
                  ))}
                  <button
                    className={`muscle-select-btn ${creatingCustomExercise.muscle === 'other' ? 'selected' : ''}`}
                    onClick={() => setCreatingCustomExercise({
                      ...creatingCustomExercise,
                      muscle: 'other'
                    })}
                  >
                    <span className="muscle-select-icon">❓</span>
                    <span className="muscle-select-name">Other</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Exercise Tier</label>
                <div className="tier-select-grid">
                  {[
                    { tier: 1, label: 'T1 Primary', desc: 'Major compound lifts', color: '#FFD700' },
                    { tier: 2, label: 'T2 Secondary', desc: 'Supporting compounds', color: '#5fbf8a' },
                    { tier: 3, label: 'T3 Accessory', desc: 'Isolation exercises', color: '#9ca3af' }
                  ].map(t => (
                    <button
                      key={t.tier}
                      className={`tier-select-btn ${creatingCustomExercise.tier === t.tier ? 'selected' : ''}`}
                      style={{ '--tier-color': t.color } as React.CSSProperties}
                      onClick={() => setCreatingCustomExercise({
                        ...creatingCustomExercise,
                        tier: t.tier
                      })}
                    >
                      <span className="tier-select-badge">{t.label}</span>
                      <span className="tier-select-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setCreatingCustomExercise(null)}>
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                  onClick={() => {
                    const name = creatingCustomExercise.name.trim();
                    const id = name.toLowerCase().replace(/\s+/g, '_');
                    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
                    const muscle = creatingCustomExercise.muscle;
                    const tier = creatingCustomExercise.tier;
                    const context = creatingCustomExercise.context;

                    // Create the custom exercise with selected muscle and tier
                    if (!store.customExercises.find(e => e.id === id)) {
                      store.addCustomExerciseWithMuscle(name, muscle, tier);
                    }

                    // Handle context-specific actions
                    if (context === 'workout') {
                      // Add to current workout or start new one
                      if (store.currentWorkout) {
                        store.addExerciseToWorkout(id);
                      } else {
                        store.startWorkoutWithExercise(id);
                      }
                    } else if (context === 'picker') {
                      // Add to current workout via picker or start new one
                      if (store.currentWorkout) {
                        store.addExerciseToWorkout(id);
                      } else {
                        store.startWorkoutWithExercise(id);
                      }
                      setShowExercisePicker(false);
                      setPickerSearchQuery('');
                    } else if (context === 'template') {
                      // Add to template
                      const template = store.getTemplateById(store.editingTemplateId!);
                      if (template) {
                        const newExercise: TemplateExercise = {
                          exerciseId: id,
                          exerciseName: formattedName,
                          order: template.exercises.length,
                          targetSets: 3,
                          targetReps: '8-12',
                        };
                        store.updateTemplate(template.id, {
                          exercises: [...template.exercises, newExercise]
                        });
                      }
                      setAddingExerciseToTemplate(false);
                      setExerciseSearchQuery('');
                    } else if (context === 'program') {
                      // Add to program workout
                      setNewWorkoutExercises(prev => [...prev, {
                        exerciseId: id,
                        exerciseName: formattedName,
                        targetSets: 3,
                        minReps: 8,
                        maxReps: 12,
                      }]);
                      setAddingExerciseToNewWorkout(false);
                      setNewWorkoutExerciseSearch('');
                    } else if (context === 'substitute') {
                      // Substitute the current exercise with the new one
                      store.substituteExercise(store.currentExerciseIndex, id, formattedName);
                    }

                    setCreatingCustomExercise(null);
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete Exercise Modal */}
        {confirmDeleteExercise && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmDeleteExercise(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '320px' }}>
              <div className="confirm-modal-icon">⚠️</div>
              <div className="modal-header">Remove Exercise?</div>
              <div className="confirm-modal-message">
                Are you sure you want to remove <span className="confirm-modal-exercise-name">{confirmDeleteExercise.name}</span> from this workout?
                {store.currentWorkout && store.currentWorkout.exercises[confirmDeleteExercise.idx]?.sets.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                    {store.currentWorkout.exercises[confirmDeleteExercise.idx].sets.length} logged set(s) will be removed.
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setConfirmDeleteExercise(null)}>
                  Cancel
                </button>
                <button className="modal-btn danger" onClick={confirmRemoveExercise}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Strength Progress Modal */}
        {strengthProgressExercise && (() => {
          const exercise = EXERCISES.find(e => e.id === strengthProgressExercise) ||
            store.customExercises.find(e => e.id === strengthProgressExercise);

          // Filter workouts by time range
          const now = new Date();
          const cutoffDate = strengthProgressRange === '30d' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            : strengthProgressRange === '90d' ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            : strengthProgressRange === '1y' ? new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            : new Date(0);

          // Epley formula for estimated 1RM: weight * (1 + reps / 30)
          const calculateE1RM = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

          // Get all sessions with this exercise
          const sessions = store.workouts
            .filter(w => new Date(w.startTime) >= cutoffDate)
            .filter(w => w.exercises.some(ex => ex.id === strengthProgressExercise))
            .map(w => {
              const ex = w.exercises.find(ex => ex.id === strengthProgressExercise)!;
              const workingSets = ex.sets.filter(s => !s.isWarmup);
              const maxWeight = Math.max(...workingSets.map(s => s.weight), 0);
              // Calculate e1RM for each set and find the best
              const e1RMs = workingSets.map(s => calculateE1RM(s.weight, s.reps));
              const bestE1RM = Math.max(...e1RMs, 0);
              const totalVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
              return {
                date: new Date(w.startTime),
                maxWeight,
                bestE1RM,
                totalVolume,
                sets: workingSets.length
              };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());

          const currentPR = store.records[strengthProgressExercise] || 0;
          const startE1RM = sessions[0]?.bestE1RM || currentPR;
          const latestE1RM = sessions[sessions.length - 1]?.bestE1RM || currentPR;
          const improvement = latestE1RM - startE1RM;
          const maxChartE1RM = Math.max(...sessions.map(s => s.bestE1RM), currentPR);

          return (
            <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setStrengthProgressExercise(null)}>
              <div className="modal strength-progress-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  {exercise?.name || strengthProgressExercise}
                </div>

                {/* Time Range Toggle */}
                <div className="time-range-toggle">
                  {(['30d', '90d', '1y', 'all'] as const).map(range => (
                    <button
                      key={range}
                      className={`range-btn ${strengthProgressRange === range ? 'active' : ''}`}
                      onClick={() => setStrengthProgressRange(range)}
                    >
                      {range === '30d' ? '30D' : range === '90d' ? '90D' : range === '1y' ? '1Y' : 'All'}
                    </button>
                  ))}
                </div>

                {/* Stats Summary */}
                <div className="progress-stats">
                  <div className="progress-stat">
                    <div className="progress-stat-value">{latestE1RM}</div>
                    <div className="progress-stat-label">Est. 1RM (lbs)</div>
                  </div>
                  <div className="progress-stat">
                    <div className="progress-stat-value">{sessions.length}</div>
                    <div className="progress-stat-label">Sessions</div>
                  </div>
                  <div className="progress-stat">
                    <div className={`progress-stat-value ${improvement > 0 ? 'positive' : ''}`}>
                      {improvement > 0 ? '+' : ''}{improvement}
                    </div>
                    <div className="progress-stat-label">Improvement</div>
                  </div>
                </div>

                {/* Progress Chart */}
                {sessions.length > 0 ? (
                  <div className="progress-chart-container">
                    <div className="progress-chart">
                      {sessions.slice(-12).map((session, idx) => (
                        <div key={idx} className="progress-bar-wrapper">
                          <div
                            className="progress-bar-fill"
                            style={{ height: `${(session.bestE1RM / maxChartE1RM) * 100}%` }}
                          >
                            <span className="progress-bar-label">{session.bestE1RM}</span>
                          </div>
                          <div className="progress-bar-date">
                            {session.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="chart-hint">Estimated 1RM per session (last {Math.min(sessions.length, 12)} shown)</div>
                  </div>
                ) : (
                  <div className="no-sessions">
                    <p>No sessions in this time period</p>
                    <p>Try selecting a longer time range</p>
                  </div>
                )}

                {/* Recent Sessions List */}
                {sessions.length > 0 && (
                  <div className="sessions-list">
                    <h4>Recent Sessions</h4>
                    {sessions.slice(-5).reverse().map((session, idx) => (
                      <div key={idx} className="session-row">
                        <div className="session-date">
                          {session.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="session-stats">
                          <span className="session-weight">{session.maxWeight} lbs</span>
                          <span className="session-sets">{session.sets} sets</span>
                          <span className="session-volume">{(session.totalVolume / 1000).toFixed(1)}k vol</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="modal-btn" onClick={() => setStrengthProgressExercise(null)}>Close</button>
              </div>
            </div>
          );
        })()}

        {/* Rival Settings Modal */}
        {showRivalSettings && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowRivalSettings(false)}>
            <div
              className="modal rival-settings-modal"
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(24, 24, 32, 0.98)',
                border: '2px solid var(--accent)',
                borderRadius: '20px',
                maxWidth: '400px',
                width: '95%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFD700' }}>
                  ⚔️ Rival System
                </span>
                <button
                  onClick={() => setShowRivalSettings(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              <RivalSettingsPanel />
            </div>
          </div>
        )}

        {/* Undo Toast */}
        {undoItem && (
          <div className="undo-toast" role="alert" aria-live="assertive">
            <span className="undo-toast-message">
              {undoItem.type === 'set'
                ? `Set removed from ${undoItem.exerciseName}`
                : `${undoItem.exerciseName} removed`
              }
            </span>
            <button className="undo-toast-btn" onClick={handleUndo}>
              Undo
            </button>
            <button className="undo-toast-dismiss" onClick={dismissUndo} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {/* Weekly Wins Modal - Shows Sunday evening or Monday morning */}
        <WeeklyWinsModal />

        {/* Swipe Gesture Hint Overlay */}
        {showSwipeHint && (
          <div className="swipe-hint-overlay" onClick={() => setShowSwipeHint(false)}>
            <span className="swipe-hint-hand">👆</span>
            <span className="swipe-hint-text">Swipe right on a set to remove it</span>
          </div>
        )}
      </div>
    </NarrativeProvider>
  );
}

// Social View Component
function SocialView({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'feed' | 'leaderboard' | 'challenge'>('challenge');
  const [challenge, setChallenge] = useState<any>(null);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [workoutProps, setWorkoutProps] = useState<Record<string, { count: number; hasGivenProps: boolean }>>({});
  const [givingProps, setGivingProps] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get user's timezone offset in minutes
      const tzOffset = new Date().getTimezoneOffset() * -1; // Invert because getTimezoneOffset returns opposite sign
      const [challengeRes, feedRes, leaderboardRes] = await Promise.all([
        fetch(`/api/fitness/challenges?tz=${tzOffset}`),
        fetch('/api/fitness/social?type=feed'),
        fetch('/api/fitness/social?type=leaderboard'),
      ]);

      if (challengeRes.ok) {
        const data = await challengeRes.json();
        setChallenge(data.challenge);
        setDailyChallenge(data.dailyChallenge);
        setWeeklyStats(data.weeklyStats);
      }

      let feedData: any[] = [];
      if (feedRes.ok) {
        const data = await feedRes.json();
        feedData = data.feed || [];
        setFeed(feedData);

        // Load props for all feed items
        if (feedData.length > 0) {
          const workoutKeys = feedData.map((item: any) => item.id).join(',');
          const propsRes = await fetch(`/api/fitness/workout-props?keys=${workoutKeys}`);
          if (propsRes.ok) {
            const propsData = await propsRes.json();
            setWorkoutProps(propsData.props || {});
          }
        }
      }
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error('Failed to load social data:', e);
    }
    setLoading(false);
  };

  const giveProps = async (workoutKey: string) => {
    if (givingProps) return;
    setGivingProps(workoutKey);

    try {
      const hasProps = workoutProps[workoutKey]?.hasGivenProps;

      if (hasProps) {
        // Remove props
        const res = await fetch(`/api/fitness/workout-props?key=${workoutKey}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const data = await res.json();
          setWorkoutProps(prev => ({
            ...prev,
            [workoutKey]: { count: data.count, hasGivenProps: false },
          }));
        }
      } else {
        // Give props
        const res = await fetch('/api/fitness/workout-props', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workoutKey }),
        });
        if (res.ok) {
          const data = await res.json();
          setWorkoutProps(prev => ({
            ...prev,
            [workoutKey]: { count: data.count, hasGivenProps: true },
          }));
        }
      }
    } catch (e) {
      console.error('Failed to give props:', e);
    }
    setGivingProps(null);
  };

  const claimReward = async (isDaily: boolean = false) => {
    const targetChallenge = isDaily ? dailyChallenge : challenge;
    if (!targetChallenge || (isDaily ? claimingDaily : claiming)) return;

    if (isDaily) {
      setClaimingDaily(true);
    } else {
      setClaiming(true);
    }

    try {
      const tzOffset = new Date().getTimezoneOffset() * -1;
      const res = await fetch('/api/fitness/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: targetChallenge.id,
          type: isDaily ? 'daily' : 'weekly',
          tz: tzOffset,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isDaily) {
          setDailyChallenge({ ...dailyChallenge, claimed: true });
        } else {
          setChallenge({ ...challenge, claimed: true });
        }
        alert(`🎉 +${data.xp_awarded} XP claimed!`);
      }
    } catch (e) {
      console.error('Failed to claim reward:', e);
    }

    if (isDaily) {
      setClaimingDaily(false);
    } else {
      setClaiming(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="view-content">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="view-title">Social</span>
      </div>

      {/* Tab Selector */}
      <div className="social-tabs">
        <button
          className={`social-tab ${activeTab === 'challenge' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenge')}
        >
          🏆 Challenge
        </button>
        <button
          className={`social-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          📰 Feed
        </button>
        <button
          className={`social-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏅 Ranks
        </button>
      </div>

      {loading ? (
        <div className="social-loading">
          <div className="loading-spinner" />
          <div>Loading...</div>
        </div>
      ) : (
        <>
          {/* Challenges Tab */}
          {activeTab === 'challenge' && (
            <div className="challenge-section">
              {/* Daily Challenge */}
              {dailyChallenge && (
                <>
                  <div className="challenge-section-label">Daily Challenge</div>
                  <div className="challenge-card daily">
                    <div className="challenge-header">
                      <span className="challenge-icon">{dailyChallenge.icon}</span>
                      <div className="challenge-info">
                        <div className="challenge-name">{dailyChallenge.name}</div>
                        <div className="challenge-desc">{dailyChallenge.description}</div>
                      </div>
                      <div className="challenge-timer daily">
                        {dailyChallenge.hoursUntilReset}h left
                      </div>
                    </div>
                    <div className="challenge-progress">
                      <div className="challenge-progress-bar daily">
                        <div
                          className="challenge-progress-fill daily"
                          style={{ width: `${dailyChallenge.progressPercent}%` }}
                        />
                      </div>
                      <div className="challenge-progress-text">
                        {dailyChallenge.progress.toLocaleString()} / {dailyChallenge.target.toLocaleString()}
                      </div>
                    </div>
                    <div className="challenge-reward">
                      <span className="challenge-xp">+{dailyChallenge.xp_reward} XP</span>
                      {dailyChallenge.completed ? (
                        dailyChallenge.claimed ? (
                          <span className="challenge-claimed">✓ Claimed</span>
                        ) : (
                          <button
                            className="challenge-claim-btn"
                            onClick={() => claimReward(true)}
                            disabled={claimingDaily}
                          >
                            {claimingDaily ? 'Claiming...' : 'Claim Reward'}
                          </button>
                        )
                      ) : (
                        <span className="challenge-pending">In Progress</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Weekly Challenge */}
              {challenge && (
                <>
                  <div className="challenge-section-label">Weekly Challenge</div>
                  <div className="challenge-card">
                    <div className="challenge-header">
                      <span className="challenge-icon">{challenge.icon}</span>
                      <div className="challenge-info">
                        <div className="challenge-name">{challenge.name}</div>
                        <div className="challenge-desc">{challenge.description}</div>
                      </div>
                      <div className="challenge-timer">
                        {challenge.daysUntilReset}d left
                      </div>
                    </div>
                    <div className="challenge-progress">
                      <div className="challenge-progress-bar">
                        <div
                          className="challenge-progress-fill"
                          style={{ width: `${challenge.progressPercent}%` }}
                        />
                      </div>
                      <div className="challenge-progress-text">
                        {challenge.progress.toLocaleString()} / {challenge.target.toLocaleString()}
                      </div>
                    </div>
                    <div className="challenge-reward">
                      <span className="challenge-xp">+{challenge.xp_reward} XP</span>
                      {challenge.completed ? (
                        challenge.claimed ? (
                          <span className="challenge-claimed">✓ Claimed</span>
                        ) : (
                          <button
                            className="challenge-claim-btn"
                            onClick={() => claimReward(false)}
                            disabled={claiming}
                          >
                            {claiming ? 'Claiming...' : 'Claim Reward'}
                          </button>
                        )
                      ) : (
                        <span className="challenge-pending">In Progress</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {weeklyStats && (
                <div className="weekly-stats-card">
                  <div className="weekly-stats-title">📊 This Week</div>
                  <div className="weekly-stats-grid">
                    <div className="weekly-stat">
                      <div className="weekly-stat-value">{weeklyStats.workouts}</div>
                      <div className="weekly-stat-label">Workouts</div>
                    </div>
                    <div className="weekly-stat">
                      <div className="weekly-stat-value">{weeklyStats.sets}</div>
                      <div className="weekly-stat-label">Sets</div>
                    </div>
                    <div className="weekly-stat">
                      <div className="weekly-stat-value">{(weeklyStats.volume / 1000).toFixed(0)}k</div>
                      <div className="weekly-stat-label">Volume (lbs)</div>
                    </div>
                    <div className="weekly-stat">
                      <div className="weekly-stat-value">{weeklyStats.days}</div>
                      <div className="weekly-stat-label">Active Days</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Feed Tab */}
          {activeTab === 'feed' && (
            <div className="feed-section">
              {feed.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <div className="empty-title">No activity yet</div>
                  <div className="empty-subtitle">Add friends to see their workouts here</div>
                </div>
              ) : (
                feed.map((item) => (
                  <div key={item.id} className="feed-item">
                    <div className="feed-item-header">
                      <div className="feed-avatar">
                        {item.user.avatar_url ? (
                          <img src={item.user.avatar_url} alt="" />
                        ) : (
                          <span>{item.user.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="feed-user-info">
                        <div className="feed-user-name">{item.user.name}</div>
                        <div className="feed-time">{formatTimeAgo(item.timestamp)}</div>
                      </div>
                      <div className="feed-xp">+{item.workout.xp} XP</div>
                    </div>
                    <div className="feed-workout">
                      <div className="feed-workout-stat">
                        <span className="feed-stat-value">{item.workout.exercises}</span>
                        <span className="feed-stat-label">exercises</span>
                      </div>
                      <div className="feed-workout-stat">
                        <span className="feed-stat-value">{item.workout.sets}</span>
                        <span className="feed-stat-label">sets</span>
                      </div>
                      <div className="feed-workout-stat">
                        <span className="feed-stat-value">{(item.workout.volume / 1000).toFixed(0)}k</span>
                        <span className="feed-stat-label">lbs</span>
                      </div>
                    </div>
                    <div className="feed-actions">
                      <button
                        className={`props-btn ${workoutProps[item.id]?.hasGivenProps ? 'active' : ''}`}
                        onClick={() => giveProps(item.id)}
                        disabled={givingProps === item.id}
                      >
                        <span className="props-icon">🔥</span>
                        <span className="props-text">
                          {workoutProps[item.id]?.hasGivenProps ? 'Props!' : 'Give Props'}
                        </span>
                        {workoutProps[item.id]?.count > 0 && (
                          <span className="props-count">{workoutProps[item.id].count}</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="leaderboard-section">
              {leaderboard.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏅</div>
                  <div className="empty-title">No rankings yet</div>
                  <div className="empty-subtitle">Add friends to compare progress</div>
                </div>
              ) : (
                leaderboard.map((entry) => (
                  <div
                    key={entry.id}
                    className={`leaderboard-item ${entry.is_self ? 'is-self' : ''}`}
                  >
                    <div className="leaderboard-rank">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </div>
                    <div className="leaderboard-avatar">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" />
                      ) : (
                        <span>{entry.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="leaderboard-info">
                      <div className="leaderboard-name">
                        {entry.name} {entry.is_self && '(You)'}
                      </div>
                      <div className="leaderboard-stats">
                        Lv.{entry.level} · {entry.total_workouts} workouts
                      </div>
                    </div>
                    <div className="leaderboard-xp">
                      {entry.xp.toLocaleString()} XP
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .social-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .social-tab {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-secondary);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .social-tab.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }
        .social-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-tertiary);
          gap: 12px;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Challenge Styles */
        .challenge-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .challenge-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }
        .challenge-icon {
          font-size: 32px;
        }
        .challenge-info {
          flex: 1;
        }
        .challenge-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .challenge-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .challenge-timer {
          background: var(--bg-tertiary);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .challenge-progress {
          margin-bottom: 16px;
        }
        .challenge-progress-bar {
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          overflow: hidden;
        }
        .challenge-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), #FFD700);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .challenge-progress-text {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 6px;
          text-align: right;
        }
        .challenge-reward {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .challenge-xp {
          font-size: 18px;
          font-weight: 700;
          color: var(--gold);
        }
        .challenge-claim-btn {
          padding: 10px 20px;
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .challenge-claim-btn:disabled {
          opacity: 0.7;
        }
        .challenge-claimed {
          color: var(--success);
          font-weight: 600;
          font-size: 14px;
        }
        .challenge-pending {
          color: var(--text-tertiary);
          font-size: 14px;
        }

        /* Daily Challenge Specific Styles */
        .challenge-section-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          margin-top: 8px;
        }
        .challenge-section-label:first-child {
          margin-top: 0;
        }
        .challenge-card.daily {
          border-color: rgba(59, 130, 246, 0.3);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02));
        }
        .challenge-timer.daily {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }
        .challenge-progress-bar.daily {
          background: rgba(59, 130, 246, 0.15);
        }
        .challenge-progress-fill.daily {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }

        /* Weekly Stats */
        .weekly-stats-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
        }
        .weekly-stats-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        .weekly-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .weekly-stat {
          text-align: center;
        }
        .weekly-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .weekly-stat-label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-top: 4px;
        }

        /* Feed Styles */
        .feed-item {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .feed-item-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .feed-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--text-secondary);
          overflow: hidden;
        }
        .feed-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .feed-user-info {
          flex: 1;
        }
        .feed-user-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }
        .feed-time {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .feed-xp {
          font-weight: 700;
          color: var(--gold);
          font-size: 14px;
        }
        .feed-workout {
          display: flex;
          gap: 20px;
        }
        .feed-workout-stat {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .feed-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .feed-stat-label {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .feed-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 12px;
          margin-top: 12px;
          border-top: 1px solid var(--border);
        }

        .props-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .props-btn:hover:not(:disabled) {
          background: color-mix(in srgb, #FF6B35 15%, transparent);
          border-color: #FF6B35;
          color: #FF6B35;
        }

        .props-btn.active {
          background: color-mix(in srgb, #FF6B35 20%, transparent);
          border-color: #FF6B35;
          color: #FF6B35;
        }

        .props-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .props-icon {
          font-size: 16px;
        }

        .props-btn.active .props-icon {
          animation: propsPulse 0.3s ease;
        }

        @keyframes propsPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        .props-text {
          font-weight: 500;
        }

        .props-count {
          background: #FF6B35;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }

        /* Leaderboard Styles */
        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 8px;
        }
        .leaderboard-item.is-self {
          border-color: var(--accent);
          background: rgba(255, 215, 0, 0.05);
        }
        .leaderboard-rank {
          font-size: 18px;
          font-weight: 700;
          min-width: 36px;
          text-align: center;
        }
        .leaderboard-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--text-secondary);
          overflow: hidden;
        }
        .leaderboard-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .leaderboard-info {
          flex: 1;
        }
        .leaderboard-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }
        .leaderboard-stats {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .leaderboard-xp {
          font-weight: 700;
          color: var(--gold);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

// AI Coach View Component
function CoachView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<any>(null);

  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fitness/ai-coach');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Failed to load coach data:', e);
    }
    setLoading(false);
  };

  const loadExerciseTips = async (exerciseId: string) => {
    setSelectedExercise(exerciseId);
    try {
      const res = await fetch(`/api/fitness/ai-coach?exercise=${exerciseId}`);
      if (res.ok) {
        setExerciseData(await res.json());
      }
    } catch (e) {
      console.error('Failed to load exercise tips:', e);
    }
  };

  const getLoadColor = (rec: string) => {
    switch (rec) {
      case 'deload': return '#FF6B6B';
      case 'push': return '#34c759';
      case 'ramp_up': return '#5CC9F5';
      default: return 'var(--text-secondary)';
    }
  };

  const getLoadIcon = (rec: string) => {
    switch (rec) {
      case 'deload': return '⚠️';
      case 'push': return '🚀';
      case 'ramp_up': return '📈';
      default: return '✓';
    }
  };

  return (
    <div className="view-content">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="view-title">AI Coach</span>
      </div>

      {loading ? (
        <div className="coach-loading">
          <div className="loading-spinner" />
          <div>Analyzing your training...</div>
        </div>
      ) : data ? (
        <div className="coach-content">
          {/* Training Load Card */}
          {data.trainingLoad && (
            <div className="coach-card">
              <div className="coach-card-header">
                <span className="coach-card-icon">📊</span>
                <span className="coach-card-title">Training Load</span>
              </div>
              <div className="training-load-stats">
                <div className="load-stat">
                  <div className="load-stat-value">{(data.trainingLoad.thisWeekVolume / 1000).toFixed(0)}k</div>
                  <div className="load-stat-label">This Week (lbs)</div>
                </div>
                <div className="load-stat">
                  <div className="load-stat-value">{data.trainingLoad.volumeChangePercent > 0 ? '+' : ''}{data.trainingLoad.volumeChangePercent}%</div>
                  <div className="load-stat-label">vs Average</div>
                </div>
                <div className="load-stat">
                  <div className="load-stat-value">{data.trainingLoad.consecutiveWeeks}</div>
                  <div className="load-stat-label">Weeks Straight</div>
                </div>
              </div>
              <div className="load-recommendation" style={{ borderLeftColor: getLoadColor(data.trainingLoad.recommendation) }}>
                <span className="load-rec-icon">{getLoadIcon(data.trainingLoad.recommendation)}</span>
                <span className="load-rec-text">{data.trainingLoad.reason}</span>
              </div>
            </div>
          )}

          {/* Insights */}
          {data.insights && data.insights.length > 0 && (
            <div className="coach-card">
              <div className="coach-card-header">
                <span className="coach-card-icon">💡</span>
                <span className="coach-card-title">Insights</span>
              </div>
              <div className="insights-list">
                {data.insights.map((insight: any, i: number) => (
                  <div key={i} className={`insight-item insight-${insight.type}`}>
                    <span className="insight-icon">{insight.icon}</span>
                    <div className="insight-content">
                      <div className="insight-title">{insight.title}</div>
                      <div className="insight-message">{insight.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plateaus */}
          {data.plateaus && data.plateaus.length > 0 && (
            <div className="coach-card">
              <div className="coach-card-header">
                <span className="coach-card-icon">🔒</span>
                <span className="coach-card-title">Plateaus Detected</span>
              </div>
              <div className="plateaus-list">
                {data.plateaus.map((plateau: any, i: number) => (
                  <div
                    key={i}
                    className="plateau-item"
                    onClick={() => loadExerciseTips(plateau.exerciseId)}
                  >
                    <div className="plateau-info">
                      <div className="plateau-name">{plateau.exerciseName}</div>
                      <div className="plateau-detail">
                        Stuck at {plateau.currentMax} lbs for {plateau.weeks} weeks
                      </div>
                    </div>
                    <div className="plateau-action">Tips →</div>
                  </div>
                ))}
              </div>
              <div className="plateau-tips">
                <div className="tips-header">💡 Breaking Plateaus</div>
                <ul className="tips-list">
                  <li>Try adding micro plates (1.25 lb increments)</li>
                  <li>Switch up rep ranges (5x5 → 4x8)</li>
                  <li>Add pause reps or tempo work</li>
                  <li>Consider a deload week to recover</li>
                </ul>
              </div>
            </div>
          )}

          {/* No plateaus message */}
          {data.plateaus && data.plateaus.length === 0 && data.totalWorkouts > 5 && (
            <div className="coach-card">
              <div className="coach-card-header">
                <span className="coach-card-icon">✨</span>
                <span className="coach-card-title">Progressing Well!</span>
              </div>
              <div className="no-plateaus">
                No plateaus detected. Keep hitting those PRs!
              </div>
            </div>
          )}

          {/* Minimum workout message */}
          {data.totalWorkouts < 5 && (
            <div className="coach-card">
              <div className="coach-card-header">
                <span className="coach-card-icon">📝</span>
                <span className="coach-card-title">Keep Logging</span>
              </div>
              <div className="no-plateaus">
                Log more workouts for personalized insights. ({data.totalWorkouts}/5 minimum)
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <div className="empty-title">No data available</div>
          <div className="empty-subtitle">Start logging workouts for AI coaching insights</div>
        </div>
      )}

      {/* Exercise Tips Modal */}
      {selectedExercise && exerciseData && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedExercise(null)}>
          <div className="modal coach-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">Form Tips</div>
            <div className="modal-subtitle">
              PR: {exerciseData.pr} lbs · {exerciseData.sessions} sessions
            </div>

            {exerciseData.tips && exerciseData.tips.length > 0 ? (
              <div className="form-tips">
                {exerciseData.tips.map((tip: string, i: number) => (
                  <div key={i} className="form-tip">
                    <span className="tip-number">{i + 1}</span>
                    <span className="tip-text">{tip}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-tips">
                No specific tips available for this exercise.
              </div>
            )}

            <button
              className="modal-btn primary"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={() => setSelectedExercise(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .coach-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-tertiary);
          gap: 12px;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .coach-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .coach-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
        }
        .coach-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .coach-card-icon {
          font-size: 20px;
        }
        .coach-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Training Load */
        .training-load-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }
        .load-stat {
          text-align: center;
        }
        .load-stat-value {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .load-stat-label {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 4px;
        }
        .load-recommendation {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          border-left: 3px solid var(--accent);
        }
        .load-rec-icon {
          font-size: 18px;
        }
        .load-rec-text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        /* Insights */
        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .insight-item {
          display: flex;
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          background: var(--bg-tertiary);
        }
        .insight-item.insight-warning {
          background: rgba(255, 107, 107, 0.1);
        }
        .insight-item.insight-achievement {
          background: rgba(255, 215, 0, 0.1);
        }
        .insight-icon {
          font-size: 20px;
        }
        .insight-content {
          flex: 1;
        }
        .insight-title {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }
        .insight-message {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        /* Plateaus */
        .plateaus-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .plateau-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          cursor: pointer;
        }
        .plateau-item:active {
          opacity: 0.8;
        }
        .plateau-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }
        .plateau-detail {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .plateau-action {
          color: var(--accent);
          font-size: 13px;
          font-weight: 600;
        }
        .plateau-tips {
          padding: 12px;
          background: rgba(255, 215, 0, 0.05);
          border-radius: 10px;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }
        .tips-header {
          font-weight: 600;
          color: var(--gold);
          font-size: 13px;
          margin-bottom: 8px;
        }
        .tips-list {
          margin: 0;
          padding-left: 16px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .tips-list li {
          margin-bottom: 4px;
        }
        .no-plateaus {
          color: var(--text-secondary);
          font-size: 14px;
          text-align: center;
          padding: 12px;
        }

        /* Form Tips Modal */
        .coach-modal {
          max-width: 360px;
        }
        .form-tips {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
        }
        .form-tip {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .tip-number {
          width: 24px;
          height: 24px;
          background: var(--accent);
          color: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .tip-text {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .no-tips {
          color: var(--text-tertiary);
          font-size: 14px;
          text-align: center;
          padding: 20px;
        }
      `}</style>
    </div>
  );
}

function WorkoutDetailView({
  workout,
  records,
  onBack,
  onRepeat,
  onEdit,
  onDelete,
  onUpdateTimes
}: {
  workout: Workout;
  records: Record<string, number>;
  onBack: () => void;
  onRepeat: (workout: Workout) => void;
  onEdit: (workoutId: string) => void;
  onDelete: (workoutId: string) => void;
  onUpdateTimes: (workoutId: string, startTime: string, endTime: string) => void;
}) {
  const [editingTimes, setEditingTimes] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  if (!workout) return null;

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const formatDuration = (seconds?: number) => seconds ? `${Math.floor(seconds / 60)} min` : '--';
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Convert ISO to datetime-local format for input
  const toDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleEditTimes = () => {
    setEditStartTime(toDateTimeLocal(workout.startTime));
    setEditEndTime(workout.endTime ? toDateTimeLocal(workout.endTime) : toDateTimeLocal(workout.startTime));
    setEditingTimes(true);
  };

  const handleSaveTimes = () => {
    const startISO = new Date(editStartTime).toISOString();
    const endISO = new Date(editEndTime).toISOString();
    onUpdateTimes(workout.id, startISO, endISO);
    setEditingTimes(false);
  };

  return (
    <div className="view-content">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="view-title">{formatDate(workout.startTime)}</span>
      </div>

      {/* Time editing section */}
      {editingTimes ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Edit Workout Times</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Start Time</span>
              <input
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                style={{
                  padding: '10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>End Time</span>
              <input
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                style={{
                  padding: '10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => setEditingTimes(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTimes}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '12px 16px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {formatTime(workout.startTime)} – {workout.endTime ? formatTime(workout.endTime) : '--'}
          </div>
          <button
            onClick={handleEditTimes}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Edit Times
          </button>
        </div>
      )}

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-around',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent)' }}>+{workout.totalXP}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '4px' }}>XP Earned</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '4px' }}>Sets</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatDuration(workout.duration)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '4px' }}>Duration</div>
        </div>
      </div>

      {workout.exercises.map((exercise, idx) => (
        <div
          key={exercise.id + idx}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '8px'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '10px', fontSize: '15px', color: 'var(--text-primary)' }}>{exercise.name}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {exercise.sets.map((set, setIdx) => (
              <span
                key={setIdx}
                style={{
                  padding: '5px 10px',
                  background: set.weight >= (records[exercise.id] || 0) ? 'rgba(255,215,0,0.15)' : 'var(--bg-tertiary)',
                  color: set.weight >= (records[exercise.id] || 0) ? 'var(--gold)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                {set.weight}×{set.reps}{set.rpe ? ` @${set.rpe}` : ''}
              </span>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button
          onClick={() => onRepeat(workout)}
          style={{
            flex: 1,
            padding: '16px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '14px',
            color: 'white',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Repeat
        </button>

        <button
          onClick={() => onEdit(workout.id)}
          style={{
            flex: 1,
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--accent)',
            borderRadius: '14px',
            color: 'var(--accent)',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Edit
        </button>

        <button
          onClick={async () => {
            const totalVolume = workout.exercises.reduce((sum, ex) =>
              sum + ex.sets.reduce((s, set) => s + (set.isWarmup ? 0 : set.weight * set.reps), 0), 0
            );
            const exerciseList = workout.exercises.map(ex => {
              const bestSet = ex.sets.reduce((best, set) =>
                set.weight > (best?.weight || 0) ? set : best, ex.sets[0]);
              return `${ex.name}: ${bestSet?.weight || 0}×${bestSet?.reps || 0}`;
            }).join('\n');

            const shareText = `Reptura Workout

${new Date(workout.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
${workout.exercises.length} exercises · ${workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} sets · ${formatDuration(workout.duration)}

${exerciseList}

+${workout.totalXP} XP earned
${Math.round(totalVolume).toLocaleString()} lbs total volume

gamify.it.com/fitness`;

            if (navigator.share) {
              try {
                await navigator.share({ text: shareText });
              } catch (e) {
                // User cancelled or share failed
              }
            } else {
              await navigator.clipboard.writeText(shareText);
              // Show copied feedback
              const btn = document.activeElement as HTMLButtonElement;
              const originalText = btn.textContent;
              btn.textContent = 'Copied!';
              setTimeout(() => { btn.textContent = originalText; }, 1500);
            }
          }}
          style={{
            flex: 1,
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Share
        </button>
      </div>

      <button
        onClick={() => {
          if (confirm('Are you sure you want to delete this workout? This cannot be undone.')) {
            onDelete(workout.id);
          }
        }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          color: 'var(--text-tertiary)',
          fontWeight: 500,
          fontSize: '13px',
          cursor: 'pointer',
          marginTop: '10px',
          transition: 'all 0.2s'
        }}
      >
        Delete This Workout
      </button>
    </div>
  );
}

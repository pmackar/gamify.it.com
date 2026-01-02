'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useFitnessStore } from '@/lib/fitness/store';
import { EXERCISES, DEFAULT_COMMANDS, getExerciseById, MILESTONES, GENERAL_ACHIEVEMENTS, matchExerciseFromCSV, calculateSetXP } from '@/lib/fitness/data';
import { CommandSuggestion, Workout, WorkoutExercise, Set as SetType } from '@/lib/fitness/types';
import { useNavBar } from '@/components/NavBarContext';

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
  const { setCenterContent } = useNavBar();
  const [query, setQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showSetPanel, setShowSetPanel] = useState(false);
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
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', targetDate: '' });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [searchingExercises, setSearchingExercises] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const rpeInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, unmapped: [] as string[] });
  const [editingBodyStats, setEditingBodyStats] = useState(false);
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(10);
  const [bodyWeight, setBodyWeight] = useState(0);
  const [unifiedProfile, setUnifiedProfile] = useState<{ level: number; xp: number; xpToNext: number } | null>(null);

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

  const getTotalSets = () => {
    if (!store.currentWorkout) return 0;
    return store.currentWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  };

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

      if (matchingExercises.length === 0 && q.length > 1 && !/^\d/.test(query)) {
        results.push({
          type: 'new-exercise',
          id: query,
          title: `New: "${query}"`,
          subtitle: 'Create custom exercise',
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

    if ('workout'.startsWith(q) || 'start'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[0] });
    if ('history'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[1] });
    if ('profile'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[2] });
    if ('campaigns'.startsWith(q) || 'goals'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[3] });
    if ('achievements'.startsWith(q) || 'badges'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[4] });
    if ('import'.startsWith(q) || 'csv'.startsWith(q) || 'strong'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[5] });
    if ('reset'.startsWith(q) || 'erase'.startsWith(q) || 'clear'.startsWith(q) || 'wipe'.startsWith(q)) results.push({ type: 'command', ...DEFAULT_COMMANDS[6] });

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
  }, [query, store.currentWorkout, store.currentView, store.currentExerciseIndex, store.records, store.templates, store.customExercises, addingGoal, searchingExercises]);

  const suggestions = getSuggestions();

  const executeCommand = (suggestion: CommandSuggestion) => {
    switch (suggestion.type) {
      case 'command':
        if (suggestion.id === 'workout') store.startWorkout();
        else if (suggestion.id === 'history') store.setView('history');
        else if (suggestion.id === 'profile') store.setView('profile');
        else if (suggestion.id === 'campaigns') store.setView('campaigns');
        else if (suggestion.id === 'achievements') store.setView('achievements');
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
        store.addCustomExercise(suggestion.id);
        break;
      case 'select-exercise':
        const idx = store.currentWorkout?.exercises.findIndex(e => e.id === suggestion.id);
        if (idx !== undefined && idx >= 0) store.selectExercise(idx);
        break;
      case 'finish': setShowSaveModal(true); return;
      case 'cancel-workout': if (confirm('Discard this workout?')) store.cancelWorkout(); break;
      case 'resume': store.setView('workout'); break;
      case 'history': store.setView('history'); break;
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
      // Adding new set
      const lastSet = currentEx.sets[currentEx.sets.length - 1];
      setSetWeight(lastSet?.weight || store.records[currentEx.id] || 135);
      setSetReps(lastSet?.reps || 8);
      setSetRpe(lastSet?.rpe || null);
      setSetIsWarmup(false);  // New sets default to working sets
      setEditingSetIndex(null);
    }
    setShowSetPanel(true);
  };

  const handleLogSet = () => {
    if (editingSetIndex !== null) {
      // Update existing set
      store.updateSet(editingSetIndex, setWeight, setReps, setRpe || undefined, setIsWarmup);
      setEditingSetIndex(null);
    } else {
      // Log new set
      store.logSet(setWeight, setReps, setRpe || undefined, setIsWarmup);
      // Start rest timer after logging a working set
      if (!setIsWarmup) {
        store.startRestTimer();
      }
    }
    setShowSetPanel(false);
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
    store.removeSet(exerciseIdx, setIdx);
    setShowSetPanel(false);
  };

  const handleRemoveExercise = (idx: number) => {
    if (confirm(`Remove ${store.currentWorkout?.exercises[idx]?.name} from this workout?`)) {
      store.removeExercise(idx);
    }
  };

  const handleFinishWorkout = async (saveTemplate: boolean) => {
    if (saveTemplate && templateName.trim()) store.saveTemplate(templateName.trim());
    await store.finishWorkout();
    setShowSaveModal(false);
    setTemplateName('');
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

          // Try to match exercise
          const exerciseId = matchExerciseFromCSV(csvExerciseName);

          if (!exerciseId) {
            unmappedExercises.add(csvExerciseName);
            continue;
          }

          const exercise = getExerciseById(exerciseId);
          const exerciseName = exercise?.name || csvExerciseName;

          if (!exerciseMap.has(exerciseId)) {
            exerciseMap.set(exerciseId, {
              id: exerciseId,
              name: exerciseName,
              sets: []
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
            totalXP
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
        console.log('Unmapped exercises:', Array.from(unmappedExercises));
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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;500;600;700&display=swap');

        .fitness-app {
          /* Iron Quest Theme - Uses universal theme system */
          /* App-specific accent from globals.css */
          --accent: var(--app-fitness);
          --accent-dark: var(--app-fitness-dark);
          --accent-glow: var(--app-fitness-glow);

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

        /* Main Content */
        .content-area {
          padding-top: 70px;
          padding-bottom: 200px;
          min-height: 100vh;
          position: relative;
          z-index: 2;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Premium Command Bar */
        .command-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 16px 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 50;
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
          font-weight: 400;
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
        }
        .exercise-sets {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .set-badge {
          padding: 4px 10px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
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
        }
        .set-badge.clickable:hover {
          background: var(--bg-elevated);
          transform: scale(1.05);
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

        /* Remove exercise button */
        .exercise-remove-btn {
          background: none;
          border: none;
          padding: 8px;
          font-size: 14px;
          cursor: pointer;
          opacity: 0.3;
          color: var(--error);
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        .exercise-remove-btn:hover { opacity: 1; }

        /* Drag states */
        .exercise-pill.dragging {
          opacity: 0.5;
          border: 2px dashed var(--accent);
        }
        .exercise-pill.drag-over {
          border: 2px solid var(--accent);
          background: var(--bg-elevated);
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
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 60;
        }

        .set-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-elevated);
          border-top: 1px solid var(--border-light);
          border-radius: 24px 24px 0 0;
          padding: 24px 20px;
          padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          z-index: 61;
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .set-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .set-panel-title {
          font-weight: 600;
          font-size: 18px;
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
          gap: 20px;
          margin-bottom: 24px;
        }
        .input-group { text-align: center; }
        .input-group input {
          width: 100px;
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          color: var(--text-primary);
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          outline: none;
          transition: all 0.2s;
        }
        .input-group input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .input-label {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .input-divider {
          font-size: 28px;
          color: var(--text-tertiary);
          font-weight: 300;
        }

        .set-actions {
          display: flex;
          gap: 10px;
        }
        .action-btn {
          flex: 1;
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .action-btn:hover {
          background: var(--bg-card-hover);
        }
        .action-btn.primary {
          flex: 2;
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        .action-btn.primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
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

        /* Previous Workout Section */
        .prev-workout-section {
          margin-bottom: 16px;
          padding: 12px;
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .prev-workout-label {
          font-size: 11px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
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

        /* Exercise Notes Section */
        .exercise-notes-section {
          margin-bottom: 16px;
        }
        .notes-toggle {
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
        }
        .notes-toggle:hover {
          background: var(--bg-card);
        }
        .exercise-notes-input {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
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

        /* Warmup Toggle */
        .warmup-toggle-row {
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
        }
        .warmup-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          transition: all 0.15s;
        }
        .warmup-toggle:hover {
          border-color: var(--border-light);
        }
        .warmup-toggle input {
          width: 18px;
          height: 18px;
          accent-color: var(--accent);
        }
        .warmup-toggle-label {
          font-size: 14px;
          color: var(--text-primary);
        }
        .warmup-toggle-hint {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        /* Repeat Last Set Button */
        .repeat-set-btn {
          width: 100%;
          margin-top: 12px;
          padding: 14px;
          background: transparent;
          border: 1px dashed var(--border);
          border-radius: 12px;
          color: var(--text-secondary);
          font-size: 14px;
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
          margin-top: 12px;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--text-tertiary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .remove-set-btn:hover {
          background: rgba(255,107,107,0.1);
          color: #ff6b6b;
        }

        /* Rest Timer */
        .rest-timer-section {
          margin-top: 20px;
          padding: 16px;
          background: var(--bg-card);
          border-radius: 16px;
          border: 1px solid var(--border);
        }
        .rest-timer-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .rest-timer-label {
          font-size: 12px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rest-timer-time {
          font-size: 32px;
          font-weight: 700;
          color: var(--accent);
          font-variant-numeric: tabular-nums;
        }
        .rest-timer-skip {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .rest-timer-skip:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .rest-timer-bar {
          height: 6px;
          background: var(--bg-elevated);
          border-radius: 3px;
          overflow: hidden;
        }
        .rest-timer-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
          transition: width 1s linear;
        }

        /* Rest Timer Presets */
        .rest-timer-presets {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rest-presets-label {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .rest-preset-btn {
          padding: 6px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 13px;
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
          color: white;
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
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }

        .modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-light);
          border-radius: 24px;
          padding: 28px;
          width: 100%;
          max-width: 380px;
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

        /* View Content */
        .view-content { padding: 16px; }

        .view-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .back-btn {
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
        }
        .pr-exercise {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .pr-weight {
          font-size: 20px;
          font-weight: 700;
          color: var(--gold);
        }

        /* Workout Cards */
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
        .achievement-card.locked {
          opacity: 0.5;
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
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--theme-text-primary);
          margin-bottom: 0.5rem;
        }
        .home-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
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

        .recent-section {
          padding: 0 16px;
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
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          flex-direction: column;
          padding: env(safe-area-inset-top, 20px) 0 env(safe-area-inset-bottom, 20px);
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
          .content-area { padding-top: 60px; }
        }
      `}</style>

      <div className="fitness-app text-white">
        <PixelParticles />
        {/* Main Content */}
        <main className="content-area">

          {/* Workout View */}
          {store.currentView === 'workout' && store.currentWorkout && (
            <div className="exercises-container">
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

                  return (
                  <div
                    key={exercise.id + idx}
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
                      openSetPanel(idx);
                    }}
                  >
                    <div className="drag-handle" title="Drag to reorder">⋮⋮</div>
                    <div className="exercise-number">{idx + 1}</div>
                    <div className="exercise-info">
                      <div className="exercise-name">{exercise.name}</div>
                      <div className="exercise-sets">
                        {exercise.sets.length === 0 ? (
                          <span className="set-badge empty">No sets yet</span>
                        ) : (
                          exercise.sets.map((set, setIdx) => (
                            <span
                              key={setIdx}
                              className={`set-badge clickable ${set.isWarmup ? 'warmup' : ''} ${!set.isWarmup && set.weight >= (store.records[exercise.id] || 0) ? 'pr' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSetPanel(idx, setIdx);
                              }}
                            >
                              {set.isWarmup && <span className="warmup-indicator">W</span>}
                              {set.weight}×{set.reps}{set.rpe ? ` @${set.rpe}` : ''}
                            </span>
                          ))
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
                  );
                })
              )}
            </div>
          )}

          {/* Profile View */}
          {store.currentView === 'profile' && (
            <div className="view-content">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')}>←</button>
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
                  const text = `Iron Quest - ${periodLabel}

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

              <div className="section-title">Personal Records</div>
              <div className="pr-grid">
                {Object.entries(store.records)
                  .filter(([id]) => EXERCISES.some(e => e.id === id))
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([id, weight]) => {
                    const exercise = getExerciseById(id);
                    return (
                      <div key={id} className="pr-card">
                        <div className="pr-exercise">{exercise?.name || id}</div>
                        <div className="pr-weight">{weight} lbs</div>
                      </div>
                    );
                  })}
              </div>

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
                  a.download = `iron-quest-export-${new Date().toISOString().split('T')[0]}.csv`;
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
                <button className="back-btn" onClick={() => store.setView('home')}>←</button>
                <span className="view-title">History</span>
              </div>

              {store.workouts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">No workouts yet</div>
                  <div className="empty-subtitle">Complete your first workout to see it here</div>
                </div>
              ) : (
                store.workouts.slice(0, 20).map(workout => (
                  <div
                    key={workout.id}
                    className="workout-card"
                    onClick={() => store.showWorkoutDetail(workout.id)}
                  >
                    <div className="workout-date">{formatDate(workout.startTime)}</div>
                    <div className="workout-summary">
                      {workout.exercises.length} exercises · {workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} sets
                      <span className="workout-xp"> · +{workout.totalXP} XP</span>
                    </div>
                  </div>
                ))
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
              onDelete={(workoutId) => store.deleteWorkout(workoutId)}
            />
          )}

          {/* Achievements View */}
          {store.currentView === 'achievements' && (
            <div className="view-content">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')}>←</button>
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

              {/* Milestone Achievements */}
              {Object.entries(MILESTONES).flatMap(([exerciseId, milestones]) =>
                milestones.map(milestone => {
                  const key = `${exerciseId}_${milestone.weight}`;
                  const unlocked = store.achievements.includes(key);
                  const exercise = getExerciseById(exerciseId);
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
                <button className="back-btn" onClick={() => store.setView('home')}>←</button>
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

          {/* Campaign Detail Modal */}
          {selectedCampaignId && !creatingCampaign && (
            <div className="modal-overlay" onClick={() => setSelectedCampaignId(null)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                {(() => {
                  const campaign = store.campaigns.find(c => c.id === selectedCampaignId);
                  if (!campaign) return null;
                  const daysLeft = Math.ceil((new Date(campaign.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

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

                      <div className="modal-actions">
                        <button
                          className="modal-btn secondary"
                          onClick={() => setSelectedCampaignId(null)}
                        >
                          Close
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
            <div className="modal-overlay" onClick={() => setCreatingCampaign(false)}>
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
                  <div className="home-icon">🏋️</div>
                  <h1 className="home-title">IRON QUEST</h1>
                  <p className="home-subtitle">Turn every rep into XP</p>
                  <div className="home-stats">
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
                </div>
              </div>

              {store.workouts.length > 0 && (
                <div className="recent-section">
                  <div className="section-header">
                    <p className="section-label">Recent Activity</p>
                    <h2 className="section-title">Your Workouts</h2>
                  </div>
                  {store.workouts.slice(0, 3).map(workout => (
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
            <input
              ref={inputRef}
              type="text"
              className="command-input"
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

        {/* Set Panel */}
        {showSetPanel && store.currentWorkout && (() => {
          const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
          const currentIdx = store.currentExerciseIndex;
          const lastWorkoutEx = currentEx ? store.getLastWorkoutForExercise(currentEx.id) : null;
          const exerciseNote = currentEx ? store.exerciseNotes[currentEx.id] || '' : '';
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
                  <button className="close-btn" onClick={() => setShowSetPanel(false)}>×</button>
                </div>
              </div>

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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        repsInputRef.current?.focus();
                        repsInputRef.current?.select();
                      }
                    }}
                    inputMode="decimal"
                    autoFocus
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        rpeInputRef.current?.focus();
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

              {/* Warmup Toggle */}
              <div className="warmup-toggle-row">
                <label className="warmup-toggle">
                  <input
                    type="checkbox"
                    checked={setIsWarmup}
                    onChange={(e) => setSetIsWarmup(e.target.checked)}
                  />
                  <span className="warmup-toggle-label">Warmup set</span>
                  <span className="warmup-toggle-hint">(no XP)</span>
                </label>
              </div>

              <div className="set-actions">
                <button className="action-btn" onClick={() => setSetWeight(w => w - 5)}>−5</button>
                <button className="action-btn primary" onClick={handleLogSet}>
                  {editingSetIndex !== null ? 'Save Changes' : 'Log Set'}
                </button>
                <button className="action-btn" onClick={() => setSetWeight(w => w + 5)}>+5</button>
              </div>

              {/* Repeat Last Set Button */}
              {editingSetIndex === null && currentEx && currentEx.sets.length > 0 && (
                <button
                  className="repeat-set-btn"
                  onClick={() => {
                    handleRepeatLastSet();
                    setShowSetPanel(false);
                  }}
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
            </div>
          </>
        );
        })()}

        {/* Save Template Modal */}
        {showSaveModal && (
          <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
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
            <div className="modal-overlay" onClick={() => setShowProgressChart(false)}>
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
            <div className="modal-overlay" onClick={() => setShowPlateCalc(false)}>
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
              icon: '💪',
              title: 'Welcome to Iron Quest!',
              content: 'Turn your workouts into an adventure. Track exercises, earn XP, and level up as you get stronger.',
            },
            {
              icon: '⭐',
              title: 'Earn XP Every Set',
              content: 'Every set you log earns XP based on weight and reps. Hit personal records for bonus XP and unlock achievements!',
            },
            {
              icon: '📊',
              title: 'Track Your Progress',
              content: 'View progress charts for each exercise, see your estimated 1RM, and track volume over time.',
            },
            {
              icon: '🔥',
              title: 'Pro Tips',
              content: 'Mark warmup sets (no XP). Add notes to exercises. Link exercises into supersets. Use the plate calculator for loading.',
            },
            {
              icon: '🚀',
              title: 'Ready to Lift?',
              content: 'Search for an exercise below to start your first workout. Let\'s get after it!',
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
                  } else {
                    setShowExercisePicker(false);
                  }
                }}
              >
                {selectedCategory ? '←' : '×'}
              </button>
              <div className="exercise-picker-title">
                {selectedCategory
                  ? MUSCLE_CATEGORIES.find(c => c.id === selectedCategory)?.name
                  : 'Add Exercise'}
              </div>
            </div>
            <div className="exercise-picker-content">
              {!selectedCategory ? (
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
                            if (!inWorkout) {
                              store.addExerciseToWorkout(exercise.id);
                            }
                            setShowExercisePicker(false);
                            setSelectedCategory(null);
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
          <div className="modal-overlay">
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
      </div>
    </>
  );
}

function WorkoutDetailView({
  workout,
  records,
  onBack,
  onRepeat,
  onDelete
}: {
  workout: Workout;
  records: Record<string, number>;
  onBack: () => void;
  onRepeat: (workout: Workout) => void;
  onDelete: (workoutId: string) => void;
}) {
  if (!workout) return null;

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const formatDuration = (seconds?: number) => seconds ? `${Math.floor(seconds / 60)} min` : '--';

  return (
    <div className="view-content">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="view-title">{formatDate(workout.startTime)}</span>
      </div>

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
          onClick={async () => {
            const totalVolume = workout.exercises.reduce((sum, ex) =>
              sum + ex.sets.reduce((s, set) => s + (set.isWarmup ? 0 : set.weight * set.reps), 0), 0
            );
            const exerciseList = workout.exercises.map(ex => {
              const bestSet = ex.sets.reduce((best, set) =>
                set.weight > (best?.weight || 0) ? set : best, ex.sets[0]);
              return `${ex.name}: ${bestSet?.weight || 0}×${bestSet?.reps || 0}`;
            }).join('\n');

            const shareText = `Iron Quest Workout

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

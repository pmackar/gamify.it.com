'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useFitnessStore } from '@/lib/fitness/store';
import { EXERCISES, DEFAULT_COMMANDS, getExerciseById, MILESTONES } from '@/lib/fitness/data';
import { CommandSuggestion, Workout } from '@/lib/fitness/types';
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

export default function FitnessPage() {
  const store = useFitnessStore();
  const [mounted, setMounted] = useState(false);
  const { setCenterContent } = useNavBar();
  const [query, setQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showSetPanel, setShowSetPanel] = useState(false);
  const [setWeight, setSetWeight] = useState(135);
  const [setReps, setSetReps] = useState(8);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', targetDate: '' });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    store.loadState();
  }, []);

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
  }, [showSetPanel, showSaveModal, creatingCampaign, addingGoal, store.currentView]);

  useEffect(() => {
    if (store.currentWorkout && store.currentView === 'workout') {
      timerRef.current = setInterval(() => {
        store.incrementTimer();
        if (store.workoutSeconds % 30 === 0) {
          store.saveState();
        }
      }, 1000);
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
        if (currentEx) {
          const lastSet = currentEx.sets[currentEx.sets.length - 1];
          const weight = lastSet?.weight || store.records[currentEx.id] || 135;
          const reps = lastSet?.reps || 8;
          results.push({
            type: 'log-set-hint',
            id: currentEx.id,
            title: `${currentEx.name}`,
            subtitle: `Type ${weight}x${reps} and press Enter`,
            icon: '💪',
            meta: `${currentEx.sets.length} sets`
          });
        }
        results.push({ type: 'add-exercise', id: 'add', title: 'Add Exercise', subtitle: 'Search and add', icon: '➕' });
        results.push({ type: 'history', id: 'history', title: 'History', subtitle: 'Past workouts', icon: '📋' });
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
  }, [query, store.currentWorkout, store.currentView, store.currentExerciseIndex, store.records, store.templates, store.customExercises, addingGoal]);

  const suggestions = getSuggestions();

  const executeCommand = (suggestion: CommandSuggestion) => {
    switch (suggestion.type) {
      case 'command':
        if (suggestion.id === 'workout') store.startWorkout();
        else if (suggestion.id === 'history') store.setView('history');
        else if (suggestion.id === 'profile') store.setView('profile');
        else if (suggestion.id === 'campaigns') store.setView('campaigns');
        else if (suggestion.id === 'achievements') store.setView('achievements');
        break;
      case 'template': store.startWorkoutFromTemplate(suggestion.id); break;
      case 'exercise': store.startWorkoutWithExercise(suggestion.id); break;
      case 'log-set-direct':
        if (suggestion.weight && suggestion.reps) store.logSet(suggestion.weight, suggestion.reps, suggestion.rpe);
        break;
      case 'log-set-hint': openSetPanel(); return;
      case 'add-exercise-quick': store.addExerciseToWorkout(suggestion.id); break;
      case 'new-exercise': store.addCustomExercise(suggestion.id); break;
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

  const openSetPanel = () => {
    if (!store.currentWorkout) return;
    const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
    if (!currentEx) return;
    const lastSet = currentEx.sets[currentEx.sets.length - 1];
    setSetWeight(lastSet?.weight || store.records[currentEx.id] || 135);
    setSetReps(lastSet?.reps || 8);
    setShowSetPanel(true);
  };

  const handleLogSet = () => {
    store.logSet(setWeight, setReps);
    setShowSetPanel(false);
  };

  const handleFinishWorkout = (saveTemplate: boolean) => {
    if (saveTemplate && templateName.trim()) store.saveTemplate(templateName.trim());
    store.finishWorkout();
    setShowSaveModal(false);
    setTemplateName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestion(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Tab') { e.preventDefault(); e.shiftKey ? setSelectedSuggestion(prev => Math.max(prev - 1, 0)) : setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1)); }
    else if (e.key === 'Enter' && suggestions[selectedSuggestion]) { e.preventDefault(); executeCommand(suggestions[selectedSuggestion]); }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (!mounted) return <div className="min-h-screen" style={{ background: '#08080c' }} />;

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .fitness-app {
          --bg-base: #0a0a0a;
          --bg-elevated: #121218;
          --bg-card: rgba(30, 30, 40, 0.6);
          --bg-hover: rgba(40, 40, 50, 0.8);
          --bg-active: rgba(50, 50, 60, 0.8);
          --text-primary: #f5f5f7;
          --text-secondary: #8e8e93;
          --text-muted: #6b7280;
          --accent: #ff6b6b;
          --accent-glow: rgba(255, 107, 107, 0.15);
          --success: #34c759;
          --gold: #ffd700;
          --border: rgba(255,255,255,0.06);
          --border-light: rgba(255,255,255,0.1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          background: linear-gradient(180deg, #0a0a0a 0%, #121218 50%, #0a0a0a 100%);
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
        }

        .suggestions {
          margin-bottom: 8px;
          max-height: 168px; /* ~3 items visible */
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          overscroll-behavior: contain;
        }
        .suggestions::-webkit-scrollbar { display: none; }

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
        .suggestion:hover, .suggestion.selected {
          background: rgba(40, 40, 50, 0.6);
          border-color: rgba(255, 255, 255, 0.05);
        }
        .suggestion.selected {
          background: var(--accent-glow);
          border-color: rgba(255, 107, 107, 0.2);
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
          color: var(--text-muted);
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
          color: var(--text-muted);
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
          background: var(--bg-hover);
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
          background: var(--bg-active);
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
          background: var(--bg-active);
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
          color: var(--text-muted);
          font-style: italic;
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
          background: var(--bg-hover);
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
          color: var(--text-muted);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .input-divider {
          font-size: 28px;
          color: var(--text-muted);
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
          background: var(--bg-hover);
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
        .modal-input::placeholder { color: var(--text-muted); }

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
          background: var(--bg-hover);
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
          background: var(--bg-hover);
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
          color: var(--text-muted);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
          color: var(--text-muted);
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
          color: var(--text-muted);
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
          background: rgba(30, 30, 40, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .home-icon {
          font-size: 56px;
          margin-bottom: 1rem;
          filter: drop-shadow(0 4px 12px rgba(255, 107, 107, 0.3));
        }
        .home-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #fff;
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
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
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
          color: var(--text-muted);
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
          background: var(--bg-hover);
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
          background: var(--bg-hover);
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
          background: var(--bg-active);
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
          background: var(--bg-active);
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
          color: var(--text-muted);
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
          color: var(--text-muted);
        }
        .goal-check {
          color: var(--success);
          font-size: 18px;
          font-weight: 600;
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
                store.currentWorkout.exercises.map((exercise, idx) => (
                  <div
                    key={exercise.id + idx}
                    className={`exercise-pill ${idx === store.currentExerciseIndex ? 'active' : ''}`}
                    onClick={() => store.selectExercise(idx)}
                  >
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
                              className={`set-badge ${set.weight >= (store.records[exercise.id] || 0) ? 'pr' : ''}`}
                            >
                              {set.weight}×{set.reps}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))
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
                  <span className="profile-level-value">{store.profile.level}</span>
                </div>
                <div className="profile-name">{store.profile.name}</div>
                <div className="profile-xp"><span>{store.profile.xp.toLocaleString()}</span> XP</div>
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
            />
          )}

          {/* Achievements View */}
          {store.currentView === 'achievements' && (
            <div className="view-content">
              <div className="view-header">
                <button className="back-btn" onClick={() => store.setView('home')}>←</button>
                <span className="view-title">Achievements</span>
              </div>

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
                          <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>
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
                      <div className="home-stat-value">{store.profile.level}</div>
                      <div className="home-stat-label">LEVEL</div>
                    </div>
                    <div className="home-stat">
                      <div className="home-stat-value">{store.profile.totalWorkouts}</div>
                      <div className="home-stat-label">WORKOUTS</div>
                    </div>
                    <div className="home-stat">
                      <div className="home-stat-value" style={{ color: '#FFD700' }}>{store.profile.xp.toLocaleString()}</div>
                      <div className="home-stat-label">TOTAL XP</div>
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
          <div className="command-bar-inner">
            <div className="suggestions">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={suggestion.id + idx}
                  className={`suggestion ${idx === selectedSuggestion ? 'selected' : ''}`}
                  onClick={() => executeCommand(suggestion)}
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
            <input
              ref={inputRef}
              type="text"
              className="command-input"
              placeholder={(() => {
                if (addingGoal) return 'Search exercise for goal...';
                // Active workout but viewing different screen
                if (store.currentWorkout && store.currentView !== 'workout') {
                  return 'Resume workout...';
                }
                // In workout view
                if (store.currentWorkout && store.currentView === 'workout') {
                  const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];
                  if (currentEx) {
                    return `${currentEx.name}: log weight:reps`;
                  }
                  return 'Add exercise or finish workout...';
                }
                return 'What do you want to do?';
              })()}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedSuggestion(0); }}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Set Panel */}
        {showSetPanel && store.currentWorkout && (
          <>
            <div className="set-panel-overlay" onClick={() => setShowSetPanel(false)} />
            <div className="set-panel">
              <div className="set-panel-header">
                <span className="set-panel-title">{store.currentWorkout.exercises[store.currentExerciseIndex]?.name}</span>
                <button className="close-btn" onClick={() => setShowSetPanel(false)}>×</button>
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
                  <div className="input-label">lbs</div>
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
                        handleLogSet();
                      }
                    }}
                    inputMode="numeric"
                  />
                  <div className="input-label">reps</div>
                </div>
              </div>
              <div className="set-actions">
                <button className="action-btn" onClick={() => setSetWeight(w => w - 5)}>−5</button>
                <button className="action-btn primary" onClick={handleLogSet}>Log Set</button>
                <button className="action-btn" onClick={() => setSetWeight(w => w + 5)}>+5</button>
              </div>
            </div>
          </>
        )}

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

        {/* Toast */}
        {store.toastMessage && <div className="toast">{store.toastMessage}</div>}
      </div>
    </>
  );
}

function WorkoutDetailView({
  workout,
  records,
  onBack,
  onRepeat
}: {
  workout: Workout;
  records: Record<string, number>;
  onBack: () => void;
  onRepeat: (workout: Workout) => void;
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
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>XP Earned</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700 }}>{workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>Sets</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700 }}>{formatDuration(workout.duration)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>Duration</div>
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
          <div style={{ fontWeight: 600, marginBottom: '10px', fontSize: '15px' }}>{exercise.name}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {exercise.sets.map((set, setIdx) => (
              <span
                key={setIdx}
                style={{
                  padding: '5px 10px',
                  background: set.weight >= (records[exercise.id] || 0) ? 'rgba(255,215,0,0.15)' : 'var(--bg-active)',
                  color: set.weight >= (records[exercise.id] || 0) ? 'var(--gold)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                {set.weight}×{set.reps}
              </span>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => onRepeat(workout)}
        style={{
          width: '100%',
          padding: '16px',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: '14px',
          color: 'white',
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          marginTop: '16px',
          transition: 'all 0.2s'
        }}
      >
        Repeat This Workout
      </button>
    </div>
  );
}

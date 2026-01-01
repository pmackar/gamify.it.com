'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useFitnessStore } from '@/lib/fitness/store';
import { EXERCISES, DEFAULT_COMMANDS, getExerciseById, MILESTONES } from '@/lib/fitness/data';
import { CommandSuggestion, Workout } from '@/lib/fitness/types';

export default function FitnessPage() {
  const store = useFitnessStore();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showSetPanel, setShowSetPanel] = useState(false);
  const [setWeight, setSetWeight] = useState(135);
  const [setReps, setSetReps] = useState(8);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent SSR hydration issues
  useEffect(() => {
    setMounted(true);
    store.loadState();
  }, []);

  // Workout timer
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [store.currentWorkout, store.currentView]);

  // Get command suggestions based on current state and query
  const getSuggestions = useCallback((): CommandSuggestion[] => {
    const q = query.toLowerCase().trim();
    const results: CommandSuggestion[] = [];

    // In workout mode
    if (store.currentWorkout && store.currentView === 'workout') {
      const currentEx = store.currentWorkout.exercises[store.currentExerciseIndex];

      // Parse set input (e.g., "135 x 8" or "135x8")
      const setMatch = query.match(/^(\d+\.?\d*)\s*[xX\*\-×\s]\s*(\d+)(?:\s*[@:]\s*(\d+\.?\d*))?$/);
      if (setMatch && currentEx) {
        const weight = parseFloat(setMatch[1]);
        const reps = parseInt(setMatch[2]);
        const rpe = setMatch[3] ? parseFloat(setMatch[3]) : undefined;
        const rpeDisplay = rpe ? ` @ ${rpe}` : '';
        results.push({
          type: 'log-set-direct',
          id: currentEx.id,
          title: `${weight} × ${reps}${rpeDisplay}`,
          subtitle: `Log set for ${currentEx.name}`,
          icon: '💪',
          meta: `${currentEx.sets.length} sets`,
          weight,
          reps,
          rpe
        });
        return results;
      }

      if (!q) {
        // Default workout commands
        if (currentEx) {
          const lastSet = currentEx.sets[currentEx.sets.length - 1];
          const weight = lastSet?.weight || store.records[currentEx.id] || 135;
          const reps = lastSet?.reps || 8;
          results.push({
            type: 'log-set-hint',
            id: currentEx.id,
            title: `Type: ${weight} x ${reps}`,
            subtitle: `Log set for ${currentEx.name} (or tap to edit)`,
            icon: '💪',
            meta: `${currentEx.sets.length} sets`
          });
        }

        results.push({ type: 'add-exercise', id: 'add', title: 'Add Exercise', subtitle: 'Search and add an exercise', icon: '➕' });
        results.push({ type: 'history', id: 'history', title: 'History', subtitle: 'View past workouts', icon: '📋' });
        results.push({ type: 'finish', id: 'finish', title: 'Finish Workout', subtitle: `${getTotalSets()} sets logged`, icon: '✅' });
        results.push({ type: 'cancel-workout', id: 'cancel', title: 'Cancel Workout', subtitle: 'Discard and exit', icon: '✕' });

        return results;
      }

      // Search exercises to add
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

      // Offer to create new exercise if no matches
      if (matchingExercises.length === 0 && q.length > 1 && !/^\d/.test(query)) {
        results.push({
          type: 'new-exercise',
          id: query,
          title: `New: "${query}"`,
          subtitle: 'Create custom exercise',
          icon: '✨'
        });
      }

      // Quick commands
      if ('done'.startsWith(q) || 'finish'.startsWith(q)) {
        results.push({ type: 'finish', id: 'finish', title: 'Finish Workout', subtitle: `${getTotalSets()} sets logged`, icon: '✅' });
      }
      if ('cancel'.startsWith(q) || 'exit'.startsWith(q)) {
        results.push({ type: 'cancel-workout', id: 'cancel', title: 'Cancel Workout', subtitle: 'Discard and exit', icon: '✕' });
      }

      return results.slice(0, 8);
    }

    // Home mode
    if (!q) {
      // Show resume if workout is active but minimized
      if (store.currentWorkout && store.currentView !== 'workout') {
        const totalSets = store.currentWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        return [
          { type: 'resume', id: 'resume', title: 'Resume Workout', subtitle: `${totalSets} sets logged`, icon: '▶️' },
          ...DEFAULT_COMMANDS.slice(1).map(cmd => ({ type: 'command', ...cmd }))
        ];
      }
      return DEFAULT_COMMANDS.map(cmd => ({ type: 'command', ...cmd }));
    }

    // Search commands
    if ('workout'.startsWith(q) || 'w'.startsWith(q) || 'start'.startsWith(q)) {
      results.push({ type: 'command', ...DEFAULT_COMMANDS[0] });
    }
    if ('history'.startsWith(q) || 'h'.startsWith(q)) {
      results.push({ type: 'command', ...DEFAULT_COMMANDS[1] });
    }
    if ('profile'.startsWith(q) || 'p'.startsWith(q)) {
      results.push({ type: 'command', ...DEFAULT_COMMANDS[2] });
    }
    if ('campaigns'.startsWith(q) || 'goals'.startsWith(q)) {
      results.push({ type: 'command', ...DEFAULT_COMMANDS[3] });
    }
    if ('achievements'.startsWith(q) || 'badges'.startsWith(q)) {
      results.push({ type: 'command', ...DEFAULT_COMMANDS[4] });
    }

    // Search templates
    for (const template of store.templates) {
      if (template.name.toLowerCase().includes(q)) {
        results.push({
          type: 'template',
          id: template.id,
          title: template.name,
          subtitle: `${template.exercises.length} exercises`,
          icon: '📝'
        });
      }
    }

    // Search exercises
    const matchingExercises = EXERCISES
      .filter(ex => ex.name.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q))
      .slice(0, 5);

    for (const ex of matchingExercises) {
      results.push({
        type: 'exercise',
        id: ex.id,
        title: ex.name,
        subtitle: `Start workout with ${ex.muscle}`,
        icon: '🏋️'
      });
    }

    return results.slice(0, 8);
  }, [query, store.currentWorkout, store.currentView, store.currentExerciseIndex, store.records, store.templates, store.customExercises]);

  const suggestions = getSuggestions();

  const getTotalSets = () => {
    if (!store.currentWorkout) return 0;
    return store.currentWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  };

  const executeCommand = (suggestion: CommandSuggestion) => {
    switch (suggestion.type) {
      case 'command':
        if (suggestion.id === 'workout') store.startWorkout();
        else if (suggestion.id === 'history') store.setView('history');
        else if (suggestion.id === 'profile') store.setView('profile');
        else if (suggestion.id === 'campaigns') store.setView('campaigns');
        else if (suggestion.id === 'achievements') store.setView('achievements');
        break;

      case 'template':
        store.startWorkoutFromTemplate(suggestion.id);
        break;

      case 'exercise':
        store.startWorkoutWithExercise(suggestion.id);
        break;

      case 'log-set-direct':
        if (suggestion.weight && suggestion.reps) {
          store.logSet(suggestion.weight, suggestion.reps, suggestion.rpe);
        }
        break;

      case 'log-set-hint':
        openSetPanel();
        return; // Don't clear input

      case 'add-exercise-quick':
        store.addExerciseToWorkout(suggestion.id);
        break;

      case 'new-exercise':
        store.addCustomExercise(suggestion.id);
        break;

      case 'select-exercise':
        const idx = store.currentWorkout?.exercises.findIndex(e => e.id === suggestion.id);
        if (idx !== undefined && idx >= 0) {
          store.selectExercise(idx);
        }
        break;

      case 'finish':
        setShowSaveModal(true);
        return;

      case 'cancel-workout':
        if (confirm('Discard this workout?')) {
          store.cancelWorkout();
        }
        break;

      case 'resume':
        store.setView('workout');
        break;

      case 'history':
        store.setView('history');
        break;
    }

    setQuery('');
    setSelectedSuggestion(0);
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
    if (saveTemplate && templateName.trim()) {
      store.saveTemplate(templateName.trim());
    }
    store.finishWorkout();
    setShowSaveModal(false);
    setTemplateName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        setSelectedSuggestion(prev => Math.max(prev - 1, 0));
      } else {
        setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
      }
    } else if (e.key === 'Enter' && suggestions[selectedSuggestion]) {
      e.preventDefault();
      executeCommand(suggestions[selectedSuggestion]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#0a0a0f]" />;
  }

  return (
    <>
      <style jsx global>{`
        .fitness-app {
          --bg-primary: #0a0a0f;
          --bg-secondary: #12121a;
          --bg-tertiary: #1a1a25;
          --bg-elevated: #22222f;
          --text-primary: #ffffff;
          --text-secondary: #a0a0b0;
          --text-muted: #606070;
          --accent: #ff6b6b;
          --accent-dim: #e55a5a;
          --success: #22c55e;
          --warning: #f59e0b;
          --border: #2a2a3a;
          --border-light: #3a3a4a;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .fitness-app * { box-sizing: border-box; }

        .status-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          padding-top: calc(12px + env(safe-area-inset-top, 0px));
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          z-index: 50;
        }

        .level-badge {
          background: var(--accent);
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .level-badge:hover { transform: scale(1.05); }

        .workout-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .workout-dot {
          width: 8px; height: 8px;
          background: var(--success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .xp-display {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .xp-display span { color: var(--accent); font-weight: 600; }

        .finish-btn {
          padding: 6px 12px;
          background: var(--success);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .content-area {
          padding-top: calc(60px + env(safe-area-inset-top, 0px));
          padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px));
          min-height: 100vh;
          overflow-y: auto;
        }

        .command-bar {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          padding: 12px 16px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
          z-index: 40;
        }

        .suggestions {
          margin-bottom: 8px;
          max-height: 320px;
          overflow-y: auto;
        }

        .suggestion {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .suggestion:hover, .suggestion.selected {
          background: var(--bg-tertiary);
        }

        .suggestion-icon {
          width: 40px; height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-elevated);
          border-radius: 8px;
          font-size: 18px;
        }

        .suggestion-text { flex: 1; }
        .suggestion-title { font-weight: 500; font-size: 14px; }
        .suggestion-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .suggestion-meta { font-size: 12px; color: var(--text-secondary); }

        .command-input {
          width: 100%;
          padding: 14px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 16px;
          outline: none;
        }
        .command-input:focus { border-color: var(--accent); }
        .command-input::placeholder { color: var(--text-muted); }

        .exercise-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .exercise-pill.active {
          border-color: var(--accent);
          background: rgba(255, 107, 107, 0.1);
        }
        .exercise-pill:hover { background: var(--bg-elevated); }

        .exercise-name { font-weight: 600; font-size: 15px; }
        .exercise-sets {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .set-badge {
          padding: 4px 8px;
          background: var(--bg-elevated);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .set-badge.pr { background: #ffd70033; color: #ffd700; }

        .set-panel {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
          padding: 20px;
          padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          z-index: 60;
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .set-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .set-panel-header span { font-weight: 600; font-size: 16px; }
        .close-btn {
          width: 32px; height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: none;
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 20px;
          cursor: pointer;
        }

        .set-inputs {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .input-col { text-align: center; }
        .input-col input {
          width: 100px;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 600;
          text-align: center;
          outline: none;
        }
        .input-col input:focus { border-color: var(--accent); }
        .input-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
        .input-divider { font-size: 24px; color: var(--text-muted); }

        .set-actions {
          display: flex;
          gap: 12px;
        }
        .stepper-btn {
          flex: 1;
          padding: 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .log-btn {
          flex: 2;
          padding: 14px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
        }
        .modal-header { font-weight: 600; font-size: 18px; margin-bottom: 16px; }
        .modal-body { margin-bottom: 20px; }
        .modal-body p { color: var(--text-secondary); font-size: 14px; margin-bottom: 12px; }
        .modal-body input {
          width: 100%;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
        }
        .modal-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
        .modal-btn.secondary {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .modal-btn.primary {
          background: var(--accent);
          color: white;
        }

        .toast {
          position: fixed;
          bottom: 180px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 200;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .view-content { padding: 16px; }
        .view-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .back-btn {
          width: 40px; height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: none;
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 18px;
          cursor: pointer;
        }
        .view-title { font-size: 20px; font-weight: 600; }

        .profile-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
        }
        .profile-level {
          width: 80px; height: 80px;
          background: var(--accent);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .profile-level-label { font-size: 10px; opacity: 0.8; }
        .profile-level-value { font-size: 28px; font-weight: 700; }
        .profile-name { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
        .profile-xp { color: var(--text-secondary); font-size: 14px; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .stat-value { font-size: 24px; font-weight: 700; color: var(--accent); }
        .stat-label { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

        .pr-section { margin-top: 24px; }
        .pr-section h3 { font-size: 16px; margin-bottom: 12px; }
        .pr-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .pr-item {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
        }
        .pr-exercise { font-size: 12px; color: var(--text-secondary); }
        .pr-weight { font-size: 18px; font-weight: 700; color: #ffd700; }

        .workout-list { }
        .workout-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .workout-card:hover { background: var(--bg-elevated); }
        .workout-date { font-size: 12px; color: var(--text-muted); }
        .workout-summary { font-size: 14px; margin-top: 4px; }
        .workout-xp { color: var(--accent); font-weight: 600; }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 13px;
          border-radius: 8px;
          transition: all 0.15s;
        }
        .nav-link:hover { color: #ffd700; background: rgba(255,215,0,0.1); }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }
        .empty-state-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-state-text { font-size: 14px; }
      `}</style>

      <div className="fitness-app min-h-screen bg-[#0a0a0f] text-white">
        {/* Status Bar */}
        <header className="status-bar">
          <div className="level-badge" onClick={() => store.setView('profile')}>
            LVL {store.profile.level}
          </div>

          {store.currentWorkout && (
            <div className="workout-indicator">
              <span className="workout-dot" />
              <span>{formatTime(store.workoutSeconds)}</span>
            </div>
          )}

          <Link href="/" className="nav-link">
            ← gamify.it
          </Link>

          <div className="xp-display">
            <span>{store.profile.xp.toLocaleString()}</span> XP
          </div>

          {store.currentWorkout && store.currentView === 'workout' && (
            <button className="finish-btn" onClick={() => setShowSaveModal(true)}>
              Finish
            </button>
          )}
        </header>

        {/* Content Area */}
        <main className="content-area">
          {/* Workout View */}
          {store.currentView === 'workout' && store.currentWorkout && (
            <div className="view-content">
              {store.currentWorkout.exercises.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💪</div>
                  <div className="empty-state-text">
                    Search for an exercise below to get started
                  </div>
                </div>
              ) : (
                store.currentWorkout.exercises.map((exercise, idx) => (
                  <div
                    key={exercise.id + idx}
                    className={`exercise-pill ${idx === store.currentExerciseIndex ? 'active' : ''}`}
                    onClick={() => store.selectExercise(idx)}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="exercise-name">{exercise.name}</div>
                      <div className="exercise-sets">
                        {exercise.sets.length === 0 ? (
                          <span className="set-badge">No sets yet</span>
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

              <div className="profile-card">
                <div className="profile-level">
                  <span className="profile-level-label">LEVEL</span>
                  <span className="profile-level-value">{store.profile.level}</span>
                </div>
                <div className="profile-name">{store.profile.name}</div>
                <div className="profile-xp">{store.profile.xp.toLocaleString()} XP</div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{store.profile.totalWorkouts}</div>
                  <div className="stat-label">WORKOUTS</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{store.profile.totalSets}</div>
                  <div className="stat-label">SETS</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{Math.floor(store.profile.totalVolume / 1000)}K</div>
                  <div className="stat-label">VOLUME (lbs)</div>
                </div>
              </div>

              <div className="pr-section">
                <h3>Personal Records</h3>
                <div className="pr-list">
                  {Object.entries(store.records)
                    .filter(([id]) => EXERCISES.some(e => e.id === id))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([id, weight]) => {
                      const exercise = getExerciseById(id);
                      return (
                        <div key={id} className="pr-item">
                          <div className="pr-exercise">{exercise?.name || id}</div>
                          <div className="pr-weight">{weight} lbs</div>
                        </div>
                      );
                    })}
                </div>
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

              <div className="workout-list">
                {store.workouts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">No workouts yet. Start your first workout!</div>
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
                        {workout.exercises.length} exercises • {workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} sets
                        <span className="workout-xp"> • +{workout.totalXP} XP</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Workout Detail View */}
          {store.currentView === 'workout-detail' && store.selectedWorkoutId && (
            <WorkoutDetailView
              workout={store.workouts.find(w => w.id === store.selectedWorkoutId)!}
              records={store.records}
              onBack={() => store.setView('history')}
              onRepeat={(workout) => {
                // Start workout with same exercises but no sets
                store.startWorkout();
                workout.exercises.forEach(ex => {
                  store.addExerciseToWorkout(ex.id);
                });
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

              <div style={{ display: 'grid', gap: '8px' }}>
                {Object.entries(MILESTONES).flatMap(([exerciseId, milestones]) =>
                  milestones.map(milestone => {
                    const key = `${exerciseId}_${milestone.weight}`;
                    const unlocked = store.achievements.includes(key);
                    const exercise = getExerciseById(exerciseId);
                    return (
                      <div
                        key={key}
                        style={{
                          background: unlocked ? 'rgba(255,215,0,0.1)' : 'var(--bg-tertiary)',
                          border: `1px solid ${unlocked ? '#ffd700' : 'var(--border)'}`,
                          borderRadius: '12px',
                          padding: '16px',
                          opacity: unlocked ? 1 : 0.5
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '28px' }}>{milestone.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{milestone.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {exercise?.name} • {milestone.weight} lbs • +{milestone.xp} XP
                            </div>
                          </div>
                          {unlocked && <span style={{ marginLeft: 'auto', color: '#22c55e' }}>✓</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Home View (default) */}
          {store.currentView === 'home' && !store.currentWorkout && (
            <div className="view-content">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💪</div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Iron Quest</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Level up your fitness journey
                </p>

                {store.workouts.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      RECENT WORKOUTS
                    </h3>
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
              </div>
            </div>
          )}
        </main>

        {/* Command Bar */}
        <div className="command-bar">
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
            placeholder={
              store.currentWorkout && store.currentView === 'workout'
                ? store.currentWorkout.exercises[store.currentExerciseIndex]
                  ? `${store.currentWorkout.exercises[store.currentExerciseIndex].name}: type weight x reps`
                  : 'Add exercise...'
                : 'What do you want to do?'
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedSuggestion(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Set Panel */}
        {showSetPanel && store.currentWorkout && (
          <div className="set-panel">
            <div className="set-panel-header">
              <span>{store.currentWorkout.exercises[store.currentExerciseIndex]?.name}</span>
              <button className="close-btn" onClick={() => setShowSetPanel(false)}>×</button>
            </div>
            <div className="set-inputs">
              <div className="input-col">
                <input
                  type="number"
                  value={setWeight}
                  onChange={(e) => setSetWeight(Number(e.target.value))}
                  inputMode="decimal"
                />
                <div className="input-label">lbs</div>
              </div>
              <div className="input-divider">×</div>
              <div className="input-col">
                <input
                  type="number"
                  value={setReps}
                  onChange={(e) => setSetReps(Number(e.target.value))}
                  inputMode="numeric"
                />
                <div className="input-label">reps</div>
              </div>
            </div>
            <div className="set-actions">
              <button className="stepper-btn" onClick={() => setSetWeight(w => w - 5)}>-5</button>
              <button className="log-btn" onClick={handleLogSet}>Log Set</button>
              <button className="stepper-btn" onClick={() => setSetWeight(w => w + 5)}>+5</button>
            </div>
          </div>
        )}

        {/* Save Template Modal */}
        {showSaveModal && (
          <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">Save as Template?</div>
              <div className="modal-body">
                <p>Save this workout to quickly start it again later.</p>
                <input
                  type="text"
                  placeholder="Template name (e.g., Push Day)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFinishWorkout(true);
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => handleFinishWorkout(false)}>
                  Skip
                </button>
                <button className="modal-btn primary" onClick={() => handleFinishWorkout(true)}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {store.toastMessage && (
          <div className="toast">{store.toastMessage}</div>
        )}
      </div>
    </>
  );
}

// Workout Detail Component
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="view-content">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="view-title">{formatDate(workout.startTime)}</span>
      </div>

      <div style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-around',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
            +{workout.totalXP}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>XP EARNED</div>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>
            {workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SETS</div>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>
            {formatDuration(workout.duration)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DURATION</div>
        </div>
      </div>

      {workout.exercises.map((exercise, idx) => (
        <div
          key={exercise.id + idx}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '8px'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>{exercise.name}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {exercise.sets.map((set, setIdx) => (
              <span
                key={setIdx}
                style={{
                  padding: '4px 8px',
                  background: set.weight >= (records[exercise.id] || 0) ? 'rgba(255,215,0,0.2)' : 'var(--bg-elevated)',
                  color: set.weight >= (records[exercise.id] || 0) ? '#ffd700' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  fontSize: '12px'
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
          padding: '14px',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: '12px',
          color: 'white',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '16px'
        }}
      >
        Repeat This Workout
      </button>
    </div>
  );
}

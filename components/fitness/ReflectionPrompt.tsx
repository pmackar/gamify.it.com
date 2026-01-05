'use client';

import { useState, useEffect } from 'react';

export type MoodRating = 'great' | 'good' | 'tired' | 'tough';
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export interface ReflectionData {
  mood?: MoodRating;
  energy?: EnergyLevel;
  note?: string;
  timestamp: string;
}

interface ReflectionPromptProps {
  onSubmit: (data: ReflectionData) => void;
  onSkip: () => void;
  workoutStats?: {
    duration: number;
    exerciseCount: number;
    setCount: number;
    prsHit: number;
  };
}

const MOOD_OPTIONS: { value: MoodRating; emoji: string; label: string }[] = [
  { value: 'great', emoji: '🔥', label: 'Great' },
  { value: 'good', emoji: '💪', label: 'Good' },
  { value: 'tired', emoji: '😮‍💨', label: 'Tired' },
  { value: 'tough', emoji: '😤', label: 'Tough' },
];

export function ReflectionPrompt({ onSubmit, onSkip, workoutStats }: ReflectionPromptProps) {
  const [mood, setMood] = useState<MoodRating | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [note, setNote] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleSubmit = () => {
    const data: ReflectionData = {
      timestamp: new Date().toISOString(),
    };
    if (mood) data.mood = mood;
    if (energy) data.energy = energy;
    if (note.trim()) data.note = note.trim();

    onSubmit(data);
  };

  const canSubmit = mood !== null || energy !== null || note.trim().length > 0;

  return (
    <>
      <style jsx>{`
        .reflection-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          opacity: ${isVisible ? 1 : 0};
          transition: opacity 0.3s ease;
        }

        .reflection-card {
          background: linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 28, 0.98) 100%);
          border: 2px solid var(--rpg-gold);
          border-radius: 16px;
          padding: 1.5rem;
          max-width: 360px;
          width: 100%;
          transform: ${isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)'};
          transition: transform 0.3s ease;
        }

        .reflection-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .reflection-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: var(--rpg-gold);
          margin-bottom: 0.5rem;
        }

        .reflection-subtitle {
          font-size: 0.75rem;
          color: var(--rpg-muted);
        }

        .reflection-section {
          margin-bottom: 1.25rem;
        }

        .section-label {
          font-size: 0.7rem;
          color: var(--rpg-text-secondary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mood-options {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .mood-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 70px;
        }

        .mood-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .mood-button.selected {
          border-color: var(--rpg-gold);
          background: rgba(255, 215, 0, 0.1);
        }

        .mood-emoji {
          font-size: 1.5rem;
        }

        .mood-label {
          font-size: 0.55rem;
          color: var(--rpg-muted);
          font-family: 'Press Start 2P', monospace;
        }

        .mood-button.selected .mood-label {
          color: var(--rpg-gold);
        }

        .energy-scale {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .energy-button {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1.25rem;
          transition: all 0.2s ease;
        }

        .energy-button:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }

        .energy-button.selected {
          border-color: var(--rpg-teal);
          background: rgba(95, 191, 138, 0.15);
        }

        .energy-button.filled {
          opacity: 1;
        }

        .energy-button:not(.filled) {
          opacity: 0.4;
        }

        .note-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--rpg-text);
          font-size: 0.85rem;
          resize: none;
          font-family: inherit;
        }

        .note-input::placeholder {
          color: var(--rpg-muted);
        }

        .note-input:focus {
          outline: none;
          border-color: var(--rpg-teal);
        }

        .char-count {
          text-align: right;
          font-size: 0.65rem;
          color: var(--rpg-muted);
          margin-top: 0.25rem;
        }

        .reflection-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .btn-skip {
          flex: 1;
          padding: 0.875rem;
          background: transparent;
          border: 1px solid var(--rpg-muted);
          border-radius: 10px;
          color: var(--rpg-muted);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-skip:hover {
          border-color: var(--rpg-text);
          color: var(--rpg-text);
        }

        .btn-submit {
          flex: 2;
          padding: 0.875rem;
          background: linear-gradient(180deg, var(--rpg-gold) 0%, #D4A800 100%);
          border: none;
          border-radius: 10px;
          color: #000;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: default;
        }

        @media (max-width: 400px) {
          .mood-button {
            padding: 0.5rem 0.75rem;
            min-width: 60px;
          }
          .mood-emoji {
            font-size: 1.25rem;
          }
          .energy-button {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>

      <div className="reflection-overlay">
        <div className="reflection-card">
          <div className="reflection-header">
            <div className="reflection-title">How Was Your Workout?</div>
            <div className="reflection-subtitle">
              Quick reflection helps track your progress
            </div>
          </div>

          <div className="reflection-section">
            <div className="section-label">How do you feel?</div>
            <div className="mood-options">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`mood-button ${mood === option.value ? 'selected' : ''}`}
                  onClick={() => setMood(mood === option.value ? null : option.value)}
                  type="button"
                >
                  <span className="mood-emoji">{option.emoji}</span>
                  <span className="mood-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="reflection-section">
            <div className="section-label">Energy level</div>
            <div className="energy-scale">
              {([1, 2, 3, 4, 5] as EnergyLevel[]).map((level) => (
                <button
                  key={level}
                  className={`energy-button ${energy !== null && level <= energy ? 'filled' : ''} ${energy === level ? 'selected' : ''}`}
                  onClick={() => setEnergy(energy === level ? null : level)}
                  type="button"
                >
                  ⚡
                </button>
              ))}
            </div>
          </div>

          <div className="reflection-section">
            <div className="section-label">Quick note (optional)</div>
            <textarea
              className="note-input"
              placeholder="What went well? Any wins today?"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 100))}
              rows={2}
            />
            <div className="char-count">{note.length}/100</div>
          </div>

          <div className="reflection-actions">
            <button className="btn-skip" onClick={onSkip} type="button">
              Skip
            </button>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={!canSubmit}
              type="button"
            >
              Save Reflection
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Event for triggering reflection prompt
export const REFLECTION_PROMPT_EVENT = 'show-reflection-prompt';

export function dispatchReflectionPrompt(workoutStats?: ReflectionPromptProps['workoutStats']) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REFLECTION_PROMPT_EVENT, { detail: workoutStats }));
  }
}

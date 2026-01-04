"use client";

import { useState } from "react";
import Link from "next/link";

interface PWAInstallTutorialProps {
  isIOS: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const IOS_STEPS = [
  {
    title: "Create a Password",
    description: "Go to Settings and create a password for easy login later",
    icon: "🔐",
    action: "settings",
  },
  {
    title: "Tap Share",
    description: "Tap the Share button at the bottom of Safari",
    icon: "⬆️",
    visual: (
      <div style={{
        width: 48,
        height: 48,
        border: "2px solid #aaa",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
      }}>
        ↑
      </div>
    ),
  },
  {
    title: "Add to Home Screen",
    description: "Scroll down and tap 'Add to Home Screen'",
    icon: "➕",
  },
  {
    title: "Tap Add",
    description: "Tap 'Add' in the top right corner",
    icon: "✓",
  },
  {
    title: "Done!",
    description: "Find Gamify on your home screen",
    icon: "🎮",
  },
];

const ANDROID_STEPS = [
  {
    title: "Create a Password",
    description: "Go to Settings and create a password for easy login later",
    icon: "🔐",
    action: "settings",
  },
  {
    title: "Tap Menu",
    description: "Tap the three dots (⋮) in Chrome's top right corner",
    icon: "⋮",
    visual: (
      <div style={{
        width: 48,
        height: 48,
        border: "2px solid #aaa",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        fontWeight: "bold",
      }}>
        ⋮
      </div>
    ),
  },
  {
    title: "Install App",
    description: "Tap 'Add to Home Screen' or 'Install App'",
    icon: "📲",
  },
  {
    title: "Confirm",
    description: "Tap 'Add' or 'Install' to confirm",
    icon: "✓",
  },
  {
    title: "Done!",
    description: "Find Gamify on your home screen",
    icon: "🎮",
  },
];

export function PWAInstallTutorial({ isIOS, onClose, onComplete }: PWAInstallTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = isIOS ? IOS_STEPS : ANDROID_STEPS;
  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <style jsx>{`
        .tutorial-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .tutorial-card {
          background: linear-gradient(180deg, #1a1a24 0%, #12121a 100%);
          border: 2px solid var(--theme-gold, #FFD700);
          border-radius: 20px;
          padding: 24px;
          max-width: 360px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.15);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tutorial-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .tutorial-platform {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: var(--theme-text-muted, #666);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tutorial-close {
          background: none;
          border: none;
          font-size: 20px;
          color: var(--theme-text-muted, #666);
          cursor: pointer;
          padding: 4px;
          transition: color 0.15s;
        }

        .tutorial-close:hover {
          color: var(--theme-text-secondary, #aaa);
        }

        .tutorial-progress {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 24px;
        }

        .progress-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--theme-border, #333);
          transition: all 0.2s;
        }

        .progress-dot.active {
          background: var(--theme-gold, #FFD700);
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        .progress-dot.completed {
          background: var(--theme-teal, #5FBF8A);
        }

        .tutorial-content {
          text-align: center;
          margin-bottom: 24px;
        }

        .tutorial-icon {
          font-size: 48px;
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
        }

        .tutorial-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 12px;
          color: var(--theme-gold, #FFD700);
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .tutorial-description {
          font-size: 14px;
          color: var(--theme-text-secondary, #aaa);
          line-height: 1.6;
        }

        .tutorial-settings-link {
          display: inline-block;
          margin-top: 12px;
          padding: 10px 16px;
          background: linear-gradient(180deg, var(--theme-teal, #5FBF8A) 0%, #4a9d6e 100%);
          color: #1a1a1a;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          border-radius: 8px;
          text-decoration: none;
          box-shadow: 0 2px 0 #2d5f42;
          transition: all 0.15s;
        }

        .tutorial-settings-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 0 #2d5f42;
        }

        .tutorial-actions {
          display: flex;
          gap: 12px;
        }

        .tutorial-btn {
          flex: 1;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          padding: 14px 16px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tutorial-btn-secondary {
          background: transparent;
          color: var(--theme-text-muted, #666);
          border: 2px solid var(--theme-border, #333);
        }

        .tutorial-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--theme-text-secondary, #aaa);
        }

        .tutorial-btn-primary {
          background: linear-gradient(180deg, var(--theme-gold, #FFD700) 0%, #E6A000 100%);
          color: #1a1a1a;
          box-shadow: 0 3px 0 #996600;
        }

        .tutorial-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 0 #996600;
        }

        .tutorial-btn-primary:active {
          transform: translateY(1px);
          box-shadow: 0 2px 0 #996600;
        }

        .step-counter {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: var(--theme-text-muted, #666);
          text-align: center;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="tutorial-overlay" onClick={onClose}>
        <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
          <div className="tutorial-header">
            <div className="tutorial-platform">
              <span>{isIOS ? "🍎" : "🤖"}</span>
              <span>{isIOS ? "iOS SETUP" : "ANDROID SETUP"}</span>
            </div>
            <button className="tutorial-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="tutorial-progress">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`progress-dot ${i === currentStep ? "active" : ""} ${i < currentStep ? "completed" : ""}`}
              />
            ))}
          </div>

          <div className="step-counter">
            STEP {currentStep + 1} OF {steps.length}
          </div>

          <div className="tutorial-content">
            <div className="tutorial-icon">
              {step.visual || step.icon}
            </div>
            <div className="tutorial-title">{step.title}</div>
            <div className="tutorial-description">{step.description}</div>

            {step.action === "settings" && (
              <Link href="/settings" className="tutorial-settings-link" onClick={onClose}>
                GO TO SETTINGS
              </Link>
            )}
          </div>

          <div className="tutorial-actions">
            {currentStep > 0 ? (
              <button className="tutorial-btn tutorial-btn-secondary" onClick={handlePrev}>
                BACK
              </button>
            ) : (
              <button className="tutorial-btn tutorial-btn-secondary" onClick={onClose}>
                SKIP
              </button>
            )}
            <button className="tutorial-btn tutorial-btn-primary" onClick={handleNext}>
              {currentStep === steps.length - 1 ? "DONE" : "NEXT"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

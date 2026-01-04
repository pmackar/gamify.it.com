'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface XPGainData {
  amount: number;
  reason?: string;
  multiplier?: number;
  streakBonus?: boolean;
}

interface XPToastContextType {
  showXPGain: (data: XPGainData) => void;
}

const XPToastContext = createContext<XPToastContextType | null>(null);

export function useXPToast() {
  const context = useContext(XPToastContext);
  if (!context) {
    throw new Error('useXPToast must be used within XPToastProvider');
  }
  return context;
}

// Custom event for XP gains
export const XP_GAINED_EVENT = 'xp-gained';

export function dispatchXPGain(amount: number, reason?: string, multiplier?: number, streakBonus?: boolean) {
  if (typeof window !== 'undefined' && amount > 0) {
    window.dispatchEvent(new CustomEvent(XP_GAINED_EVENT, {
      detail: { amount, reason, multiplier, streakBonus }
    }));
  }
}

interface ToastData extends XPGainData {
  id: number;
}

function XPToastNotification({ data, onComplete }: { data: ToastData; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      <style jsx>{`
        .xp-toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(24, 24, 32, 0.95);
          backdrop-filter: blur(10px);
          border: 2px solid var(--rpg-teal);
          border-radius: 12px;
          box-shadow: 0 0 20px var(--rpg-teal-glow),
                      0 4px 12px rgba(0, 0, 0, 0.4);
          animation: toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          font-family: var(--font-pixel), monospace;
        }

        @keyframes toastSlideIn {
          0% {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .xp-toast.exiting {
          animation: toastSlideOut 0.3s ease forwards;
        }

        @keyframes toastSlideOut {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        .xp-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--rpg-teal) 0%, rgba(95, 191, 138, 0.6) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 0 12px var(--rpg-teal-glow);
          animation: iconPulse 0.6s ease-in-out;
        }

        @keyframes iconPulse {
          0% { transform: scale(0.5); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .xp-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .xp-amount {
          font-size: 14px;
          font-weight: 700;
          color: var(--rpg-teal);
          text-shadow: 0 0 10px var(--rpg-teal-glow);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .xp-amount-number {
          animation: numberPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes numberPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }

        .xp-multiplier {
          font-size: 10px;
          padding: 2px 6px;
          background: linear-gradient(135deg, var(--rpg-gold), #FFA500);
          color: #1a1a1a;
          border-radius: 4px;
          font-weight: 700;
          animation: multiplierGlow 1s ease-in-out infinite;
        }

        @keyframes multiplierGlow {
          0%, 100% { box-shadow: 0 0 4px var(--rpg-gold-glow); }
          50% { box-shadow: 0 0 12px var(--rpg-gold-glow); }
        }

        .xp-reason {
          font-size: 10px;
          color: var(--rpg-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .streak-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          padding: 2px 8px;
          background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
          color: white;
          border-radius: 4px;
          margin-left: 4px;
          animation: streakPulse 0.8s ease-in-out infinite;
        }

        @keyframes streakPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 768px) {
          .xp-toast {
            padding: 10px 16px;
          }
          .xp-icon {
            width: 32px;
            height: 32px;
            font-size: 16px;
          }
          .xp-amount {
            font-size: 12px;
          }
          .xp-reason {
            font-size: 9px;
          }
        }
      `}</style>

      <div className="xp-toast">
        <div className="xp-icon">+</div>
        <div className="xp-content">
          <div className="xp-amount">
            <span className="xp-amount-number">+{data.amount} XP</span>
            {data.multiplier && data.multiplier > 1 && (
              <span className="xp-multiplier">{data.multiplier}x</span>
            )}
            {data.streakBonus && (
              <span className="streak-badge">Streak</span>
            )}
          </div>
          {data.reason && <div className="xp-reason">{data.reason}</div>}
        </div>
      </div>
    </>
  );
}

export function XPToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [nextId, setNextId] = useState(0);

  const showXPGain = useCallback((data: XPGainData) => {
    const id = nextId;
    setNextId((prev) => prev + 1);
    setToasts((prev) => [...prev, { ...data, id }]);
  }, [nextId]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for XP gain events
  useEffect(() => {
    const handleXPGain = (event: CustomEvent<XPGainData>) => {
      showXPGain(event.detail);
    };

    window.addEventListener(XP_GAINED_EVENT, handleXPGain as EventListener);
    return () => {
      window.removeEventListener(XP_GAINED_EVENT, handleXPGain as EventListener);
    };
  }, [showXPGain]);

  return (
    <XPToastContext.Provider value={{ showXPGain }}>
      {children}
      {toasts.length > 0 && (
        <>
          <style jsx>{`
            .xp-toast-container {
              position: fixed;
              top: 80px;
              right: 20px;
              z-index: 9999;
              display: flex;
              flex-direction: column;
              gap: 10px;
              pointer-events: none;
            }

            @media (max-width: 768px) {
              .xp-toast-container {
                top: auto;
                bottom: 120px;
                right: 16px;
                left: 16px;
              }
            }
          `}</style>
          <div className="xp-toast-container">
            {toasts.map((toast) => (
              <XPToastNotification
                key={toast.id}
                data={toast}
                onComplete={() => removeToast(toast.id)}
              />
            ))}
          </div>
        </>
      )}
    </XPToastContext.Provider>
  );
}

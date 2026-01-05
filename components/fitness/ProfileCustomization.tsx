'use client';

import { useState, useEffect } from 'react';

interface Title {
  id: string;
  name: string;
  description: string;
  rarity: string;
  color?: string;
  colors: { bg: string; border: string; text: string };
  progress?: number;
}

interface Frame {
  id: string;
  name: string;
  level: number;
  color: string;
  currentLevel?: number;
}

interface Theme {
  id: string;
  name: string;
  color: string;
  requiredTitle?: string;
}

interface CosmeticsData {
  equipped: {
    title: string | null;
    frame: string;
    theme: string;
  };
  titles: { unlocked: Title[]; locked: Title[] };
  frames: { unlocked: Frame[]; locked: Frame[] };
  themes: { unlocked: Theme[]; locked: Theme[] };
}

export function ProfileCustomization({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<CosmeticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'titles' | 'frames' | 'themes'>('titles');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/fitness/cosmetics');
      if (!res.ok) return;
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch cosmetics:', error);
    } finally {
      setLoading(false);
    }
  };

  const equipItem = async (type: string, itemId: string | null) => {
    setSaving(true);
    try {
      const res = await fetch('/api/fitness/cosmetics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId }),
      });
      if (res.ok) {
        const result = await res.json();
        setData(d => d ? { ...d, equipped: result.equipped } : d);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="customization-modal">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <style jsx>{`
        .customization-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 10005;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .customization-modal {
          background: var(--theme-bg-elevated);
          border: 2px solid var(--rpg-gold);
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: var(--rpg-gold);
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--rpg-muted);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.5rem;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab {
          flex: 1;
          padding: 0.75rem;
          background: none;
          border: none;
          color: var(--rpg-muted);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab.active {
          color: var(--rpg-gold);
          border-bottom: 2px solid var(--rpg-gold);
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .section-title {
          font-size: 0.7rem;
          color: var(--rpg-muted);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
        }

        .items-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .item:hover {
          transform: translateX(4px);
        }

        .item.equipped {
          border-width: 2px;
        }

        .item.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .item-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .item-info {
          flex: 1;
        }

        .item-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--rpg-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .equipped-badge {
          font-size: 0.6rem;
          background: var(--rpg-gold);
          color: #000;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }

        .item-desc {
          font-size: 0.7rem;
          color: var(--rpg-muted);
          margin-top: 0.2rem;
        }

        .progress-mini {
          margin-top: 0.3rem;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 2px;
        }

        .rarity-badge {
          font-size: 0.55rem;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .frame-preview {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid;
        }

        .theme-preview {
          width: 40px;
          height: 40px;
          border-radius: 10px;
        }
      `}</style>

      <div className="customization-overlay" onClick={onClose}>
        <div className="customization-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">Customize Profile</span>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'titles' ? 'active' : ''}`}
              onClick={() => setActiveTab('titles')}
            >
              Titles
            </button>
            <button
              className={`tab ${activeTab === 'frames' ? 'active' : ''}`}
              onClick={() => setActiveTab('frames')}
            >
              Frames
            </button>
            <button
              className={`tab ${activeTab === 'themes' ? 'active' : ''}`}
              onClick={() => setActiveTab('themes')}
            >
              Themes
            </button>
          </div>

          <div className="content">
            {activeTab === 'titles' && (
              <>
                {/* Option to remove title */}
                <div className="items-grid">
                  <div
                    className={`item ${!data.equipped.title ? 'equipped' : ''}`}
                    style={{
                      background: 'rgba(107, 114, 128, 0.1)',
                      border: `1px solid ${!data.equipped.title ? '#6b7280' : 'transparent'}`,
                    }}
                    onClick={() => equipItem('title', null)}
                  >
                    <div className="item-icon" style={{ background: 'rgba(107, 114, 128, 0.2)' }}>
                      ❌
                    </div>
                    <div className="item-info">
                      <div className="item-name">
                        No Title
                        {!data.equipped.title && <span className="equipped-badge">Equipped</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="section-title">Unlocked</div>
                <div className="items-grid">
                  {data.titles.unlocked.map((title) => (
                    <div
                      key={title.id}
                      className={`item ${data.equipped.title === title.id ? 'equipped' : ''}`}
                      style={{
                        background: title.colors.bg,
                        border: `1px solid ${title.colors.border}`,
                      }}
                      onClick={() => !saving && equipItem('title', title.id)}
                    >
                      <div className="item-icon" style={{ background: title.colors.bg }}>
                        👑
                      </div>
                      <div className="item-info">
                        <div className="item-name" style={{ color: title.color || title.colors.text }}>
                          {title.name}
                          {data.equipped.title === title.id && (
                            <span className="equipped-badge">Equipped</span>
                          )}
                        </div>
                        <div className="item-desc">{title.description}</div>
                      </div>
                      <span
                        className="rarity-badge"
                        style={{ background: title.colors.bg, color: title.colors.text }}
                      >
                        {title.rarity}
                      </span>
                    </div>
                  ))}
                </div>

                {data.titles.locked.length > 0 && (
                  <>
                    <div className="section-title">Locked</div>
                    <div className="items-grid">
                      {data.titles.locked.slice(0, 5).map((title) => (
                        <div
                          key={title.id}
                          className="item locked"
                          style={{
                            background: 'rgba(107, 114, 128, 0.1)',
                            border: '1px solid rgba(107, 114, 128, 0.2)',
                          }}
                        >
                          <div className="item-icon" style={{ background: 'rgba(107, 114, 128, 0.2)' }}>
                            🔒
                          </div>
                          <div className="item-info">
                            <div className="item-name">{title.name}</div>
                            <div className="item-desc">{title.description}</div>
                            {title.progress !== undefined && (
                              <div className="progress-mini">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${title.progress}%`,
                                    background: title.colors.text,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'frames' && (
              <>
                <div className="section-title">Unlocked</div>
                <div className="items-grid">
                  {data.frames.unlocked.map((frame) => (
                    <div
                      key={frame.id}
                      className={`item ${data.equipped.frame === frame.id ? 'equipped' : ''}`}
                      style={{
                        background: `${frame.color}20`,
                        border: `1px solid ${data.equipped.frame === frame.id ? frame.color : 'transparent'}`,
                      }}
                      onClick={() => !saving && equipItem('frame', frame.id)}
                    >
                      <div className="frame-preview" style={{ borderColor: frame.color }} />
                      <div className="item-info">
                        <div className="item-name">
                          {frame.name}
                          {data.equipped.frame === frame.id && (
                            <span className="equipped-badge">Equipped</span>
                          )}
                        </div>
                        <div className="item-desc">Unlocked at Level {frame.level}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {data.frames.locked.length > 0 && (
                  <>
                    <div className="section-title">Locked</div>
                    <div className="items-grid">
                      {data.frames.locked.map((frame) => (
                        <div
                          key={frame.id}
                          className="item locked"
                          style={{
                            background: 'rgba(107, 114, 128, 0.1)',
                            border: '1px solid rgba(107, 114, 128, 0.2)',
                          }}
                        >
                          <div className="frame-preview" style={{ borderColor: '#6b7280' }} />
                          <div className="item-info">
                            <div className="item-name">{frame.name}</div>
                            <div className="item-desc">
                              Reach Level {frame.level} (you're {frame.currentLevel})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'themes' && (
              <>
                <div className="section-title">Unlocked</div>
                <div className="items-grid">
                  {data.themes.unlocked.map((theme) => (
                    <div
                      key={theme.id}
                      className={`item ${data.equipped.theme === theme.id ? 'equipped' : ''}`}
                      style={{
                        background: `${theme.color}20`,
                        border: `1px solid ${data.equipped.theme === theme.id ? theme.color : 'transparent'}`,
                      }}
                      onClick={() => !saving && equipItem('theme', theme.id)}
                    >
                      <div
                        className="theme-preview"
                        style={{ background: theme.color }}
                      />
                      <div className="item-info">
                        <div className="item-name">
                          {theme.name}
                          {data.equipped.theme === theme.id && (
                            <span className="equipped-badge">Equipped</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {data.themes.locked.length > 0 && (
                  <>
                    <div className="section-title">Locked</div>
                    <div className="items-grid">
                      {data.themes.locked.map((theme) => (
                        <div
                          key={theme.id}
                          className="item locked"
                          style={{
                            background: 'rgba(107, 114, 128, 0.1)',
                            border: '1px solid rgba(107, 114, 128, 0.2)',
                          }}
                        >
                          <div
                            className="theme-preview"
                            style={{ background: '#6b7280' }}
                          />
                          <div className="item-info">
                            <div className="item-name">{theme.name}</div>
                            <div className="item-desc">
                              Unlock "{theme.requiredTitle}" title
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

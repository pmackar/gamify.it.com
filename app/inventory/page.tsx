'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRarityColor, getRarityGlow, ItemRarity } from '@/lib/loot';

interface InventoryItem {
  id: string;
  quantity: number;
  acquiredAt: string;
  source: string | null;
  item: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: string;
    rarity: ItemRarity;
    icon: string | null;
    effects: Record<string, unknown> | null;
    stackable: boolean;
    maxStack: number | null;
  };
}

interface InventoryData {
  inventory: InventoryItem[];
  grouped: {
    consumables: number;
    cosmetics: number;
    pets: number;
    currency: number;
  };
  totals: {
    items: number;
    uniqueItems: number;
    byRarity: Record<string, number>;
  };
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch('/api/loot/inventory');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function useItem(inventoryId: string) {
    try {
      const res = await fetch('/api/loot/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId }),
      });

      if (res.ok) {
        // Refresh inventory
        fetchInventory();
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to use item:', err);
    }
  }

  const filteredItems = data?.inventory.filter((inv) => {
    if (filter === 'all') return true;
    return inv.item.type === filter.toUpperCase();
  }) || [];

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .inventory-page {
          min-height: 100vh;
          padding: calc(80px + env(safe-area-inset-top)) 1rem 2rem;
          background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
        }

        .inventory-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .inventory-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.2rem;
          color: #FFD700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
          margin-bottom: 0.5rem;
        }

        .inventory-subtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #666;
        }

        .inventory-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          text-align: center;
          min-width: 100px;
        }

        .stat-value {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.2rem;
          color: #fff;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #666;
        }

        .filter-tabs {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .filter-tab {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .filter-tab.active {
          background: rgba(255, 215, 0, 0.15);
          border-color: rgba(255, 215, 0, 0.3);
          color: #FFD700;
        }

        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 1rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .item-slot {
          aspect-ratio: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .item-slot:hover {
          transform: translateY(-4px);
        }

        .item-icon {
          font-size: 2.5rem;
          margin-bottom: 0.25rem;
        }

        .item-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: #fff;
          text-align: center;
          padding: 0 0.25rem;
          line-height: 1.4;
        }

        .item-quantity {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #fff;
          background: rgba(0, 0, 0, 0.7);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .empty-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #666;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .empty-cta {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #FFD700;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .empty-cta:hover {
          background: rgba(255, 215, 0, 0.2);
        }

        .item-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal-card {
          background: linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 28, 0.98) 100%);
          border-radius: 20px;
          padding: 2rem;
          max-width: 320px;
          width: 100%;
          text-align: center;
        }

        .modal-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .modal-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.8rem;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .modal-rarity {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          text-transform: uppercase;
          margin-bottom: 1rem;
        }

        .modal-description {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #888;
          line-height: 1.8;
          margin-bottom: 1.5rem;
        }

        .modal-quantity {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #666;
          margin-bottom: 1.5rem;
        }

        .modal-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .modal-btn {
          flex: 1;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn.primary {
          background: linear-gradient(180deg, #5CC9F5 0%, #4AA8D8 100%);
          border: none;
          color: #000;
        }

        .modal-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #888;
        }

        .modal-btn:hover {
          transform: translateY(-2px);
        }

        .loading {
          text-align: center;
          padding: 3rem;
        }

        .loading-spinner {
          font-size: 2rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #666;
          text-decoration: none;
          margin-bottom: 1rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #FFD700;
        }
      `}</style>

      <div className="inventory-page">
        <Link href="/account" className="back-link">
          ← Back to Profile
        </Link>

        <div className="inventory-header">
          <h1 className="inventory-title">Inventory</h1>
          <p className="inventory-subtitle">Your collected treasures</p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner">⚙️</div>
          </div>
        ) : data ? (
          <>
            <div className="inventory-stats">
              <div className="stat-card">
                <div className="stat-value">{data.totals.items}</div>
                <div className="stat-label">Total Items</div>
              </div>
              <div className="stat-card" style={{ borderColor: getRarityColor('RARE') }}>
                <div className="stat-value" style={{ color: getRarityColor('RARE') }}>
                  {data.totals.byRarity.RARE || 0}
                </div>
                <div className="stat-label">Rare</div>
              </div>
              <div className="stat-card" style={{ borderColor: getRarityColor('EPIC') }}>
                <div className="stat-value" style={{ color: getRarityColor('EPIC') }}>
                  {data.totals.byRarity.EPIC || 0}
                </div>
                <div className="stat-label">Epic</div>
              </div>
              <div className="stat-card" style={{ borderColor: getRarityColor('LEGENDARY') }}>
                <div className="stat-value" style={{ color: getRarityColor('LEGENDARY') }}>
                  {data.totals.byRarity.LEGENDARY || 0}
                </div>
                <div className="stat-label">Legendary</div>
              </div>
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({data.totals.items})
              </button>
              <button
                className={`filter-tab ${filter === 'consumable' ? 'active' : ''}`}
                onClick={() => setFilter('consumable')}
              >
                Consumables ({data.grouped.consumables})
              </button>
              <button
                className={`filter-tab ${filter === 'cosmetic' ? 'active' : ''}`}
                onClick={() => setFilter('cosmetic')}
              >
                Cosmetics ({data.grouped.cosmetics})
              </button>
              <button
                className={`filter-tab ${filter === 'pet' ? 'active' : ''}`}
                onClick={() => setFilter('pet')}
              >
                Pets ({data.grouped.pets})
              </button>
            </div>

            {filteredItems.length > 0 ? (
              <div className="inventory-grid">
                {filteredItems.map((inv) => (
                  <div
                    key={inv.id}
                    className="item-slot"
                    style={{
                      borderColor: getRarityColor(inv.item.rarity),
                      boxShadow: `0 0 20px ${getRarityGlow(inv.item.rarity)}`,
                    }}
                    onClick={() => setSelectedItem(inv)}
                  >
                    <div className="item-icon">{inv.item.icon || '❓'}</div>
                    <div className="item-name">{inv.item.name}</div>
                    {inv.quantity > 1 && (
                      <div className="item-quantity">x{inv.quantity}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p className="empty-text">
                  No items yet!<br />
                  Complete tasks to earn loot drops.
                </p>
                <Link href="/today" className="empty-cta">
                  Start Questing
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <p className="empty-text">Sign in to view your inventory</p>
            <Link href="/login" className="empty-cta">
              Sign In
            </Link>
          </div>
        )}

        {selectedItem && (
          <div className="item-modal" onClick={() => setSelectedItem(null)}>
            <div
              className="modal-card"
              style={{ borderColor: getRarityColor(selectedItem.item.rarity) }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon">{selectedItem.item.icon || '❓'}</div>
              <div className="modal-name">{selectedItem.item.name}</div>
              <div
                className="modal-rarity"
                style={{ color: getRarityColor(selectedItem.item.rarity) }}
              >
                {selectedItem.item.rarity}
              </div>
              <p className="modal-description">
                {selectedItem.item.description || 'A mysterious item.'}
              </p>
              <p className="modal-quantity">
                Quantity: {selectedItem.quantity}
              </p>
              <div className="modal-buttons">
                <button
                  className="modal-btn secondary"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </button>
                {selectedItem.item.type === 'CONSUMABLE' && (
                  <button
                    className="modal-btn primary"
                    onClick={() => useItem(selectedItem.id)}
                  >
                    Use Item
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

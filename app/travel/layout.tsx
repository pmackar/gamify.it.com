'use client';

import TravelBreadcrumb from '@/components/TravelBreadcrumb';

export default function TravelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style jsx global>{`
        .travel-layout {
          min-height: 100vh;
          background: var(--theme-bg-base);
          padding-top: 66px;
          color: var(--theme-text-primary);
        }

        /* Light theme adjustments for travel */
        :global(html.light) .travel-layout {
          background: var(--theme-bg-base);
        }

        :global(html.light) .travel-layout [style*="background: var(--rpg-card)"],
        :global(html.light) .travel-layout [style*="background: #2d2d2d"] {
          background: var(--theme-bg-card) !important;
        }

        @media (max-width: 768px) {
          .travel-layout {
            padding-top: 56px;
          }
        }
      `}</style>
      <div className="travel-layout">
        <TravelBreadcrumb />
        <main>{children}</main>
      </div>
    </>
  );
}

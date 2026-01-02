'use client';

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
          font-family: var(--font-body);
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

          .travel-layout .text-lg {
            font-size: 0.65rem !important;
          }
        }
      `}</style>
      <div className="travel-layout">
        <main>{children}</main>
      </div>
    </>
  );
}

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

        /* Universal font sizing for travel */
        .travel-layout h1,
        .travel-layout h2,
        .travel-layout h3 {
          font-family: var(--font-pixel) !important;
        }

        /* Override Tailwind text sizes for consistency */
        .travel-layout .text-lg {
          font-family: var(--font-pixel) !important;
          font-size: 0.75rem !important;
        }

        .travel-layout .text-sm {
          font-size: 0.6rem !important;
        }

        .travel-layout .text-xs {
          font-size: 0.5rem !important;
        }

        /* Normalize arbitrary text sizes */
        .travel-layout [class*="text-[0.45rem]"] {
          font-size: 0.5rem !important;
        }

        .travel-layout [class*="text-[0.5rem]"] {
          font-size: 0.55rem !important;
        }

        .travel-layout [class*="text-[0.55rem]"] {
          font-size: 0.6rem !important;
        }

        .travel-layout [class*="text-[0.6rem]"] {
          font-size: 0.65rem !important;
        }

        .travel-layout [class*="text-[0.65rem]"] {
          font-size: 0.7rem !important;
        }

        /* RPG button text sizing */
        .travel-layout .rpg-btn {
          font-size: 0.55rem !important;
        }

        /* RPG input text sizing */
        .travel-layout .rpg-input {
          font-size: 0.6rem !important;
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

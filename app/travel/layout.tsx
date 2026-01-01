'use client';

export default function TravelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style jsx>{`
        .travel-layout {
          min-height: 100vh;
          background: #1a1a1a;
          padding-top: 66px;
        }
        @media (max-width: 768px) {
          .travel-layout {
            padding-top: 56px;
          }
        }
      `}</style>
      <div className="travel-layout">
        <main>{children}</main>
      </div>
    </>
  );
}

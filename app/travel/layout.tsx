export default function TravelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: '#1a1a1a', paddingTop: '66px' }}>
      <main>{children}</main>
    </div>
  );
}

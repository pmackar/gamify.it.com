'use client';

import { NavBar } from "@/components/NavBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: '#1a1a1a' }}>
      <NavBar />
      <main style={{ paddingTop: '80px' }}>{children}</main>
    </div>
  );
}

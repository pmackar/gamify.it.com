import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import { SessionProvider } from "@/components/providers/SessionProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen" style={{ background: 'var(--rpg-bg-dark)' }}>
        <Navbar />
        <main className="pt-14">{children}</main>
      </div>
    </SessionProvider>
  );
}

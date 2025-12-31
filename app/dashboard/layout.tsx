import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--rpg-bg-dark)' }}>
      <Navbar user={user} />
      <main className="pt-14">{children}</main>
    </div>
  );
}

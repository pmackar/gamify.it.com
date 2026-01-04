import { getAuthUser } from "@/lib/auth";
import { checkUserIsAdmin } from "@/lib/permissions-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Shield,
  ArrowLeft,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/moderation", label: "Moderation", icon: Shield },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await checkUserIsAdmin(user.id);

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--rpg-bg-dark)" }}
    >
      {/* Sidebar */}
      <aside
        className="w-64 border-r flex flex-col"
        style={{
          background: "var(--rpg-bg)",
          borderColor: "var(--rpg-border)",
        }}
      >
        {/* Logo */}
        <div
          className="p-4 border-b"
          style={{ borderColor: "var(--rpg-border)" }}
        >
          <h1
            className="text-lg font-bold"
            style={{
              fontFamily: "var(--font-pixel)",
              color: "var(--rpg-gold)",
              fontSize: "12px",
            }}
          >
            Admin Panel
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
            gamify.it.com
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{
                color: "var(--rpg-text-dim)",
              }}
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Back to app */}
        <div className="p-4 border-t" style={{ borderColor: "var(--rpg-border)" }}>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--rpg-muted)" }}
          >
            <ArrowLeft size={16} />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

import type { Route } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { SessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export function AppShell({
  user,
  children
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const links = [
    {
      href: "/students" as Route,
      label: "Ученици"
    },
    ...(user.role === "admin"
      ? [
          {
            href: "/admin/users" as Route,
            label: "Корисници"
          }
        ]
      : [])
  ] satisfies Array<{
    href: Route;
    label: string;
  }>;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Shared school workspace</p>
          <h1>Акциски план</h1>
        </div>
        <div className="header-actions">
          <span className="user-chip">
            {user.name || user.username}
            <small>{user.role}</small>
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={cn("nav-link")}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-note">
            <strong>JSON backup</strong>
            <p>
              Секој план може да се извезе како JSON пакет и повторно да се внесе
              со верзионирање.
            </p>
          </div>
        </aside>

        <section className="workspace">{children}</section>
      </div>
    </div>
  );
}

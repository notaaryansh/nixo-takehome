"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessagesSquare } from "lucide-react";

const items = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    isActive: (path: string) => path === "/" || path.startsWith("/customers"),
  },
  {
    label: "Messaging",
    href: "/messages",
    icon: MessagesSquare,
    isActive: (path: string) => path.startsWith("/messages"),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)]">
      <nav className="px-2 pt-3">
        <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
          View
        </div>
        {items.map(({ label, href, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={label}
              href={href}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors ${
                active
                  ? "bg-[var(--surface)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2 border-t border-[var(--border)] px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFE0B2] text-[10px] font-semibold text-[#1B1F23]">
          PS
        </div>
        <div className="flex flex-1 flex-col leading-tight">
          <span className="text-[11.5px] text-[var(--text)]">Priya Shah</span>
          <span className="text-[10px] text-[var(--text-dim)]">FDE · online</span>
        </div>
      </div>
    </aside>
  );
}

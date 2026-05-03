"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash } from "lucide-react";
import type { Channel } from "@/lib/fixtures";
import { formatRelativeTime } from "@/lib/format";

export function ChannelList({ channels }: { channels: Channel[] }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3">
        <span className="text-[12.5px] font-semibold text-[var(--text)]">Slack</span>
        <span className="text-[10.5px] text-[var(--text-dim)]">{channels.length} channels</span>
      </div>

      <div className="px-2 pb-1 pt-3">
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
          Customer channels
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {channels.map((c) => {
          const href = `/messages/${c.id}`;
          const active = pathname === href;
          return (
            <Link
              key={c.id}
              href={href}
              className={`group block rounded-md px-2 py-1.5 transition-colors ${
                active
                  ? "bg-[var(--surface)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Hash size={13} className="shrink-0 text-[var(--text-dim)]" />
                <span className="flex-1 truncate text-[12.5px]">{c.name}</span>
              </div>
              <p className="mt-0.5 truncate pl-[19px] text-[10.5px] text-[var(--text-dim)]">
                {formatRelativeTime(c.lastTs)} · {c.preview}
              </p>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

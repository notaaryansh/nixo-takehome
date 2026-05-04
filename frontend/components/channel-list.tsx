"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Hash, Plus } from "lucide-react";
import type { ChannelSummary } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

const slugifyChannel = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ChannelList({ channels }: { channels: ChannelSummary[] }) {
  const pathname = usePathname();
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const submitAdd = () => {
    const slug = slugifyChannel(draft);
    if (!slug) return;
    setDraft("");
    setAdding(false);
    router.push(`/messages/${slug}`);
  };

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3">
        <span className="text-[12.5px] font-semibold text-[var(--text)]">Slack</span>
        <span className="text-[10.5px] text-[var(--text-dim)]">
          {channels.length} channels
        </span>
      </div>

      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
          Customer channels
        </span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-dim)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          aria-label="Add new channel"
          title="Add new channel"
        >
          <Plus size={13} />
        </button>
      </div>

      {adding && (
        <div className="mx-2 mb-1 mt-1 flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
          <Hash size={12} className="shrink-0 text-[var(--text-dim)]" />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitAdd();
              } else if (e.key === "Escape") {
                setAdding(false);
                setDraft("");
              }
            }}
            placeholder="channel-name"
            className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none"
          />
          <button
            type="button"
            onClick={submitAdd}
            disabled={!slugifyChannel(draft)}
            className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-[var(--text-dim)]"
          >
            Add
          </button>
        </div>
      )}

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
              {c.preview && (
                <p className="mt-0.5 truncate pl-[19px] text-[10.5px] text-[var(--text-dim)]">
                  {c.lastTs ? `${formatRelativeTime(c.lastTs)} · ` : ""}
                  {c.preview}
                </p>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

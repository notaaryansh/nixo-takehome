"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Hash,
  Send,
  AtSign,
  Smile,
  Paperclip,
  UserRound,
  BadgeCheck,
} from "lucide-react";
import type { Message, Author } from "@/lib/types";
import type { Channel } from "@/lib/fixtures";
import { formatRelativeTime } from "@/lib/format";

const palette = ["#B6E3F4", "#C0AEDE", "#FFE0B2", "#C0F0E8", "#FFD5DC", "#E8D5F5"];
const colorFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const formatExactTime = (iso: string) => {
  const d = new Date(iso);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
};

const formatDay = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type MessageGroup = {
  authorKey: string;
  author: Message["author"];
  day: string;
  messages: Message[];
};

const groupMessages = (messages: Message[]): MessageGroup[] => {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const day = formatDay(m.ts);
    const last = groups[groups.length - 1];
    const sameAuthor = last && last.author.handle === m.author.handle && last.day === day;
    const within5min =
      last &&
      sameAuthor &&
      new Date(m.ts).getTime() -
        new Date(last.messages[last.messages.length - 1].ts).getTime() <
        5 * 60 * 1000;

    if (within5min && last) {
      last.messages.push(m);
    } else {
      groups.push({
        authorKey: `${m.author.handle}-${day}-${m.ts}-${m.id}`,
        author: m.author,
        day,
        messages: [m],
      });
    }
  }
  return groups;
};

type Role = "client" | "fde";

const FDE_PERSONA: Author = {
  name: "Priya Shah",
  handle: "priya",
  isInternal: true,
};

export function MessageStream({
  channel,
  messages: initialMessages,
}: {
  channel: Channel;
  messages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [role, setRole] = useState<Role>("client");
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset when navigating to a new channel
  useEffect(() => {
    setMessages(initialMessages);
    setText("");
  }, [channel.id, initialMessages]);

  // Auto-scroll on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Pick a "client" persona from the existing channel chatter, or fall back.
  const clientPersona = useMemo<Author>(() => {
    const fromChannel = initialMessages.find((m) => !m.author.isInternal)?.author;
    return (
      fromChannel ?? {
        name: `${channel.customerName} (demo)`,
        handle: `${channel.id}-demo`,
        isInternal: false,
      }
    );
  }, [initialMessages, channel.customerName, channel.id]);

  const activeAuthor: Author = role === "fde" ? FDE_PERSONA : clientPersona;
  const CLIENT_COLOR = "#3B82F6"; // clean blue, complements brand magenta
  const FDE_COLOR = "var(--accent)";
  const activeColor = role === "fde" ? FDE_COLOR : CLIENT_COLOR;

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newMsg: Message = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticketId: "local",
      customerId: channel.customerId,
      author: activeAuthor,
      text: trimmed,
      channel: `#${channel.name}`,
      ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setText("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const groups = groupMessages(messages);
  let lastDay: string | null = null;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3">
        <Hash size={15} className="text-[var(--text-dim)]" />
        <h1 className="text-[13.5px] font-semibold text-[var(--text)]">{channel.name}</h1>
        <span className="text-[var(--text-dim)]">·</span>
        <span className="text-[11.5px] text-[var(--text-muted)]">{channel.customerName}</span>
        <span className="ml-auto text-[10.5px] text-[var(--text-dim)]">
          {messages.length} messages
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3">
        {groups.map((g) => {
          const showDayDivider = g.day !== lastDay;
          lastDay = g.day;
          const avatarColor = g.author.isInternal
            ? "var(--accent)"
            : colorFor(g.author.handle);

          return (
            <div key={g.authorKey}>
              {showDayDivider && (
                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--border)]" />
                  <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-0.5 text-[10.5px] text-[var(--text-muted)]">
                    {g.day}
                  </span>
                  <div className="h-px flex-1 bg-[var(--border)]" />
                </div>
              )}

              <div className="flex gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--surface-hover)]/40">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
                  style={{
                    background: avatarColor,
                    color: g.author.isInternal ? "white" : "#1B1F23",
                  }}
                >
                  {initialsOf(g.author.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12.5px] font-semibold text-[var(--text)]">
                      {g.author.name}
                    </span>
                    {g.author.isInternal && (
                      <span className="rounded bg-[var(--accent-bg)] px-1 py-0 text-[9.5px] font-medium text-[var(--accent-soft)]">
                        FDE
                      </span>
                    )}
                    <span className="text-[10.5px] text-[var(--text-dim)]">
                      {formatExactTime(g.messages[0].ts)} ·{" "}
                      {formatRelativeTime(g.messages[0].ts)}
                    </span>
                  </div>
                  {g.messages.map((m) => (
                    <div
                      key={m.id}
                      id={`msg-${m.id}`}
                      className="mt-0.5 -mx-1 rounded px-1 transition-colors target:bg-[var(--accent-bg)] target:ring-1 target:ring-[var(--accent)]/40"
                    >
                      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--text)]">
                        {m.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* composer */}
      <div className="border-t border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-2">
          {/* role toggle */}
          <div className="flex items-center gap-1">
            <RoleToggleButton
              active={role === "client"}
              onClick={() => setRole("client")}
              label={`Send as ${clientPersona.name}`}
              color={CLIENT_COLOR}
              icon={<UserRound size={13} fill="currentColor" strokeWidth={1.5} />}
            />
            <RoleToggleButton
              active={role === "fde"}
              onClick={() => setRole("fde")}
              label={`Send as ${FDE_PERSONA.name} (FDE)`}
              color={FDE_COLOR}
              icon={<BadgeCheck size={13} fill="currentColor" strokeWidth={1.5} />}
            />
          </div>

          <span className="h-5 w-px bg-[var(--border)]" />

          {/* inline role indicator */}
          <span
            className="flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 text-[10px] font-medium"
            style={{
              background: role === "fde" ? "var(--accent-bg)" : `${activeColor}26`,
              color: role === "fde" ? "var(--accent-soft)" : activeColor,
            }}
            title={`Sending as ${activeAuthor.name}`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: activeColor }}
            />
            as {activeAuthor.name}
          </span>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Message #${channel.name}`}
            className="flex-1 bg-transparent text-[12.5px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none"
          />
          <button
            type="button"
            className="text-[var(--text-dim)] hover:text-[var(--text-muted)]"
            tabIndex={-1}
          >
            <Paperclip size={14} />
          </button>
          <button
            type="button"
            className="text-[var(--text-dim)] hover:text-[var(--text-muted)]"
            tabIndex={-1}
          >
            <AtSign size={14} />
          </button>
          <button
            type="button"
            className="text-[var(--text-dim)] hover:text-[var(--text-muted)]"
            tabIndex={-1}
          >
            <Smile size={14} />
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!text.trim()}
            className="ml-1 rounded bg-[var(--accent)] p-1.5 text-white transition-colors hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-[var(--text-dim)]"
            aria-label="Send message"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </section>
  );
}

function RoleToggleButton({
  active,
  onClick,
  label,
  color,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
      style={
        active
          ? { background: color, color: "#fff" }
          : { background: "transparent", color: "var(--text-dim)" }
      }
    >
      {icon}
    </button>
  );
}

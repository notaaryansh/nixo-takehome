"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Hash,
  Send,
  AtSign,
  Smile,
  Paperclip,
  ChevronUp,
  Plus,
} from "lucide-react";
import type { Message, Author } from "@/lib/types";
import type { ChannelSummary } from "@/lib/api";
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

type Persona = Author & { color: string };

const FDE_PERSONA: Persona = {
  name: "You",
  handle: "you",
  isInternal: true,
  color: "var(--accent)",
};

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

const buildPersonas = (initialMessages: Message[]): Persona[] => {
  // Only collect client-side senders. FDE is always Priya, regardless of
  // whatever handle ("You", etc.) the existing engineer messages were sent under.
  const seen = new Map<string, Persona>();
  for (const m of initialMessages) {
    if (m.author.isInternal) continue;
    if (seen.has(m.author.handle)) continue;
    seen.set(m.author.handle, {
      ...m.author,
      color: colorFor(m.author.handle),
    });
  }
  return [...Array.from(seen.values()), FDE_PERSONA];
};

export function MessageStream({
  channel,
  messages: initialMessages,
}: {
  channel: ChannelSummary;
  messages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [personas, setPersonas] = useState<Persona[]>(() =>
    buildPersonas(initialMessages),
  );
  const [currentHandle, setCurrentHandle] = useState<string>(() => {
    const personasInit = buildPersonas(initialMessages);
    const firstClient = personasInit.find((p) => !p.isInternal);
    return firstClient?.handle ?? FDE_PERSONA.handle;
  });

  // Reset when navigating to a new channel
  useEffect(() => {
    setMessages(initialMessages);
    setText("");
    const next = buildPersonas(initialMessages);
    setPersonas(next);
    const firstClient = next.find((p) => !p.isInternal);
    setCurrentHandle(firstClient?.handle ?? FDE_PERSONA.handle);
  }, [channel.id, initialMessages]);

  // Auto-scroll on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const currentPersona =
    personas.find((p) => p.handle === currentHandle) ?? FDE_PERSONA;

  const addClientPersona = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    const handleBase = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const handle = `${handleBase || "client"}-${Math.random().toString(36).slice(2, 5)}`;
    const newPersona: Persona = {
      name,
      handle,
      isInternal: false,
      color: colorFor(handle),
    };
    setPersonas((prev) => [...prev, newPersona]);
    setCurrentHandle(handle);
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newMsg: Message = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticketId: "local",
      customerId: channel.customerId,
      author: {
        name: currentPersona.name,
        handle: currentPersona.handle,
        isInternal: currentPersona.isInternal,
      },
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

  const groups = useMemo(() => groupMessages(messages), [messages]);
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
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-dim)]">
            No messages yet — send the first one below.
          </div>
        ) : (
          groups.map((g) => {
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
          })
        )}
      </div>

      {/* composer */}
      <div className="border-t border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-2">
          <PersonaPicker
            personas={personas}
            currentHandle={currentHandle}
            onSelect={setCurrentHandle}
            onAddClient={addClientPersona}
          />

          <span className="h-5 w-px bg-[var(--border)]" />

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

function PersonaPicker({
  personas,
  currentHandle,
  onSelect,
  onAddClient,
}: {
  personas: Persona[];
  currentHandle: string;
  onSelect: (handle: string) => void;
  onAddClient: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setNewName("");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const current =
    personas.find((p) => p.handle === currentHandle) ?? personas[0];

  const submitNew = () => {
    if (!newName.trim()) return;
    onAddClient(newName);
    setNewName("");
    setAdding(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 items-center gap-1.5 rounded-md px-1.5 transition-colors hover:bg-[var(--surface-hover)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded text-[9.5px] font-semibold"
          style={{
            background: current?.color,
            color: current?.isInternal ? "white" : "#1B1F23",
          }}
        >
          {initialsOf(current?.name ?? "?")}
        </span>
        <span className="text-[11.5px] text-[var(--text-muted)]">
          {current?.name}
        </span>
        <ChevronUp
          size={12}
          className={`text-[var(--text-dim)] transition-transform ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 min-w-[220px] rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] py-1 shadow-lg shadow-black/40">
          <div className="border-b border-[var(--border)] px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
            Send as
          </div>
          <ul className="max-h-[240px] overflow-y-auto py-1" role="listbox">
            {personas.map((p) => {
              const active = p.handle === currentHandle;
              return (
                <li key={p.handle}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onSelect(p.handle);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] transition-colors ${
                      active
                        ? "bg-[var(--surface)]"
                        : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded text-[9.5px] font-semibold"
                      style={{
                        background: p.color,
                        color: p.isInternal ? "white" : "#1B1F23",
                      }}
                    >
                      {initialsOf(p.name)}
                    </span>
                    <span className="flex-1 truncate text-[var(--text)]">
                      {p.name}
                    </span>
                    {p.isInternal && (
                      <span className="rounded bg-[var(--accent-bg)] px-1 py-0 text-[9px] font-medium text-[var(--accent-soft)]">
                        FDE
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--border)] py-1">
            {!adding ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              >
                <Plus size={13} />
                Add new client
              </button>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1">
                <Plus size={13} className="text-[var(--text-dim)]" />
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitNew();
                    } else if (e.key === "Escape") {
                      setAdding(false);
                      setNewName("");
                    }
                  }}
                  placeholder="Client name…"
                  className="h-6 flex-1 rounded bg-[var(--bg)] px-1.5 text-[12px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                />
                <button
                  type="button"
                  onClick={submitNew}
                  disabled={!newName.trim()}
                  className="rounded bg-[var(--accent)] px-2 py-0.5 text-[10.5px] font-medium text-white transition-colors hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-[var(--text-dim)]"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

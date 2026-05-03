import Link from "next/link";
import { Hash, ArrowUpRight } from "lucide-react";
import type { Message } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

const palette = ["#B6E3F4", "#C0AEDE", "#FFE0B2", "#C0F0E8", "#FFD5DC", "#E8D5F5"];
const colorFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function MessageSnapshot({
  message,
  customerId,
}: {
  message: Message;
  customerId: string;
}) {
  const avatarColor = message.author.isInternal
    ? "var(--accent)"
    : colorFor(message.author.handle);
  const channelName = message.channel.replace(/^#/, "");

  return (
    <div className="group rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10.5px] font-semibold"
          style={{
            background: avatarColor,
            color: message.author.isInternal ? "white" : "#1B1F23",
          }}
        >
          {initialsOf(message.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[12.5px] font-semibold text-[var(--text)]">
              {message.author.name}
            </span>
            {message.author.isInternal && (
              <span className="rounded bg-[var(--accent-bg)] px-1 py-0 text-[9.5px] font-medium text-[var(--accent-soft)]">
                FDE
              </span>
            )}
            <span className="text-[10.5px] text-[var(--text-dim)]">
              {formatRelativeTime(message.ts)}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-[var(--text-dim)]">
              <Hash size={10.5} />
              {channelName}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--text)]">
            {message.text}
          </p>
          <div className="mt-2">
            <Link
              href={`/messages/${customerId}#msg-${message.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[10.5px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-bg)] hover:text-[var(--accent-soft)]"
            >
              View in Slack
              <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

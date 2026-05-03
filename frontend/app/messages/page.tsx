import { redirect } from "next/navigation";
import { getChannels } from "@/lib/fixtures";

export default function MessagesIndex() {
  const channels = getChannels();
  if (channels.length > 0) {
    redirect(`/messages/${channels[0].id}`);
  }
  return (
    <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-dim)]">
      No channels yet.
    </div>
  );
}

import { redirect } from "next/navigation";
import { apiGetChannels } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MessagesIndex() {
  const channels = await apiGetChannels();
  if (channels.length > 0) {
    redirect(`/messages/${channels[0]}`);
  }
  return (
    <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-dim)]">
      No channels yet.
    </div>
  );
}

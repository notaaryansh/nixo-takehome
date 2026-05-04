import { ChannelList } from "@/components/channel-list";
import { apiGetChannels, apiGetMessages, buildChannelSummaries } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [channels, messages] = await Promise.all([
    apiGetChannels(),
    apiGetMessages(),
  ]);
  const summaries = buildChannelSummaries(channels, messages);
  return (
    <div className="flex h-full min-h-0">
      <ChannelList channels={summaries} />
      <div className="flex h-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

import { ChannelList } from "@/components/channel-list";
import { getChannels } from "@/lib/fixtures";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const channels = getChannels();
  return (
    <div className="flex h-full min-h-0">
      <ChannelList channels={channels} />
      <div className="flex h-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

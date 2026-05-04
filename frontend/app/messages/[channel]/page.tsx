import { MessageStream } from "@/components/message-stream";
import {
  adaptMessage,
  apiGetChannels,
  apiGetEvents,
  apiGetMessages,
  buildChannelSummaries,
  channelDisplayName,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel: channelId } = await params;

  const [channels, events, messages] = await Promise.all([
    apiGetChannels(),
    apiGetEvents(channelId),
    apiGetMessages(channelId),
  ]);

  const knownChannel = channels.includes(channelId);

  const summary =
    (knownChannel &&
      buildChannelSummaries(channels, messages).find((c) => c.id === channelId)) ||
    {
      id: channelId,
      name: channelId,
      customerId: channelId,
      customerName: channelDisplayName(channelId),
      lastTs: "",
      preview: "",
    };

  const sortedMessages = [...messages].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const ui = sortedMessages.map((m) => {
    const owning = events.find((e) => e.message_ids.includes(m.id));
    return adaptMessage(m, owning?.id ?? "");
  });

  return <MessageStream channel={summary} messages={ui} />;
}

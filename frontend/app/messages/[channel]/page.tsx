import { notFound } from "next/navigation";
import { MessageStream } from "@/components/message-stream";
import { getChannel, getMessagesForChannel } from "@/lib/fixtures";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel: channelId } = await params;
  const channel = getChannel(channelId);
  if (!channel) notFound();
  const messages = getMessagesForChannel(channelId);
  return <MessageStream channel={channel} messages={messages} />;
}

import { notFound } from "next/navigation";
import { TicketDetail } from "@/components/ticket-detail";
import { PollRefresh } from "@/components/poll-refresh";
import {
  apiGetChannels,
  apiGetEvents,
  apiGetMessages,
  apiGetRisks,
  buildCustomers,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string; ticketId: string }>;
}) {
  const { id, ticketId } = await params;
  const nowMs = Date.now();

  const [channels, events, messages, risks] = await Promise.all([
    apiGetChannels(),
    apiGetEvents(),
    apiGetMessages(),
    apiGetRisks(),
  ]);

  if (!channels.includes(id)) notFound();

  const data = buildCustomers(channels, events, messages, nowMs, risks).find(
    (c) => c.customer.id === id,
  );
  if (!data) notFound();

  const ticket = data.tickets.find((t) => t.id === ticketId);
  if (!ticket) notFound();

  return (
    <>
      <PollRefresh intervalMs={5000} />
      <TicketDetail customer={data.customer} ticket={ticket} />
    </>
  );
}

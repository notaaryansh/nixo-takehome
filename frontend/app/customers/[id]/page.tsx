import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/customer-detail";
import {
  apiGetChannels,
  apiGetEvents,
  apiGetMessages,
  apiGetRisks,
  buildCustomers,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return <CustomerDetail customer={data.customer} tickets={data.tickets} />;
}

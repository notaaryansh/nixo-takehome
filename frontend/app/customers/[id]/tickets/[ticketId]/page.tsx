import { notFound } from "next/navigation";
import { TicketDetail } from "@/components/ticket-detail";
import { getCustomer, getTicket } from "@/lib/fixtures";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string; ticketId: string }>;
}) {
  const { id, ticketId } = await params;
  const customer = getCustomer(id);
  const ticket = getTicket(ticketId);
  if (!customer || !ticket || ticket.customerId !== id) notFound();
  return <TicketDetail customer={customer} ticket={ticket} />;
}

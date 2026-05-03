import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/customer-detail";
import { getCustomer, getTicketsForCustomer } from "@/lib/fixtures";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = getCustomer(id);
  if (!customer) notFound();

  const tickets = getTicketsForCustomer(customer.id);
  return <CustomerDetail customer={customer} tickets={tickets} />;
}

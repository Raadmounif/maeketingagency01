"use client";

import { AllOrdersSection, type RecentOrdersSnapshot } from "./all-orders-section";
import { PaymentRequestsSection, type PaymentRequestRow } from "./payment-requests-section";

export default function PaymentsAndOrdersClient({
  isPlatformAdmin,
  requests,
  recentOrders,
}: {
  isPlatformAdmin: boolean;
  requests: PaymentRequestRow[];
  recentOrders: RecentOrdersSnapshot;
}) {
  return (
    <div className="space-y-10">
      <PaymentRequestsSection isPlatformAdmin={isPlatformAdmin} requests={requests} />
      <AllOrdersSection orders={recentOrders} />
    </div>
  );
}

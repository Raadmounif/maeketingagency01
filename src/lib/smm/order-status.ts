import type { SmmOrderStatus } from "@prisma/client";

export function mapProviderOrderStatus(status: string | undefined): SmmOrderStatus {
  const s = (status ?? "").toLowerCase();
  if (s.includes("completed")) return "COMPLETED";
  if (s.includes("partial")) return "PARTIAL";
  if (s.includes("cancel")) return "CANCELED";
  if (s.includes("in progress") || s.includes("in_progress")) return "IN_PROGRESS";
  if (s.includes("processing")) return "PROCESSING";
  if (s.includes("fail")) return "FAILED";
  if (s.includes("pending")) return "PENDING";
  return "PROCESSING";
}

import { revalidatePath } from "next/cache";

export function revalidatePaymentPaths() {
  for (const locale of ["en", "ar"] as const) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/admin/payments`);
    revalidatePath(`/${locale}/admin/payments-and-orders`);
    revalidatePath(`/${locale}/admin`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments-and-orders");
  revalidatePath("/admin");
}

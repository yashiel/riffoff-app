import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Payment Successful" };

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="size-8 text-emerald-600" />
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        Payment successful
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your tickets have been issued. You can view them in your ticket wallet.
      </p>

      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/dashboard/tickets">View My Tickets</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/events">Browse More Events</Link>
        </Button>
      </div>
    </div>
  );
}

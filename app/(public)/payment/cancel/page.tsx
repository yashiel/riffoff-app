import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Payment Cancelled" };

export default function PaymentCancelPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <XCircle className="size-8 text-destructive" />
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        Payment cancelled
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your payment was not completed. No charge was made and your
        reservation will be released automatically.
      </p>

      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/events">Browse Events</Link>
        </Button>
      </div>
    </div>
  );
}

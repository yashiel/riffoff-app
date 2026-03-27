"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { applyToEvent } from "@/actions/artist-applications";

interface ApplyFormProps {
  eventId: string;
  eventTitle: string;
}

export function ApplyForm({ eventId, eventTitle }: ApplyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await applyToEvent({
        eventId,
        notes: (formData.get("notes") as string) || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/dashboard/applications");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-base text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] p-4">
        <p className="text-base text-muted-foreground">Applying to perform at</p>
        <p className="mt-1 text-base font-bold text-foreground">{eventTitle}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-base text-muted-foreground">
          Message to organiser (optional)
        </Label>
        <textarea
          id="notes" name="notes" rows={4} maxLength={500}
          placeholder="Introduce yourself, share your experience, why you'd be a great fit..."
          className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] transition-colors resize-none"
        />
        <p className="text-sm text-muted-foreground">
          The organiser will see your artist profile along with this message.
        </p>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary w-full !py-3">
        {isPending ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}

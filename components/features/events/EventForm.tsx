"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { VenueCombobox } from "./VenueCombobox";
import { createEvent, updateEvent, type EventFormResult } from "@/actions/events";
import { createVenue } from "@/actions/venues";
import { uploadEventImage } from "@/actions/upload";
import type { EventDoc, VenueDoc } from "@/lib/appwrite/types";

interface EventFormProps {
  event?: EventDoc;
  venues: VenueDoc[];
}

export function EventForm({ event, venues }: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState(event?.coverimageUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(event?.venueId ?? null);
  const [venueName, setVenueName] = useState("");

  const isEditing = !!event;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadEventImage(formData);
    if (result.url) setCoverUrl(result.url);
    if (result.error) setError(result.error);
    setIsUploading(false);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // If no existing venue selected, create a new one
      let resolvedVenueId = venueId;
      if (!resolvedVenueId && venueName) {
        const venueResult = await createVenue(venueName);
        if (venueResult.error) { setError(venueResult.error); return; }
        resolvedVenueId = venueResult.venueId ?? null;
      }
      if (!resolvedVenueId) { setError("Please select or enter a venue"); return; }

      const input = {
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        venueId: resolvedVenueId,
        genres: (formData.get("genres") as string)
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        startsAt: new Date(formData.get("startsAt") as string).toISOString(),
        endsAt: new Date(formData.get("endsAt") as string).toISOString(),
        capacity: parseInt(formData.get("capacity") as string, 10),
        isFree: formData.get("isFree") === "on",
        coverimageUrl: coverUrl || undefined,
      };

      let result: EventFormResult;
      if (isEditing) {
        result = await updateEvent({ eventId: event.$id, ...input });
      } else {
        result = await createEvent(input);
      }

      if (result.error) {
        setError(result.error);
      } else if (result.eventId) {
        router.push(`/dashboard/events/${result.eventId}`);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-[13px] text-muted-foreground">Event title</Label>
        <input
          id="title" name="title" required maxLength={200}
          defaultValue={event?.title ?? ""}
          placeholder="e.g. Summer Electronic Night"
          className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] transition-colors"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[13px] text-muted-foreground">Description</Label>
        <textarea
          id="description" name="description" rows={4} maxLength={1000}
          defaultValue={event?.description ?? ""}
          placeholder="Tell people about your event..."
          className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] transition-colors resize-none"
        />
      </div>

      {/* Venue — autocomplete with free-text */}
      <div className="space-y-1.5">
        <Label className="text-[13px] text-muted-foreground">Venue</Label>
        <VenueCombobox
          venues={venues}
          defaultVenueId={event?.venueId}
          onChange={(id, name) => { setVenueId(id); setVenueName(name); }}
        />
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startsAt" className="text-[13px] text-muted-foreground">Starts at</Label>
          <input
            id="startsAt" name="startsAt" type="datetime-local" required
            defaultValue={event?.startsAt ? event.startsAt.slice(0, 16) : ""}
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] transition-colors [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endsAt" className="text-[13px] text-muted-foreground">Ends at</Label>
          <input
            id="endsAt" name="endsAt" type="datetime-local" required
            defaultValue={event?.endsAt ? event.endsAt.slice(0, 16) : ""}
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] transition-colors [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Capacity + Genres */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="capacity" className="text-[13px] text-muted-foreground">Capacity</Label>
          <input
            id="capacity" name="capacity" type="number" required min={1}
            defaultValue={event?.capacity ?? ""}
            placeholder="e.g. 500"
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="genres" className="text-[13px] text-muted-foreground">Genres (comma-separated)</Label>
          <input
            id="genres" name="genres"
            defaultValue={event?.genres?.join(", ") ?? ""}
            placeholder="e.g. Electronic, Techno, House"
            className="w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[color-mix(in srgb,var(--foreground) 30%,transparent)] transition-colors"
          />
        </div>
      </div>

      {/* Free event toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox" name="isFree"
          defaultChecked={event?.isFree ?? false}
          className="size-4 rounded border-[var(--border)] bg-transparent accent-coral"
        />
        <span className="text-[14px] text-foreground">This is a free event (RSVP only, no tickets)</span>
      </label>

      {/* Cover image */}
      <div className="space-y-1.5">
        <Label className="text-[13px] text-muted-foreground">Cover image</Label>
        {coverUrl && (
          <div className="relative aspect-[21/9] overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
          </div>
        )}
        <input
          type="file" accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          disabled={isUploading}
          className="text-[13px] text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-[var(--border)] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white file:cursor-pointer"
        />
        {isUploading && <p className="text-[12px] text-muted-foreground">Uploading...</p>}
      </div>

      {/* Submit */}
      <button type="submit" disabled={isPending || isUploading} className="btn-primary w-full !py-3">
        {isPending ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
      </button>
    </form>
  );
}

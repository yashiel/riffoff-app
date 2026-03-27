"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { VenueCombobox } from "./VenueCombobox";
import { GenreTagInput } from "./GenreTagInput";
import { DateTimePicker } from "@/components/features/shared/DateTimePicker";
import { createEvent, updateEvent, type EventFormResult } from "@/actions/events";
import { createVenue } from "@/actions/venues";
import { uploadEventImage } from "@/actions/upload";
import type { EventDoc, VenueDoc } from "@/lib/appwrite/types";

interface EventFormProps {
  event?: EventDoc;
  venues: VenueDoc[];
  availableGenres?: string[];
}

export function EventForm({ event, venues, availableGenres = [] }: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState(event?.coverimageUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(event?.venueId ?? null);
  const [venueName, setVenueName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Controlled state for text fields so they persist across error re-renders
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [capacity, setCapacity] = useState(
    event?.capacity === 999999 ? "" : String(event?.capacity ?? "")
  );
  const [unlimitedCapacity, setUnlimitedCapacity] = useState(event?.capacity === 999999);
  const [isFree, setIsFree] = useState(event?.isFree ?? false);
  const [videoUrl, setVideoUrl] = useState(event?.videoUrl ?? "");

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(formRef.current!);

    startTransition(async () => {
      // If no existing venue selected, create a new one
      let resolvedVenueId = venueId;
      if (!resolvedVenueId && venueName) {
        const venueResult = await createVenue(venueName);
        if (venueResult.error) { setError(venueResult.error); return; }
        resolvedVenueId = venueResult.venueId ?? null;
      }
      if (!resolvedVenueId) { setError("Please select or enter a venue"); return; }

      const startsAtRaw = formData.get("startsAt") as string;
      const endsAtRaw = formData.get("endsAt") as string;

      const startsAtDate = startsAtRaw ? new Date(startsAtRaw) : null;
      const endsAtDate = endsAtRaw ? new Date(endsAtRaw) : null;

      if (!startsAtDate || isNaN(startsAtDate.getTime())) {
        setError("Please select a start date and time");
        return;
      }
      if (!endsAtDate || isNaN(endsAtDate.getTime())) {
        setError("Please select an end date and time");
        return;
      }

      const input = {
        title: title.trim(),
        description: description.trim() || undefined,
        venueId: resolvedVenueId,
        genres: (formData.get("genres") as string)
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        startsAt: startsAtDate.toISOString(),
        endsAt: endsAtDate.toISOString(),
        capacity: unlimitedCapacity
          ? 999999
          : parseInt(capacity, 10) || 1,
        isFree,
        coverimageUrl: coverUrl || undefined,
        videoUrl: videoUrl.trim() || undefined,
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

  const inputClass =
    "w-full rounded bg-[var(--input)] border border-[var(--border)] px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-[color-mix(in_srgb,var(--foreground)_30%,transparent)] transition-colors";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-base text-red-400">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-base text-muted-foreground">Event title</Label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Summer Electronic Night"
          className={inputClass}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-base text-muted-foreground">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell people about your event..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Venue — autocomplete with free-text */}
      <div className="space-y-1.5">
        <Label className="text-base text-muted-foreground">Venue</Label>
        <VenueCombobox
          venues={venues}
          defaultVenueId={event?.venueId}
          onChange={(id, name) => { setVenueId(id); setVenueName(name); }}
        />
      </div>

      {/* Dates — custom calendar picker */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-base text-muted-foreground">Starts at</Label>
          <DateTimePicker
            name="startsAt"
            label="When does it start?"
            defaultValue={event?.startsAt}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-base text-muted-foreground">Ends at</Label>
          <DateTimePicker
            name="endsAt"
            label="When does it end?"
            defaultValue={event?.endsAt}
            required
          />
        </div>
      </div>

      {/* Capacity + Genres */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="capacity" className="text-base text-muted-foreground">Capacity</Label>
          <div className="flex items-center gap-3">
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 500"
              disabled={unlimitedCapacity}
              className={`${inputClass} disabled:opacity-40`}
            />
            <label className="flex shrink-0 items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                name="unlimitedCapacity"
                checked={unlimitedCapacity}
                onChange={(e) => {
                  setUnlimitedCapacity(e.target.checked);
                  if (e.target.checked) setCapacity("");
                }}
                className="size-4 rounded border-[var(--border)] bg-transparent accent-coral"
              />
              <span className="text-base text-muted-foreground whitespace-nowrap">Unlimited</span>
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-base text-muted-foreground">Genres</Label>
          <GenreTagInput
            name="genres"
            availableGenres={availableGenres}
            defaultGenres={event?.genres ?? []}
            max={10}
          />
        </div>
      </div>

      {/* Free event toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="isFree"
          checked={isFree}
          onChange={(e) => setIsFree(e.target.checked)}
          className="size-4 rounded border-[var(--border)] bg-transparent accent-coral"
        />
        <span className="text-base text-foreground">This is a free event (RSVP only, no tickets)</span>
      </label>

      {/* Cover image */}
      <div className="space-y-1.5">
        <Label className="text-base text-muted-foreground">Cover image</Label>
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
          className="text-base text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-[var(--border)] file:px-3 file:py-1.5 file:text-base file:font-medium file:text-white file:cursor-pointer"
        />
        {isUploading && <p className="text-base text-muted-foreground">Uploading...</p>}
      </div>

      {/* Promotional video URL */}
      <div className="space-y-1.5">
        <Label htmlFor="videoUrl" className="text-base text-muted-foreground">Promotional video URL (optional)</Label>
        <input
          id="videoUrl"
          name="videoUrl"
          type="url"
          maxLength={500}
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or any video URL"
          className={inputClass}
        />
        <p className="text-sm text-muted-foreground">YouTube links auto-embed. Supports YouTube, direct MP4/WebM URLs.</p>
      </div>

      {/* Submit */}
      <button type="submit" disabled={isPending || isUploading} className="btn-primary w-full !py-3">
        {isPending ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
      </button>
    </form>
  );
}

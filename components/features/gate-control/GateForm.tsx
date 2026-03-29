"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { X } from "lucide-react";
import { createGate, updateGate } from "@/actions/gate";

const gateSchema = z.object({
  name: z.string().min(1, "Gate name is required").max(100),
  capacity: z.coerce.number().int().min(0, "Capacity must be 0 or more"),
  maxDevices: z.coerce.number().int().min(0, "Max devices must be 0 or more"),
  sortOrder: z.coerce.number().int().min(0),
});

interface GateFormProps {
  eventId: string;
  gate?: {
    gateId: string;
    name: string;
    capacity: number;
    maxDevices: number;
    sortOrder: number;
    status: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function GateForm({ eventId, gate, onClose, onSuccess }: GateFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEditing = !!gate;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get("name") as string,
      capacity: formData.get("capacity") as string,
      maxDevices: formData.get("maxDevices") as string,
      sortOrder: formData.get("sortOrder") as string,
    };

    const result = gateSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const { name, capacity, maxDevices } = result.data;

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateGate(eventId, gate.gateId, { name, capacity, maxDevices });
        } else {
          await createGate(eventId, name, capacity, maxDevices);
        }
        onSuccess();
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-coral/20 bg-coral/[0.02] p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {isEditing ? "Edit Gate" : "Add New Gate"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="size-4" />
        </button>
      </div>

      {serverError && (
        <p className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-base text-red-400">
          {serverError}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label
            htmlFor="gate-name"
            className="block text-base font-medium text-muted-foreground"
          >
            Gate Name
          </label>
          <input
            id="gate-name"
            name="name"
            type="text"
            defaultValue={gate?.name ?? ""}
            placeholder="e.g. Main Entrance, VIP Gate"
            className="mt-1.5 w-full rounded-lg border border-border bg-muted/80 px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-coral/40"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Capacity */}
        <div>
          <label
            htmlFor="gate-capacity"
            className="block text-base font-medium text-muted-foreground"
          >
            Capacity
          </label>
          <input
            id="gate-capacity"
            name="capacity"
            type="number"
            min={0}
            placeholder="0 = unlimited"
            defaultValue={gate?.capacity ?? 0}
            className="mt-1.5 w-full rounded-lg border border-border bg-muted/80 px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-coral/40"
          />
          <p className="mt-1 text-sm text-muted-foreground/70">
            0 = unlimited
          </p>
          {errors.capacity && (
            <p className="mt-1 text-sm text-red-400">{errors.capacity}</p>
          )}
        </div>

        {/* Max Devices */}
        <div>
          <label
            htmlFor="gate-max-devices"
            className="block text-base font-medium text-muted-foreground"
          >
            Max Devices
          </label>
          <input
            id="gate-max-devices"
            name="maxDevices"
            type="number"
            min={0}
            placeholder="0 = unlimited"
            defaultValue={gate?.maxDevices ?? 0}
            className="mt-1.5 w-full rounded-lg border border-border bg-muted/80 px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-coral/40"
          />
          <p className="mt-1 text-sm text-muted-foreground/70">
            0 = unlimited
          </p>
          {errors.maxDevices && (
            <p className="mt-1 text-sm text-red-400">{errors.maxDevices}</p>
          )}
        </div>
      </div>

      {/* Hidden sort order */}
      <input
        type="hidden"
        name="sortOrder"
        value={gate?.sortOrder ?? 0}
      />

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-coral px-4 py-2 text-base font-bold text-[#0e0e10] transition-colors hover:bg-coral/90 disabled:opacity-50"
        >
          {isPending
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Gate"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

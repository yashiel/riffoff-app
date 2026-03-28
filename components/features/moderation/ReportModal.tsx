"use client";

import * as React from "react";
import {
  Flag, Loader2, AlertTriangle, ShieldAlert, CalendarX, TicketX,
  BadgeAlert, Ban, Ghost, Copy, CircleHelp, ChevronRight, CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submitReport } from "@/actions/moderation";
import type { ModerationEntityType, ModerationReason } from "@/lib/appwrite/types";

/* ─── Reason definitions with icons + descriptions ─── */

interface ReasonDef {
  id: ModerationReason;
  label: string;
  description: string;
  icon: React.ElementType;
}

const EVENT_REASONS: ReasonDef[] = [
  {
    id: "wrong_info",
    label: "Incorrect details",
    description: "Wrong date, time, venue, or pricing",
    icon: Info,
  },
  {
    id: "sold_out_misleading",
    label: "Misleading availability",
    description: "Tickets listed but actually unavailable",
    icon: TicketX,
  },
  {
    id: "cancelled_unlisted",
    label: "Event cancelled",
    description: "Already cancelled but still listed",
    icon: CalendarX,
  },
  {
    id: "unofficial",
    label: "Unauthorised listing",
    description: "Not the official organiser or promoter",
    icon: BadgeAlert,
  },
  {
    id: "duplicate",
    label: "Duplicate event",
    description: "Same event listed multiple times",
    icon: Copy,
  },
];

const SAFETY_REASONS: ReasonDef[] = [
  {
    id: "scam",
    label: "Suspected scam",
    description: "Fake event designed to steal money",
    icon: ShieldAlert,
  },
  {
    id: "fraud",
    label: "Fraudulent organiser",
    description: "Organiser identity or pricing is fake",
    icon: AlertTriangle,
  },
  {
    id: "spam",
    label: "Spam or bot listing",
    description: "Auto-generated or promotional spam",
    icon: Ban,
  },
  {
    id: "inappropriate",
    label: "Inappropriate content",
    description: "Offensive imagery, text, or themes",
    icon: Ghost,
  },
];

const PERSON_REASONS: ReasonDef[] = [
  {
    id: "harassment",
    label: "Harassment",
    description: "Bullying, threats, or targeted abuse",
    icon: AlertTriangle,
  },
  {
    id: "impersonation",
    label: "Impersonation",
    description: "Pretending to be someone else",
    icon: Ghost,
  },
];

const OTHER_REASON: ReasonDef = {
  id: "other",
  label: "Something else",
  description: "An issue not covered above",
  icon: CircleHelp,
};

function getReasonsForEntity(entityType: ModerationEntityType): { label: string; reasons: ReasonDef[] }[] {
  switch (entityType) {
    case "event":
      return [
        { label: "Event issues", reasons: EVENT_REASONS },
        { label: "Safety & trust", reasons: SAFETY_REASONS },
        { label: "", reasons: [OTHER_REASON] },
      ];
    case "user":
      return [
        { label: "Safety concerns", reasons: [...PERSON_REASONS, ...SAFETY_REASONS.slice(0, 2)] },
        { label: "", reasons: [OTHER_REASON] },
      ];
    case "message":
    case "review":
      return [
        { label: "Content issues", reasons: [SAFETY_REASONS[2], SAFETY_REASONS[3], ...PERSON_REASONS] },
        { label: "", reasons: [OTHER_REASON] },
      ];
    default:
      return [
        { label: "Issues", reasons: [...EVENT_REASONS, ...SAFETY_REASONS] },
        { label: "", reasons: [OTHER_REASON] },
      ];
  }
}

const ENTITY_TYPE_LABELS: Record<ModerationEntityType, string> = {
  event: "event",
  user: "user",
  message: "message",
  review: "review",
};

const DESCRIPTION_MAX = 500;

/* ─── Component ─── */

interface ReportModalProps {
  entityType: ModerationEntityType;
  entityId: string;
  entityLabel?: string;
  trigger?: React.ReactNode;
}

export function ReportModal({
  entityType,
  entityId,
  entityLabel,
  trigger,
}: ReportModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<ModerationReason | "">("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const categories = React.useMemo(() => getReasonsForEntity(entityType), [entityType]);

  function handleReset() {
    setReason("");
    setDescription("");
    setIsSubmitting(false);
    setSubmitted(false);
  }

  async function handleSubmit() {
    if (!reason) return;
    setIsSubmitting(true);

    try {
      const result = await submitReport(
        entityType,
        entityId,
        reason,
        description.trim() || undefined,
      );

      if ("error" in result && result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
      } else {
        setSubmitted(true);
        setIsSubmitting(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    // Delay reset so close animation completes
    setTimeout(handleReset, 200);
  }

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
      <Flag className="size-4" />
      Report
    </Button>
  );

  // Render plain trigger during SSR to avoid Radix hydration mismatch
  if (!mounted) {
    return trigger ?? defaultTrigger;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (next) setOpen(true);
      else handleClose();
    }}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {submitted ? (
          /* ─── Success state ─── */
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-7 text-emerald-400" />
            </div>
            <p className="mt-5 font-display text-xl tracking-tight">
              Report submitted
            </p>
            <p className="mt-2 text-base text-muted-foreground">
              Our team will review this {ENTITY_TYPE_LABELS[entityType]} shortly.
              <br />
              Thank you for keeping RiffOff safe.
            </p>
            <Button
              onClick={handleClose}
              className="mt-6"
            >
              Done
            </Button>
          </div>
        ) : (
          /* ─── Report form ─── */
          <>
            {/* Header */}
            <div className="border-b border-border px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10">
                  <Flag className="size-4 text-red-400" />
                </div>
                <div>
                  <h2 className="font-display text-lg tracking-tight">
                    Report {ENTITY_TYPE_LABELS[entityType]}
                  </h2>
                  {entityLabel && (
                    <p className="mt-0.5 max-w-[320px] truncate text-base text-muted-foreground">
                      {entityLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Reason cards */}
            <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
              <fieldset disabled={isSubmitting} className="space-y-5">
                {categories.map(({ label, reasons }) => (
                  <div key={label || "other"}>
                    {label && (
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                        {label}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {reasons.map((r) => {
                        const isSelected = reason === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setReason(isSelected ? "" : r.id)}
                            className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                              isSelected
                                ? "bg-coral/[0.06] ring-1 ring-coral/25"
                                : "hover:bg-muted/60"
                            }`}
                          >
                            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isSelected
                                ? "bg-coral/10 text-coral"
                                : "bg-muted text-muted-foreground/60 group-hover:text-muted-foreground"
                            }`}>
                              <r.icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-base font-medium leading-tight transition-colors ${
                                isSelected ? "text-foreground" : "text-foreground/80"
                              }`}>
                                {r.label}
                              </p>
                              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                                {r.description}
                              </p>
                            </div>
                            <ChevronRight className={`size-4 shrink-0 transition-all ${
                              isSelected
                                ? "rotate-90 text-coral"
                                : "text-muted-foreground/30 group-hover:text-muted-foreground/50"
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Description — slides in when reason selected */}
                {reason && (
                  <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Details <span className="normal-case tracking-normal font-normal">(optional)</span>
                    </p>
                    <Textarea
                      placeholder="Anything else we should know..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                      maxLength={DESCRIPTION_MAX}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground/50">
                      {description.length}/{DESCRIPTION_MAX}
                    </p>
                  </div>
                )}
              </fieldset>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3.5">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-base text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Submit report"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

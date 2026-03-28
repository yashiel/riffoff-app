"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/features/ratings/StarRating";
import { submitEventRating } from "@/actions/ratings";

const COMMENT_MAX = 500;

interface RatingModalProps {
  eventId: string;
  eventTitle: string;
  trigger?: React.ReactNode;
}

export function RatingModal({
  eventId,
  eventTitle,
  trigger,
}: RatingModalProps) {
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function handleReset() {
    setRating(0);
    setComment("");
    setIsSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);

    try {
      const result = await submitEventRating(
        eventId,
        rating,
        comment.trim() || undefined,
      );

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Thank you for your rating!");
        setOpen(false);
        handleReset();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) handleReset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            Rate this event
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rate your experience</DialogTitle>
            <DialogDescription className="truncate">
              {eventTitle}
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={isSubmitting} className="mt-4 space-y-4">
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rating-comment" className="text-sm">
                Comment{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="rating-comment"
                placeholder="How was your experience?"
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value.slice(0, COMMENT_MAX))
                }
                maxLength={COMMENT_MAX}
                rows={3}
                className="resize-none"
              />
              <p className="text-right text-xs text-muted-foreground">
                {comment.length}/{COMMENT_MAX}
              </p>
            </div>
          </fieldset>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={rating === 0 || isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Submit Rating
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

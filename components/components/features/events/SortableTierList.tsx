"use client";

import { useState, useTransition, useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit2, Trash2, X } from "lucide-react";
import { TierForm } from "./TierForm";
import { deleteTier, reorderTiers } from "@/actions/tiers";
import { formatCurrency } from "@/lib/utils";
import type { TicketTierDoc } from "@/lib/appwrite/types";

interface SortableTierListProps {
  tiers: TicketTierDoc[];
  eventId: string;
}

export function SortableTierList({ tiers: initialTiers, eventId }: SortableTierListProps) {
  const [tiers, setTiers] = useState(initialTiers);
  const [isPending, startTransition] = useTransition();

  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tiers.findIndex((t) => t.$id === active.id);
    const newIndex = tiers.findIndex((t) => t.$id === over.id);
    const reordered = arrayMove(tiers, oldIndex, newIndex);

    // Optimistic update
    setTiers(reordered);

    // Persist new order
    startTransition(async () => {
      const orderMap = reordered.map((t, i) => ({ tierId: t.$id, sortOrder: i }));
      const result = await reorderTiers(orderMap);
      if (result.error) {
        // Revert on error
        setTiers(initialTiers);
      }
    });
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tiers.map((t) => t.$id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tiers.map((tier) => (
            <SortableTierItem key={tier.$id} tier={tier} eventId={eventId} isPending={isPending} />
          ))}
        </div>
      </SortableContext>
      {isPending && (
        <p className="mt-2 text-sm text-coral animate-pulse">Saving order...</p>
      )}
    </DndContext>
  );
}

function SortableTierItem({
  tier,
  eventId,
  isPending: parentPending,
}: {
  tier: TicketTierDoc;
  eventId: string;
  isPending: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.$id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  const available = tier.quota - tier.soldCount;

  function handleDelete() {
    if (!confirm(`Delete "${tier.name}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTier(tier.$id);
      if (result.error) setError(result.error);
    });
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-coral/20 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-base font-medium text-muted-foreground">Editing: {tier.name}</span>
          <button onClick={() => setIsEditing(false)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <TierForm eventId={eventId} tier={tier} onComplete={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-shadow ${
        isDragging ? "shadow-xl shadow-coral/10 border-coral/20" : "hover:border-border"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab touch-none items-center text-muted-foreground/60 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-5" />
      </button>

      {/* Tier info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-foreground">{tier.name}</span>
          {tier.soldCount > 0 && (
            <span className="text-base text-muted-foreground">
              {tier.soldCount}/{tier.quota} sold
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-base text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatCurrency(tier.price, tier.currency)}
          </span>
          <span>{available} available</span>
          {tier.saleStartsAt && (
            <span>Sale: {new Date(tier.saleStartsAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {error && <span className="mr-3 text-base text-red-400">{error}</span>}

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Edit tier"
        >
          <Edit2 className="size-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending || parentPending || tier.soldCount > 0}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
          aria-label="Delete tier"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

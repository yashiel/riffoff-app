"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Plus } from "lucide-react";
import type { VenueDoc } from "@/lib/appwrite/types";

interface VenueComboboxProps {
  venues: VenueDoc[];
  defaultVenueId?: string;
  /** Called when selection changes — returns venueId for existing, or null + venueName for new */
  onChange: (venueId: string | null, venueName: string) => void;
}

export function VenueCombobox({ venues, defaultVenueId, onChange }: VenueComboboxProps) {
  const defaultVenue = venues.find((v) => v.$id === defaultVenueId);
  const [query, setQuery] = useState(defaultVenue?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(defaultVenueId ?? null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter venues by query
  const filtered = query.trim()
    ? venues.filter((v) => v.name.toLowerCase().includes(query.toLowerCase()))
    : venues;

  const exactMatch = venues.find((v) => v.name.toLowerCase() === query.trim().toLowerCase());
  const showCreateOption = query.trim().length > 2 && !exactMatch;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectVenue(venue: VenueDoc) {
    setQuery(venue.name);
    setSelectedId(venue.$id);
    setIsOpen(false);
    onChange(venue.$id, venue.name);
  }

  function createNew() {
    setSelectedId(null);
    setIsOpen(false);
    onChange(null, query.trim());
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    // If text matches an existing venue exactly, auto-select it
    const match = venues.find((v) => v.name.toLowerCase() === value.toLowerCase());
    if (match) {
      setSelectedId(match.$id);
      onChange(match.$id, match.name);
    } else {
      setSelectedId(null);
      onChange(null, value.trim());
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name="venueId" value={selectedId ?? ""} />
      <input type="hidden" name="venueName" value={selectedId ? "" : query.trim()} />

      {/* Visible input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search or type a new venue..."
          className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] py-2.5 pl-10 pr-10 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => { setIsOpen(!isOpen); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (filtered.length > 0 || showCreateOption) && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#1e1e22] py-1 shadow-xl">
          {filtered.slice(0, 8).map((venue) => (
            <button
              key={venue.$id}
              type="button"
              onClick={() => selectVenue(venue)}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-white/[0.05] ${
                selectedId === venue.$id ? "bg-white/[0.05] text-coral" : "text-white"
              }`}
            >
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{venue.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{venue.address}</p>
              </div>
            </button>
          ))}

          {showCreateOption && (
            <>
              {filtered.length > 0 && <div className="mx-3 my-1 border-t border-white/[0.06]" />}
              <button
                type="button"
                onClick={createNew}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-coral transition-colors hover:bg-coral/[0.05]"
              >
                <Plus className="size-3.5 shrink-0" />
                <span>Create &ldquo;{query.trim()}&rdquo; as new venue</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Status indicator */}
      {query.trim() && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {selectedId ? (
            <span className="text-emerald-400/60">✓ Existing venue selected</span>
          ) : query.trim().length > 2 ? (
            <span className="text-coral/60">+ New venue will be created</span>
          ) : null}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import { X } from "lucide-react";

/**
 * Common music genres as fallback suggestions when no DB genres exist yet.
 * These merge with genres fetched from the platform's existing events.
 */
const PRESET_GENRES = [
  "Acoustic",
  "Afrobeats",
  "Alternative",
  "Blues",
  "Classical",
  "Country",
  "Dance",
  "Disco",
  "Drum & Bass",
  "Dubstep",
  "EDM",
  "Electronic",
  "Folk",
  "Funk",
  "Gospel",
  "Grunge",
  "Hip Hop",
  "House",
  "Indie",
  "Jazz",
  "K-Pop",
  "Latin",
  "Lo-Fi",
  "Metal",
  "Pop",
  "Punk",
  "R&B",
  "Rap",
  "Reggae",
  "Reggaeton",
  "Rock",
  "Soul",
  "Techno",
  "Trance",
  "Trap",
  "World",
];

interface GenreTagInputProps {
  /** Genres already in use on the platform (from DB) */
  availableGenres?: string[];
  /** Pre-selected genres (for edit mode) */
  defaultGenres?: string[];
  /** Hidden input name for form submission */
  name?: string;
  /** Max genres allowed */
  max?: number;
}

export function GenreTagInput({
  availableGenres = [],
  defaultGenres = [],
  name = "genres",
  max = 10,
}: GenreTagInputProps) {
  const [tags, setTags] = useState<string[]>(defaultGenres);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const listboxId = useId();

  // Merge presets + DB genres, deduplicate, sort
  const allSuggestions = Array.from(
    new Set([...PRESET_GENRES, ...availableGenres].map((g) => g.trim()))
  ).sort((a, b) => a.localeCompare(b));

  // Filter suggestions: match input, exclude already-selected tags
  const filtered = inputValue.trim()
    ? allSuggestions.filter(
        (g) =>
          g.toLowerCase().includes(inputValue.toLowerCase().trim()) &&
          !tags.some((t) => t.toLowerCase() === g.toLowerCase())
      )
    : allSuggestions.filter(
        (g) => !tags.some((t) => t.toLowerCase() === g.toLowerCase())
      );

  // Check if current input is a new genre (not in suggestions)
  const trimmedInput = inputValue.trim();
  const isNewGenre =
    trimmedInput.length > 0 &&
    !allSuggestions.some((g) => g.toLowerCase() === trimmedInput.toLowerCase()) &&
    !tags.some((t) => t.toLowerCase() === trimmedInput.toLowerCase());

  const addTag = useCallback(
    (genre: string) => {
      const cleaned = genre.trim();
      if (!cleaned) return;
      if (tags.length >= max) return;
      if (tags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) return;
      setTags((prev) => [...prev, cleaned]);
      setInputValue("");
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [tags, max]
  );

  const removeTag = useCallback((index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const totalItems = filtered.length + (isNewGenre ? 1 : 0);

    if (e.key === "," || e.key === "Enter" || e.key === "Tab") {
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        // Select highlighted suggestion
        e.preventDefault();
        addTag(filtered[highlightedIndex]);
        setIsOpen(false);
      } else if (highlightedIndex === filtered.length && isNewGenre) {
        // "Create new" option
        e.preventDefault();
        addTag(trimmedInput);
        setIsOpen(false);
      } else if (trimmedInput) {
        // Comma/Enter with text but nothing highlighted — add as-is
        if (e.key !== "Tab") e.preventDefault();
        // Try to match an existing suggestion first
        const match = allSuggestions.find(
          (g) => g.toLowerCase() === trimmedInput.toLowerCase()
        );
        addTag(match ?? trimmedInput);
        setIsOpen(false);
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isOpen && (filtered.length > 0 || isNewGenre);

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={tags.join(",")} />

      {/* Tag container + input */}
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-[var(--input)] px-2 py-1.5 transition-colors focus-within:border-coral/40 focus-within:ring-2 focus-within:ring-coral/20"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="genre-pill !py-1 !px-2.5 !text-sm flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-coral/20"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        {tags.length < max && (
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? "Type a genre..." : "Add more..."}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            className="min-w-[100px] flex-1 bg-transparent py-1 text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
        )}
      </div>

      {/* Hint */}
      <p className="mt-1.5 text-sm text-muted-foreground">
        {tags.length >= max
          ? `Maximum ${max} genres reached`
          : "Type and press comma or Enter to add. Use arrow keys to browse suggestions."}
      </p>

      {/* Dropdown */}
      {showDropdown && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label="Genre suggestions"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"
        >
          {filtered.map((genre, i) => (
            <li
              key={genre}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={highlightedIndex === i}
              onMouseEnter={() => setHighlightedIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(genre);
                setIsOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 text-base transition-colors ${
                highlightedIndex === i
                  ? "bg-coral/10 text-coral"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {/* Highlight matching text */}
              {trimmedInput ? highlightMatch(genre, trimmedInput) : genre}
            </li>
          ))}

          {/* "Create new" option */}
          {isNewGenre && (
            <li
              id={`${listboxId}-option-${filtered.length}`}
              role="option"
              aria-selected={highlightedIndex === filtered.length}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(trimmedInput);
                setIsOpen(false);
              }}
              className={`cursor-pointer border-t border-border px-3 py-2 text-base transition-colors ${
                highlightedIndex === filtered.length
                  ? "bg-coral/10 text-coral"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              Create{" "}
              <span className="font-semibold text-coral">&ldquo;{trimmedInput}&rdquo;</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Bold the matching substring in the suggestion */
function highlightMatch(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="font-bold text-coral">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </>
  );
}

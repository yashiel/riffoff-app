"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

interface DateTimePickerProps {
  name: string;
  label?: string;
  defaultValue?: string; // ISO string or datetime-local format
  required?: boolean;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DateTimePicker({ name, label, defaultValue, required }: DateTimePickerProps) {
  const initial = defaultValue ? new Date(defaultValue) : null;
  const [selectedDate, setSelectedDate] = useState<Date | null>(initial);
  const [viewMonth, setViewMonth] = useState(initial?.getMonth() ?? new Date().getMonth());
  const [viewYear, setViewYear] = useState(initial?.getFullYear() ?? new Date().getFullYear());
  const [hours, setHours] = useState(initial ? initial.getHours() : 20);
  const [minutes, setMinutes] = useState(initial ? initial.getMinutes() : 0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"date" | "time">("date");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [openDirection, setOpenDirection] = useState<"down" | "up">("down");

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Detect if dropdown would overflow below viewport
  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 420; // approximate height of the picker
      setOpenDirection(spaceBelow < dropdownHeight ? "up" : "down");
    }
  }, [isOpen]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const daysInMonth = lastDay.getDate();

  const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();
  const calendarDays: { day: number; month: "prev" | "current" | "next" }[] = [];

  // Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthLast - i, month: "prev" });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, month: "current" });
  }
  // Next month leading days
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({ day: d, month: "next" });
  }

  function selectDay(day: number, month: "prev" | "current" | "next") {
    let m = viewMonth;
    let y = viewYear;
    if (month === "prev") { m--; if (m < 0) { m = 11; y--; } }
    if (month === "next") { m++; if (m > 11) { m = 0; y++; } }
    setSelectedDate(new Date(y, m, day, hours, minutes));
    setViewMonth(m);
    setViewYear(y);
    setActiveTab("time");
  }

  function navigate(dir: -1 | 1) {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  }

  function updateTime(h: number, m: number) {
    setHours(h);
    setMinutes(m);
    if (selectedDate) {
      const d = new Date(selectedDate);
      d.setHours(h, m);
      setSelectedDate(d);
    }
  }

  function confirm() {
    setIsOpen(false);
  }

  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (d: number) =>
    selectedDate && d === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();

  // Hidden input value in datetime-local format
  const hiddenValue = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : "";

  const displayValue = selectedDate
    ? `${selectedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : "";

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={hiddenValue} required={required} />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center gap-2.5 rounded-xl bg-[var(--input)] border border-[var(--border)] px-4 py-3 text-left text-base transition-all hover:border-coral/30 focus:border-coral/40 focus:outline-none ${
          displayValue ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <Calendar className="size-4 shrink-0 text-coral/60" />
        {displayValue || (label ?? "Select date and time")}
      </button>

      {/* Dropdown picker */}
      {isOpen && (
        <div className={`absolute left-0 z-50 w-[320px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 ${
          openDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
        }`}>
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("date")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-base font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "date" ? "text-coral border-b-2 border-coral" : "text-muted-foreground/80 hover:text-muted-foreground"
              }`}
            >
              <Calendar className="size-3.5" /> Date
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("time")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-base font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "time" ? "text-coral border-b-2 border-coral" : "text-muted-foreground/80 hover:text-muted-foreground"
              }`}
            >
              <Clock className="size-3.5" /> Time
            </button>
          </div>

          {activeTab === "date" ? (
            <div className="p-4">
              {/* Month/year nav */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => navigate(-1)} className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-base font-semibold">{MONTHS[viewMonth]} {viewYear}</span>
                <button type="button" onClick={() => navigate(1)} className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="py-1 text-center text-sm font-medium text-muted-foreground/70">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((cell, i) => {
                  const isCurrent = cell.month === "current";
                  const isPast = isCurrent && new Date(viewYear, viewMonth, cell.day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => !isPast && selectDay(cell.day, cell.month)}
                      disabled={isPast && isCurrent}
                      className={`flex size-9 items-center justify-center rounded-lg text-base transition-all ${
                        isSelected(cell.day) && isCurrent
                          ? "bg-coral font-bold text-white dark:text-[#08080a] shadow-[0_2px_8px_rgba(var(--coral-rgb,191,255,0),0.3)]"
                          : isToday(cell.day) && isCurrent
                            ? "border border-coral/30 font-semibold text-coral"
                            : isCurrent
                              ? isPast
                                ? "text-muted-foreground/50 cursor-not-allowed"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              : "text-muted-foreground/50"
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-5">
              {/* Time picker — hour and minute with scroll wheels */}
              <div className="flex items-center justify-center gap-3">
                {/* Hour */}
                <div className="flex flex-col items-center">
                  <button type="button" onClick={() => updateTime((hours + 1) % 24, minutes)} className="flex size-8 items-center justify-center text-muted-foreground/80 hover:bg-muted hover:text-foreground">
                    <ChevronLeft className="size-4 rotate-90" />
                  </button>
                  <div className="flex size-16 items-center justify-center rounded-xl bg-coral/10 border border-coral/20 text-[28px] font-bold tabular-nums text-coral">
                    {String(hours).padStart(2, "0")}
                  </div>
                  <button type="button" onClick={() => updateTime((hours - 1 + 24) % 24, minutes)} className="flex size-8 items-center justify-center text-muted-foreground/80 hover:bg-muted hover:text-foreground">
                    <ChevronRight className="size-4 rotate-90" />
                  </button>
                  <span className="mt-1 text-sm text-muted-foreground/70 uppercase">Hour</span>
                </div>

                <span className="text-[28px] font-bold text-muted-foreground/60 mt-[-20px]">:</span>

                {/* Minute */}
                <div className="flex flex-col items-center">
                  <button type="button" onClick={() => updateTime(hours, (minutes + 5) % 60)} className="flex size-8 items-center justify-center text-muted-foreground/80 hover:bg-muted hover:text-foreground">
                    <ChevronLeft className="size-4 rotate-90" />
                  </button>
                  <div className="flex size-16 items-center justify-center rounded-xl bg-coral/10 border border-coral/20 text-[28px] font-bold tabular-nums text-coral">
                    {String(minutes).padStart(2, "0")}
                  </div>
                  <button type="button" onClick={() => updateTime(hours, (minutes - 5 + 60) % 60)} className="flex size-8 items-center justify-center text-muted-foreground/80 hover:bg-muted hover:text-foreground">
                    <ChevronRight className="size-4 rotate-90" />
                  </button>
                  <span className="mt-1 text-sm text-muted-foreground/70 uppercase">Minute</span>
                </div>
              </div>

              {/* Quick time presets */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {[
                  { label: "6 PM", h: 18, m: 0 },
                  { label: "7 PM", h: 19, m: 0 },
                  { label: "8 PM", h: 20, m: 0 },
                  { label: "9 PM", h: 21, m: 0 },
                  { label: "10 PM", h: 22, m: 0 },
                  { label: "11 PM", h: 23, m: 0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => updateTime(preset.h, preset.m)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      hours === preset.h && minutes === preset.m
                        ? "bg-coral text-white dark:text-[#08080a]"
                        : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirm button */}
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={confirm}
              disabled={!selectedDate}
              className="btn-primary w-full !py-2.5 !text-base disabled:opacity-30"
            >
              {selectedDate ? `Confirm — ${displayValue}` : "Select a date first"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("riffoff-theme");
    if (stored === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("riffoff-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("riffoff-theme", "light");
    }
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className={`relative flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-foreground/[0.06] ${className ?? ""}`}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <Sun className="size-4 text-muted-foreground transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-muted-foreground transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}

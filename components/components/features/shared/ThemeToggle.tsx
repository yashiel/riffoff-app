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

  // Same-size placeholder prevents hydration mismatch (server=span, client=button)
  if (!mounted) {
    return (
      <span
        className={`flex size-8 items-center justify-center rounded-lg ${className ?? ""}`}
        aria-hidden="true"
      >
        <Sun className="size-4 text-muted-foreground" />
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`relative flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted ${className ?? ""}`}
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

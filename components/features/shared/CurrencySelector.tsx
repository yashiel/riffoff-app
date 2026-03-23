"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

interface CurrencySelectorProps {
  currentCurrency: string;
}

export function CurrencySelector({ currentCurrency }: CurrencySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const currency = e.target.value;

    // Store in cookie for server-side reading
    document.cookie = `riffoff-currency=${currency};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;

    // Refresh the page to apply conversion server-side
    const params = new URLSearchParams(searchParams.toString());
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Currency</span>
      <select
        value={currentCurrency}
        onChange={handleChange}
        className="rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] px-2.5 py-1.5 text-[12px] font-medium text-white outline-none transition-colors hover:border-[rgba(255,255,255,0.15)] focus:border-coral"
      >
        <option value="original">🌐 Original</option>
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
    </div>
  );
}

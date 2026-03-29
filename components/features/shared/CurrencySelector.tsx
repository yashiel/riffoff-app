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
    document.cookie = `riffoff-currency=${currency};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    const params = new URLSearchParams(searchParams.toString());
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  return (
    <select
      value={currentCurrency}
      onChange={handleChange}
      className="cursor-pointer rounded-lg border-0 bg-transparent py-1 pl-1 pr-6 text-base font-medium text-muted-foreground outline-none transition-colors hover:text-white focus:text-white [&>option]:bg-card [&>option]:text-foreground"
      aria-label="Display currency"
    >
      <option value="original">🌐 All</option>
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.code}
        </option>
      ))}
    </select>
  );
}

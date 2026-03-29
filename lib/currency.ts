/**
 * Real-time currency conversion with server-side caching.
 *
 * Uses the free Open Exchange Rates API (no API key needed).
 * Rates cached in-memory for 1 hour to minimize API calls.
 *
 * Supported currencies: USD, MYR, SGD, LKR, THB, PHP, IDR, EUR, GBP, AUD, JPY, KRW
 */

export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "US Dollar", flag: "🇺🇸" },
  { code: "MYR", label: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "SGD", label: "Singapore Dollar", flag: "🇸🇬" },
  { code: "LKR", label: "Sri Lankan Rupee", flag: "🇱🇰" },
  { code: "THB", label: "Thai Baht", flag: "🇹🇭" },
  { code: "PHP", label: "Philippine Peso", flag: "🇵🇭" },
  { code: "IDR", label: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "EUR", label: "Euro", flag: "🇪🇺" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧" },
  { code: "AUD", label: "Australian Dollar", flag: "🇦🇺" },
  { code: "JPY", label: "Japanese Yen", flag: "🇯🇵" },
  { code: "KRW", label: "Korean Won", flag: "🇰🇷" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

// ─── In-Memory Cache ────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ratesCache = new Map<string, ExchangeRates>();

/**
 * Fetch exchange rates for a base currency.
 * Results are cached for 1 hour.
 */
export async function getExchangeRates(
  baseCurrency: string = "USD",
): Promise<ExchangeRates | null> {
  const cacheKey = baseCurrency.toUpperCase();
  const cached = ratesCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${cacheKey}`,
      { next: { revalidate: 3600 } }, // Next.js fetch cache: 1 hour
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    const rates: ExchangeRates = {
      base: cacheKey,
      rates: data.rates as Record<string, number>,
      fetchedAt: Date.now(),
    };

    ratesCache.set(cacheKey, rates);
    return rates;
  } catch {
    // Return stale cache if available
    return cached ?? null;
  }
}

/**
 * Convert an amount from one currency to another.
 * Uses USD as the intermediary if direct rate isn't available.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates,
): number | null {
  if (fromCurrency === toCurrency) return amount;

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // If rates are based on the fromCurrency, direct conversion
  if (rates.base === from && rates.rates[to]) {
    return amount * rates.rates[to];
  }

  // If rates are based on USD, convert via USD
  if (rates.base === "USD") {
    const fromRate = rates.rates[from];
    const toRate = rates.rates[to];
    if (fromRate && toRate) {
      return (amount / fromRate) * toRate;
    }
  }

  // If rates base matches toCurrency
  if (rates.base === to && rates.rates[from]) {
    return amount / rates.rates[from];
  }

  return null;
}

/**
 * Format a converted price with approximate indicator.
 * Returns: "~USD 85.00" or null if conversion fails.
 */
export function formatConvertedPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates,
): string | null {
  const converted = convertCurrency(amount, fromCurrency, toCurrency, rates);
  if (converted === null) return null;

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: toCurrency,
    minimumFractionDigits: toCurrency === "IDR" || toCurrency === "KRW" || toCurrency === "LKR" ? 0 : 2,
    maximumFractionDigits: toCurrency === "IDR" || toCurrency === "KRW" || toCurrency === "LKR" ? 0 : 2,
  }).format(converted);

  return formatted;
}

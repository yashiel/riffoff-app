/** Regions for grouping cities */
export const REGIONS = [
  { id: "all", name: "All", emoji: "🌍" },
  { id: "southeast-asia", name: "SE Asia", emoji: "🌏" },
  { id: "east-asia", name: "East Asia", emoji: "🗾" },
  { id: "south-asia", name: "South Asia", emoji: "🏔️" },
  { id: "europe", name: "Europe", emoji: "🇪🇺" },
  { id: "americas", name: "Americas", emoji: "🌎" },
  { id: "oceania", name: "Oceania", emoji: "🏝️" },
  { id: "middle-east", name: "Middle East", emoji: "🕌" },
  { id: "africa", name: "Africa", emoji: "🌍" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

/** City data with address matching keywords and region */
export const CITY_DATA = [
  // ── Southeast Asia ──
  { id: "kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", flag: "🇲🇾", region: "southeast-asia" as RegionId, keywords: ["kuala lumpur", "kl,", "selangor", "petaling jaya", "bukit jalil", "sunway", "sepang", "genting", "mid valley", "bukit bintang"] },
  { id: "penang", name: "Penang", country: "Malaysia", flag: "🇲🇾", region: "southeast-asia" as RegionId, keywords: ["penang", "bayan lepas"] },
  { id: "sarawak", name: "Sarawak", country: "Malaysia", flag: "🇲🇾", region: "southeast-asia" as RegionId, keywords: ["sarawak", "santubong"] },
  { id: "singapore", name: "Singapore", country: "Singapore", flag: "🇸🇬", region: "southeast-asia" as RegionId, keywords: ["singapore"] },
  { id: "bangkok", name: "Bangkok", country: "Thailand", flag: "🇹🇭", region: "southeast-asia" as RegionId, keywords: ["bangkok", "nonthaburi", "pathumwan", "muang thong", "pak kret", "thailand"] },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", flag: "🇮🇩", region: "southeast-asia" as RegionId, keywords: ["jakarta", "tangerang", "indonesia"] },
  { id: "manila", name: "Manila", country: "Philippines", flag: "🇵🇭", region: "southeast-asia" as RegionId, keywords: ["manila", "pasay", "quezon city", "bulacan", "philippines"] },
  { id: "ho-chi-minh", name: "Ho Chi Minh", country: "Vietnam", flag: "🇻🇳", region: "southeast-asia" as RegionId, keywords: ["ho chi minh", "vietnam"] },

  // ── East Asia ──
  { id: "seoul", name: "Seoul", country: "South Korea", flag: "🇰🇷", region: "east-asia" as RegionId, keywords: ["seoul", "korea", "guro-gu"] },
  { id: "tokyo", name: "Tokyo", country: "Japan", flag: "🇯🇵", region: "east-asia" as RegionId, keywords: ["tokyo", "bunkyo", "japan"] },
  { id: "osaka", name: "Osaka", country: "Japan", flag: "🇯🇵", region: "east-asia" as RegionId, keywords: ["osaka"] },
  { id: "taipei", name: "Taipei", country: "Taiwan", flag: "🇹🇼", region: "east-asia" as RegionId, keywords: ["taipei", "taiwan"] },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", flag: "🇭🇰", region: "east-asia" as RegionId, keywords: ["hong kong"] },
  { id: "shanghai", name: "Shanghai", country: "China", flag: "🇨🇳", region: "east-asia" as RegionId, keywords: ["shanghai"] },
  { id: "beijing", name: "Beijing", country: "China", flag: "🇨🇳", region: "east-asia" as RegionId, keywords: ["beijing"] },

  // ── South Asia ──
  { id: "colombo", name: "Colombo", country: "Sri Lanka", flag: "🇱🇰", region: "south-asia" as RegionId, keywords: ["colombo", "sri lanka", "ratmalana"] },
  { id: "galle", name: "Galle", country: "Sri Lanka", flag: "🇱🇰", region: "south-asia" as RegionId, keywords: ["galle"] },
  { id: "mumbai", name: "Mumbai", country: "India", flag: "🇮🇳", region: "south-asia" as RegionId, keywords: ["mumbai", "bombay"] },
  { id: "delhi", name: "Delhi", country: "India", flag: "🇮🇳", region: "south-asia" as RegionId, keywords: ["delhi", "new delhi"] },
  { id: "bangalore", name: "Bangalore", country: "India", flag: "🇮🇳", region: "south-asia" as RegionId, keywords: ["bangalore", "bengaluru"] },
  { id: "dhaka", name: "Dhaka", country: "Bangladesh", flag: "🇧🇩", region: "south-asia" as RegionId, keywords: ["dhaka", "bangladesh"] },

  // ── Europe ──
  { id: "london", name: "London", country: "UK", flag: "🇬🇧", region: "europe" as RegionId, keywords: ["london", "uk", "united kingdom", "england"] },
  { id: "paris", name: "Paris", country: "France", flag: "🇫🇷", region: "europe" as RegionId, keywords: ["paris", "france"] },
  { id: "berlin", name: "Berlin", country: "Germany", flag: "🇩🇪", region: "europe" as RegionId, keywords: ["berlin", "germany"] },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", flag: "🇳🇱", region: "europe" as RegionId, keywords: ["amsterdam", "netherlands"] },
  { id: "barcelona", name: "Barcelona", country: "Spain", flag: "🇪🇸", region: "europe" as RegionId, keywords: ["barcelona"] },
  { id: "stockholm", name: "Stockholm", country: "Sweden", flag: "🇸🇪", region: "europe" as RegionId, keywords: ["stockholm", "sweden"] },

  // ── Americas ──
  { id: "new-york", name: "New York", country: "USA", flag: "🇺🇸", region: "americas" as RegionId, keywords: ["new york", "nyc", "brooklyn", "manhattan"] },
  { id: "los-angeles", name: "Los Angeles", country: "USA", flag: "🇺🇸", region: "americas" as RegionId, keywords: ["los angeles", "la,"] },
  { id: "toronto", name: "Toronto", country: "Canada", flag: "🇨🇦", region: "americas" as RegionId, keywords: ["toronto", "canada"] },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", flag: "🇧🇷", region: "americas" as RegionId, keywords: ["sao paulo", "são paulo", "brazil"] },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", flag: "🇲🇽", region: "americas" as RegionId, keywords: ["mexico city", "cdmx"] },

  // ── Oceania ──
  { id: "sydney", name: "Sydney", country: "Australia", flag: "🇦🇺", region: "oceania" as RegionId, keywords: ["sydney"] },
  { id: "melbourne", name: "Melbourne", country: "Australia", flag: "🇦🇺", region: "oceania" as RegionId, keywords: ["melbourne"] },
  { id: "auckland", name: "Auckland", country: "New Zealand", flag: "🇳🇿", region: "oceania" as RegionId, keywords: ["auckland", "new zealand"] },

  // ── Middle East ──
  { id: "dubai", name: "Dubai", country: "UAE", flag: "🇦🇪", region: "middle-east" as RegionId, keywords: ["dubai", "uae", "abu dhabi"] },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", flag: "🇸🇦", region: "middle-east" as RegionId, keywords: ["riyadh", "saudi"] },
] as const;

export type CityId = (typeof CITY_DATA)[number]["id"];

/** Derive city ID from a venue address string */
export function deriveCityFromAddress(address: string | null): CityId | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const city of CITY_DATA) {
    for (const keyword of city.keywords) {
      if (lower.includes(keyword)) return city.id;
    }
  }
  return null;
}

/** Get the region for a city */
export function getRegionForCity(cityId: string): RegionId | null {
  const city = CITY_DATA.find((c) => c.id === cityId);
  return city?.region ?? null;
}

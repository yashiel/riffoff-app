import crypto from "crypto";
import { BloomFilter } from "./bloom-filter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManifestPublicKey {
  kid: string;
  key: string;
  active: boolean;
  validUntil?: string;
}

export interface GateConfig {
  gateId: string;
  gateName: string;
  lanes: number;
}

export interface EventManifest {
  version: number;
  eventId: string;
  generatedAt: string;
  publicKeys: ManifestPublicKey[];
  ticketHashes?: string[];
  bloomFilter?: string;
  totalTickets: number;
  gateConfig: GateConfig;
  salt: string;
  integrity: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLOOM_FILTER_THRESHOLD = 1_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic SHA-256 hash of a ticket scoped to an event + salt.
 * Format: SHA256(`${ticketId}:${eventId}:${salt}`) → hex string (64 chars).
 */
export function hashTicket(
  ticketId: string,
  eventId: string,
  salt: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${ticketId}:${eventId}:${salt}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Manifest builder
// ---------------------------------------------------------------------------

export function buildManifest(
  tickets: string[],
  eventId: string,
  publicKeys: ManifestPublicKey[],
  gateConfig: GateConfig,
  forceBloom?: boolean,
): EventManifest {
  const salt = crypto.randomBytes(16).toString("hex");
  const useBloom =
    forceBloom === true || tickets.length > BLOOM_FILTER_THRESHOLD;

  let ticketHashes: string[] | undefined;
  let bloomFilter: string | undefined;

  if (useBloom) {
    const bf = new BloomFilter(tickets.length || 1, 0.0001);
    for (const id of tickets) {
      bf.add(hashTicket(id, eventId, salt));
    }
    bloomFilter = bf.serialize();
  } else {
    ticketHashes = tickets.map((id) => hashTicket(id, eventId, salt));
  }

  // Build the manifest body (everything except integrity)
  const body: Omit<EventManifest, "integrity"> = {
    version: Date.now(),
    eventId,
    generatedAt: new Date().toISOString(),
    publicKeys,
    ...(ticketHashes !== undefined ? { ticketHashes } : {}),
    ...(bloomFilter !== undefined ? { bloomFilter } : {}),
    totalTickets: tickets.length,
    gateConfig,
    salt,
  };

  // Integrity = SHA-256 of the deterministic JSON body
  const integrity = crypto
    .createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");

  return { ...body, integrity };
}

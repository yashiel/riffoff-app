import { createHash } from "crypto";

/**
 * Space-efficient probabilistic data structure for testing set membership.
 * Uses double hashing with SHA-256 for uniform bit distribution.
 *
 * False positives are possible at a controlled rate (FPR).
 * False negatives are impossible — if an item was added, `has()` always returns true.
 */
export class BloomFilter {
  private bits: Uint8Array;
  private numBits: number;
  private numHashes: number;

  constructor(expectedItems: number, fpr: number) {
    // Optimal bit size: m = -n * ln(p) / (ln2)^2
    this.numBits = Math.ceil(
      (-expectedItems * Math.log(fpr)) / (Math.LN2 * Math.LN2)
    );

    // Optimal hash count: k = (m/n) * ln2
    this.numHashes = Math.max(
      1,
      Math.round((this.numBits / expectedItems) * Math.LN2)
    );

    // Allocate byte array (ceil to full bytes)
    this.bits = new Uint8Array(Math.ceil(this.numBits / 8));
  }

  /**
   * Add an item to the filter. After this call, `has(item)` will always return true.
   */
  add(item: string): void {
    const hashes = this.getHashes(item);
    for (const h of hashes) {
      const byteIndex = Math.floor(h / 8);
      const bitIndex = h % 8;
      this.bits[byteIndex] |= 1 << bitIndex;
    }
  }

  /**
   * Test whether an item might be in the set.
   * - Returns `true` if the item is probably in the set (may be a false positive).
   * - Returns `false` if the item is definitely not in the set.
   */
  has(item: string): boolean {
    const hashes = this.getHashes(item);
    for (const h of hashes) {
      const byteIndex = Math.floor(h / 8);
      const bitIndex = h % 8;
      if ((this.bits[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the size of the internal byte array in bytes.
   */
  sizeBytes(): number {
    return this.bits.length;
  }

  /**
   * Serialize the bloom filter to a JSON string with base64-encoded bits.
   */
  serialize(): string {
    return JSON.stringify({
      bits: Buffer.from(this.bits).toString("base64"),
      numHashes: this.numHashes,
      numBits: this.numBits,
    });
  }

  /**
   * Reconstruct a BloomFilter from a serialized JSON string.
   */
  static deserialize(data: string): BloomFilter {
    const parsed = JSON.parse(data) as {
      bits: string;
      numHashes: number;
      numBits: number;
    };

    // Create instance bypassing the constructor calculations
    const filter = Object.create(BloomFilter.prototype) as BloomFilter;
    filter.numBits = parsed.numBits;
    filter.numHashes = parsed.numHashes;
    filter.bits = new Uint8Array(Buffer.from(parsed.bits, "base64"));

    return filter;
  }

  /**
   * Double hashing: h(i) = (h1 + i * h2) mod numBits
   * h1 and h2 are derived from a single SHA-256 digest.
   */
  private getHashes(item: string): number[] {
    const digest = createHash("sha256").update(item).digest();

    // Read two independent 32-bit values from the digest
    const h1 = digest.readUInt32BE(0);
    const h2 = digest.readUInt32BE(4);

    const positions: number[] = [];
    for (let i = 0; i < this.numHashes; i++) {
      // Ensure non-negative with unsigned modulo
      const pos = ((h1 + i * h2) >>> 0) % this.numBits;
      positions.push(pos);
    }
    return positions;
  }
}

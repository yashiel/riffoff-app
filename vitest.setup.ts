import "@testing-library/jest-dom/vitest";

// Polyfill localStorage for tests — jsdom in some versions ships an
// incomplete Storage implementation (missing `.clear()`). Provide a
// simple in-memory shim so component tests can assert state.
class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

Object.defineProperty(window, "localStorage", {
  value: new MemoryStorage(),
  writable: false,
  configurable: true,
});
Object.defineProperty(window, "sessionStorage", {
  value: new MemoryStorage(),
  writable: false,
  configurable: true,
});

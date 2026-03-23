/**
 * Input sanitization utilities for user-provided content.
 * Applied at the Server Action boundary before database writes.
 */

/** Strip HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/** Escape HTML entities to prevent XSS in rendered content */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] ?? char);
}

/** Remove null bytes and control characters (except newline/tab) */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** Sanitize a plain text input (bio, description, notes) */
export function sanitizeText(input: string): string {
  return stripControlChars(stripHtml(input)).trim();
}

/** Sanitize a display name */
export function sanitizeName(input: string): string {
  return stripControlChars(stripHtml(input))
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim()
    .slice(0, 100); // Hard max
}

/** Validate and sanitize a URL (must be https) */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    // Only allow http and https protocols (blocks javascript:, data:, etc.)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Validate redirect URL (must be relative path, no protocol) */
export function sanitizeRedirectUrl(input: string): string {
  // Must start with / and not contain protocol or double slashes
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return "/dashboard";
  if (trimmed.includes("//")) return "/dashboard";
  if (trimmed.includes("://")) return "/dashboard";
  // Remove any query params with javascript:
  if (trimmed.toLowerCase().includes("javascript:")) return "/dashboard";
  return trimmed;
}

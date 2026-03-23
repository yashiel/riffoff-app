import { describe, it, expect } from "vitest";
import {
  stripHtml,
  escapeHtml,
  stripControlChars,
  sanitizeText,
  sanitizeName,
  sanitizeUrl,
  sanitizeRedirectUrl,
} from "../sanitize";

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<b>bold</b>")).toBe("bold");
  });

  it("removes script tags", () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("handles nested tags", () => {
    expect(stripHtml("<div><p>hello</p></div>")).toBe("hello");
  });

  it("leaves plain text unchanged", () => {
    expect(stripHtml("no tags here")).toBe("no tags here");
  });
});

describe("escapeHtml", () => {
  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });
});

describe("stripControlChars", () => {
  it("removes null bytes", () => {
    expect(stripControlChars("hello\x00world")).toBe("helloworld");
  });

  it("preserves newlines and tabs", () => {
    expect(stripControlChars("hello\n\tworld")).toBe("hello\n\tworld");
  });

  it("removes other control chars", () => {
    expect(stripControlChars("hello\x01\x02\x03world")).toBe("helloworld");
  });
});

describe("sanitizeText", () => {
  it("strips HTML and control chars, trims", () => {
    expect(sanitizeText("  <b>hello</b>\x00  ")).toBe("hello");
  });
});

describe("sanitizeName", () => {
  it("collapses multiple spaces", () => {
    expect(sanitizeName("DJ   Eclipse")).toBe("DJ Eclipse");
  });

  it("enforces max 100 chars", () => {
    expect(sanitizeName("x".repeat(150))).toHaveLength(100);
  });

  it("strips HTML", () => {
    expect(sanitizeName("<script>bad</script>DJ")).toBe("badDJ");
  });
});

describe("sanitizeUrl", () => {
  it("accepts valid https URL", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
  });

  it("accepts http URL", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
  });

  it("rejects invalid URL", () => {
    expect(sanitizeUrl("not-a-url")).toBeNull();
  });
});

describe("sanitizeRedirectUrl", () => {
  it("allows valid relative path", () => {
    expect(sanitizeRedirectUrl("/dashboard")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeRedirectUrl("https://evil.com")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeRedirectUrl("//evil.com")).toBe("/dashboard");
  });

  it("rejects javascript: in redirect", () => {
    expect(sanitizeRedirectUrl("/javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects paths not starting with /", () => {
    expect(sanitizeRedirectUrl("evil.com/path")).toBe("/dashboard");
  });

  it("allows nested paths", () => {
    expect(sanitizeRedirectUrl("/dashboard/events/123")).toBe("/dashboard/events/123");
  });
});

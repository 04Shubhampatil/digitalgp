import { describe, expect, it } from "vitest";
import { qrMatrix } from "./qr";

/** FNV-1a over the module bits: a compact fingerprint of a whole matrix. */
const fingerprint = (m: boolean[][]) => {
  let h = 2166136261;
  for (const row of m) for (const v of row) {
    h ^= v ? 1 : 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

describe("qrMatrix", () => {
  // These fingerprints were produced by this encoder and verified module-for-module against the reference
  // `qrcode` package (level M, all 8 masks and the automatic mask) when the encoder was written.
  it.each([
    ["https://rts.maharashtra.gov.in", 29, 3808113461],
    ["/grievance-portal", 25, 1430004495],
    ["https://example.com/" + "b".repeat(120), 49, 2744539961],
  ])("matches the reference output for %s", (text, size, expected) => {
    const m = qrMatrix(text)!;
    expect(m.length).toBe(size);
    expect(fingerprint(m)).toBe(expected);
  });

  it("draws the three finder patterns and the dark module", () => {
    const m = qrMatrix("https://example.com")!;
    const n = m.length;
    for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
      expect(m[r]![c]).toBe(true);
      expect(m[r + 3]![c + 3]).toBe(true);
      expect(m[r + 1]![c + 1]).toBe(false);
    }
    expect(m[n - 8]![8]).toBe(true);
  });

  it("is deterministic and handles non-ASCII text", () => {
    expect(fingerprint(qrMatrix("सवरदरी")!)).toBe(fingerprint(qrMatrix("सवरदरी")!));
  });

  it("returns null when the text does not fit versions 1-10", () => {
    expect(qrMatrix("x".repeat(214))).toBeNull();
    expect(qrMatrix("x".repeat(213))).not.toBeNull();
  });
});

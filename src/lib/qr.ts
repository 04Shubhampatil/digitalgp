/**
 * Minimal QR Code encoder (ISO/IEC 18004): byte mode, error-correction level M, versions 1–10
 * (up to 213 bytes of UTF-8). Returns the module matrix (true = dark) without the quiet zone, or null
 * when the text does not fit. It exists so the public site can draw a QR code from a link without a
 * new dependency; the output is checked against the reference `qrcode` package in tests.
 */

// ECC level M: [total codewords, EC codewords per block, [blockCount, dataCodewords][]]
const VERSIONS: Record<number, { total: number; ec: number; blocks: [number, number][] }> = {
  1: { total: 26, ec: 10, blocks: [[1, 16]] },
  2: { total: 44, ec: 16, blocks: [[1, 28]] },
  3: { total: 70, ec: 26, blocks: [[1, 44]] },
  4: { total: 100, ec: 18, blocks: [[2, 32]] },
  5: { total: 134, ec: 24, blocks: [[2, 43]] },
  6: { total: 172, ec: 16, blocks: [[4, 27]] },
  7: { total: 196, ec: 18, blocks: [[4, 31]] },
  8: { total: 242, ec: 22, blocks: [[2, 38], [2, 39]] },
  9: { total: 292, ec: 22, blocks: [[3, 36], [2, 37]] },
  10: { total: 346, ec: 26, blocks: [[4, 43], [1, 44]] },
};

const ALIGNMENT: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// ---------------------------------------------------------------- Reed–Solomon over GF(256), poly 0x11d
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
})();

const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!);

function generator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    poly.forEach((c, j) => {
      // multiply by (x + α^i): the x term keeps the index, the constant term moves one place down
      next[j] = (next[j]! ^ c) as number;
      next[j + 1] = (next[j + 1]! ^ gfMul(c, EXP[i]!)) as number;
    });
    poly = next;
  }
  return poly; // highest degree first, monic
}

function remainder(data: number[], ecLen: number): number[] {
  const gen = generator(ecLen);
  const res = [...data, ...new Array<number>(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = res[i]!;
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) res[i + j] = (res[i + j]! ^ gfMul(gen[j]!, coef)) as number;
  }
  return res.slice(data.length);
}

// ---------------------------------------------------------------- bit helpers
function bchFormat(data: number): number {
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersion(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

type Grid = (boolean | null)[][];

function buildFunctionPatterns(version: number): { modules: Grid; reserved: boolean[][] } {
  const size = 17 + version * 4;
  const modules: Grid = Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    modules[r]![c] = dark;
    reserved[r]![c] = true;
  };
  // finder patterns + separators
  for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]] as const) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark = inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        set(r0 + r, c0 + c, dark);
      }
    }
  }
  // timing
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // alignment
  const pos = ALIGNMENT[version]!;
  for (const r of pos) {
    for (const c of pos) {
      const overlapsFinder = (r === 6 && c === 6) || (r === 6 && c === pos[pos.length - 1]) || (c === 6 && r === pos[pos.length - 1]);
      if (overlapsFinder) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
  }
  // reserve format areas (filled later) and the dark module
  for (let i = 0; i < 9; i++) {
    if (!reserved[8]![i]) reserved[8]![i] = true;
    if (!reserved[i]![8]) reserved[i]![8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8]![size - 1 - i] = true;
    reserved[size - 1 - i]![8] = true;
  }
  set(size - 8, 8, true);
  // version information (v >= 7)
  if (version >= 7) {
    const bits = bchVersion(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      set(a, b, dark);
      set(b, a, dark);
    }
  }
  return { modules, reserved };
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penalty(m: boolean[][]): number {
  const n = m.length;
  let score = 0;
  // N1: runs of 5+ in rows and columns
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j < n; j++) {
        const cur = pass === 0 ? m[i]![j]! : m[j]![i]!;
        const prev = pass === 0 ? m[i]![j - 1]! : m[j - 1]![i]!;
        if (cur === prev) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }
  // N2: 2x2 blocks
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) if (m[r]![c] === m[r]![c + 1] && m[r]![c] === m[r + 1]![c] && m[r]![c] === m[r + 1]![c + 1]) score += 3;
  // N3: finder-like 1:1:3:1:1 patterns with 4 light modules on a side
  const pat = [true, false, true, true, true, false, true];
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j + 11 <= n; j++) {
        const at = (k: number) => (pass === 0 ? m[i]![j + k]! : m[j + k]![i]!);
        const a = pat.every((v, k) => at(k + 4) === v) && [0, 1, 2, 3].every((k) => !at(k));
        const b = pat.every((v, k) => at(k) === v) && [7, 8, 9, 10].every((k) => !at(k));
        if (a) score += 40;
        if (b) score += 40;
      }
    }
  }
  // N4: dark proportion
  let dark = 0;
  for (const row of m) for (const v of row) if (v) dark++;
  score += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return score;
}

/** Module matrix for `text` (UTF-8, byte mode, level M), or null if it does not fit versions 1–10. `forceMask` is for tests. */
export function qrMatrix(text: string, forceMask?: number): boolean[][] | null {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const info = VERSIONS[v]!;
    const dataWords = info.blocks.reduce((s, [n, d]) => s + n * d, 0);
    // 4-bit mode + 8/16-bit count + data must fit
    const countBits = v < 10 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataWords * 8) {
      version = v;
      break;
    }
  }
  if (!version) return null;
  const info = VERSIONS[version]!;
  const dataWords = info.blocks.reduce((s, [n, d]) => s + n * d, 0);

  // ---- bit stream
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  push(0, Math.min(4, dataWords * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0; data.length < dataWords; pad++) data.push(pad % 2 === 0 ? 0xec : 0x11);

  // ---- split into blocks, add EC, interleave
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;
  for (const [count, len] of info.blocks) {
    for (let i = 0; i < count; i++) {
      const d = data.slice(offset, offset + len);
      offset += len;
      blocks.push({ data: d, ec: remainder(d, info.ec) });
    }
  }
  const codewords: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.data.length) codewords.push(b.data[i]!);
  for (let i = 0; i < info.ec; i++) for (const b of blocks) codewords.push(b.ec[i]!);

  // ---- place data in the zig-zag order, then pick the best mask
  const { modules, reserved } = buildFunctionPatterns(version);
  const size = modules.length;
  const dataBits: boolean[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) dataBits.push(((cw >>> i) & 1) === 1);
  const positions: [number, number][] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const up = ((right + 1) & 2) === 0;
        const r = up ? size - 1 - vert : vert;
        if (!reserved[r]![c]) positions.push([r, c]);
      }
    }
  }

  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = forceMask ?? 0; mask < (forceMask === undefined ? 8 : forceMask + 1); mask++) {
    const m: boolean[][] = modules.map((row) => row.map((v) => v === true));
    positions.forEach(([r, c], i) => {
      const bit = dataBits[i] ?? false;
      m[r]![c] = bit !== MASKS[mask]!(r, c);
    });
    // format information: level M = 00, then the mask (two copies)
    const fmt = bchFormat((0b00 << 3) | mask);
    const bit = (i: number) => ((fmt >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) m[i]![8] = bit(i);
    m[7]![8] = bit(6);
    m[8]![8] = bit(7);
    m[8]![7] = bit(8);
    for (let i = 9; i < 15; i++) m[8]![14 - i] = bit(i);
    for (let i = 0; i < 8; i++) m[8]![size - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) m[size - 15 + i]![8] = bit(i);
    m[size - 8]![8] = true; // the always-dark module
    const score = penalty(m);
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

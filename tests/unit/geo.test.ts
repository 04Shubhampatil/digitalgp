import { describe, expect, it } from "vitest";
import { projectGeometries, type WardGeometry } from "@/lib/geo";

const square = (x: number, y: number, s: number): WardGeometry => ({ type: "Polygon", coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });

describe("projectGeometries", () => {
  it("returns null when there are no coordinates", () => {
    expect(projectGeometries([undefined, undefined], 600, 400)).toBeNull();
  });

  it("keeps shapes inside the box and keeps their order", () => {
    const r = projectGeometries([square(73, 18, 0.1), undefined, square(73.1, 18, 0.1)], 600, 400)!;
    expect(r.shapes).toHaveLength(3);
    expect(r.shapes[1]).toBeNull();
    for (const s of [r.shapes[0]!, r.shapes[2]!]) {
      const nums = s.d.match(/-?\d+\.?\d*/g)!.map(Number);
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...nums)).toBeLessThanOrEqual(600);
    }
  });

  it("puts a neighbour to the east on the right (north up)", () => {
    const r = projectGeometries([square(73, 18, 0.1), square(73.1, 18, 0.1)], 600, 400)!;
    expect(r.shapes[1]!.label[0]).toBeGreaterThan(r.shapes[0]!.label[0]);
  });

  it("handles MultiPolygon", () => {
    const g: WardGeometry = { type: "MultiPolygon", coordinates: [[square(73, 18, 0.1).coordinates as never][0], [square(73.2, 18, 0.1).coordinates as never][0]] };
    expect(projectGeometries([g], 600, 400)!.shapes[0]!.d.split("Z").length).toBeGreaterThan(2);
  });
});

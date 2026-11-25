/**
 * Ward outlines of the Figma home ward map (1352×628 space, traced from the design picture): green, orange, blue, purple.
 * Wards without boundary data are drawn with these, in order, so the map has the design's look and every ward is a shape
 * that can be selected. Neighbouring wards share their border points exactly.
 */
export const WARD_MAP_W = 1352;
export const WARD_MAP_H = 628;

export const WARD_SHAPES: { points: [number, number][]; label: [number, number] }[] = [
  {
    // Ward 1 (green)
    points: [[548, 52], [660, 40], [800, 36], [800, 118], [770, 168], [762, 232], [724, 296], [758, 326], [735, 360], [742, 388], [690, 388], [648, 378], [612, 360], [578, 322], [530, 275], [498, 285], [452, 276], [392, 256], [344, 232], [340, 178], [398, 168], [470, 150], [530, 128], [548, 100]],
    label: [600, 217],
  },
  {
    // Ward 2 (orange)
    points: [[800, 36], [860, 10], [900, 22], [945, 18], [975, 92], [1030, 122], [1105, 148], [1126, 218], [1112, 282], [1050, 326], [1000, 330], [930, 350], [880, 340], [830, 374], [770, 372], [735, 360], [758, 326], [724, 296], [762, 232], [770, 168], [800, 118]],
    label: [914, 217],
  },
  {
    // Ward 3 (blue)
    points: [[340, 178], [344, 232], [392, 256], [452, 276], [498, 285], [530, 275], [578, 322], [612, 360], [648, 378], [690, 388], [668, 420], [660, 455], [668, 470], [640, 498], [590, 520], [548, 548], [500, 540], [440, 520], [380, 510], [335, 492], [325, 430], [280, 385], [262, 300], [255, 265], [300, 205]],
    label: [423, 367],
  },
  {
    // Ward 4 (purple)
    points: [[742, 388], [735, 360], [770, 372], [830, 374], [880, 340], [930, 350], [1000, 330], [1050, 326], [1060, 400], [1090, 430], [1088, 470], [1078, 540], [1050, 575], [960, 600], [900, 628], [790, 628], [760, 585], [752, 552], [660, 545], [622, 500], [640, 498], [668, 470], [660, 455], [668, 420], [690, 388]],
    label: [890, 481],
  },
];

/** SVG path of a shape (closed polygon). */
export const shapePath = (points: [number, number][]) => `M${points.map((p) => p.join(" ")).join("L")}Z`;

/**
 * The pins of the Figma "Village Infrastructure Map" picture (infra-map-view.webp, 1360×620): where each pin's head is and
 * which Facility Filter it belongs to (`icon` is the filter's icon key). The Facility Filters use these to keep the
 * pins of the chosen categories bright and dim the rest. Only valid for that picture.
 */
export const INFRA_MAP_FILE = "infra-map-view.webp";
export const INFRA_MAP_SIZE = { w: 1360, h: 620 };

export const INFRA_MAP_PINS: { x: number; y: number; icon: string }[] = [
  { x: 491, y: 98, icon: "drop" },
  { x: 318, y: 132, icon: "toilet" },
  { x: 820, y: 208, icon: "toilet" },
  { x: 625, y: 322, icon: "toilet" },
  { x: 183, y: 230, icon: "route" },
  { x: 305, y: 258, icon: "book" },
  { x: 440, y: 268, icon: "book" },
  { x: 800, y: 66, icon: "book" },
  { x: 771, y: 362, icon: "book" },
  { x: 700, y: 152, icon: "cross" },
  { x: 493, y: 362, icon: "bus" },
  { x: 969, y: 232, icon: "bus" },
  { x: 1088, y: 102, icon: "bus" },
  { x: 1053, y: 376, icon: "users" },
];

/**
 * Deterministic project-to-color mapping for capacity views.
 *
 * Each project gets a stable color based on its ID so colors stay
 * consistent across renders and navigation.
 */

interface ProjectColor {
  /** Hex color for Recharts / inline bar segments */
  hex: string;
  /** Tailwind-compatible bg class */
  bg: string;
  /** Tailwind-compatible text class */
  text: string;
}

const PALETTE: ProjectColor[] = [
  { hex: "#e8912d", bg: "bg-[#e8912d]", text: "text-white" },      // orange (Cello)
  { hex: "#4caf50", bg: "bg-[#4caf50]", text: "text-white" },      // green (Limitless)
  { hex: "#e53935", bg: "bg-[#e53935]", text: "text-white" },      // red (TieBreak)
  { hex: "#26a69a", bg: "bg-[#26a69a]", text: "text-white" },      // teal (Panjaya)
  { hex: "#5fb8c2", bg: "bg-[#5fb8c2]", text: "text-white" },      // light teal (365Scores)
  { hex: "#2e7d7a", bg: "bg-[#2e7d7a]", text: "text-white" },      // dark teal (Gravity)
  { hex: "#7e57c2", bg: "bg-[#7e57c2]", text: "text-white" },      // purple
  { hex: "#42a5f5", bg: "bg-[#42a5f5]", text: "text-white" },      // blue
  { hex: "#ef5350", bg: "bg-[#ef5350]", text: "text-white" },      // coral
  { hex: "#8d6e63", bg: "bg-[#8d6e63]", text: "text-white" },      // brown
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Build a stable project ID → color mapping. */
export function buildProjectColorMap(
  projectIds: string[],
): Map<string, ProjectColor> {
  const map = new Map<string, ProjectColor>();
  const sorted = [...projectIds].sort();
  for (let i = 0; i < sorted.length; i++) {
    map.set(sorted[i], PALETTE[i % PALETTE.length]);
  }
  return map;
}

/** Get a single project's color by ID (fallback for unknown projects). */
export function getProjectColor(projectId: string): ProjectColor {
  return PALETTE[hashString(projectId) % PALETTE.length];
}

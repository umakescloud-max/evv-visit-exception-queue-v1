import type { Palette, Typefaces } from "@kit";

// Starter placeholder only — a real build replaces this with the brief's
// design.palette / design.typefaces. The builder may never touch this file
// once a brief has been applied (see builder.md's "theme" constraint).
export const theme: { palette: Palette; typefaces: Typefaces } = {
  palette: {
    surface: "#F2F6F7",
    ink: "#1A2B30",
    primary: "#1F5F6B",
    accent: "#D9A83F",
    muted: "#53666C",
  },
  typefaces: {
    heading: "Source Serif 4",
    body: "Public Sans",
  },
};

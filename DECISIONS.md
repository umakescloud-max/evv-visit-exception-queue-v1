# Decisions

- Visit #41882 is anchored to the most recent Thursday that is at least four days before the render date, so the record is always a Thursday visit and its business-day age is computed from the date. On the Friday this was built, that places the visit six business days back rather than four; the weekday is the fixed fact, the age is the computed one.
- Below 640px the architecture screen renders a stacked text layout built from the same nodes, edges and compliance notes, because the kit's fixed-width SVG cannot stay legible at 390px. Above 640px it renders the kit `ArchitectureView` unchanged.
- The attached document and the billing review decision live in an in-memory store (`src/screens/case-state.ts`): in-app navigation carries them, a page reload resets the record, so nothing changes on its own and nothing is persisted.

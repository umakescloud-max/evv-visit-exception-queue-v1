import { useEffect, useState } from "react";
import { AppShell, ArchitectureView, IntegrationTiles } from "@kit";
import { NAV } from "../nav";
import { usePageTitle } from "./page-title";

const NODES = [
  { id: "scheduling", label: "Scheduling system", kind: "system" },
  { id: "caregiver-app", label: "Caregiver mobile app (clock-in and clock-out)", kind: "app" },
  { id: "evv-aggregator", label: "State EVV aggregator", kind: "system" },
  { id: "verification-ui", label: "Visit verification queue (this prototype)", kind: "app" },
  { id: "clearinghouse", label: "Claims clearinghouse", kind: "system" },
  { id: "payroll", label: "Payroll provider", kind: "system" },
  { id: "claude", label: "Claude (explains exception patterns)", kind: "model" },
  { id: "coordinator", label: "Marisol (verification coordinator)", kind: "human" },
];

const EDGES = [
  { from: "scheduling", to: "verification-ui", label: "Scheduled visits and authorized hours" },
  { from: "caregiver-app", to: "verification-ui", label: "Clock-in and clock-out events" },
  { from: "evv-aggregator", to: "verification-ui", label: "State EVV confirmation file" },
  { from: "verification-ui", to: "claude", label: "Drafts a plain-language reason for each mismatch" },
  { from: "verification-ui", to: "coordinator", label: "Queues flagged visits for review" },
  { from: "coordinator", to: "clearinghouse", label: "Approved visits in the Friday claim batch" },
  { from: "coordinator", to: "payroll", label: "Approved hours for the pay run" },
];

const COMPLIANCE_NOTES = [
  "Visit and client data would be encrypted at rest and in transit",
  "EVV records would be retained for the state's required retention period and exported in the state's mandated file format",
  "Caregivers see only the clients assigned to them; coordinators see only the clients they manage",
  "Every exception decision is written to an append-only audit log with the coordinator's name and timestamp",
  "Any AI-assisted explanation of an exception runs under a signed BAA; no client PHI is sent to a model without one",
  "No visit reaches the claim batch or the pay run without explicit coordinator approval",
];

// The kit's diagram is a fixed-width SVG; below 640px it scales down past
// legibility, so the phone layout lists each system and what it sends on.
const ARCH_TOUR_TARGET = "architecture-diagram";
const NARROW_QUERY = "(max-width: 639px)";

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(NARROW_QUERY);
    const update = () => setIsNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isNarrow;
}

// Left-to-right flow order of the same nodes the desktop diagram draws, so
// the phone layout reads as a connected chain rather than a flat list.
const FLOW_ORDER = [
  "scheduling",
  "caregiver-app",
  "evv-aggregator",
  "verification-ui",
  "claude",
  "coordinator",
  "clearinghouse",
  "payroll",
];

function StackedArchitecture() {
  const flow = FLOW_ORDER.map((id) => NODES.find((node) => node.id === id)).filter(
    (node): node is (typeof NODES)[number] => node !== undefined
  );

  return (
    <div
      data-tour={ARCH_TOUR_TARGET}
      className="space-y-4 rounded-xl border border-[var(--pf-muted)]/20 p-4"
    >
      <p className="text-sm text-[var(--pf-muted)]">
        Read top to bottom. The schedule, the caregiver app and the state EVV aggregator feed the
        verification queue; Marisol approves what leaves it for claims and payroll.
      </p>
      <ol className="space-y-3">
        {flow.map((node, index) => {
          const incoming = EDGES.filter((edge) => edge.to === node.id);
          const outgoing = EDGES.filter((edge) => edge.from === node.id);
          return (
            <li
              key={node.id}
              className="rounded-lg border border-[var(--pf-primary)]/30 p-3"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded-full bg-[var(--pf-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--pf-primary)]">
                  Step {index + 1}
                </span>
                <p className="text-sm font-medium">{node.label}</p>
                <span className="text-xs text-[var(--pf-muted)]">{node.kind}</span>
              </div>
              {incoming.map((edge) => {
                const source = NODES.find((candidate) => candidate.id === edge.from);
                return (
                  <p key={`in-${edge.from}`} className="mt-2 text-xs">
                    <span className="text-[var(--pf-muted)]">From {source?.label}: </span>
                    {edge.label}
                  </p>
                );
              })}
              {outgoing.map((edge) => {
                const target = NODES.find((candidate) => candidate.id === edge.to);
                return (
                  <p key={`out-${edge.to}-${edge.label}`} className="mt-2 text-xs">
                    <span className="text-[var(--pf-muted)]">To {target?.label}: </span>
                    {edge.label}
                  </p>
                );
              })}
            </li>
          );
        })}
      </ol>
      <div>
        <h3 className="text-sm font-medium">Compliance notes</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--pf-muted)]">
          {COMPLIANCE_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Architecture() {
  usePageTitle();
  const isNarrow = useIsNarrow();

  return (
    <AppShell
      brandName="Umakes.cloud"
      brandUrl="https://umakes.cloud"
      brandEmail="umakescloud@gmail.com"
      personaName="Marisol Reyes"
      personaRole="Visit verification and billing coordinator"
      nav={NAV}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl">How this would work</h1>
          <p className="mt-1 text-sm text-[var(--pf-muted)]">
            The verification queue sits between the scheduling system, the caregiver app, and the
            state EVV aggregator, with a human approval before anything reaches claims or payroll.
          </p>
        </header>

        {isNarrow ? (
          <StackedArchitecture />
        ) : (
          <ArchitectureView nodes={NODES} edges={EDGES} complianceNotes={COMPLIANCE_NOTES} />
        )}

        <IntegrationTiles tools={[]} title="Connected tools" />
      </div>
    </AppShell>
  );
}

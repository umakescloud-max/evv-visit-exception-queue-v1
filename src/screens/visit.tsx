import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppShell,
  AuditLog,
  DocumentViewer,
  StatusPill,
  Timeline,
  formatDate,
  formatDateTime,
  useActivity,
  type TimelineEntry,
} from "@kit";
import { NAV } from "../nav";
import {
  EDGE_CASE_VISIT_ID,
  clients,
  getVisit,
  getVisitNotes,
  type Visit,
} from "../seed";
import { useCaseState } from "./case-state";
import { usePageTitle } from "./page-title";

interface Entry {
  id: string;
  timestamp: Date;
  author: string;
  text: string;
}

interface LocalNote {
  id: string;
  visitId: string;
  timestamp: Date;
  author: string;
  text: string;
}

function baseEntries(visit: Visit): Entry[] {
  const scheduledAt = new Date(visit.visitDate);
  scheduledAt.setDate(scheduledAt.getDate() - 2);

  const entries: Entry[] = [
    {
      id: "scheduled",
      timestamp: scheduledAt,
      author: "Scheduling system",
      text: `Scheduled for ${visit.scheduledStart} to ${visit.scheduledEnd} with ${visit.caregiverName}.`,
    },
    {
      id: "clock-in",
      timestamp: visit.visitDate,
      author: "Caregiver app",
      text: `Clock-in at ${visit.clockIn} by ${visit.clockInMethod}.`,
    },
    {
      id: "clock-out",
      timestamp: visit.visitDate,
      author: "Caregiver app",
      text: visit.clockOut ? `Clock-out at ${visit.clockOut}.` : "No clock-out recorded.",
    },
    {
      id: "aggregator",
      timestamp: visit.visitDate,
      author: "State EVV aggregator",
      text: `Geofence status: ${visit.geofenceStatus}. ${visit.confirmedHours.toFixed(1)} confirmed hours.`,
    },
  ];

  for (const note of getVisitNotes(visit.id)) {
    entries.push({
      id: note.id,
      timestamp: note.timestamp,
      author: note.author,
      text: note.text,
    });
  }

  return entries;
}

export default function VisitScreen() {
  usePageTitle();
  const [searchParams] = useSearchParams();
  const { logAction } = useActivity();
  const { attached } = useCaseState();
  const [draft, setDraft] = useState("");
  const [localNotes, setLocalNotes] = useState<LocalNote[]>([]);

  const requested = searchParams.get("case") ?? EDGE_CASE_VISIT_ID;
  const visit = getVisit(requested);

  if (!visit) {
    return (
      <AppShell
        brandName="Umakes.cloud"
        brandUrl="https://umakes.cloud"
        brandEmail="umakescloud@gmail.com"
        personaName="Marisol Reyes"
        personaRole="Visit verification and billing coordinator"
        nav={NAV}
      >
        <p className="text-sm">Visit #{requested} is not in this week's visit list.</p>
      </AppShell>
    );
  }

  const client = clients.find((c) => c.id === visit.clientId);
  const statusLabel = visit.verificationStatus === "flagged" ? "Flagged" : visit.verificationStatus === "pending" ? "Waiting on aggregator" : "Verified";
  const statusTone = visit.verificationStatus === "flagged" ? "accent" : visit.verificationStatus === "pending" ? "muted" : "primary";

  const merged: Entry[] = [
    ...baseEntries(visit),
    ...localNotes.filter((n) => n.visitId === visit.id),
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const timelineEntries: TimelineEntry[] = merged.map((entry) => ({
    id: entry.id,
    timestamp: formatDateTime(entry.timestamp),
    author: entry.author,
    text: entry.text,
  }));

  const visitId = visit.id;

  function addNote() {
    const text =
      draft.trim() || `Note added ${formatDateTime(new Date())}; no further detail entered.`;
    setLocalNotes((notes) => [
      {
        id: `local-${visitId}-${notes.length}-${Date.now()}`,
        visitId,
        timestamp: new Date(),
        author: "Marisol Reyes",
        text,
      },
      ...notes,
    ]);
    setDraft("");
    logAction("Note added to visit");
  }

  return (
    <AppShell
      brandName="Umakes.cloud"
      brandUrl="https://umakes.cloud"
      brandEmail="umakescloud@gmail.com"
      personaName="Marisol Reyes"
      personaRole="Visit verification and billing coordinator"
      nav={NAV}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl">Visit #{visit.id}</h1>
          <StatusPill label={statusLabel} tone={statusTone} />
        </header>

        <p className="text-sm text-[var(--pf-muted)]">
          {visit.clientName}, {visit.caregiverName}, {formatDate(visit.visitDate)}
        </p>

        <dl className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--pf-muted)]/20 p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-[var(--pf-muted)]">Scheduled</dt>
            <dd className="mt-1">
              {visit.scheduledStart} to {visit.scheduledEnd}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--pf-muted)]">Service</dt>
            <dd className="mt-1">
              {visit.serviceCode} {visit.serviceLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--pf-muted)]">Confirmed hours</dt>
            <dd className="mt-1">{visit.confirmedHours.toFixed(1)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--pf-muted)]">Payroll status</dt>
            <dd className="mt-1">{visit.payrollStatus}</dd>
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <DocumentViewer
            title="State EVV aggregator response"
            lines={[
              `Clock-in: ${visit.clockIn} by ${visit.clockInMethod}`,
              `Clock-out: ${visit.clockOut || "Not received"}`,
              `Geofence: ${visit.geofenceStatus}`,
              `Claim batch: ${visit.claimBatch}`,
            ]}
          />
          <DocumentViewer
            title="Client profile on file"
            lines={[
              `Client: ${visit.clientName}`,
              `Address: ${client ? client.address : "Not on file"}`,
              `Geofence radius: ${client ? client.geofenceRadiusM : 150} meters`,
              `Address last updated: ${
                client
                  ? `${formatDate(client.addressUpdatedDate)}, ${client.addressUpdatedDate.getFullYear()}`
                  : "Unknown"
              }`,
              `Program: ${client ? client.program : "Unknown"}`,
            ]}
          />
        </div>

        {visit.id === EDGE_CASE_VISIT_ID && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Documents</h2>
            <DocumentViewer
              title="Family written confirmation"
              missing={!attached}
              lines={[
                "Family confirmed the caregiver stayed from 8:00am until 12:00pm",
                "Four hours of personal care on the visit date",
                "Attached by Marisol Reyes from the Exceptions queue",
              ]}
            />
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Visit history</h2>
          <Timeline entries={timelineEntries} dataTour="case-timeline" />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Add a note</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span>Note text</span>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What did you find out about this visit?"
                className="min-h-[44px] w-full rounded-lg border border-[var(--pf-muted)]/30 bg-[var(--pf-surface)] px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={addNote}
              className="min-h-[44px] rounded-lg bg-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-surface)]"
            >
              Add note
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Action log</h2>
          <AuditLog />
        </section>
      </div>
    </AppShell>
  );
}

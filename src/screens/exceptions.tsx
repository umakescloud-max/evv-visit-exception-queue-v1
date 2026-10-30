import { useState } from "react";
import {
  AppShell,
  DataTable,
  RecordDrawer,
  ScenarioBanner,
  StatusPill,
  businessDaysBetween,
  useActivity,
  type DataTableColumn,
} from "@kit";
import { NAV } from "../nav";
import { EDGE_CASE_VISIT_ID, visits, type Visit } from "../seed";
import { markDocumentAttached, sendToBillingReview, useCaseState } from "./case-state";
import { usePageTitle } from "./page-title";

function waitingDays(v: Visit): number {
  const from = v.flaggedDate ?? v.visitDate;
  return Math.max(0, businessDaysBetween(from, new Date()));
}

function waitingLabel(v: Visit): string {
  const days = waitingDays(v);
  return `${days} business day${days === 1 ? "" : "s"}`;
}

const ADDRESS_ON_FILE = "Apt 2A, 118 Larkspur Court";
const CORRECTED_ADDRESS = "Apt 2C, 118 Larkspur Court";

export default function Exceptions() {
  usePageTitle();
  const { logAction } = useActivity();
  const { attached, inBillingReview, decision } = useCaseState();
  const [selected, setSelected] = useState<Visit | null>(null);

  const flaggedVisits = visits.filter((v) => v.verificationStatus === "flagged");
  const edgeCase = flaggedVisits.find((v) => v.id === EDGE_CASE_VISIT_ID);
  const edgeApproved = decision === "approved";
  const edgeReturned = decision === "returned";
  // Once the visit leaves for billing review there is nothing left to do in
  // this queue; a returned visit comes back here still needing documentation.
  const edgeLeftQueue = edgeApproved || (inBillingReview && !edgeReturned);

  function attachNote() {
    logAction("Confirmation note attached to visit #41882");
    markDocumentAttached();
  }

  function sendToBilling() {
    logAction("Visit #41882 sent to billing review");
    sendToBillingReview();
    setSelected(null);
  }

  function edgeStatusPill() {
    if (edgeApproved) return <StatusPill label="Approved for billing" tone="primary" />;
    if (inBillingReview && !edgeReturned)
      return <StatusPill label="In billing review" tone="muted" />;
    if (edgeReturned) return <StatusPill label="Needs documentation" tone="accent" />;
    return attached ? (
      <StatusPill label="Documentation attached" tone="primary" />
    ) : (
      <StatusPill label="Awaiting documentation" tone="accent" />
    );
  }

  const edgeActions = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={attachNote}
        className="min-h-[44px] rounded-lg border border-[var(--pf-muted)]/30 px-4 py-2 text-sm"
      >
        Attach supporting note
      </button>
      <button
        type="button"
        onClick={sendToBilling}
        className="min-h-[44px] rounded-lg bg-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-surface)]"
      >
        Send to billing review
      </button>
    </div>
  );

  const columns: DataTableColumn<Visit>[] = [
    {
      key: "visit",
      header: "Visit",
      render: (v) => (
        <span>
          <span className="font-medium">Visit #{v.id}</span>
          <span className="block text-xs text-[var(--pf-muted)]">{v.clientName}</span>
        </span>
      ),
    },
    { key: "caregiver", header: "Caregiver", render: (v) => v.caregiverName },
    { key: "reason", header: "Exception reason", render: (v) => v.exceptionReason },
    {
      key: "waiting",
      header: "Waiting",
      render: (v) =>
        v.id === EDGE_CASE_VISIT_ID && edgeApproved ? "Cleared" : waitingLabel(v),
    },
    {
      key: "status",
      header: "Status",
      render: (v) =>
        v.id === EDGE_CASE_VISIT_ID ? edgeStatusPill() : <StatusPill label="Flagged" tone="accent" />,
    },
  ];

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
          <h1 className="text-2xl">Exceptions</h1>
          <p className="mt-1 text-sm text-[var(--pf-muted)]">
            Every visit that failed verification, with the reason in plain words and how long it
            has been waiting.
          </p>
        </header>

        <ScenarioBanner
          dataTour="exception-detail"
          title="Visit #41882 is one clean visit flagged twice"
          body="Address on file: Apt 2A, 118 Larkspur Court. The corrected address is Apt 2C. The clock-in reads outside the old geofence and no clock-out was captured, so one four-hour visit looks wrong twice."
        />

        {selected === null && edgeCase && (
          <section className="space-y-3 rounded-xl border border-[var(--pf-primary)]/30 bg-[var(--pf-primary)]/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 text-lg font-medium">
                {edgeApproved
                  ? "Visit #41882 approved for billing"
                  : edgeLeftQueue
                    ? "Visit #41882 is in billing review"
                    : "Visit #41882 needs a coordinator"}
              </h2>
              <span className="shrink-0">{edgeStatusPill()}</span>
            </div>

            {edgeLeftQueue ? (
              <>
                <p className="text-sm">
                  {edgeApproved
                    ? "Released into the Friday Medicaid claim batch and into Dwayne Ellison's pay run. Nothing further is needed in this queue."
                    : "Waiting on Marisol's approval before it reaches the Friday Medicaid claim batch or the caregiver's pay run. This queue has nothing left to do for it."}
                </p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--pf-muted)]/20 bg-[var(--pf-surface)] p-3">
                    <dt className="text-xs text-[var(--pf-muted)]">Address on file</dt>
                    <dd className="mt-1">{CORRECTED_ADDRESS}</dd>
                  </div>
                  <div className="rounded-lg border border-[var(--pf-muted)]/20 bg-[var(--pf-surface)] p-3">
                    <dt className="text-xs text-[var(--pf-muted)]">Documentation</dt>
                    <dd className="mt-1">
                      {attached
                        ? "Family written confirmation attached"
                        : "Family written confirmation not attached"}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                {edgeReturned && (
                  <p className="text-sm font-medium">
                    Returned from billing review. The visit still needs the family's written
                    confirmation before it can go back.
                  </p>
                )}
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--pf-muted)]/20 bg-[var(--pf-surface)] p-3">
                    <dt className="text-xs text-[var(--pf-muted)]">Address on file</dt>
                    <dd className="mt-1">{ADDRESS_ON_FILE}</dd>
                  </div>
                  <div className="rounded-lg border border-[var(--pf-primary)]/30 bg-[var(--pf-surface)] p-3">
                    <dt className="text-xs text-[var(--pf-muted)]">Corrected address</dt>
                    <dd className="mt-1">{CORRECTED_ADDRESS}</dd>
                  </div>
                </dl>

                <p className="text-sm">
                  The family moved two apartments over two weeks ago and the profile was never
                  updated. Attach the family's written confirmation of the four hours, then send
                  the visit to billing review. Nothing clears without this step.
                </p>
                {edgeActions}
              </>
            )}
          </section>
        )}

        <DataTable
          columns={columns}
          rows={flaggedVisits}
          rowKey={(v) => v.id}
          onRowClick={(v) => setSelected(v)}
          dataTour="denial"
          mobileStatusKey="status"
          mobileUrgencyKey="reason"
          edgeCaseRow={(v) => v.id === EDGE_CASE_VISIT_ID}
        />
      </div>

      <RecordDrawer
        open={selected !== null}
        title={selected ? `Visit #${selected.id}` : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p>
              {selected.clientName}, {selected.caregiverName}
            </p>
            <p>
              {selected.scheduledStart} to {selected.scheduledEnd}, {selected.serviceLabel}
            </p>
            <p>
              Reason: <span className="font-medium">{selected.exceptionReason}</span>
            </p>
            <p>
              {selected.id === EDGE_CASE_VISIT_ID && edgeApproved
                ? "Cleared for billing."
                : `Waiting ${waitingLabel(selected)}.`}{" "}
              Clock-in {selected.clockIn}; clock-out {selected.clockOut || "not recorded"}.
            </p>
            {selected.id === EDGE_CASE_VISIT_ID ? (
              <div className="space-y-3">
                {edgeStatusPill()}
                <dl className="grid gap-2">
                  <div>
                    <dt className="text-xs text-[var(--pf-muted)]">Address on file</dt>
                    <dd>{edgeLeftQueue ? CORRECTED_ADDRESS : ADDRESS_ON_FILE}</dd>
                  </div>
                  {!edgeLeftQueue && (
                    <div>
                      <dt className="text-xs text-[var(--pf-muted)]">Corrected address</dt>
                      <dd>{CORRECTED_ADDRESS}</dd>
                    </div>
                  )}
                </dl>
                {edgeLeftQueue ? (
                  <p>
                    {edgeApproved
                      ? "Approved for billing and released to the claim batch and the caregiver's pay run."
                      : "Waiting on approval in the billing review queue. Nothing left to do here."}
                  </p>
                ) : (
                  <>
                    <p>
                      The client moved two weeks ago. Correct the address and geofence before
                      releasing this visit.
                    </p>
                    {edgeActions}
                  </>
                )}
              </div>
            ) : (
              <p className="text-[var(--pf-muted)]">
                Open the visit detail from the tracker to add a note to this record.
              </p>
            )}
          </div>
        )}
      </RecordDrawer>
    </AppShell>
  );
}

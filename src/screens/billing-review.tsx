import {
  AppShell,
  ApprovalQueue,
  AuditLog,
  DocumentViewer,
  useActivity,
  type ApprovalItem,
} from "@kit";
import { NAV } from "../nav";
import { recordDecision, useCaseState } from "./case-state";
import { usePageTitle } from "./page-title";

export default function BillingReview() {
  usePageTitle();
  const { logAction } = useActivity();
  const { attached, decision } = useCaseState();

  const reviewItem: ApprovalItem = {
    id: "41882",
    title: "Visit #41882, H. Pruitt",
    subtitle: attached
      ? "4.0 confirmed hours, family confirmation attached, address correction pending review"
      : "4.0 confirmed hours, family confirmation not yet attached, address still on file",
    edgeCase: true,
  };

  const recordLines = [
    "Caregiver: Dwayne Ellison",
    "Client: H. Pruitt",
    "Scheduled: 8:00am to 12:00pm",
    "Confirmed hours: 4.0",
    ...(attached
      ? [
          "Corrected address: Apt 2C, 118 Larkspur Court",
          "Address correction pending review",
          "Geofence radius updated to 150 meters",
        ]
      : ["Address on file: Apt 2A, 118 Larkspur Court"]),
  ];

  function approve() {
    logAction("Visit #41882 approved for billing");
    recordDecision("approved");
  }

  function sendBack() {
    logAction("Visit #41882 returned to exceptions");
    recordDecision("returned");
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
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl">Billing review</h1>
          <p className="mt-1 text-sm text-[var(--pf-muted)]">
            Visits waiting on a person before they reach the Friday Medicaid claim batch or the
            caregiver's pay run. Nothing moves until Marisol approves it here.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <DocumentViewer title="Corrected visit record" lines={recordLines} />
          <DocumentViewer
            title="Supporting documentation"
            missing={!attached}
            lines={[
              "Family written confirmation received",
              "Confirms the caregiver stayed until 12:00pm",
              "EVV aggregator record re-pulled",
              "Missing clock-out noted as documented",
            ]}
          />
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {decision === "waiting" ? "Waiting for approval" : "Decision recorded"}
          </h2>

          {decision === "waiting" ? (
            <ApprovalQueue
              items={[reviewItem]}
              primaryLabel="Approve for billing"
              secondaryLabel="Send back for more information"
              onPrimary={approve}
              onSecondary={sendBack}
              dataTour="approval-queue"
            />
          ) : (
            <div className="space-y-3">
              <div
                data-tour="approval-queue-item"
                data-edge-case="true"
                className="rounded-xl border border-[var(--pf-primary)]/30 bg-[var(--pf-primary)]/5 p-4"
              >
                <p className="text-sm font-medium">Decision recorded</p>
                <p className="mt-1 text-sm">
                  {decision === "approved"
                    ? "Visit #41882 is included in the Friday Medicaid claim batch and released to Dwayne Ellison's pay run."
                    : "Visit #41882 is back in the Exceptions queue and still needs documentation before it reaches billing."}
                </p>
              </div>
              <p className="text-sm text-[var(--pf-muted)]">
                The billing review queue is empty until a visit is sent from Exceptions.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Action log</h2>
          <AuditLog />
        </section>
      </div>
    </AppShell>
  );
}

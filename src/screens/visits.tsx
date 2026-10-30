import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  DataTable,
  MetricPanel,
  StatusPill,
  businessDaysBetween,
  rel,
  useActivity,
  type DataTableColumn,
  type StatTileProps,
} from "@kit";
import { NAV } from "../nav";
import { EDGE_CASE_VISIT_ID, EXCEPTION_REASONS, visits, type Visit } from "../seed";
import { useCaseState } from "./case-state";
import { usePageTitle } from "./page-title";

const PAGE_SIZE = 25;

function statusLabel(status: Visit["verificationStatus"]): string {
  if (status === "flagged") return "Flagged";
  if (status === "pending") return "Waiting on aggregator";
  return "Verified";
}

function statusTone(status: Visit["verificationStatus"]): "primary" | "accent" | "muted" {
  if (status === "flagged") return "accent";
  if (status === "pending") return "muted";
  return "primary";
}

export default function Visits() {
  usePageTitle();
  const navigate = useNavigate();
  const { logAction } = useActivity();
  const { decision, inBillingReview } = useCaseState();
  const [reason, setReason] = useState("All reasons");
  const [appliedReason, setAppliedReason] = useState("All reasons");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // The row and the tiles both read the same coordinator state, so approving
  // the edge case in Billing review clears it here too.
  const edgeApproved = decision === "approved";
  const edgeInReview = inBillingReview && decision !== "returned";
  const edgeCleared = (v: Visit): boolean => v.id === EDGE_CASE_VISIT_ID && edgeApproved;

  function rowStatus(v: Visit): { label: string; tone: "primary" | "accent" | "muted" } {
    if (v.id === EDGE_CASE_VISIT_ID) {
      if (edgeApproved) return { label: "Approved for billing", tone: "primary" };
      if (edgeInReview) return { label: "In billing review", tone: "muted" };
    }
    return { label: statusLabel(v.verificationStatus), tone: statusTone(v.verificationStatus) };
  }

  // Every metric is computed from the seed at render time.
  const waitingCount = visits.filter(
    (v) =>
      !edgeCleared(v) &&
      (v.verificationStatus === "flagged" || v.verificationStatus === "pending")
  ).length;
  const heldHours = visits
    .filter((v) => v.verificationStatus === "flagged" && !edgeCleared(v))
    .reduce((sum, v) => sum + v.confirmedHours, 0);
  const sevenDaysAgo = rel(-7);
  const recentVisits = visits.filter((v) => v.visitDate.getTime() >= sevenDaysAgo.getTime());
  const recentFlags = visits.filter(
    (v) =>
      v.flaggedDate !== null &&
      v.flaggedDate.getTime() >= sevenDaysAgo.getTime() &&
      !edgeCleared(v)
  );
  const exceptionRate = recentVisits.length
    ? (recentFlags.length / recentVisits.length) * 100
    : 0;
  const clearedDurations = visits
    .filter((v) => v.flaggedDate !== null && (v.clearedDate !== null || edgeCleared(v)))
    .map((v) => businessDaysBetween(v.flaggedDate as Date, v.clearedDate ?? new Date()));
  const averageDays = clearedDurations.length
    ? clearedDurations.reduce((sum, days) => sum + days, 0) / clearedDurations.length
    : 0;

  const metrics: StatTileProps[] = [
    {
      label: "Visits waiting on verification",
      value: String(waitingCount),
      hint: "flagged or still waiting on the aggregator",
    },
    {
      label: "Caregiver hours held from payroll",
      value: `${heldHours.toFixed(1)} hrs`,
      hint: "released only after a coordinator signs off",
    },
    {
      label: "Exception rate, last 7 days",
      value: `${exceptionRate.toFixed(1)}%`,
      hint: "flagged visits against all visits this week",
    },
    {
      label: "Average days to clear an exception",
      value: `${averageDays.toFixed(1)} days`,
      hint: "business days from flag to cleared",
    },
  ];

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
    { key: "service", header: "Service", render: (v) => v.serviceLabel },
    { key: "hours", header: "Confirmed hours", render: (v) => v.confirmedHours.toFixed(1) },
    {
      key: "status",
      header: "Status",
      render: (v) => {
        const status = rowStatus(v);
        return <StatusPill label={status.label} tone={status.tone} />;
      },
    },
    {
      key: "reason",
      header: "Exception reason",
      render: (v) =>
        edgeCleared(v) ? "Cleared after address correction" : v.exceptionReason || "None recorded",
    },
  ];

  const filteredVisits =
    appliedReason === "All reasons"
      ? visits
      : visits.filter((v) => v.exceptionReason === appliedReason);
  const shownVisits = filteredVisits.slice(0, visibleCount);

  function applyFilter() {
    setAppliedReason(reason);
    setVisibleCount(PAGE_SIZE);
    logAction("Filtered by exception reason");
  }

  function openVisit(v: Visit) {
    logAction("Opened visit detail");
    navigate(`/visit?case=${encodeURIComponent(v.id)}`);
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
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl">Visit tracker</h1>
          <p className="mt-1 text-sm text-[var(--pf-muted)]">
            Last week's visits, already reconciled against the state EVV file, with the visits
            that need a person at the top.
          </p>
        </header>

        <MetricPanel metrics={metrics} dataTour="metric-panel" />

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Exception reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[44px] rounded-lg border border-[var(--pf-muted)]/30 bg-[var(--pf-surface)] px-3 py-2 text-sm"
            >
              <option value="All reasons">All reasons</option>
              {EXCEPTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applyFilter}
            className="min-h-[44px] rounded-lg bg-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-surface)]"
          >
            Filter by exception reason
          </button>
          <p className="text-sm text-[var(--pf-muted)]">
            Showing {shownVisits.length} of {filteredVisits.length} visits
          </p>
        </div>

        <DataTable
          columns={columns}
          rows={shownVisits}
          rowKey={(v) => v.id}
          onRowClick={openVisit}
          dataTour="tracker-table"
          mobileStatusKey="status"
          mobileUrgencyKey="reason"
        />

        {filteredVisits.length > shownVisits.length && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--pf-muted)]">
              {filteredVisits.length - shownVisits.length} more visits not shown
            </p>
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="min-h-[44px] rounded-lg border border-[var(--pf-muted)]/30 px-4 py-2 text-sm"
            >
              Show more visits
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

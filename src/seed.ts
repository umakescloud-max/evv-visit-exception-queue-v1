// Deterministic seed data for the visit verification queue. Every date here
// is produced with rel()/addBusinessDays() so "today" is always today, and
// every value is generated from the demo's own rng seed.

import {
  addBusinessDays,
  createNameGenerator,
  fakeInitialName,
  pickWeighted,
  randomInt,
  rel,
  rng,
} from "@kit";

export type VerificationStatus = "verified" | "flagged" | "pending";
export type PayrollStatus = "held" | "released" | "not queued";

export const EDGE_CASE_VISIT_ID = "41882";
export const EDGE_CASE_REASON = "No clock-out recorded";

export const EXCEPTION_REASONS = [
  "No clock-out recorded",
  "Location outside geofence",
  "Visit overlaps another visit",
  "Service code mismatch",
] as const;

export interface Client {
  id: string;
  name: string;
  address: string;
  geofenceRadiusM: number;
  program: "Medicaid waiver" | "Private pay";
  authorizedHoursPerWeek: number;
  planOfCareOnFile: boolean;
  addressUpdatedDate: Date;
}

export interface Caregiver {
  id: string;
  name: string;
  role: "Personal care aide" | "Companion";
  hireDate: Date;
  weeklyScheduledHours: number;
  evvAppEnrolled: boolean;
  payRate: number;
  primaryClientIds: string[];
}

export interface Visit {
  id: string;
  clientId: string;
  clientName: string;
  caregiverId: string;
  caregiverName: string;
  serviceCode: string;
  serviceLabel: string;
  visitDate: Date;
  scheduledStart: string;
  scheduledEnd: string;
  confirmedHours: number;
  clockIn: string;
  clockInMethod: string;
  clockOut: string;
  geofenceStatus: "inside geofence" | "outside geofence";
  verificationStatus: VerificationStatus;
  exceptionReason: string;
  flaggedDate: Date | null;
  clearedDate: Date | null;
  payrollStatus: PayrollStatus;
  claimBatch: string;
}

export interface VisitNote {
  id: string;
  visitId: string;
  author: string;
  timestamp: Date;
  text: string;
  noteType: "call" | "family contact" | "correction" | "system";
}

const rand = rng("evv-visit-exception-queue-v1");

const STREETS = [
  "Larkspur Court",
  "Birchwood Lane",
  "Harvest Row",
  "Sable Ridge Drive",
  "Millbrook Way",
  "Juniper Hollow",
  "Alder Bend",
  "Kestrel Path",
  "Willow Croft",
  "Cedar Hollow",
];

function makeAddress(i: number): string {
  const unitLetter = ["A", "B", "C", "D"][randomInt(rand, 0, 3)];
  const unitNumber = randomInt(rand, 1, 8);
  return `Apt ${unitNumber}${unitLetter}, ${100 + i * 7} ${STREETS[i % STREETS.length]}`;
}

const clientSeen = new Set<string>(["H. Pruitt"]);

function uniqueClientName(): string {
  let name = fakeInitialName(rand);
  while (clientSeen.has(name)) name = fakeInitialName(rand);
  clientSeen.add(name);
  return name;
}

export const clients: Client[] = Array.from({ length: 62 }, (_, i) => {
  if (i === 0) {
    return {
      id: "CL-01",
      name: "H. Pruitt",
      address: "Apt 2A, 118 Larkspur Court",
      geofenceRadiusM: 150,
      program: "Medicaid waiver",
      authorizedHoursPerWeek: 20,
      planOfCareOnFile: true,
      addressUpdatedDate: rel(-92),
    };
  }
  return {
    id: `CL-${String(i + 1).padStart(2, "0")}`,
    name: uniqueClientName(),
    address: makeAddress(i),
    geofenceRadiusM: pickWeighted<number>(rand, [
      [120, 30],
      [150, 40],
      [200, 30],
    ]),
    program: pickWeighted<Client["program"]>(rand, [
      ["Medicaid waiver", 75],
      ["Private pay", 25],
    ]),
    authorizedHoursPerWeek: randomInt(rand, 6, 35),
    planOfCareOnFile: rand() < 0.92,
    addressUpdatedDate: rel(-randomInt(rand, 20, 400)),
  };
});

const caregiverNames = createNameGenerator(rng("evv-caregiver-names"));
const caregiverSeen = new Set<string>(["Dwayne Ellison"]);

function nextCaregiverName(): string {
  let name = caregiverNames.next();
  while (caregiverSeen.has(name)) name = caregiverNames.next();
  caregiverSeen.add(name);
  return name;
}

export const caregivers: Caregiver[] = Array.from({ length: 34 }, (_, i) => {
  const isNewHire = i > 0 && i <= 4;
  return {
    id: `CG-${String(i + 1).padStart(2, "0")}`,
    name: i === 0 ? "Dwayne Ellison" : nextCaregiverName(),
    role:
      i === 0
        ? "Personal care aide"
        : pickWeighted<Caregiver["role"]>(rand, [
            ["Personal care aide", 70],
            ["Companion", 30],
          ]),
    hireDate:
      i === 0
        ? rel(-730)
        : isNewHire
          ? rel(-randomInt(rand, 3, 28))
          : rel(-randomInt(rand, 60, 900)),
    weeklyScheduledHours: i === 0 ? 38 : randomInt(rand, 16, 40),
    evvAppEnrolled: i === 0 ? true : rand() < 0.9,
    payRate: i === 0 ? 17.5 : Math.round((15 + rand() * 6) * 10) / 10,
    primaryClientIds: Array.from(
      { length: 11 },
      (_, k) => clients[(i * 2 + k) % clients.length].id
    ),
  };
});

const WINDOWS = [
  { start: [8, 0], end: [12, 0] },
  { start: [9, 0], end: [13, 0] },
  { start: [10, 0], end: [14, 0] },
  { start: [13, 0], end: [17, 0] },
  { start: [7, 30], end: [11, 30] },
] as const;

const SERVICES = [
  { code: "T1019", label: "personal care, 15-minute unit", weight: 60 },
  { code: "T1020", label: "personal care, per diem", weight: 25 },
  { code: "S5125", label: "companion care, 15-minute unit", weight: 15 },
] as const;

const FLAGGED_REASONS: [string, number][] = [
  ["No clock-out recorded", 40],
  ["Location outside geofence", 25],
  ["Visit overlaps another visit", 20],
  ["Service code mismatch", 15],
];

function clockLabel(hours: number, minutes: number): string {
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

function addMinutes(hours: number, minutes: number, delta: number): { h: number; m: number } {
  const total = hours * 60 + minutes + delta;
  return { h: Math.floor(total / 60), m: total % 60 };
}

function dateAt(daysAgo: number, hour: number, minute: number): Date {
  const d = rel(-daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function cloneAt(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// The brief's edge case is a Thursday visit recorded four days ago. Anchor it
// to exactly four days back so the age a coordinator sees on screen — always
// computed from this date with businessDaysBetween(), never written — matches
// the visit date in the seed no matter which day the demo is opened.
const EDGE_VISIT_DATE = (() => {
  const d = rel(-4);
  d.setHours(8, 0, 0, 0);
  return d;
})();
const EDGE_FLAGGED_DATE = cloneAt(EDGE_VISIT_DATE, 9, 15);
const EDGE_NOTE_DAY = new Date(EDGE_VISIT_DATE);
EDGE_NOTE_DAY.setDate(EDGE_NOTE_DAY.getDate() + 1);
EDGE_NOTE_DAY.setHours(6, 0, 0, 0);

interface GeneratedVisit {
  visit: Visit;
  daysAgo: number;
}

const generated: GeneratedVisit[] = [];

// Visit #41882 is the brief's edge case: a clean four-hour visit flagged
// twice because the client moved and the profile was never updated.
generated.push({
  daysAgo: 4,
  visit: {
    id: EDGE_CASE_VISIT_ID,
    clientId: "CL-01",
    clientName: "H. Pruitt",
    caregiverId: "CG-01",
    caregiverName: "Dwayne Ellison",
    serviceCode: "T1019",
    serviceLabel: "personal care, 15-minute unit",
    visitDate: EDGE_VISIT_DATE,
    scheduledStart: "8:00am",
    scheduledEnd: "12:00pm",
    confirmedHours: 4,
    clockIn: "8:02am",
    clockInMethod: "mobile app GPS",
    clockOut: "",
    geofenceStatus: "outside geofence",
    verificationStatus: "flagged",
    exceptionReason: EDGE_CASE_REASON,
    flaggedDate: EDGE_FLAGGED_DATE,
    clearedDate: null,
    payrollStatus: "held",
    claimBatch: "Not in a batch",
  },
});

for (let i = 0; i < 319; i += 1) {
  const client = clients[randomInt(rand, 1, clients.length - 1)];
  const caregiver = caregivers[randomInt(rand, 1, caregivers.length - 1)];
  const windowOption = WINDOWS[randomInt(rand, 0, WINDOWS.length - 1)];
  const [startH, startM] = windowOption.start;
  const [endH, endM] = windowOption.end;

  const status = pickWeighted<VerificationStatus>(rand, [
    ["verified", 86],
    ["flagged", 12],
    ["pending", 2],
  ]);

  const daysAgo = status === "pending" ? randomInt(rand, 0, 1) : randomInt(rand, 1, 7);
  const service = pickWeighted<(typeof SERVICES)[number]>(rand, [
    [SERVICES[0], 60],
    [SERVICES[1], 25],
    [SERVICES[2], 15],
  ]);

  const reason = status === "flagged" ? pickWeighted<string>(rand, FLAGGED_REASONS) : "";
  const noClockOut = reason === "No clock-out recorded";
  const outsideGeofence = reason === "Location outside geofence";

  const inJitter = addMinutes(startH, startM, randomInt(rand, 0, 8));
  const outJitter = addMinutes(endH, endM, randomInt(rand, -5, 6));
  const confirmedHours = (endH * 60 + endM - startH * 60 - startM) / 60;

  const wasCleared = status === "verified" && rand() < 0.08;
  const flaggedDate = wasCleared ? dateAt(daysAgo, 9, 15) : status === "flagged" ? dateAt(daysAgo, 9, 15) : null;
  const clearedDate = wasCleared && flaggedDate ? addBusinessDays(flaggedDate, randomInt(rand, 1, 2)) : null;

  const visitDate = dateAt(daysAgo, startH, startM);

  generated.push({
    daysAgo,
    visit: {
      id: String(42000 + i),
      clientId: client.id,
      clientName: client.name,
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      serviceCode: service.code,
      serviceLabel: service.label,
      visitDate,
      scheduledStart: clockLabel(startH, startM),
      scheduledEnd: clockLabel(endH, endM),
      confirmedHours,
      clockIn: clockLabel(inJitter.h, inJitter.m),
      clockInMethod: caregiver.evvAppEnrolled ? "mobile app GPS" : "telephone from client line",
      clockOut: noClockOut || status === "pending" ? "" : clockLabel(outJitter.h, outJitter.m),
      geofenceStatus: outsideGeofence ? "outside geofence" : "inside geofence",
      verificationStatus: status,
      exceptionReason: reason,
      flaggedDate,
      clearedDate,
      payrollStatus:
        status === "flagged" ? "held" : status === "verified" ? "released" : "not queued",
      claimBatch:
        status === "verified"
          ? rand() < 0.55
            ? "Friday Medicaid batch"
            : "Not in a batch"
          : "Not in a batch",
    },
  });
}

// Flagged visits come first so the ones needing a person are at the top.
const STATUS_RANK: Record<VerificationStatus, number> = {
  flagged: 0,
  pending: 1,
  verified: 2,
};

export const visits: Visit[] = generated
  .slice()
  .sort((a, b) => STATUS_RANK[a.visit.verificationStatus] - STATUS_RANK[b.visit.verificationStatus])
  .map((g) => g.visit);

const notes: VisitNote[] = [];
let noteCounter = 0;

function pushNote(
  visitId: string,
  author: string,
  timestamp: Date,
  text: string,
  noteType: VisitNote["noteType"]
): void {
  noteCounter += 1;
  notes.push({
    id: `N-${String(noteCounter).padStart(4, "0")}`,
    visitId,
    author,
    timestamp,
    text,
    noteType,
  });
}

// The three notes already on the edge-case visit.
pushNote(
  EDGE_CASE_VISIT_ID,
  "Marisol Reyes",
  cloneAt(EDGE_VISIT_DATE, 9, 40),
  "Called caregiver, left voicemail",
  "call"
);
pushNote(
  EDGE_CASE_VISIT_ID,
  "Marisol Reyes",
  cloneAt(EDGE_VISIT_DATE, 10, 5),
  "Family confirmed 4 hours by phone",
  "family contact"
);
pushNote(
  EDGE_CASE_VISIT_ID,
  "EVV sync",
  EDGE_NOTE_DAY,
  "Aggregator file re-pulled, clock-out still missing",
  "system"
);

const CALL_NOTES = [
  "Called caregiver, left voicemail",
  "Called caregiver and confirmed arrival time",
  "Called caregiver, no answer, will try after the shift",
];
const FAMILY_NOTES = [
  "Family confirmed the visit length by phone",
  "Family confirmed the caregiver stayed the full shift",
];
const CORRECTION_NOTES = [
  "Corrected the client address on the visit record",
  "Updated the geofence radius for this visit",
];
const SYSTEM_NOTES = [
  "Aggregator file re-pulled, clock-out still missing",
  "Aggregator returned the visit as confirmed",
];

for (const { visit, daysAgo } of generated) {
  if (visit.id === EDGE_CASE_VISIT_ID) continue;
  const needsNotes =
    visit.verificationStatus === "flagged" || visit.clearedDate !== null;
  if (!needsNotes) continue;

  pushNote(visit.id, "Marisol Reyes", dateAt(daysAgo, 9, 40), CALL_NOTES[randomInt(rand, 0, CALL_NOTES.length - 1)], "call");
  pushNote(
    visit.id,
    "Marisol Reyes",
    dateAt(daysAgo, 11, 15),
    FAMILY_NOTES[randomInt(rand, 0, FAMILY_NOTES.length - 1)],
    "family contact"
  );
  if (visit.clearedDate !== null || rand() < 0.4) {
    pushNote(
      visit.id,
      visit.clearedDate ? "Marisol Reyes" : "EVV sync",
      dateAt(daysAgo, 14, 30),
      visit.clearedDate
        ? CORRECTION_NOTES[randomInt(rand, 0, CORRECTION_NOTES.length - 1)]
        : SYSTEM_NOTES[randomInt(rand, 0, SYSTEM_NOTES.length - 1)],
      visit.clearedDate ? "correction" : "system"
    );
  }
}

export const visitNotes: VisitNote[] = notes;

export function getVisit(id: string | null | undefined): Visit | undefined {
  if (!id) return undefined;
  return visits.find((v) => v.id === id);
}

export function getVisitNotes(id: string): VisitNote[] {
  return notes
    .filter((n) => n.visitId === id)
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

import { useState } from "react";
import {
  AppShell,
  OneClickLogin,
  StoryPanel,
  TourRunner,
  useActivity,
  type TourStep,
} from "@kit";
import tourSteps from "../tour.json";
import { NAV } from "../nav";
import { usePageTitle } from "./page-title";

const LOGIN_KEY = "pf-login-evv-visit-exception-queue-v1";
const TOUR_KEY = "pf-tour-evv-visit-exception-queue-v1";
const STEPS = tourSteps as TourStep[];

const PERSONA_NAME = "Marisol Reyes";
const PERSONA_ROLE = "Visit verification and billing coordinator";
const PRACTICE_NAME = "Cedar Bend Home Care";

export default function Story() {
  usePageTitle();
  const { logAction } = useActivity();
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(LOGIN_KEY) === "1";
    } catch {
      return false;
    }
  });

  function logIn() {
    try {
      window.localStorage.setItem(LOGIN_KEY, "1");
    } catch {
      // localStorage unavailable; the session still continues in memory.
    }
    setLoggedIn(true);
  }

  function startTour() {
    logAction("Tour started");
    const replay = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Replay tour",
    );
    replay?.click();
  }

  if (!loggedIn) {
    return (
      <OneClickLogin
        personaName={PERSONA_NAME}
        personaRole={PERSONA_ROLE}
        practiceName={PRACTICE_NAME}
        onLogin={logIn}
      />
    );
  }

  return (
    <AppShell
      brandName="Umakes.cloud"
      brandUrl="https://umakes.cloud"
      brandEmail="umakescloud@gmail.com"
      personaName={PERSONA_NAME}
      personaRole={PERSONA_ROLE}
      nav={NAV}
    >
      <StoryPanel
        practiceName={PRACTICE_NAME}
        practiceType="Non-medical home care agency, personal care and companion services"
        personaName={PERSONA_NAME}
        dayInTheLife="Marisol starts at 7:20am on Monday. Last week's 340 visits sit in three places that don't talk: the scheduling calendar, the caregiver app's clock-in and clock-out events, and the state EVV aggregator's confirmation file. She pastes all three into a reconciliation spreadsheet her predecessor built, filters for blanks and mismatches by hand, and works the list until both deadlines close on Thursday: the caregiver payroll run at 1pm and the Friday Medicaid claim batch. Last week 38 visits came back flagged, and two caregivers were paid late because of it."
        painPoints={[
          "A missing clock-out or an out-of-geofence clock-in is only caught when a person reads a spreadsheet",
          "The same visit can look correct in the caregiver app and wrong in the state aggregator, with no single record of truth",
          "Exceptions are worked in the same short week they're due, with no buffer before payroll and claims close",
          "Address and authorization changes don't propagate, so a visit that was actually fine gets flagged anyway",
        ]}
        costOfPain="Marisol spends 9 to 11 hours a week reconciling visit records by hand, about 130 caregiver hours a week sit on hold until they clear, and roughly $3,100 in wages reaches caregivers after payday. Every Friday claim batch also carries a handful of visits at risk of rejection."
        before="Monday, 7:20am. Marisol opens the scheduling portal, the caregiver app export, and the state aggregator file side by side and pastes all three into the reconciliation spreadsheet. She filters for blanks and starts working down the list. At 9:40am she reaches a Thursday visit for client H. Pruitt: caregiver Dwayne Ellison clocked in on his phone at 8:02am, there's no clock-out, and the aggregator shows that clock-in 0.4 miles outside the geofence on file. She calls Dwayne (voicemail), calls the family (they confirm he stayed until noon), types a note, and moves on. That was one visit out of 38. Payroll closes Thursday at 1pm."
        after="Monday, 7:20am. Marisol opens one queue. Last week's visits are already reconciled against the state file, and 38 are waiting with a plain reason next to each: no clock-out recorded, location outside geofence, visit overlaps another visit, service code mismatch. She opens visit #41882, sees that the client's address changed two weeks ago and the profile was never updated, corrects the address, attaches the family's written confirmation, and sends the visit to billing review. By 7:55am she has cleared 14 of the 38; every remaining visit has a named next step and an owner. Payroll and the Friday claim batch both run on time."
        onStartTour={startTour}
      />
      <TourRunner steps={STEPS} storageKey={TOUR_KEY} />
    </AppShell>
  );
}

## Three systems, one Monday spreadsheet

Picture a home care agency with 32 caregivers and about 340 visits a week. Every visit exists in three places: the schedule, the caregiver app's clock events, and the state EVV aggregator's confirmation file. They rarely agree.

So on Monday morning the billing coordinator pastes all three into a spreadsheet and filters for blanks and mismatches by hand. That takes 9 to 11 hours a week. Payroll closes Thursday at 1pm and the Medicaid claim batch goes out Friday, so the exceptions get worked in the same short week they are due. In our example, 38 visits were flagged last week, about 130 caregiver hours sat on hold, and roughly $3,100 in wages arrived after payday.

It keeps happening because nothing owns the comparison. A missing clock-out is only caught when a person reads the right row. And an address change in one system does not reach the others, so a good visit gets flagged anyway.

## What we built

We made a concept prototype of one verification queue. Walk through it:

- **Visit tracker.** Last week's visits in one list, already checked against the state file, flagged ones first. Four numbers sit above it: visits waiting, caregiver hours held, the 7-day exception rate, and average days to clear.
- **Exceptions.** Each flagged visit has a reason in plain words and a live age in business days. Our example is visit #41882: the caregiver clocked in at 8:02am and never clocked out, and the clock-in sits 0.4 miles outside the geofence.
- **Root cause.** The client moved two apartments over and the profile still lists the old address. One clean four-hour visit, flagged twice. The coordinator corrects the address and attaches the family's written confirmation.
- **Billing review.** She clicks "Approve for billing". Nothing reaches claims or payroll without that decision, and each step writes a line to the action log.

## How a real version would be built

It would sit between the scheduling system, the caregiver app and the state aggregator, and feed a claims clearinghouse and a payroll provider. Access would be role-based, every exception decision would go to an append-only audit log, and data would be encrypted at rest and in transit. Any AI-assisted explanation of a mismatch would run under a signed BAA. It would run on the client's own GCP account, and the client would own it.

## The honest part

The demo is a concept prototype running on synthetic data. Every name and number is made up. A real build runs on your own cloud, HIPAA-ready, and you own it.

You can click through it here: https://umakescloud-max.github.io/evv-visit-exception-queue-v1/

If your team fights this every week, book a free workflow audit at umakes.cloud or reply to umakescloud@gmail.com.

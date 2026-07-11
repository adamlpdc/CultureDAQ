# Culture Intelligence Engine v1 — implementation report

Status: implemented on `feature/culture-intelligence-v1`; not deployed.

## Architecture

Admins create draft CultureEvents manually. Drafts can be edited or cancelled.
Verification requires the exact `CONFIRM_VERIFIED_EVENT_PRICING` confirmation and
creates an immutable audit entry. Only verified events with no resolution or
cancellation timestamp enter the Market Engine v2 queue. The event is consumed
at most once for each affected asset, enforced both in application selection and
by the existing unique database index.

The signed event contribution combines sentiment, expected attention, optional
actual-attention surprise, confidence, logarithmic reach, momentum, viral
amplification and continuous decay. It is an input to Market Engine v2 and never
sets a price. Existing materiality, tick, verified-event, rolling, locking and
calculation-audit controls remain authoritative.

`FEATURE_CULTURE_INTELLIGENCE_V1=false` removes CultureEvents from the active
pricing inputs without disabling the signed momentum/trading fallback. A verified
event can be rolled back only before an applied price calculation exists.

## Seven-day accelerated simulation

- Assets: 84
- Ticks: 672 (96 per day)
- Event mix: positive, negative, neutral-surprise and low-confidence
- Maximum absolute tick movement: 0.267896%
- Average daily market median: 0.000000%
- Average asset return: -0.340341%
- Verified-event cap breaches: 0
- Persistent drift gate: passed (`|daily median| <= 0.15%`)

The small negative mean asset return comes from the deliberately asymmetric
neutral-disappointment cohort in the mixed fixture; the unconditional market
median remains exactly zero and there is no systematic engine-direction bias.

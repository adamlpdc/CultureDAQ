import { createCultureEventService } from "../src/lib/culture-intelligence/service";
import { persistExpectationSnapshot } from "../src/lib/culture-intelligence/expectation-persistence";
import { getExpectationConfigFromEnv } from "../src/lib/culture-intelligence/expectation";

if (process.env.FEATURE_CULTURE_INTELLIGENCE !== "true") {
  throw new Error("Culture Intelligence feature is disabled");
}
if (process.env.CULTURE_EVENTS_SOURCE !== "supabase") {
  throw new Error("Decay persistence requires CULTURE_EVENTS_SOURCE=supabase");
}

const events = await createCultureEventService().list();
const expectations = await persistExpectationSnapshot(events, new Date(), getExpectationConfigFromEnv());
console.log(`Recalculated and recorded expectation decay for ${expectations.length} assets.`);

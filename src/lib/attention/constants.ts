export const ATTENTION_MAX_TICK_PERCENT = 8;
export const TICK_MINUTES = 15;
export const TICKS_PER_DAY = (24 * 60) / TICK_MINUTES;

export const FAIR_VALUE_K = 0.35;
export const REVERSION_RATE_BASE = 0.06;
export const DEMAND_CAP_PERCENT = 0.3;

export const ATTENTION_SPIKE: Record<number, number> = {
  1: 8,
  2: 15,
  3: 22,
  4: 35,
  5: 50,
};

export const VERIFIED_IMPULSE: Record<number, number> = {
  1: 0.4,
  2: 0.9,
  3: 1.6,
  4: 2.8,
  5: 4.2,
};

export const EVENT_HALF_LIFE_HOURS: Record<string, number> = {
  goal: 36,
  brace: 36,
  album: 72,
  trailer: 120,
  premiere: 48,
  title: 168,
  product: 96,
  award: 96,
  documentary: 48,
  default: 72,
};

export const STATE_DEMAND_MULTIPLIER: Record<string, number> = {
  dormant: 0.6,
  emerging: 0.85,
  hot: 1.0,
  peak: 0.5,
  cooling: 0.35,
};

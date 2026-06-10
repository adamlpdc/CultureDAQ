import type { Asset } from "@/types/database";
import type { CultureMoment } from "@/lib/culture-context";
import { CATEGORY_LABELS } from "@/lib/constants";
import { getMomentumLabel } from "@/lib/price-event-labels";
import { getPriceChange } from "@/lib/utils";

export function getMovementHeadline(asset: Asset): string {
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const shortName = asset.name.split(/\s+/).slice(0, 2).join(" ");

  if (change > 0.5) return `Why ${shortName} Is Rising`;
  if (change < -0.5) return `Why ${shortName} Is Falling`;
  return `Why ${shortName} Is Moving`;
}

export function generateMovementSummary(
  asset: Asset,
  cultureMoment?: CultureMoment | null
): string[] {
  const bullets: string[] = [];
  const change = getPriceChange(asset.current_price, asset.previous_price);
  const buyPressure = Number(asset.buy_pressure);
  const sellPressure = Number(asset.sell_pressure);
  const momentum = Number(asset.momentum_score);

  if (buyPressure > sellPressure * 1.15) {
    bullets.push("Strong buying pressure");
  } else if (sellPressure > buyPressure * 1.15) {
    bullets.push("Elevated selling pressure");
  } else if (buyPressure > 0 || sellPressure > 0) {
    bullets.push("Balanced buy and sell pressure");
  }

  const momentumLabel = getMomentumLabel(momentum);
  if (momentumLabel === "Building") {
    bullets.push("Positive momentum score");
  } else if (momentumLabel === "Cooling") {
    bullets.push("Momentum score cooling");
  } else {
    bullets.push("Steady momentum score");
  }

  if (change > 0) {
    bullets.push(`${CATEGORY_LABELS[asset.category]} category trending up`);
  } else if (change < 0) {
    bullets.push(`${CATEGORY_LABELS[asset.category]} category under pressure`);
  } else {
    bullets.push(`${CATEGORY_LABELS[asset.category]} category holding steady`);
  }

  if (asset.trade_volume_24h >= 500) {
    bullets.push("High trading activity in the last 24 hours");
  } else if (asset.trade_volume_24h > 0) {
    bullets.push("Active trading in the last 24 hours");
  }

  if (cultureMoment) {
    bullets.push(`Shared attention via ${cultureMoment.title}`);
  }

  return bullets.slice(0, 4);
}

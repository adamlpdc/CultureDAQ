import type { ImageCandidate } from "./types";

const CONFIDENCE_THRESHOLD = 0.85;
const AMBIGUITY_GAP = 0.08;

export function pickBestCandidate(candidates: ImageCandidate[]): {
  best: ImageCandidate | null;
  manualReview: boolean;
  reviewReason: string | null;
} {
  if (candidates.length === 0) {
    return { best: null, manualReview: true, reviewReason: "no_match" };
  }

  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];
  const second = sorted[1];

  if (best.confidence < CONFIDENCE_THRESHOLD) {
    return {
      best,
      manualReview: true,
      reviewReason: `low_confidence (${best.confidence})`,
    };
  }

  if (
    second &&
    best.confidence - second.confidence < AMBIGUITY_GAP &&
    best.confidence < 0.98
  ) {
    return {
      best,
      manualReview: true,
      reviewReason: `ambiguous (${best.title} vs ${second.title})`,
    };
  }

  return { best, manualReview: false, reviewReason: null };
}

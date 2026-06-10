import { CULTURE_MOMENTS } from "@/lib/constants";

export type CultureMoment = (typeof CULTURE_MOMENTS)[number];

export function getCultureMomentForSlug(slug: string): CultureMoment | null {
  return (
    CULTURE_MOMENTS.find((moment) =>
      (moment.assetSlugs as readonly string[]).includes(slug)
    ) ?? null
  );
}

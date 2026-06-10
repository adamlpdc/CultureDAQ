import Image from "next/image";
import type { Asset, AssetCategory } from "@/types/database";
import { CATEGORY_COLORS } from "@/lib/constants";
import {
  getAssetInitials,
  getAvatarHue,
  isPersonCategory,
  POSTER_CATEGORIES,
} from "@/lib/asset-visual";
import { cn } from "@/lib/utils";

export type VisualSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AssetVisualProps {
  name: string;
  category: AssetCategory;
  imageUrl?: string | null;
  size?: VisualSize;
  className?: string;
}

const sizeClasses: Record<VisualSize, { box: string; text: string; img: number }> = {
  xs: { box: "h-8 w-8 rounded-lg", text: "text-[10px]", img: 32 },
  sm: { box: "h-10 w-10 rounded-xl", text: "text-xs", img: 40 },
  md: { box: "h-12 w-12 rounded-xl", text: "text-sm", img: 48 },
  lg: { box: "h-14 w-14 rounded-2xl", text: "text-base", img: 56 },
  xl: { box: "h-20 w-20 rounded-2xl", text: "text-lg", img: 80 },
};

/** Reusable market tile: initials for people, logos/posters when available. */
export function AssetVisual({
  name,
  category,
  imageUrl,
  size = "md",
  className,
}: AssetVisualProps) {
  const { box, text, img } = sizeClasses[size];
  const initials = getAssetInitials(name);
  const isPoster = POSTER_CATEGORIES.includes(category);
  const showImage = imageUrl && !isPersonCategory(category);

  if (showImage) {
    return (
      <div
        className={cn(
          box,
          "relative shrink-0 overflow-hidden border border-border bg-surface-muted shadow-card",
          isPoster && "rounded-lg",
          className
        )}
      >
        <Image
          src={imageUrl}
          alt=""
          width={img}
          height={img}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (isPersonCategory(category)) {
    const hue = getAvatarHue(name);
    return (
      <div
        className={cn(
          box,
          "flex shrink-0 items-center justify-center border border-border/60 font-bold shadow-card",
          text,
          className
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 45% 92%) 0%, hsl(${hue} 35% 85%) 100%)`,
          color: `hsl(${hue} 40% 32%)`,
        }}
      >
        {initials}
      </div>
    );
  }

  if (isPoster) {
    const hue = getAvatarHue(name);
    return (
      <div
        className={cn(
          box,
          "flex shrink-0 items-center justify-center border border-border/60 p-1 font-bold shadow-card rounded-lg",
          text,
          className
        )}
        style={{
          background: `linear-gradient(160deg, hsl(${hue} 30% 18%) 0%, hsl(${hue} 45% 28%) 100%)`,
          color: "white",
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        box,
        "flex shrink-0 items-center justify-center border font-bold shadow-card",
        CATEGORY_COLORS[category],
        text,
        className
      )}
    >
      {initials}
    </div>
  );
}

export function AssetVisualFromAsset({
  asset,
  size = "md",
  className,
}: {
  asset: Pick<Asset, "name" | "category" | "image_url">;
  size?: VisualSize;
  className?: string;
}) {
  return (
    <AssetVisual
      name={asset.name}
      category={asset.category}
      imageUrl={asset.image_url}
      size={size}
      className={className}
    />
  );
}

import Image from "next/image";
import type { Asset, AssetCategory } from "@/types/database";
import { CATEGORY_COLORS } from "@/lib/constants";
import {
  getAssetInitials,
  getAvatarHue,
  IDENTITY_SIZE_CLASSES,
  isPersonCategory,
  resolveAssetIdentityRenderMode,
  type IdentitySize,
} from "@/lib/asset-visual";
import { cn } from "@/lib/utils";

export type { IdentitySize as AssetIdentitySize };

interface AssetIdentityProps {
  name: string;
  category: AssetCategory;
  imageUrl?: string | null;
  size?: IdentitySize;
  className?: string;
  premium?: boolean;
}

function shapeClass(category: AssetCategory, box: string): string {
  if (isPersonCategory(category)) {
    return cn(box.replace(/\brounded-\S+/g, ""), "rounded-full");
  }
  return box;
}

function innerAccent(premium?: boolean, rounded?: string) {
  return cn(premium && "ring-2 ring-border-tint/80", rounded);
}

export function AssetIdentity({
  name,
  category,
  imageUrl,
  size = "md",
  className,
  premium = false,
}: AssetIdentityProps) {
  const { box, text, img, poster } = IDENTITY_SIZE_CLASSES[size];
  const initials = getAssetInitials(name);
  const shaped = shapeClass(category, box);
  const mode = resolveAssetIdentityRenderMode(category, imageUrl);

  if (mode === "poster-image") {
    const posterBox = size === "hero" && poster ? poster : shaped;
    return (
      <div className={cn("relative shrink-0 inline-flex", className)}>
        <div
          className={cn(
            posterBox,
            "relative overflow-hidden border border-border/60 bg-surface-muted",
            innerAccent(premium, posterBox)
          )}
        >
          <Image
            src={imageUrl!}
            alt=""
            width={img}
            height={Math.round(img * 1.4)}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    );
  }

  if (mode === "logo-image") {
    return (
      <div className={cn("relative shrink-0 inline-flex", className)}>
        <div
          className={cn(
            shaped,
            "relative flex items-center justify-center overflow-hidden border border-border/60 bg-surface-muted/60",
            innerAccent(premium, shaped)
          )}
        >
          <Image
            src={imageUrl!}
            alt=""
            width={img}
            height={img}
            className="h-[85%] w-[85%] object-contain"
          />
        </div>
      </div>
    );
  }

  if (mode === "portrait-image") {
    return (
      <div className={cn("relative shrink-0 inline-flex", className)}>
        <div
          className={cn(
            shaped,
            "relative overflow-hidden border border-border/60 bg-surface-muted",
            innerAccent(premium, shaped)
          )}
        >
          <Image
            src={imageUrl!}
            alt={name}
            width={img}
            height={img}
            className="h-full w-full object-cover object-[center_25%]"
          />
        </div>
      </div>
    );
  }

  if (mode === "portrait-fallback") {
    const hue = getAvatarHue(name);
    return (
      <div className={cn("relative shrink-0 inline-flex", className)}>
        <div
          className={cn(
            shaped,
            "flex items-center justify-center border border-border/50 font-bold",
            text,
            innerAccent(premium, shaped)
          )}
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 48% 94%) 0%, hsl(${hue} 38% 86%) 100%)`,
            color: `hsl(${hue} 42% 30%)`,
          }}
        >
          {initials}
        </div>
      </div>
    );
  }

  if (mode === "poster-fallback") {
    const hue = getAvatarHue(name);
    const posterBox = size === "hero" && poster ? poster : shaped;
    return (
      <div className={cn("relative shrink-0 inline-flex", className)}>
        <div
          className={cn(
            posterBox,
            "flex flex-col items-center justify-center border border-border/60 p-2 font-bold",
            text,
            innerAccent(premium, posterBox)
          )}
          style={{
            background: `linear-gradient(165deg, hsl(${hue} 32% 16%) 0%, hsl(${hue} 48% 30%) 100%)`,
            color: "white",
          }}
        >
          <span className="text-[0.65em] font-semibold uppercase tracking-widest opacity-70">
            {category === "movies" ? "Film" : "Series"}
          </span>
          <span className="mt-1 leading-none">{initials}</span>
        </div>
      </div>
    );
  }

  if (mode === "logo-fallback") {
    const hue = getAvatarHue(name);
    return (
      <div className={cn("relative shrink-0 inline-flex", className)}>
        <div
          className={cn(
            shaped,
            "flex items-center justify-center border border-border/60 font-bold",
            text,
            innerAccent(premium, shaped)
          )}
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 30% 96%) 0%, hsl(${hue} 25% 88%) 100%)`,
            color: `hsl(${hue} 45% 28%)`,
          }}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 inline-flex", className)}>
      <div
        className={cn(
          shaped,
          "flex items-center justify-center border font-bold",
          CATEGORY_COLORS[category],
          text,
          innerAccent(premium, shaped)
        )}
      >
        {initials}
      </div>
    </div>
  );
}

export function AssetIdentityFromAsset({
  asset,
  size = "md",
  className,
  premium = false,
}: {
  asset: Pick<Asset, "name" | "category" | "image_url">;
  size?: IdentitySize;
  className?: string;
  premium?: boolean;
}) {
  return (
    <AssetIdentity
      name={asset.name}
      category={asset.category}
      imageUrl={asset.image_url}
      size={size}
      className={className}
      premium={premium}
    />
  );
}

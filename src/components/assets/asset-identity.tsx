import Image from "next/image";
import type { Asset, AssetCategory } from "@/types/database";
import { CATEGORY_COLORS } from "@/lib/constants";
import {
  getAssetInitials,
  getAvatarHue,
  IDENTITY_SIZE_CLASSES,
  isLogoCategory,
  isPersonCategory,
  isPosterCategory,
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

function IdentityFrame({
  className,
  premium,
  children,
}: {
  className?: string;
  premium?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0",
        premium ? "ring-2 ring-border-tint shadow-elevated" : "shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
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
  const isPoster = isPosterCategory(category);
  const isLogo = isLogoCategory(category);
  const showImage = imageUrl && !isPersonCategory(category);

  if (showImage && isPoster) {
    const posterBox = size === "hero" && poster ? poster : box;
    return (
      <IdentityFrame className={className} premium={premium}>
        <div
          className={cn(
            posterBox,
            "relative overflow-hidden border border-border bg-surface-muted"
          )}
        >
          <Image
            src={imageUrl}
            alt=""
            width={img}
            height={Math.round(img * 1.4)}
            className="h-full w-full object-cover"
          />
        </div>
      </IdentityFrame>
    );
  }

  if (showImage && isLogo) {
    return (
      <IdentityFrame className={className} premium={premium}>
        <div
          className={cn(
            box,
            "relative flex items-center justify-center overflow-hidden border border-border bg-surface p-1.5"
          )}
        >
          <Image
            src={imageUrl}
            alt=""
            width={img}
            height={img}
            className="h-full w-full object-contain"
          />
        </div>
      </IdentityFrame>
    );
  }

  if (showImage) {
    return (
      <IdentityFrame className={className} premium={premium}>
        <div
          className={cn(
            box,
            "relative overflow-hidden border border-border bg-surface-muted"
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
      </IdentityFrame>
    );
  }

  if (isPersonCategory(category)) {
    const hue = getAvatarHue(name);
    return (
      <IdentityFrame className={className} premium={premium}>
        <div
          className={cn(
            box,
            "flex items-center justify-center border border-border/60 font-bold",
            text
          )}
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 48% 94%) 0%, hsl(${hue} 38% 86%) 100%)`,
            color: `hsl(${hue} 42% 30%)`,
          }}
        >
          {initials}
        </div>
      </IdentityFrame>
    );
  }

  if (isPoster) {
    const hue = getAvatarHue(name);
    const posterBox = size === "hero" && poster ? poster : box;
    return (
      <IdentityFrame className={className} premium={premium}>
        <div
          className={cn(
            posterBox,
            "flex flex-col items-center justify-center border border-border/60 p-2 font-bold",
            text
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
      </IdentityFrame>
    );
  }

  if (isLogo) {
    const hue = getAvatarHue(name);
    return (
      <IdentityFrame className={className} premium={premium}>
        <div
          className={cn(
            box,
            "flex items-center justify-center border border-border/60 font-bold",
            text
          )}
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 30% 96%) 0%, hsl(${hue} 25% 88%) 100%)`,
            color: `hsl(${hue} 45% 28%)`,
          }}
        >
          {initials}
        </div>
      </IdentityFrame>
    );
  }

  return (
    <IdentityFrame className={className} premium={premium}>
      <div
        className={cn(
          box,
          "flex items-center justify-center border font-bold",
          CATEGORY_COLORS[category],
          text
        )}
      >
        {initials}
      </div>
    </IdentityFrame>
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

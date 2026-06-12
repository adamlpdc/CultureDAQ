"use client";

import { useState } from "react";
import Image from "next/image";

interface AssetIdentityImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallback: React.ReactNode;
}

export function AssetIdentityImage({
  src,
  alt,
  width,
  height,
  className,
  fallback,
}: AssetIdentityImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

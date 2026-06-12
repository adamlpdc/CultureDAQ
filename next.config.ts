import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/asset/prime",
        destination: "/asset/prime-hydration",
        permanent: true,
      },
      {
        source: "/asset/avatar",
        destination: "/asset/avatar-film-franchise",
        permanent: true,
      },
      {
        source: "/asset/fallout",
        destination: "/asset/fallout-tv-series",
        permanent: true,
      },
      {
        source: "/asset/barbie",
        destination: "/asset/barbie-2023",
        permanent: true,
      },
      {
        source: "/asset/shogun",
        destination: "/asset/shogun-2024",
        permanent: true,
      },
      {
        source: "/asset/ferrari-f1",
        destination: "/asset/scuderia-ferrari",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

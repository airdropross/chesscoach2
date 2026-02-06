import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.chesscomfiles.com",
        pathname: "/chess-themes/pieces/**",
      },
    ],
  },
};

export default nextConfig;

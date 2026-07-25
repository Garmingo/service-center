import "@service-center/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  output: "standalone",
  transpilePackages: [
    "@garmingo/ui-primitives",
    "@garmingo/ui-blocks",
    "@garmingo/ui-hooks",
    "@garmingo/ui-charts",
  ],
};

export default nextConfig;

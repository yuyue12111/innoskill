import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Docker 用 .next/standalone,不带完整 node_modules
	output: "standalone",
	// tar 走原生 require,不打进 bundle
	serverExternalPackages: ["tar"],
	poweredByHeader: false,
};

export default nextConfig;

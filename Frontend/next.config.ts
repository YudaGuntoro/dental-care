import type { NextConfig } from "next";

// Keep the SVG coordinate system when CSS scales TailAdmin icons.
const svgLoader = {
  loader: "@svgr/webpack",
  options: {
    svgoConfig: {
      plugins: [
        {
          name: "preset-default",
          params: { overrides: { removeViewBox: false } },
        },
      ],
    },
  },
};

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  async headers() {
    return [{
      // Exclude Next.js assets and public files; include every page and /api.
      source: "/((?!_next/|.*\\.[^/]+$).*)",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    }];
  },
  async rewrites() {
    // Browsers always call /api. Only this server-side proxy knows the backend URL.
    const target = (process.env.API_PROXY_TARGET || "http://127.0.0.1:5243").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [svgLoader],
    });
    return config;
  },
    
    turbopack: {
      rules: {
        '*.svg': {
          loaders: [svgLoader],
          as: '*.js',
        },
      },
    },
  
};

export default nextConfig;

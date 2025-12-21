/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/8.x/**",
      },
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.xml$/i,
      type: "asset/source",
    });

    return config;
  },
};

export default nextConfig;

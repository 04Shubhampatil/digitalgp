import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native modules used by the backend must not be bundled by Next.
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;

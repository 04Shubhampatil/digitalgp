import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Native modules used by the backend must not be bundled by Next.
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default withNextIntl(nextConfig);

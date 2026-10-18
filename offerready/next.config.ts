import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite ships WebAssembly + data files and ExcelJS uses Node streams: load them with Node's require.
  serverExternalPackages: ["@electric-sql/pglite", "exceljs", "unpdf"],
  // Private data never ships in a build: the alumni spreadsheet is read from disk at runtime only,
  // and the local database (.data/) holds student records.
  outputFileTracingExcludes: { "*": ["**/*.xlsx", "**/*.xls", "**/*.csv", ".data/**"] },
  // Resume + LinkedIn PDF uploads (5 MB each, checked again on the server).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

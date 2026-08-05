import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The PDF routes launch headless Chrome through @sparticuz/chromium, whose
   * runtime lives as brotli archives under its bin/ directory. Next already
   * externalises the package, but file tracing does not follow those archives
   * because nothing imports them — so the deployed bundle shipped without them
   * and every PDF failed at runtime with "input directory does not exist".
   *
   * Tracing them explicitly for the routes that render PDFs fixes that.
   */
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;

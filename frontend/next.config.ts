import type { NextConfig } from "next";

// Allow next/image to optimize the Supabase Storage signed URLs the products
// API returns. Derived from NEXT_PUBLIC_SUPABASE_URL so it matches whatever
// host is in play — http://127.0.0.1:54321 locally, the project URL in prod —
// without hardcoding either. Scoped to the signed-object path only.
function supabaseImagePatterns() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  const { protocol, hostname, port } = new URL(url);
  return [
    {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      port: port || undefined,
      pathname: "/storage/v1/object/sign/**",
    },
  ];
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: supabaseImagePatterns(),
    // The local Supabase stack serves signed URLs from a loopback address
    // (http://127.0.0.1:54321). Next's image optimizer blocks private/local
    // IPs by default as an SSRF guard, separately from remotePatterns
    // matching — confirmed by testing: the same pattern against a public
    // HTTPS host passes validation, but 127.0.0.1 is rejected with `"url"
    // parameter is not allowed` until this is set. Dev-only: production's
    // Supabase URL is a public HTTPS host and never hits this path.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;

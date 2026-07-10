import type { NextConfig } from 'next';

function supabaseImagePatterns() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  const { protocol, hostname, port } = new URL(url);
  return [
    {
      protocol: protocol.replace(':', '') as 'http' | 'https',
      hostname,
      port: port || undefined,
      pathname: '/storage/v1/object/sign/**',
    },
  ];
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: supabaseImagePatterns(),
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
  },
};

export default nextConfig;

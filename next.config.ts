import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: 'abzxhkbcmbdybxyk.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '' }
    ]
  }
};

export default nextConfig;

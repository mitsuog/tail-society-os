import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v5.airtableusercontent.com', // Permite imágenes antiguas de Airtable
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Permite imágenes nuevas de tu Supabase
      },
    ],
  },
};

export default nextConfig;
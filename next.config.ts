import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production'

// script-src : unsafe-eval requis par Next.js hot-reload en dev uniquement
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

const csp = [
  "default-src 'self'",
  scriptSrc,
  // CSS-in-JS de Next.js nécessite unsafe-inline
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Polices Google Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // APIs externes : Open-Meteo, Mapbox, Nominatim (geocoding)
  "connect-src 'self' https://api.open-meteo.com https://marine-api.open-meteo.com https://api.mapbox.com https://events.mapbox.com https://nominatim.openstreetmap.org",
  // Tuiles images Mapbox
  "img-src 'self' data: blob: https://*.mapbox.com",
  // Workers Mapbox GL (blob: requis)
  "worker-src blob:",
  // iframes webcam (Windy et assimilés)
  "frame-src https://*.windy.com https://windy.app https://*.windyapp.co https://webcam.travel",
].join('; ')

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
};

export default nextConfig;

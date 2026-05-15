import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Empêche le sniffing de type MIME
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Protège contre le clickjacking (SAMEORIGIN pour autoriser les webcams Windy en iframe)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Filtre XSS (couverture navigateurs anciens)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Limite les infos Referer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Désactive caméra, micro ; autorise géolocalisation (pour centrage carte)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts : Next.js chunks (inline + eval nécessaire en dev, restreint en prod)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Styles : CSS-in-JS de Next.js nécessite unsafe-inline
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Polices Google Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Tuiles Mapbox, Open-Meteo
              "connect-src 'self' https://api.open-meteo.com https://marine-api.open-meteo.com https://api.mapbox.com https://events.mapbox.com",
              // Tuiles images Mapbox
              "img-src 'self' data: blob: https://*.mapbox.com",
              // Workers Mapbox GL (blob: requis)
              "worker-src blob:",
              // iframes webcam (Windy et assimilés)
              "frame-src https://*.windy.com https://windy.app https://*.windyapp.co https://webcam.travel",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;

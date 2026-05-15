'use client'

interface Props {
  /** Wind direction in degrees (meteorological: direction FROM which wind blows) */
  dirDeg: number
  /** Wind speed in km/h */
  speedKmh: number
  /** Gust speed in km/h */
  gustKmh?: number
  /** Accent color */
  color?: string
  /** Size in px (default 80) */
  size?: number
}

export function WindCompass({ dirDeg, speedKmh, gustKmh, color = '#00D4FF', size = 80 }: Props) {
  const bearingLabel = dirToBearing(dirDeg)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg
        width={size}
        height={size}
        viewBox="-50 -50 100 100"
        style={{ flexShrink: 0 }}
        aria-label={`Vent ${Math.round(speedKmh)} km/h depuis ${bearingLabel}`}
      >
        {/* Outer ring */}
        <circle cx="0" cy="0" r="46" fill="none" stroke="#1a2840" strokeWidth="1.5" />
        <circle cx="0" cy="0" r="36" fill="none" stroke="#0d1826" strokeWidth="0.5" />

        {/* Tick marks at 45° intervals */}
        {([0, 45, 90, 135, 180, 225, 270, 315] as number[]).map(a => {
          const rad = (a - 90) * Math.PI / 180
          const r1 = 38, r2 = 46
          return (
            <line
              key={a}
              x1={Math.cos(rad) * r1}
              y1={Math.sin(rad) * r1}
              x2={Math.cos(rad) * r2}
              y2={Math.sin(rad) * r2}
              stroke="#1a2840"
              strokeWidth="1"
            />
          )
        })}

        {/* Cardinal labels */}
        <text x="0" y="-30" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#3a5a7a" fontFamily="monospace">N</text>
        <text x="0" y="30" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#3a5a7a" fontFamily="monospace">S</text>
        <text x="-30" y="0" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#3a5a7a" fontFamily="monospace">O</text>
        <text x="30" y="0" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#3a5a7a" fontFamily="monospace">E</text>

        {/* Wind arrow group — rotated by dirDeg so tip points where wind blows TO */}
        <g transform={`rotate(${dirDeg})`}>
          <line x1="0" y1="22" x2="0" y2="-20" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <polygon points="0,-26 -5,-16 5,-16" fill={color} />
          <line x1="0" y1="22" x2="-6" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="22" x2="6" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Center: speed */}
        <text x="0" y="-3" textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#e8f4ff" fontFamily="monospace" fontWeight="bold">
          {Math.round(speedKmh)}
        </text>
        <text x="0" y="7" textAnchor="middle" dominantBaseline="central" fontSize="6.5" fill="#2a4a6a" fontFamily="monospace">
          km/h
        </text>
      </svg>

      {/* Side info */}
      <div style={{ fontFamily: 'var(--font-rajdhani)' }}>
        <div style={{ fontSize: 13, color: color, fontWeight: 700, letterSpacing: '0.05em' }}>
          {bearingLabel} — {Math.round(dirDeg)}°
        </div>
        {gustKmh !== undefined && (
          <div style={{ fontSize: 11, color: '#3a5a7a', marginTop: 2 }}>
            Rafales {Math.round(gustKmh)} km/h
          </div>
        )}
      </div>
    </div>
  )
}

function dirToBearing(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16]
}

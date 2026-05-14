'use client'
import type { AllFilters } from '@/lib/filters'

interface Props {
  layerId: string
  filters: AllFilters
  onChange: (f: AllFilters) => void
  onClose: () => void
  color: string
}

// ── Chip toggle ────────────────────────────────────────────────────────────
function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-rajdhani)',
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: '0.06em',
        padding: '4px 12px',
        border: `1px solid ${active ? color : '#1e3050'}`,
        borderRadius: 4,
        background: active ? `${color}22` : 'transparent',
        color: active ? color : '#4a6a8a',
        cursor: 'pointer',
        transition: 'all 0.12s',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ── Section label ──────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-rajdhani)',
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.22em',
      color: '#4a6a8a',
      textTransform: 'uppercase',
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

// ── Altitude slider ────────────────────────────────────────────────────────
function AltitudeSlider({
  value,
  max,
  color,
  onChange,
}: {
  value: number
  max: number
  color: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="range"
        min={0}
        max={max}
        step={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: color, height: 3, cursor: 'pointer' }}
      />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: value > 0 ? color : '#4a6a8a',
        minWidth: 52,
        textAlign: 'right',
        letterSpacing: '0.04em',
      }}>
        {value > 0 ? `≥${value}m` : 'tous'}
      </span>
    </div>
  )
}

// ── Toggle multi-select helper ─────────────────────────────────────────────
function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FilterPanel({ layerId, filters, onChange, onClose, color }: Props) {
  const setGlobal = (g: Partial<AllFilters['global']>) =>
    onChange({ ...filters, global: { ...filters.global, ...g } })
  const setSkydive = (s: Partial<AllFilters['skydive']>) =>
    onChange({ ...filters, skydive: { ...filters.skydive, ...s } })
  const setPara = (p: Partial<AllFilters['paragliding']>) =>
    onChange({ ...filters, paragliding: { ...filters.paragliding, ...p } })
  const setBJ = (b: Partial<AllFilters['basejump']>) =>
    onChange({ ...filters, basejump: { ...filters.basejump, ...b } })

  return (
    <div style={{
      background: '#060c18',
      borderTop: `1px solid ${color}35`,
      borderBottom: '1px solid #0d1826',
      padding: '14px 18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.2em',
          color: color,
          textTransform: 'uppercase',
        }}>
          Filtres
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#4a6a8a',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Global: France only */}
      <div>
        <Label>Pays</Label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip
            label="🌍 Europe"
            active={!filters.global.franceOnly}
            color={color}
            onClick={() => setGlobal({ franceOnly: false })}
          />
          <Chip
            label="🇫🇷 France"
            active={filters.global.franceOnly}
            color={color}
            onClick={() => setGlobal({ franceOnly: true })}
          />
        </div>
      </div>

      {/* ── Skydive filters ── */}
      {layerId === 'skydive' && (
        <>
          <div>
            <Label>Conditions météo</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['green', 'yellow', 'red'] as const).map((c) => (
                <Chip
                  key={c}
                  label={c === 'green' ? '🟢 Bon' : c === 'yellow' ? '🟡 Moyen' : '🔴 Mauvais'}
                  active={filters.skydive.conditions.includes(c)}
                  color={c === 'green' ? '#00FF88' : c === 'yellow' ? '#FFB347' : '#FF4500'}
                  onClick={() => setSkydive({ conditions: toggle(filters.skydive.conditions, c) })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Altitude mini saut</Label>
            <AltitudeSlider
              value={filters.skydive.altitudeMin}
              max={4500}
              color={color}
              onChange={(v) => setSkydive({ altitudeMin: v })}
            />
          </div>
        </>
      )}

      {/* ── Paragliding filters ── */}
      {layerId === 'paragliding' && (
        <>
          <div>
            <Label>Niveau pilote</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { val: 'all',          label: '🔰 Tous niveaux' },
                { val: 'beginner',     label: '🟢 Débutant' },
                { val: 'intermediate', label: '🟡 Intermédiaire' },
                { val: 'advanced',     label: '🟠 Avancé' },
                { val: 'expert',       label: '🔴 Expert' },
              ].map(({ val, label }) => (
                <Chip
                  key={val}
                  label={label}
                  active={filters.paragliding.levels.includes(val)}
                  color={color}
                  onClick={() => setPara({ levels: toggle(filters.paragliding.levels, val) })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Altitude décollage mini</Label>
            <AltitudeSlider
              value={filters.paragliding.altitudeMin}
              max={2500}
              color={color}
              onChange={(v) => setPara({ altitudeMin: v })}
            />
          </div>
        </>
      )}

      {/* ── BASE jump filters ── */}
      {layerId === 'basejump' && (
        <>
          <div>
            <Label>Difficulté</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { val: 'intermediate', label: '🟡 Intermédiaire' },
                { val: 'advanced',     label: '🟠 Avancé' },
                { val: 'expert',       label: '🔴 Expert' },
              ].map(({ val, label }) => (
                <Chip
                  key={val}
                  label={label}
                  active={filters.basejump.difficulties.includes(val)}
                  color={color}
                  onClick={() => setBJ({ difficulties: toggle(filters.basejump.difficulties, val) })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Statut légal</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { val: 'authorized', label: '✅ Autorisé' },
                { val: 'tolerated',  label: '⚠️ Toléré' },
              ].map(({ val, label }) => (
                <Chip
                  key={val}
                  label={label}
                  active={filters.basejump.legalStatus.includes(val)}
                  color={color}
                  onClick={() => setBJ({ legalStatus: toggle(filters.basejump.legalStatus, val) })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Type de sortie</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { val: 'cliff',   label: '🏔 Falaise' },
                { val: 'bridge',  label: '🌉 Pont' },
                { val: 'antenna', label: '📡 Antenne' },
                { val: 'earth',   label: '⛰ Terre' },
              ].map(({ val, label }) => (
                <Chip
                  key={val}
                  label={label}
                  active={filters.basejump.types.includes(val)}
                  color={color}
                  onClick={() => setBJ({ types: toggle(filters.basejump.types, val) })}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

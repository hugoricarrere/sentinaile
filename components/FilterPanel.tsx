'use client'
import type { AllFilters } from '@/lib/filters'
import { DEFAULT_FILTERS } from '@/lib/filters'

interface Props {
  layerId: string
  filters: AllFilters
  onChange: (f: AllFilters) => void
  onClose: () => void
  color: string
  totalCount?: number
  visibleCount?: number
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
      role="switch"
      aria-checked={active}
      aria-label={label}
      style={{
        fontFamily: 'var(--font-rajdhani)',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.08em',
        padding: '3px 9px',
        border: `1px solid ${active ? color : '#1e3050'}`,
        borderRadius: 3,
        background: active ? `${color}22` : 'transparent',
        color: active ? color : '#2a4a6a',
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
      fontWeight: 600,
      fontSize: 9,
      letterSpacing: '0.22em',
      color: '#2a4a6a',
      textTransform: 'uppercase',
      marginBottom: 6,
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
  label,
  onChange,
}: {
  value: number
  max: number
  color: string
  label?: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="range"
        min={0}
        max={max}
        step={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label ?? `Altitude minimum (${value} m)`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={value > 0 ? `${value} mètres minimum` : 'aucun filtre'}
        style={{ flex: 1, accentColor: color, height: 3, cursor: 'pointer' }}
      />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: value > 0 ? color : '#2a4a6a',
        minWidth: 44,
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
export default function FilterPanel({ layerId, filters, onChange, onClose, color, totalCount, visibleCount }: Props) {
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
      borderTop: `1px solid ${color}30`,
      borderBottom: '1px solid #0d1826',
      padding: '12px 16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-rajdhani)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.2em',
            color: color,
            textTransform: 'uppercase',
          }}>
            Filtres
          </span>
          {totalCount != null && visibleCount != null && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: visibleCount < totalCount ? color : '#2a4a6a',
              letterSpacing: '0.04em',
            }}>
              {visibleCount}/{totalCount}
              {visibleCount < totalCount && ` (−${totalCount - visibleCount})`}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            title="Réinitialiser tous les filtres"
            aria-label="Réinitialiser tous les filtres"
            style={{
              background: 'none',
              border: '1px solid #1e3050',
              borderRadius: 3,
              cursor: 'pointer',
              color: '#2a4a6a',
              fontFamily: 'var(--font-rajdhani)',
              fontWeight: 600,
              fontSize: 9,
              letterSpacing: '0.12em',
              padding: '2px 6px',
              textTransform: 'uppercase' as const,
              transition: 'border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = color
              ;(e.currentTarget as HTMLButtonElement).style.color = color
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e3050'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#2a4a6a'
            }}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            aria-label="Fermer les filtres"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#2a4a6a',
              fontSize: 14,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Global: France only */}
      <div>
        <Label>Pays</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

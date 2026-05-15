'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}
interface State { hasError: boolean; message: string }

/**
 * React ErrorBoundary — catches runtime errors in any descendant tree and
 * shows a minimal fallback instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    }
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div style={{
        padding: '12px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: '#cc3a20',
        background: '#0a0e1a',
        border: '1px solid #2a1010',
        borderRadius: 4,
        margin: 8,
      }}>
        <span style={{ fontWeight: 700 }}>Erreur composant</span>
        <span style={{ color: '#4a2a2a', marginLeft: 8 }}>{this.state.message}</span>
      </div>
    )
  }
}

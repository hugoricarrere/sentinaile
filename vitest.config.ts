import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [
      // Default exclusions
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      // Exclude git worktrees created by Claude Code / superpowers agents
      '**/.claude/worktrees/**',
      '**/.superpowers/worktrees/**',
      '**/worktrees/**',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})

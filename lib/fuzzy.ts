/**
 * Lightweight fuzzy search engine for SentinAile map points.
 *
 * Scoring priority (higher = better match):
 *  100+ : exact substring
 *   80  : all query tokens match word boundaries
 *   60  : majority of query tokens match
 *   20-59: character-subsequence (fuzzy)
 *    0   : no meaningful match
 *
 * Handles accents, case, and minor typos via:
 *   - Unicode NFD accent stripping
 *   - Token-level edit-distance (max 1 error per token ≤ 5 chars, max 2 for longer)
 */

/** Remove accents + lowercase + trim */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Levenshtein distance (capped early at maxDist for performance) */
function editDistance(a: string, b: string, maxDist = 3): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1
  const m = a.length, n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = i
    for (let j = 1; j <= n; j++) {
      const cur = a[i - 1] === b[j - 1]
        ? dp[j - 1]
        : 1 + Math.min(dp[j], prev, dp[j - 1])
      dp[j - 1] = prev
      prev = cur
    }
    dp[n] = prev
  }
  return dp[n]
}

/** Max allowed edit distance for a token of given length */
function maxEdit(tokenLen: number): number {
  if (tokenLen <= 2) return 0   // short tokens must match exactly
  if (tokenLen <= 4) return 1   // e.g. "parc" → "park" ok
  if (tokenLen <= 7) return 2   // e.g. "chardon" → "chardons"
  return 2                       // cap at 2 for long tokens (avoids false positives)
}

/**
 * Score how well `query` matches `text`.
 * Returns 0 if no meaningful match.
 */
export function fuzzyScore(query: string, text: string): number {
  if (!query || !text) return 0
  const q = normalize(query)
  const t = normalize(text)
  if (!q || !t) return 0

  // ── 1. Exact substring ────────────────────────────────────────────────
  if (t.includes(q)) {
    // Bonus if it matches at word boundary (e.g., "annecy" in "col de la forclaz – annecy")
    const wordBoundary = t === q || t.startsWith(q) || t.includes(' ' + q) || t.includes('-' + q)
    return wordBoundary ? 105 : 100 - (t.length - q.length) * 0.05
  }

  // ── 2. Token-level fuzzy matching ─────────────────────────────────────
  const qTokens = q.split(/[\s\-–,]+/).filter(t => t.length > 0)
  const tTokens = t.split(/[\s\-–,]+/).filter(t => t.length > 0)

  let tokenMatches = 0
  for (const qt of qTokens) {
    const maxD = maxEdit(qt.length)
    const matched = tTokens.some(tt => {
      if (tt.startsWith(qt)) return true          // prefix match is free
      return editDistance(qt, tt, maxD) <= maxD
    })
    if (matched) tokenMatches++
  }

  const coverage = tokenMatches / qTokens.length
  if (coverage === 1) return 80 + (1 / t.length) * 5  // all tokens matched (fuzzy)
  if (coverage >= 0.5) return 40 + coverage * 30        // most tokens matched

  // ── 3. Character subsequence (fallback for short queries) ─────────────
  if (q.length <= 4) {
    let qi = 0
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++
    }
    if (qi === q.length) return 15 + (qi / t.length) * 10
  }

  return 0
}

export interface SearchResult<T> {
  item: T
  score: number
}

/**
 * Search `items` for those matching `query` using `getText` to extract searchable text.
 * Returns results sorted by score (highest first), up to `limit` items.
 */
export function fuzzySearch<T>(
  items: T[],
  getText: (item: T) => string,
  query: string,
  limit = 8,
): SearchResult<T>[] {
  if (!query.trim()) return []
  const results: SearchResult<T>[] = []
  for (const item of items) {
    const score = fuzzyScore(query, getText(item))
    if (score > 0) results.push({ item, score })
  }
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

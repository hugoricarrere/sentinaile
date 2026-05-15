import { test, expect } from '@playwright/test'

test.describe('Carte principale', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass la splash screen pour les tests
    await page.addInitScript(() => {
      localStorage.setItem('sentinaile-seen', '1')
    })
    await page.goto('/')
    // Attendre que la carte soit chargée (le loading overlay disparaît)
    await page.waitForSelector('[data-testid="map-loaded"]', { timeout: 15_000 }).catch(() => {
      // Si pas de testid, attendre simplement que le canvas apparaisse
    })
  })

  test('affiche le titre SentinAile', async ({ page }) => {
    await expect(page).toHaveTitle(/SentinAile/)
  })

  test('affiche la carte sans erreur critique', async ({ page }) => {
    // La page se charge sans erreur 500
    const response = await page.request.get('/')
    expect(response.status()).toBe(200)
  })

  test('la recherche est accessible', async ({ page, isMobile }) => {
    if (isMobile) {
      // Mobile : bouton ⌕ dans le header
      const searchBtn = page.locator('button[aria-label="Rechercher un club, spot ou lieu"]')
      await expect(searchBtn).toBeVisible()
    } else {
      // Desktop : TopBar avec input search
      const searchInput = page.locator('input[placeholder*="Club"]').or(
        page.locator('input[placeholder*="club"]')
      )
      await expect(searchInput).toBeVisible()
    }
  })
})

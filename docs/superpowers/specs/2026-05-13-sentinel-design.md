# SENTINEL — Design Spec

**Date :** 2026-05-13  
**Statut :** Approuvé

---

## Vue d'ensemble

SENTINEL est un dashboard personnel d'intelligence géospatiale temps réel, inspiré de l'esthétique Palantir Gotham. Il agrège des données publiques mondiales sur une carte immersive plein écran avec drill-down sur la France, et couvre 10 couches de données : trafic aérien, maritime, ferroviaire, qualité de l'air, webcams publiques, surf, parachutisme, parapente et BASE jump.

L'objectif est double : vitrine visuellement impressionnante ET outil quotidien fonctionnel avec de vraies données en temps réel.

---

## Architecture

### Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Carte | Mapbox GL JS (fond dark) + Deck.gl (couches de données) |
| Styling | Tailwind CSS |
| Déploiement | Vercel (gratuit) |
| Langue | TypeScript |

### Structure du projet

```
/app
  /page.tsx              → page principale (carte + UI)
  /api
    /_template/route.ts  → template commenté pour nouvelles sources
    /flights/route.ts    → proxy OpenSky Network
    /ships/route.ts      → proxy VesselFinder AIS
    /weather/route.ts    → proxy Open-Meteo
    /trains/route.ts     → proxy SNCF Open Data
    /air/route.ts        → proxy OpenAQ
    /webcams/route.ts    → proxy Windy Webcams API
    /surf/route.ts       → proxy Stormglass + spots dataset
    /skydive/route.ts    → proxy OpenAIP + FFP + Open-Meteo
    /paragliding/route.ts→ proxy FFVL + DHV + Open-Meteo
    /basejump/route.ts   → proxy Exit List dataset + Open-Meteo
/components
  TopBar.tsx
  StatusBar.tsx
  LayerToggle.tsx        → auto-généré depuis layers-registry
  ContextPanel.tsx       → dispatch vers le bon panel selon layer id
  FrancePanel.tsx
  MapCanvas.tsx          → monte les couches depuis layers-registry
  /panels
    FlightPanel.tsx
    ShipPanel.tsx
    WebcamPanel.tsx
    SurfPanel.tsx
    SkydivePanel.tsx
    ParaglidingPanel.tsx
    BasejumpPanel.tsx
/lib
  layers-registry.ts     → registre central de toutes les couches
  cache.ts               → cache in-memory avec TTL par source
  weather.ts             → helpers calcul conditions (surf, DZ, BASE)
/data
  surf-spots.json        → dataset statique des spots de surf
  skydive-dz.json        → dataset statique des DZ (OpenAIP export)
  paragliding-spots.json → dataset statique des sites FFVL/DHV
  basejump-exits.json    → dataset statique des exits connus
```

### Pattern de données

Toutes les API routes suivent le même pattern :

```
Browser poll (toutes les X sec)
  → Next.js API Route
      → si cache valide : retourne cache
      → sinon : fetch API externe, met à jour cache, retourne résultat
  → Deck.gl layer update
```

Pas de WebSocket. Polling HTTP simple, suffisant pour des données qui se rafraîchissent à 30s+.

En cas d'échec d'une API externe, la route retourne les données du cache même expirées (stale-while-revalidate), avec un flag `stale: true` qui affiche un indicateur d'avertissement dans le panneau correspondant.

---

## Sources de données

| Couche | Source | Auth | TTL cache | Notes |
|---|---|---|---|---|
| Vols | OpenSky Network | Non | 30s | Gratuit sans auth (rate limit souple) |
| Navires | VesselFinder AIS | Non | 60s | Endpoint public |
| Météo | Open-Meteo | Non | 10min | Gratuit, sans clé, excellent coverage |
| Trains France | SNCF Open Data | Non | 2min | API REST officielle |
| Qualité de l'air | OpenAQ | Non | 10min | Gratuit |
| Trafic France | BISON FUTÉ | Non | 5min | Open data gouvernement |
| Webcams | Windy Webcams API | Clé gratuite | 5min | Agrégateur webcams publiques mondiales |
| Surf | Stormglass.io + dataset | Clé gratuite | 30min | 50 req/jour free tier — suffisant |
| Parachutisme | OpenAIP + FFP | Non | statique+météo | Positions statiques, météo Open-Meteo |
| Parapente | FFVL + DHV GeoInfo | Non | statique+météo | Positions statiques, météo Open-Meteo |
| BASE jump | Exit List + BLiNC | Non | statique+météo | Positions statiques, météo Open-Meteo |

Les datasets statiques (surf-spots.json, skydive-dz.json, etc.) sont embarqués dans le projet et mis à jour manuellement au besoin. Seules les données météo et temps réel sont fetchées dynamiquement.

---

## Palette de couleurs sémantique

| Couche | Couleur hex | Usage |
|---|---|---|
| Vols | `#00D4FF` | Points, trails de trajectoires |
| Navires | `#00FF88` | Points, traces AIS |
| Météo | `#B388FF` | Overlay precipitation/vent |
| Trains | `#FFB347` | Points gares, lignes perturbées |
| Qualité air | `#FF6B35` | Heatmap, indicateurs stations |
| Webcams | `#FFD700` | Icônes caméra |
| Surf | `#00CED1` | Points spots, indicateur houle |
| Parachutisme | `#FF4500` | Icônes DZ, indicateur conditions |
| Parapente | `#9B59B6` | Icônes sites, indicateur vent |
| BASE jump | `#FF0080` | Icônes exits |

Fond de carte : Mapbox style `dark-v11` (near-black `#070B14`).  
Typographie : JetBrains Mono (monospace, cohérent avec l'esthétique terminal Palantir).

---

## Composants UI

### TopBar
- Logo `SENTINEL` à gauche en `#00D4FF`
- Indicateur LIVE pulsant (animation CSS pulse)
- Compteurs globaux par couche active (vols actifs, navires, alertes)
- Heure UTC en temps réel à droite

### LayerToggle (sidebar gauche escamotable)
- Toggle on/off par couche avec sa couleur sémantique
- Compteur d'entités visibles par couche
- Bouton collapse → sidebar réduite à des icônes seules

### MapCanvas
- Mapbox GL JS dark style en plein écran
- Couches Deck.gl superposées :
  - `ScatterplotLayer` pour les positions (vols, navires, DZ, spots)
  - `LineLayer` pour les trails de vols et AIS
  - `IconLayer` pour les webcams, DZ, spots de sports
  - `HeatmapLayer` pour la qualité de l'air
  - `GeoJsonLayer` pour les overlays de régions France
- Hover sur un point → tooltip avec info de base
- Clic sur un point → ouverture ContextPanel

### ContextPanel (panneau flottant)
S'ouvre à droite ou en bas selon la taille d'écran. Contenu adapté selon le type de point cliqué :

**Vol :**
- Immatriculation, compagnie, type d'appareil
- Origine → Destination
- Altitude, vitesse, cap
- Lien FlightAware

**Navire :**
- Nom, pavillon, type (cargo/tanker/ferry)
- Origine → Destination, ETA
- Vitesse, cap

**Webcam :**
- Preview iframe du flux live
- Localisation, source

**Spot de surf :**
- Houle : hauteur, période, direction
- Vent : vitesse, direction, rafales
- Prévisions 7 jours (graphique mini)
- Niveau recommandé (débutant / intermédiaire / expert)

**DZ Parachutisme :**
- Nom, OACI de l'aérodrome, altitude terrain
- Fréquence radio, contact, site web
- Avions disponibles, hauteurs de largage
- Conditions météo : vent sol + 3000m + 6000m, visibilité, METAR
- Indicateur conditions : 🟢 Favorable / 🟡 Attention / 🔴 Fermé

**Site Parapente :**
- Nom, type (décollage/atterrissage/école), niveau requis
- Orientation vent favorable, altitude déco
- Vent actuel + altitude, thermiques (indice calculé)
- Prévisions vent 24h

**Exit BASE jump :**
- Nom, type (cliff/bridge/antenna/building), hauteur
- Délai d'ouverture recommandé, difficulté
- Statut légal : ✅ Autorisé / ⚠️ Toléré / ❌ Interdit
- Météo critique : vent, rafales, visibilité, plafond

### FrancePanel
Panneau fixe bas-droite, s'active automatiquement quand le zoom Mapbox ≥ 5 et la vue est centrée sur la France. Affiche :
- SNCF : ponctualité TGV, TER, nombre de retards
- BISON FUTÉ : couleur trafic autoroutes (vert/orange/rouge/noir)
- Qualité air IDF : indice ATMO
- Météo Paris : température, vent

### StatusBar
- Coordonnées GPS du centre de la vue (mises à jour au drag)
- Timestamp dernière mise à jour de chaque source active
- Nombre de sources connectées / total

---

## Conditions météo — Calcul des indicateurs

### Parachutisme (seuils FFP standards)
- 🟢 Favorable : vent sol < 25 km/h, vent 3000m < 60 km/h, visibilité ≥ 5km, pas de précipitations
- 🟡 Attention : vent sol 25-35 km/h OU vent 3000m 60-80 km/h OU visibilité 3-5km
- 🔴 Fermé : vent sol > 35 km/h OU vent 3000m > 80 km/h OU visibilité < 3km OU précipitations

### Parapente
- 🟢 : vent 10-30 km/h, direction dans le secteur favorable du site, thermiques actifs (température > 15°C, radiation > 300 W/m²)
- 🟡 : vent 30-45 km/h OU turbulences modérées
- 🔴 : vent > 45 km/h OU rafales > 30 km/h OU orage prévu

### BASE jump
- 🟢 : vent < 15 km/h, visibilité > 5km, pas de précipitations, plafond > 600m
- 🟡 : vent 15-20 km/h OU visibilité 3-5km
- 🔴 : vent > 20 km/h OU rafales > 15 km/h OU précipitations OU visibilité < 3km

### Surf
- Score 1-10 calculé à partir de : hauteur houle (idéal 1.5-2.5m), période (idéal > 12s), vent offshore (< 15 km/h)

---

## Performance

- Deck.gl WebGL gère 100k+ points à 60fps nativement — les ~8000 vols simultanés sont triviaux
- Les trails de vols sont calculés client-side à partir d'un historique de 5 positions par appareil, gardé en state React
- Le cache in-memory Next.js empêche les appels API redondants entre utilisateurs (si déployé en prod)
- Les datasets statiques (DZ, spots) sont chargés une seule fois au démarrage et mis en mémoire

---

## Déploiement

1. `git push` → Vercel détecte Next.js et déploie automatiquement
2. Variables d'environnement à configurer sur Vercel :
   - `NEXT_PUBLIC_MAPBOX_TOKEN` (gratuit, 50k loads/mois)
   - `WINDY_API_KEY` (gratuit)
   - `STORMGLASS_API_KEY` (gratuit, 50 req/jour)
3. URL publique générée automatiquement par Vercel

---

## Extensibilité — Ajouter une nouvelle source de données

L'architecture est construite autour d'un **registre de couches** (`/lib/layers-registry.ts`). Chaque couche est déclarée en un seul endroit via une interface `LayerConfig`. Le reste de l'application (LayerToggle, MapCanvas, StatusBar, polling) se branche automatiquement sur tout ce qui est dans le registre — sans modification.

### Interface `LayerConfig`

```ts
interface LayerConfig {
  id: string                // identifiant unique, ex: "surf"
  label: string             // affiché dans le LayerToggle
  color: string             // hex, couleur sémantique
  icon: string              // emoji ou nom d'icône
  apiRoute: string          // ex: "/api/surf"
  pollInterval: number      // ms, ex: 1800000 (30min)
  defaultEnabled: boolean
  getDeckLayer: (data: unknown) => DeckLayer  // fonction qui retourne la couche Deck.gl
  renderContextPanel: (point: unknown) => ReactNode  // contenu du ContextPanel au clic
}
```

### Pour ajouter une couche : 3 étapes

**1. Créer la route API** `/app/api/<nom>/route.ts`

```ts
// Copier le template /app/api/_template/route.ts
// Remplir : URL source, transformation de données, TTL cache
export async function GET() {
  return fetchWithCache('https://...', TTL_MS, transform)
}
```

**2. Déclarer la couche dans le registre** `/lib/layers-registry.ts`

```ts
{
  id: 'ma-nouvelle-couche',
  label: 'Ma Couche',
  color: '#AABBCC',
  icon: '🎯',
  apiRoute: '/api/ma-nouvelle-couche',
  pollInterval: 60_000,
  defaultEnabled: true,
  getDeckLayer: (data) => new ScatterplotLayer({ data, ... }),
  renderContextPanel: (point) => <MaCouchePanel point={point} />,
}
```

**3. (Optionnel) Créer le composant ContextPanel** `/components/panels/MaCouchePanel.tsx`

C'est tout. Le LayerToggle, le polling, le StatusBar et le MapCanvas récupèrent la nouvelle couche automatiquement.

### Template API route

`/app/api/_template/route.ts` est fourni dans le projet comme point de départ commenté, avec le pattern cache + fallback stale déjà en place.

---

## Hors scope (v1)

- Authentification / accès privé
- Historique des données (replay)
- Alertes push / notifications
- Mode mobile (le dashboard est desktop-first)
- Personnalisation des panneaux (drag & drop)

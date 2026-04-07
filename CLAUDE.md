# Prezzi Benzina

Mobile-first web app che mostra i distributori di carburante più economici in zona su mappa.

Live: https://prezzibenzina.pages.dev

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Zustand + SCSS
- **Map**: Mapbox GL JS v2.10.0 (loaded from CDN, global `window.mapboxgl`)
- **Backend**: Cloudflare Pages Function (proxy API)
- **Deploy**: Cloudflare Pages (`npx wrangler pages deploy dist --project-name prezzibenzina`)

## Struttura

```
src/
  App.tsx          # Layout: FilterBar + Map container
  Map.tsx          # Mapbox map, markers, clusters, popups, geolocation, search radius
  FilterBar.tsx    # Pills per carburante (benzina/gasolio) e distanza (3-25 km)
  store.ts         # Zustand store (fuel, distance, distributori, loading, error)
  api.ts           # fetch /api/distributori (URL relativo, proxied)
  types.ts         # Distributore, FuelType
  app.scss         # Tutti gli stili (design tokens, map, pills, popup)
  mapbox.d.ts      # Type declaration per window.mapboxgl
functions/
  api/distributori.ts  # CF Pages Function: proxy MISE API + trasformazione risposta
```

## API upstream

`POST https://carburanti.mise.gov.it/ospzApi/search/zone` (API ufficiale Osservatorio Prezzi MISE)

Body: `{"points":[{"lat","lng"}],"fuelType":"1"|"2","priceOrder":"asc","radius":N}`

Niente CORS → proxied via CF Pages Function. La function trasforma la risposta MISE nel formato `Distributore` (dedup self/servito per stazione, preferendo self).

## Logica colori marker

Basata sulla differenza dal prezzo più basso trovato:
- **Verde**: <= +5 cent
- **Arancione**: <= +15 cent
- **Rosso**: resto

I cluster ereditano `min_prezzo_valid` e `global_min` via `clusterProperties` e usano la stessa logica.

**Outlier detection**: se ci sono almeno 5 risultati e il prezzo più basso è >10% sotto il secondo, viene marcato grigio (`#9ca3af`) e escluso da min/avg/colori cluster.

## Popup

Mostra: ranking, gestore, prezzo, distanza, self/servito, confronto risparmio/costo extra su pieno da 40L (vs media e vs minimo), data aggiornamento (relativo + assoluto), link Indicazioni Google Maps.

## Comandi

```bash
npm run dev          # Dev server con proxy API
npm run build        # TypeScript check + Vite build
npx wrangler pages deploy dist --project-name prezzibenzina  # Deploy
```

## Env

- `VITE_MAPBOX_TOKEN` in `.env` (Mapbox access token, stile personale francescocioria)

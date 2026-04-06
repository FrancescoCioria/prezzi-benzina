import { useRef, useEffect, useState, useCallback } from "react";
import type { FeatureCollection, Point } from "geojson";
import type MbMap from "mapbox-gl";
import { fetchDistributori } from "./api";
import { useAppStore } from "./store";
import type { Distributore } from "./types";

const mapboxgl = window.mapboxgl;

const SOURCE_ID = "distributori";
const LAYER_ID = "distributori-circles";
const LABEL_LAYER_ID = "distributori-labels";
const CLUSTER_LAYER_ID = "distributori-clusters";
const CLUSTER_LABEL_ID = "distributori-cluster-labels";

const defaultCenter: [number, number] = [9.19, 45.4642]; // Milano

function toGeoJSON(distributori: Distributore[]): FeatureCollection {
  const minPrice = distributori.length > 0
    ? Math.min(...distributori.map((d) => d.prezzo))
    : 0;

  return {
    type: "FeatureCollection",
    features: distributori.map((d) => {
      const diff = d.prezzo - minPrice;
      const color =
        diff <= 0.05 ? "#22c55e" : diff <= 0.15 ? "#f59e0b" : "#ef4444";
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [d.longitudine, d.latitudine],
        },
        properties: {
          ranking: d.ranking,
          gestore: d.gestore,
          prezzo: d.prezzo.toFixed(3).replace(".", ","),
          prezzo_num: d.prezzo,
          color,
          self: d.self,
          distanza: d.distanza,
          data: d.data,
          latitudine: d.latitudine,
          longitudine: d.longitudine,
        },
      };
    }),
  };
}

function formatPrezzo(prezzo: string | number): string {
  return Number(prezzo).toFixed(3).replace(".", ",");
}

function formatUpdate(dateStr: string): string {
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/");
  const date = new Date(`${year}-${month}-${day}T${timePart}`);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  let relative: string;
  if (diffMin < 1) relative = "adesso";
  else if (diffMin < 60) relative = `${diffMin} min fa`;
  else if (diffH < 24) relative = `${diffH} ore fa`;
  else if (diffD === 1) relative = "ieri";
  else if (diffD < 7) relative = `${diffD} giorni fa`;
  else relative = "";

  const time = timePart.slice(0, 5);
  const absolute = `${parseInt(day)}/${month}/${year} ${time}`;

  return relative ? `${relative} (${absolute})` : absolute;
}

function buildPopupHTML(props: Record<string, any>): string {
  const mapsUrl = `https://maps.google.com/?daddr=${props.latitudine},${props.longitudine}`;
  const isSelf = props.self === "true" || props.self === true;

  return `
    <div class="popup-card">
      <div class="popup-header">
        <span class="popup-rank" style="color:${props.color}">#${props.ranking}</span>
        <span class="popup-gestore">${props.gestore}</span>
        <span class="popup-prezzo">${props.prezzo} €/L</span>
      </div>
      <div class="popup-meta">
        <span>${props.distanza} km</span>
        <span class="popup-badge">${isSelf ? "Self" : "Servito"}</span>
      </div>
      <div class="popup-updated">Aggiornato ${formatUpdate(props.data)}</div>
      <a class="popup-directions" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Indicazioni</a>
    </div>
  `;
}

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Map() {
  const mapRef = useRef<MbMap.Map | null>(null);
  const popupRef = useRef<MbMap.Popup | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSearchCenter = useRef<{ lat: number; lng: number } | null>(null);

  const [showSearchButton, setShowSearchButton] = useState(false);

  const fuel = useAppStore((s) => s.fuel);
  const distance = useAppStore((s) => s.distance);

  const fetchAndUpdate = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    coordsRef.current = { lat, lng };
    lastSearchCenter.current = { lat, lng };
    setShowSearchButton(false);

    const { setLoading, setError, setDistributori } = useAppStore.getState();
    const { fuel, distance, results } = useAppStore.getState();

    setLoading(true);
    setError(null);
    try {
      const data = await fetchDistributori(
        lat, lng, distance, fuel, results, controller.signal
      );
      if (controller.signal.aborted) return;
      setDistributori(data);
      const map = mapRef.current;
      if (map && map.getSource(SOURCE_ID)) {
        (map.getSource(SOURCE_ID) as MbMap.GeoJSONSource).setData(
          toGeoJSON(data)
        );
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Errore sconosciuto");
      setDistributori([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const handleSearchThisArea = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    fetchAndUpdate(center.lat, center.lng);
  }, [fetchAndUpdate]);

  // Re-fetch when filters change
  useEffect(() => {
    if (coordsRef.current) {
      fetchAndUpdate(coordsRef.current.lat, coordsRef.current.lng);
    }
  }, [fuel, distance]);

  // Init map
  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: "map",
      style:
        "mapbox://styles/francescocioria/cjqi3u6lmame92rmw6aw3uyhm?optimize=true",
      center: defaultCenter,
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current = map;

    const isMobile = navigator.maxTouchPoints > 0;
    if (isMobile) map.scrollZoom.disable();

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      showUserHeading: true,
      showAccuracyCircle: true,
      trackUserLocation: true,
    });

    map.addControl(geolocate, "bottom-right");
    map.addControl(
      new mapboxgl.NavigationControl({ showZoom: false }),
      "bottom-right"
    );

    // Show "search this area" on pan
    map.on("moveend", () => {
      if (!lastSearchCenter.current) return;
      const center = map.getCenter();
      const dist = haversineKm(
        lastSearchCenter.current.lat,
        lastSearchCenter.current.lng,
        center.lat,
        center.lng
      );
      const { distance } = useAppStore.getState();
      if (dist > distance / 3) {
        setShowSearchButton(true);
      }
    });

    map.on("load", () => {
      geolocate.trigger();

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toGeoJSON([]),
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 15,
        clusterProperties: {
          min_prezzo: [["min", ["accumulated"], ["get", "min_prezzo"]], ["get", "prezzo_num"]],
        },
      });

      // Cluster circles
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 22,
          "circle-color": "#22c55e",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      // Cluster price + count label
      map.addLayer({
        id: CLUSTER_LABEL_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": [
            "format",
            ["number-format", ["get", "min_prezzo"], { "min-fraction-digits": 3, "max-fraction-digits": 3, "locale": "it" }],
            { "font-scale": 1.0 },
            "\n",
            {},
            ["concat", "×", ["get", "point_count"]],
            { "font-scale": 0.7 },
          ],
          "text-size": 12,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-line-height": 1.2,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual station circles
      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 18,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      // Price labels on individual markers
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "prezzo"],
          "text-size": 11,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Click cluster → zoom in
      map.on("click", CLUSTER_LAYER_ID, (e: any) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [CLUSTER_LAYER_ID],
        });
        if (!features[0]) return;
        const clusterId = features[0].properties!.cluster_id;
        (map.getSource(SOURCE_ID) as any).getClusterExpansionZoom(
          clusterId,
          (err: any, zoom: number) => {
            if (err) return;
            map.easeTo({
              center: (features[0].geometry as Point).coordinates as [number, number],
              zoom,
            });
          }
        );
      });

      // Click individual marker → popup
      map.on("click", LAYER_ID, (e: any) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const coords = (e.features[0].geometry as Point)
          .coordinates as [number, number];

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          offset: 20,
          maxWidth: "300px",
          closeButton: false,
        })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(props))
          .addTo(map);
      });

      map.on("mouseenter", LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    });

    geolocate.on("geolocate", (e: any) => {
      fetchAndUpdate(e.coords.latitude, e.coords.longitude);
    });

    geolocate.on("error", () => {
      fetchAndUpdate(defaultCenter[1], defaultCenter[0]);
    });

    return () => {
      abortRef.current?.abort();
      popupRef.current?.remove();
      map.remove();
    };
  }, []);

  return showSearchButton ? (
    <button className="search-this-area" onClick={handleSearchThisArea}>
      Cerca in questa zona
    </button>
  ) : null;
}

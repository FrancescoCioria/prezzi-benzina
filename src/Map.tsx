import { useRef, useEffect } from "react";
import type { FeatureCollection, Point } from "geojson";
import type MbMap from "mapbox-gl";
import { fetchDistributori } from "./api";
import { useAppStore } from "./store";
import type { Distributore } from "./types";

const mapboxgl = window.mapboxgl;

const SOURCE_ID = "distributori";
const LAYER_ID = "distributori-circles";
const LABEL_LAYER_ID = "distributori-labels";

const defaultCenter: [number, number] = [9.19, 45.4642]; // Milano

function toGeoJSON(distributori: Distributore[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: distributori.map((d) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [d.longitudine, d.latitudine],
      },
      properties: {
        ranking: d.ranking,
        gestore: d.gestore,
        prezzo: d.prezzo.toFixed(3),
        self: d.self,
        indirizzo: d.indirizzo,
        distanza: d.distanza,
        data: d.data,
      },
    })),
  };
}

export default function Map() {
  const mapRef = useRef<MbMap.Map | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fuel = useAppStore((s) => s.fuel);
  const distance = useAppStore((s) => s.distance);

  const fetchAndUpdate = async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    coordsRef.current = { lat, lng };
    const { setLoading, setError, setDistributori } =
      useAppStore.getState();
    const { fuel, distance, results } = useAppStore.getState();

    setLoading(true);
    setError(null);
    try {
      const data = await fetchDistributori(
        lat,
        lng,
        distance,
        fuel,
        results,
        controller.signal
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
  };

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

    map.on("load", () => {
      geolocate.trigger();

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toGeoJSON([]),
      });

      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 18,
          "circle-color": [
            "case",
            ["<=", ["get", "ranking"], 3],
            "#22c55e",
            ["<=", ["get", "ranking"], 10],
            "#f59e0b",
            "#ef4444",
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
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

      map.on("click", LAYER_ID, (e: any) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const coords = (e.features[0].geometry as Point).coordinates;

        useAppStore.getState().setSelectedDistributore({
          ranking: props.ranking,
          gestore: props.gestore,
          prezzo: parseFloat(props.prezzo),
          self: props.self === true || props.self === "true",
          indirizzo: props.indirizzo,
          distanza: props.distanza,
          data: props.data,
          latitudine: coords[1],
          longitudine: coords[0],
        });
      });

      map.on("mouseenter", LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_ID, () => {
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
      map.remove();
    };
  }, []);

  return null;
}

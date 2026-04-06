import mapboxgl from "mapbox-gl";

declare global {
  interface Window {
    mapboxgl: typeof mapboxgl;
  }
}

import type { Distributore, FuelType } from "./types";

export async function fetchDistributori(
  latitude: number,
  longitude: number,
  distance: number,
  fuel: FuelType,
  results: number,
  signal?: AbortSignal
): Promise<Distributore[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    distance: String(distance),
    fuel,
    results: String(results),
  });

  const res = await fetch(`/api/distributori?${params}`, {
    signal,
  });

  if (!res.ok) {
    throw new Error(`Errore API: ${res.status}`);
  }

  return res.json();
}

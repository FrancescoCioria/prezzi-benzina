const MISE_API = "https://carburanti.mise.gov.it/ospzApi/search/zone";

const FUEL_MAP: Record<string, string> = {
  benzina: "1",
  gasolio: "2",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface MISEFuel {
  price: number;
  name: string;
  fuelId: number;
  isSelf: boolean;
}

interface MISEResult {
  name: string;
  brand: string;
  fuels: MISEFuel[];
  location: { lat: number; lng: number };
  insertDate: string;
  distance: string;
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const lat = parseFloat(params.get("latitude") || "");
  const lng = parseFloat(params.get("longitude") || "");
  const dist = parseInt(params.get("distance") || "");
  const fuel = params.get("fuel") || "benzina";

  if (isNaN(lat) || isNaN(lng) || isNaN(dist)) {
    return new Response(
      JSON.stringify({ error: "Parametri mancanti o non validi" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const fuelId = Number(FUEL_MAP[fuel] || "1");

  try {
    const res = await fetch(MISE_API, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://carburanti.mise.gov.it",
        "Referer": "https://carburanti.mise.gov.it/ospzSearch/zona",
      },
      body: JSON.stringify({
        points: [{ lat, lng }],
        fuelType: FUEL_MAP[fuel] || "1",
        priceOrder: "asc",
        radius: dist,
      }),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error: ${res.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const json = await res.json() as { success: boolean; results: MISEResult[] };

    if (!json.success) {
      return new Response(
        JSON.stringify({ error: "API MISE ha risposto con errore" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // One entry per station: prefer self, fallback to servito
    const distributori: any[] = [];

    for (const r of json.results) {
      const matchingFuels = r.fuels.filter((f) => f.fuelId === fuelId);
      if (matchingFuels.length === 0) continue;

      // Pick self if available, otherwise servito
      const best = matchingFuels.find((f) => f.isSelf) || matchingFuels[0];

      distributori.push({
        ranking: 0,
        gestore: r.brand || r.name,
        indirizzo: "",
        prezzo: best.price,
        self: best.isSelf,
        data: formatDate(r.insertDate),
        distanza: parseFloat(r.distance).toFixed(1),
        latitudine: r.location.lat,
        longitudine: r.location.lng,
      });
    }

    // Sort by price asc, assign ranking
    distributori.sort((a, b) => a.prezzo - b.prezzo);
    distributori.forEach((d, i) => (d.ranking = i + 1));

    return new Response(JSON.stringify(distributori), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Servizio temporaneamente non disponibile" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};

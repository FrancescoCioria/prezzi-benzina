const UPSTREAM = "https://prezzi-carburante.onrender.com";

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  // Validate required params
  const lat = parseFloat(params.get("latitude") || "");
  const lng = parseFloat(params.get("longitude") || "");
  const dist = parseInt(params.get("distance") || "");
  const fuel = params.get("fuel");

  if (isNaN(lat) || isNaN(lng) || isNaN(dist) || !fuel) {
    return new Response(
      JSON.stringify({ error: "Parametri mancanti o non validi" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const allowed = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    distance: String(dist),
    fuel,
  });
  const results = params.get("results");
  if (results) allowed.set("results", results);

  try {
    const res = await fetch(
      `${UPSTREAM}/api/distributori?${allowed}`
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error: ${res.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.text();

    return new Response(data, {
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

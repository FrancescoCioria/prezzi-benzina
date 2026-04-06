import { useAppStore } from "./store";
import type { Distributore } from "./types";

function formatDate(dateStr: string): string {
  // "04/04/2026 23:58:22" → "4 apr, 23:58"
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month] = datePart.split("/");
  const months = [
    "gen",
    "feb",
    "mar",
    "apr",
    "mag",
    "giu",
    "lug",
    "ago",
    "set",
    "ott",
    "nov",
    "dic",
  ];
  const time = timePart.slice(0, 5);
  return `${parseInt(day)} ${months[parseInt(month) - 1]}, ${time}`;
}

function StationCard({
  d,
  isSelected,
  onClick,
}: {
  d: Distributore;
  isSelected: boolean;
  onClick: () => void;
}) {
  const mapsUrl = `https://maps.google.com/?daddr=${d.latitudine},${d.longitudine}`;

  return (
    <div className={`station-card ${isSelected ? "selected" : ""}`} onClick={onClick}>
      <div className="station-header">
        <span className={`ranking rank-${d.ranking <= 3 ? "top" : d.ranking <= 10 ? "mid" : "low"}`}>
          #{d.ranking}
        </span>
        <span className="gestore">{d.gestore}</span>
        <span className="prezzo">
          {d.prezzo.toFixed(3)} €/L
        </span>
      </div>
      <div className="station-details">
        <span className="indirizzo">{d.indirizzo}</span>
        <div className="station-meta">
          <span className="distanza">{d.distanza} km</span>
          <span className="self-service">{d.self ? "Self" : "Servito"}</span>
          <span className="data">{formatDate(d.data)}</span>
        </div>
      </div>
      <a
        className="directions-btn"
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        Indicazioni
      </a>
    </div>
  );
}

export default function StationList() {
  const distributori = useAppStore((s) => s.distributori);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const selectedDistributore = useAppStore((s) => s.selectedDistributore);
  const setSelectedDistributore = useAppStore(
    (s) => s.setSelectedDistributore
  );

  return (
    <div className={`station-list ${distributori.length > 0 || loading || error ? "visible" : ""}`}>
      <div className="list-handle" />
      {loading && <div className="list-status">Ricerca in corso...</div>}
      {error && <div className="list-status error">{error}</div>}
      {!loading && !error && distributori.length === 0 && (
        <div className="list-status">Nessun distributore trovato</div>
      )}
      {distributori.map((d) => (
        <StationCard
          key={`${d.latitudine}-${d.longitudine}-${d.prezzo}`}
          d={d}
          isSelected={
            selectedDistributore?.latitudine === d.latitudine &&
            selectedDistributore?.longitudine === d.longitudine
          }
          onClick={() => setSelectedDistributore(d)}
        />
      ))}
    </div>
  );
}

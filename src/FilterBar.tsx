import { useAppStore } from "./store";
import type { FuelType } from "./types";

const fuelOptions: { value: FuelType; label: string }[] = [
  { value: "benzina", label: "Benzina" },
  { value: "gasolio", label: "Gasolio" },
];

const distanceOptions = [3, 5, 10, 15, 25];

export default function FilterBar() {
  const fuel = useAppStore((s) => s.fuel);
  const setFuel = useAppStore((s) => s.setFuel);
  const distance = useAppStore((s) => s.distance);
  const setDistance = useAppStore((s) => s.setDistance);

  return (
    <div className="filter-bar">
      <div className="fuel-pills">
        {fuelOptions.map((opt) => (
          <button
            key={opt.value}
            className={`pill ${fuel === opt.value ? "active" : ""}`}
            onClick={() => setFuel(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="distance-pills">
        {distanceOptions.map((d) => (
          <button
            key={d}
            className={`pill pill-distance ${distance === d ? "active" : ""}`}
            onClick={() => setDistance(d)}
          >
            {d} km
          </button>
        ))}
      </div>
    </div>
  );
}

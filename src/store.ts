import { create } from "zustand";
import type { Distributore, FuelType } from "./types";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

interface AppState {
  fuel: FuelType;
  setFuel: (fuel: FuelType) => void;
  distance: number;
  setDistance: (distance: number) => void;
  results: number;
  distributori: Distributore[];
  setDistributori: (distributori: Distributore[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  fuel: (safeGet("fuel") as FuelType) || "benzina",
  setFuel: (fuel) => {
    safeSet("fuel", fuel);
    set({ fuel });
  },
  distance: Number(safeGet("distance")) || 5,
  setDistance: (distance) => {
    safeSet("distance", String(distance));
    set({ distance });
  },
  results: 20,
  distributori: [],
  setDistributori: (distributori) => set({ distributori }),
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
}));

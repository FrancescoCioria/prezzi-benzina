export type FuelType = "benzina" | "gasolio";

export interface Distributore {
  ranking: number;
  gestore: string;
  indirizzo: string;
  prezzo: number;
  self: boolean;
  data: string;
  distanza: string;
  latitudine: number;
  longitudine: number;
}

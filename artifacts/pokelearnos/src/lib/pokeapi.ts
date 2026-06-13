import { useQuery } from "@tanstack/react-query";
import { ARTWORK, SPRITE } from "./sprites";

const offlineError = () => new Error("PokéAPI network access is disabled at runtime.");

export const fetchJson = async (url: string) => {
  throw offlineError();
};

export const usePokemonList = (limit = 151, offset = 0) => {
  return useQuery({
    queryKey: ["pokemonList", limit, offset],
    queryFn: () => fetchJson("pokemon-list"),
    enabled: false,
  });
};

export const usePokemonDetail = (idOrName: string | number) => {
  return useQuery({
    queryKey: ["pokemon", idOrName],
    queryFn: () => fetchJson("pokemon-detail"),
    enabled: false,
  });
};

export const usePokemonSpecies = (idOrName: string | number) => {
  return useQuery({
    queryKey: ["pokemonSpecies", idOrName],
    queryFn: () => fetchJson("pokemon-species"),
    enabled: false,
  });
};

export const useRegions = () => {
  return useQuery({
    queryKey: ["regions"],
    queryFn: () => fetchJson("regions"),
    enabled: false,
  });
};

export const useRegionDetail = (idOrName: string | number) => {
  return useQuery({
    queryKey: ["region", idOrName],
    queryFn: () => fetchJson("region-detail"),
    enabled: false,
  });
};

export const getSpriteUrl = (id: number) => 
  SPRITE(id);

export const getOfficialArtworkUrl = (id: number) =>
  ARTWORK(id);

export const getShinyArtworkUrl = (id: number) =>
  ARTWORK(id);

export const getBackSpriteUrl = (id: number) =>
  SPRITE(id);

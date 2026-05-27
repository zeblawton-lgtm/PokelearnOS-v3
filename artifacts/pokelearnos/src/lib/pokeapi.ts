import { useQuery } from "@tanstack/react-query";

const BASE_URL = "https://pokeapi.co/api/v2";

export const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

export const usePokemonList = (limit = 151, offset = 0) => {
  return useQuery({
    queryKey: ["pokemonList", limit, offset],
    queryFn: () => fetchJson(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`),
  });
};

export const usePokemonDetail = (idOrName: string | number) => {
  return useQuery({
    queryKey: ["pokemon", idOrName],
    queryFn: () => fetchJson(`${BASE_URL}/pokemon/${idOrName}`),
    enabled: !!idOrName,
  });
};

export const usePokemonSpecies = (idOrName: string | number) => {
  return useQuery({
    queryKey: ["pokemonSpecies", idOrName],
    queryFn: () => fetchJson(`${BASE_URL}/pokemon-species/${idOrName}`),
    enabled: !!idOrName,
  });
};

export const useRegions = () => {
  return useQuery({
    queryKey: ["regions"],
    queryFn: () => fetchJson(`${BASE_URL}/region/`),
  });
};

export const useRegionDetail = (idOrName: string | number) => {
  return useQuery({
    queryKey: ["region", idOrName],
    queryFn: () => fetchJson(`${BASE_URL}/region/${idOrName}`),
    enabled: !!idOrName,
  });
};

export const getSpriteUrl = (id: number) => 
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

export const getOfficialArtworkUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export const getShinyArtworkUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`;

export const getBackSpriteUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`;

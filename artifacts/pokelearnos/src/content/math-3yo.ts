export interface Math3YoQuestion {
  id: string;
  type: "count" | "add" | "subtract";
  pokemonId: number;
  pokemonName: string;
  count?: number;
  a?: number;
  b?: number;
  answer: number;
  choices: number[];
}

const POKEMON = [
  { id: 25, name: "Pikachu" },
  { id: 39, name: "Jigglypuff" },
  { id: 133, name: "Eevee" },
  { id: 175, name: "Togepi" },
  { id: 54, name: "Psyduck" },
  { id: 7, name: "Squirtle" },
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
];

const p = (idx: number) => POKEMON[idx % POKEMON.length];

export const math3YoQuestions: Math3YoQuestion[] = [
  { id: "c01", type: "count", pokemonId: p(0).id, pokemonName: p(0).name, count: 1, answer: 1, choices: [1, 2, 3] },
  { id: "c02", type: "count", pokemonId: p(1).id, pokemonName: p(1).name, count: 2, answer: 2, choices: [1, 2, 3] },
  { id: "c03", type: "count", pokemonId: p(2).id, pokemonName: p(2).name, count: 3, answer: 3, choices: [2, 3, 4] },
  { id: "c04", type: "count", pokemonId: p(3).id, pokemonName: p(3).name, count: 4, answer: 4, choices: [3, 4, 5] },
  { id: "c05", type: "count", pokemonId: p(0).id, pokemonName: p(0).name, count: 5, answer: 5, choices: [3, 4, 5] },
  { id: "c06", type: "count", pokemonId: p(4).id, pokemonName: p(4).name, count: 2, answer: 2, choices: [1, 2, 3] },
  { id: "c07", type: "count", pokemonId: p(5).id, pokemonName: p(5).name, count: 3, answer: 3, choices: [2, 3, 4] },
  { id: "c08", type: "count", pokemonId: p(6).id, pokemonName: p(6).name, count: 4, answer: 4, choices: [3, 4, 5] },
  { id: "a01", type: "add", pokemonId: p(0).id, pokemonName: p(0).name, a: 1, b: 1, answer: 2, choices: [1, 2, 3] },
  { id: "a02", type: "add", pokemonId: p(1).id, pokemonName: p(1).name, a: 1, b: 2, answer: 3, choices: [2, 3, 4] },
  { id: "a03", type: "add", pokemonId: p(2).id, pokemonName: p(2).name, a: 2, b: 2, answer: 4, choices: [3, 4, 5] },
  { id: "a04", type: "add", pokemonId: p(3).id, pokemonName: p(3).name, a: 2, b: 3, answer: 5, choices: [4, 5, 6] },
  { id: "a05", type: "add", pokemonId: p(4).id, pokemonName: p(4).name, a: 1, b: 3, answer: 4, choices: [3, 4, 5] },
  { id: "a06", type: "add", pokemonId: p(5).id, pokemonName: p(5).name, a: 3, b: 2, answer: 5, choices: [4, 5, 6] },
  { id: "s01", type: "subtract", pokemonId: p(0).id, pokemonName: p(0).name, a: 3, b: 1, answer: 2, choices: [1, 2, 3] },
  { id: "s02", type: "subtract", pokemonId: p(1).id, pokemonName: p(1).name, a: 4, b: 2, answer: 2, choices: [1, 2, 3] },
  { id: "s03", type: "subtract", pokemonId: p(2).id, pokemonName: p(2).name, a: 5, b: 2, answer: 3, choices: [2, 3, 4] },
  { id: "s04", type: "subtract", pokemonId: p(3).id, pokemonName: p(3).name, a: 5, b: 3, answer: 2, choices: [1, 2, 3] },
  { id: "s05", type: "subtract", pokemonId: p(7).id, pokemonName: p(7).name, a: 4, b: 1, answer: 3, choices: [2, 3, 4] },
];

export function getQuestionPrompt(q: Math3YoQuestion): string {
  if (q.type === "count") return `How many ${q.pokemonName}?`;
  if (q.type === "add") return `${q.a} + ${q.b} = ?`;
  return `${q.a} - ${q.b} = ?`;
}

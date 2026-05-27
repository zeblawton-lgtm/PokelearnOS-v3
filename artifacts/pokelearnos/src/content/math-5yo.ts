export interface Math5YoQuestion {
  id: string;
  type: "add" | "subtract" | "multiply" | "word";
  pokemonId: number;
  pokemonName: string;
  a?: number;
  b?: number;
  wordProblem?: string;
  answer: number;
  choices: number[];
}

const POKEMON = [
  { id: 25, name: "Pikachu" },
  { id: 133, name: "Eevee" },
  { id: 39, name: "Jigglypuff" },
  { id: 143, name: "Snorlax" },
  { id: 7, name: "Squirtle" },
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 52, name: "Meowth" },
];

const p = (idx: number) => POKEMON[idx % POKEMON.length];

export const math5YoQuestions: Math5YoQuestion[] = [
  { id: "a01", type: "add", pokemonId: p(0).id, pokemonName: p(0).name, a: 3, b: 4, answer: 7, choices: [6, 7, 8] },
  { id: "a02", type: "add", pokemonId: p(1).id, pokemonName: p(1).name, a: 5, b: 6, answer: 11, choices: [10, 11, 12] },
  { id: "a03", type: "add", pokemonId: p(2).id, pokemonName: p(2).name, a: 7, b: 8, answer: 15, choices: [14, 15, 16] },
  { id: "a04", type: "add", pokemonId: p(3).id, pokemonName: p(3).name, a: 9, b: 5, answer: 14, choices: [13, 14, 15] },
  { id: "a05", type: "add", pokemonId: p(4).id, pokemonName: p(4).name, a: 6, b: 7, answer: 13, choices: [12, 13, 14] },
  { id: "a06", type: "add", pokemonId: p(5).id, pokemonName: p(5).name, a: 8, b: 9, answer: 17, choices: [16, 17, 18] },
  { id: "s01", type: "subtract", pokemonId: p(6).id, pokemonName: p(6).name, a: 10, b: 4, answer: 6, choices: [5, 6, 7] },
  { id: "s02", type: "subtract", pokemonId: p(7).id, pokemonName: p(7).name, a: 15, b: 7, answer: 8, choices: [7, 8, 9] },
  { id: "s03", type: "subtract", pokemonId: p(0).id, pokemonName: p(0).name, a: 12, b: 5, answer: 7, choices: [6, 7, 8] },
  { id: "s04", type: "subtract", pokemonId: p(1).id, pokemonName: p(1).name, a: 20, b: 8, answer: 12, choices: [11, 12, 13] },
  { id: "s05", type: "subtract", pokemonId: p(2).id, pokemonName: p(2).name, a: 18, b: 9, answer: 9, choices: [8, 9, 10] },
  { id: "m01", type: "multiply", pokemonId: p(3).id, pokemonName: p(3).name, a: 2, b: 3, answer: 6, choices: [5, 6, 7] },
  { id: "m02", type: "multiply", pokemonId: p(4).id, pokemonName: p(4).name, a: 3, b: 3, answer: 9, choices: [8, 9, 10] },
  { id: "m03", type: "multiply", pokemonId: p(5).id, pokemonName: p(5).name, a: 2, b: 5, answer: 10, choices: [9, 10, 11] },
  { id: "m04", type: "multiply", pokemonId: p(6).id, pokemonName: p(6).name, a: 4, b: 2, answer: 8, choices: [7, 8, 9] },
  { id: "w01", type: "word", pokemonId: p(0).id, pokemonName: "Pikachu", wordProblem: "Pikachu has 6 berries. He eats 2. How many are left?", answer: 4, choices: [3, 4, 5] },
  { id: "w02", type: "word", pokemonId: p(1).id, pokemonName: "Eevee", wordProblem: "Eevee caught 5 fish in the morning and 7 in the afternoon. How many total?", answer: 12, choices: [11, 12, 13] },
  { id: "w03", type: "word", pokemonId: p(3).id, pokemonName: "Snorlax", wordProblem: "Snorlax is sleeping in 3 fields. Each field has 4 flowers. How many flowers?", answer: 12, choices: [11, 12, 13] },
  { id: "w04", type: "word", pokemonId: p(7).id, pokemonName: "Meowth", wordProblem: "Meowth has 9 coins. She gives 4 to a friend. How many does she have now?", answer: 5, choices: [4, 5, 6] },
];

export function getQuestionPrompt(q: Math5YoQuestion): string {
  if (q.type === "word") return q.wordProblem!;
  if (q.type === "add") return `${q.a} + ${q.b} = ?`;
  if (q.type === "subtract") return `${q.a} − ${q.b} = ?`;
  return `${q.a} × ${q.b} = ?`;
}

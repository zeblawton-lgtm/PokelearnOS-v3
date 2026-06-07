// Offline Pokédex dataset. Every id here has a bundled sprite under
// public/sprites/official-artwork/ so the Pokédex works with no internet.
export interface PokedexEntry {
  id: number;
  name: string;
  types: string[];
  fact: string;
}

export const pokedex: PokedexEntry[] = [
  { id: 1, name: "Bulbasaur", types: ["Grass", "Poison"], fact: "It has a seed on its back that grows into a big plant." },
  { id: 4, name: "Charmander", types: ["Fire"], fact: "The flame on its tail shows how it feels." },
  { id: 6, name: "Charizard", types: ["Fire", "Flying"], fact: "It can fly high up into the sky and breathe hot fire." },
  { id: 7, name: "Squirtle", types: ["Water"], fact: "It hides inside its shell to stay safe." },
  { id: 9, name: "Blastoise", types: ["Water"], fact: "It shoots water from the cannons on its shell." },
  { id: 25, name: "Pikachu", types: ["Electric"], fact: "Its cheeks make electricity. Zap!" },
  { id: 26, name: "Raichu", types: ["Electric"], fact: "It is Pikachu all grown up and very strong." },
  { id: 39, name: "Jigglypuff", types: ["Normal", "Fairy"], fact: "It sings a soft song that makes everyone sleepy." },
  { id: 52, name: "Meowth", types: ["Normal"], fact: "It loves shiny round coins." },
  { id: 54, name: "Psyduck", types: ["Water"], fact: "It always has a headache and looks confused." },
  { id: 87, name: "Dewgong", types: ["Water", "Ice"], fact: "It swims happily in cold, icy water." },
  { id: 94, name: "Gengar", types: ["Ghost", "Poison"], fact: "A playful ghost that likes to hide in shadows." },
  { id: 129, name: "Magikarp", types: ["Water"], fact: "It only splashes around, but it becomes mighty later!" },
  { id: 130, name: "Gyarados", types: ["Water", "Flying"], fact: "A huge, powerful sea serpent." },
  { id: 131, name: "Lapras", types: ["Water", "Ice"], fact: "It is gentle and gives friends a ride across the water." },
  { id: 133, name: "Eevee", types: ["Normal"], fact: "It can grow up in many different ways." },
  { id: 143, name: "Snorlax", types: ["Normal"], fact: "It loves to eat and then take a big nap." },
  { id: 147, name: "Dratini", types: ["Dragon"], fact: "A rare baby dragon that lives in the water." },
  { id: 149, name: "Dragonite", types: ["Dragon", "Flying"], fact: "A kind dragon that can fly around the whole world." },
  { id: 150, name: "Mewtwo", types: ["Psychic"], fact: "A very powerful Pokémon with a strong mind." },
  { id: 151, name: "Mew", types: ["Psychic"], fact: "A tiny, rare Pokémon that knows many moves." },
  { id: 175, name: "Togepi", types: ["Fairy"], fact: "A baby Pokémon inside a spotty shell. It brings luck!" },
  { id: 196, name: "Espeon", types: ["Psychic"], fact: "A sun Pokémon that can sense how you feel." },
  { id: 197, name: "Umbreon", types: ["Dark"], fact: "A moon Pokémon whose rings glow in the dark." },
];

export const TYPE_COLORS: Record<string, string> = {
  Grass: "bg-green-500", Poison: "bg-purple-500", Fire: "bg-orange-500",
  Water: "bg-blue-500", Electric: "bg-yellow-400", Normal: "bg-gray-400",
  Fairy: "bg-pink-400", Ghost: "bg-indigo-500", Ice: "bg-cyan-400",
  Flying: "bg-sky-400", Dragon: "bg-indigo-600", Psychic: "bg-fuchsia-500",
  Dark: "bg-gray-700",
};

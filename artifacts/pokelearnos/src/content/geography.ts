export interface GeographyQuestion {
  id: string;
  type: "continent" | "ocean" | "concept" | "feature";
  question: string;
  answer: string;
  choices: string[];
  hint?: string;
  pokemonId?: number;
  pokemonName?: string;
  imageDescription?: string;
}

export const geographyQuestions: GeographyQuestion[] = [
  {
    id: "con01", type: "continent",
    question: "On which continent do you find the Sahara Desert and lions?",
    answer: "Africa",
    choices: ["Asia", "Africa", "Europe"],
    hint: "It is the second largest continent",
  },
  {
    id: "con02", type: "continent",
    question: "Which continent is the LARGEST in the world?",
    answer: "Asia",
    choices: ["Asia", "Africa", "North America"],
    hint: "China and India are here",
  },
  {
    id: "con03", type: "continent",
    question: "Which continent is covered in ice and snow, and penguins live there?",
    answer: "Antarctica",
    choices: ["Antarctica", "Australia", "Europe"],
    hint: "It is the coldest place on Earth",
  },
  {
    id: "con04", type: "continent",
    question: "Which continent has the Amazon rainforest and jaguars?",
    answer: "South America",
    choices: ["North America", "South America", "Africa"],
    hint: "Brazil is here",
  },
  {
    id: "con05", type: "continent",
    question: "Which continent has kangaroos and the Great Barrier Reef?",
    answer: "Australia",
    choices: ["Australia", "Asia", "Africa"],
    hint: "It is also an island!",
  },
  {
    id: "con06", type: "continent",
    question: "Which continent do YOU live on? (USA is part of this continent)",
    answer: "North America",
    choices: ["South America", "North America", "Europe"],
    hint: "Canada, USA, and Mexico are here",
  },
  {
    id: "oc01", type: "ocean",
    question: "What is the LARGEST ocean in the world?",
    answer: "Pacific Ocean",
    choices: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean"],
    hint: "It covers more than half of Earth's water",
  },
  {
    id: "oc02", type: "ocean",
    question: "Which ocean is between North America and Europe?",
    answer: "Atlantic Ocean",
    choices: ["Atlantic Ocean", "Pacific Ocean", "Arctic Ocean"],
    hint: "Ships cross this ocean to reach Europe",
  },
  {
    id: "oc03", type: "ocean",
    question: "Which ocean is at the very top of the Earth, near the North Pole?",
    answer: "Arctic Ocean",
    choices: ["Arctic Ocean", "Indian Ocean", "Atlantic Ocean"],
    hint: "It is mostly frozen ice",
  },
  {
    id: "ft01", type: "feature",
    question: "What do we call a very tall rocky landform that touches the clouds?",
    answer: "Mountain",
    choices: ["Mountain", "Island", "Ocean"],
    hint: "Everest is the tallest one",
  },
  {
    id: "ft02", type: "feature",
    question: "What is a piece of land surrounded by water on all sides?",
    answer: "Island",
    choices: ["Peninsula", "Island", "Mountain"],
    hint: "Hawaii is one!",
  },
  {
    id: "ft03", type: "feature",
    question: "What do we call a very large, dry area with lots of sand and very little rain?",
    answer: "Desert",
    choices: ["Forest", "Desert", "Ocean"],
    hint: "The Sahara is the biggest one",
  },
  {
    id: "ft04", type: "feature",
    question: "What do we call an area full of tall trees and lots of animals?",
    answer: "Forest",
    choices: ["Desert", "Ocean", "Forest"],
    hint: "The Amazon is a famous one",
  },
  {
    id: "dir01", type: "concept",
    question: "When you face the sunrise, which direction are you looking?",
    answer: "East",
    choices: ["West", "East", "North"],
    hint: "The sun rises in the morning here",
  },
  {
    id: "dir02", type: "concept",
    question: "Which direction does the sun go DOWN (set)?",
    answer: "West",
    choices: ["East", "South", "West"],
    hint: "The sun sets in the evening here",
  },
  {
    id: "dir03", type: "concept",
    question: "Where is the NORTH POLE — at the top or bottom of the Earth?",
    answer: "Top",
    choices: ["Top", "Bottom", "Middle"],
    hint: "Santa Claus lives near here!",
  },
  {
    id: "hot01", type: "concept",
    question: "Which place is HOT all year round?",
    answer: "Near the Equator",
    choices: ["Near the North Pole", "Near the Equator", "On a Mountain Top"],
    hint: "Countries like Brazil and Kenya are here",
  },
  {
    id: "hot02", type: "concept",
    question: "Which place is COLD all year round?",
    answer: "Near the North Pole",
    choices: ["Near the Equator", "Near the North Pole", "In a Desert"],
    hint: "Polar bears live here",
    pokemonId: 87, pokemonName: "Dewgong",
  },
];

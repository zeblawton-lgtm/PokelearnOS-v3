export interface SpanishQuestion {
  id: string;
  type: "color" | "number" | "greeting" | "phrase";
  question: string;
  spanishWord?: string;
  pokemonId?: number;
  pokemonName?: string;
  answer: string;
  choices: string[];
  hint?: string;
}

export const spanishQuestions: SpanishQuestion[] = [
  {
    id: "col01", type: "color",
    question: "Which Pokemon is ROJO (red)?",
    spanishWord: "rojo",
    pokemonId: 4, pokemonName: "Charmander",
    answer: "Charmander",
    choices: ["Squirtle", "Charmander", "Bulbasaur"],
    hint: "Rojo means RED",
  },
  {
    id: "col02", type: "color",
    question: "Which Pokemon is AZUL (blue)?",
    spanishWord: "azul",
    pokemonId: 7, pokemonName: "Squirtle",
    answer: "Squirtle",
    choices: ["Squirtle", "Pikachu", "Eevee"],
    hint: "Azul means BLUE",
  },
  {
    id: "col03", type: "color",
    question: "Which Pokemon is AMARILLO (yellow)?",
    spanishWord: "amarillo",
    pokemonId: 25, pokemonName: "Pikachu",
    answer: "Pikachu",
    choices: ["Charmander", "Pikachu", "Bulbasaur"],
    hint: "Amarillo means YELLOW",
  },
  {
    id: "col04", type: "color",
    question: "Which Pokemon is VERDE (green)?",
    spanishWord: "verde",
    pokemonId: 1, pokemonName: "Bulbasaur",
    answer: "Bulbasaur",
    choices: ["Bulbasaur", "Pikachu", "Meowth"],
    hint: "Verde means GREEN",
  },
  {
    id: "col05", type: "color",
    question: "Which Pokemon is ROSA (pink)?",
    spanishWord: "rosa",
    pokemonId: 39, pokemonName: "Jigglypuff",
    answer: "Jigglypuff",
    choices: ["Jigglypuff", "Squirtle", "Charmander"],
    hint: "Rosa means PINK",
  },
  {
    id: "num01", type: "number",
    question: "What is UNO?",
    spanishWord: "uno",
    answer: "1",
    choices: ["1", "2", "3"],
    hint: "Uno = 1",
  },
  {
    id: "num02", type: "number",
    question: "What is DOS?",
    spanishWord: "dos",
    answer: "2",
    choices: ["1", "2", "3"],
    hint: "Dos = 2",
  },
  {
    id: "num03", type: "number",
    question: "What is TRES?",
    spanishWord: "tres",
    answer: "3",
    choices: ["2", "3", "4"],
    hint: "Tres = 3",
  },
  {
    id: "num04", type: "number",
    question: "What is CUATRO?",
    spanishWord: "cuatro",
    answer: "4",
    choices: ["3", "4", "5"],
    hint: "Cuatro = 4",
  },
  {
    id: "num05", type: "number",
    question: "What is CINCO?",
    spanishWord: "cinco",
    answer: "5",
    choices: ["4", "5", "6"],
    hint: "Cinco = 5",
  },
  {
    id: "num06", type: "number",
    question: "¿Cuántos Pikachu? How many Pikachu?",
    spanishWord: "cuántos",
    pokemonId: 25, pokemonName: "Pikachu",
    answer: "tres",
    choices: ["uno", "dos", "tres"],
    hint: "Count the Pikachu!",
  },
  {
    id: "gr01", type: "greeting",
    question: "How do you say HELLO in Spanish?",
    answer: "Hola",
    choices: ["Adios", "Hola", "Gracias"],
    hint: "It starts with H",
  },
  {
    id: "gr02", type: "greeting",
    question: "How do you say GOODBYE in Spanish?",
    answer: "Adios",
    choices: ["Hola", "Adios", "Por favor"],
    hint: "It starts with A",
  },
  {
    id: "gr03", type: "greeting",
    question: "How do you say THANK YOU in Spanish?",
    answer: "Gracias",
    choices: ["Gracias", "Hola", "Si"],
    hint: "It starts with G",
  },
  {
    id: "gr04", type: "greeting",
    question: "How do you say PLEASE in Spanish?",
    answer: "Por favor",
    choices: ["Gracias", "Hola", "Por favor"],
    hint: "It means 'for favor'",
  },
  {
    id: "ph01", type: "phrase",
    question: "What does BUENOS DIAS mean?",
    spanishWord: "buenos dias",
    answer: "Good morning",
    choices: ["Good night", "Good morning", "Good afternoon"],
    hint: "Dias = days",
  },
  {
    id: "ph02", type: "phrase",
    question: "What does ME LLAMO mean?",
    spanishWord: "me llamo",
    answer: "My name is",
    choices: ["I am happy", "My name is", "I like it"],
    hint: "You say this to introduce yourself",
  },
];

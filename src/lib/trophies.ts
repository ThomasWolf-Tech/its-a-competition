export const TROPHIES = [
  {
    "id": "crown",
    "name": "Crown of the aether",
    "category": "Fantasy",
    "subjectLabel": "Elven laurel",
    "src": "/trophies/achievements/crown.png"
  },
  {
    "id": "dragon",
    "name": "Dragonheart",
    "category": "Fantasy",
    "subjectLabel": "Dragon",
    "src": "/trophies/achievements/dragon.png"
  },
  {
    "id": "crystal",
    "name": "Heart of the rift",
    "category": "Fantasy",
    "subjectLabel": "Arcane crystal",
    "src": "/trophies/achievements/crystal.png"
  },
  {
    "id": "spellbook",
    "name": "The astral codex",
    "category": "Fantasy",
    "subjectLabel": "Spellbook",
    "src": "/trophies/achievements/spellbook.png"
  },
  {
    "id": "sword",
    "name": "Eclipse edge",
    "category": "Fantasy",
    "subjectLabel": "Enchanted sword",
    "src": "/trophies/achievements/sword.png"
  },
  {
    "id": "reel",
    "name": "Silver-screen legend",
    "category": "Movies",
    "subjectLabel": "Classic cinema",
    "src": "/trophies/achievements/reel.png"
  },
  {
    "id": "clapper",
    "name": "Scene stealer",
    "category": "Movies",
    "subjectLabel": "Drama & comedy",
    "src": "/trophies/achievements/clapper.png"
  },
  {
    "id": "popcorn",
    "name": "Premiere night",
    "category": "Movies",
    "subjectLabel": "Movie night",
    "src": "/trophies/achievements/popcorn.png"
  },
  {
    "id": "director",
    "name": "Blockbuster",
    "category": "Movies",
    "subjectLabel": "Action movies",
    "src": "/trophies/achievements/director.png"
  },
  {
    "id": "star",
    "name": "Beyond the frame",
    "category": "Movies",
    "subjectLabel": "Sci-fi movies",
    "src": "/trophies/achievements/star.png"
  },
  {
    "id": "donut",
    "name": "Glazed glory",
    "category": "Food",
    "subjectLabel": "Strawberry donut",
    "src": "/trophies/achievements/donut.png"
  },
  {
    "id": "pizza",
    "name": "Slice supremacy",
    "category": "Food",
    "subjectLabel": "Pepperoni pizza",
    "src": "/trophies/achievements/pizza-no-leaves.png"
  },
  {
    "id": "burger",
    "name": "Burger royalty",
    "category": "Food",
    "subjectLabel": "Cheeseburger",
    "src": "/trophies/achievements/burger.png"
  },
  {
    "id": "cupcake",
    "name": "Sweet victory",
    "category": "Food",
    "subjectLabel": "Cherry cupcake",
    "src": "/trophies/achievements/cupcake.png"
  },
  {
    "id": "taco",
    "name": "Taco triumph",
    "category": "Food",
    "subjectLabel": "Crispy taco",
    "src": "/trophies/achievements/taco.png"
  },
  {
    "id": "lion",
    "name": "Savanna sovereign",
    "category": "Animals",
    "subjectLabel": "Savanna lion",
    "src": "/trophies/achievements/lion.png"
  },
  {
    "id": "fox",
    "name": "Woodland wanderer",
    "category": "Animals",
    "subjectLabel": "Woodland fox",
    "src": "/trophies/achievements/fox.png"
  },
  {
    "id": "owl",
    "name": "Forest oracle",
    "category": "Animals",
    "subjectLabel": "Forest owl",
    "src": "/trophies/achievements/owl.png"
  },
  {
    "id": "wolf",
    "name": "Moonlit guardian",
    "category": "Animals",
    "subjectLabel": "Mountain wolf",
    "src": "/trophies/achievements/wolf.png"
  },
  {
    "id": "shark",
    "name": "Ocean apex",
    "category": "Animals",
    "subjectLabel": "Ocean shark",
    "src": "/trophies/achievements/shark.png"
  }
] as const;

export const TROPHY_CATEGORIES = ["Fantasy", "Movies", "Food", "Animals"] as const;
export function getTrophy(id: string) { return TROPHIES.find(trophy => trophy.id === id) ?? TROPHIES[0]; }

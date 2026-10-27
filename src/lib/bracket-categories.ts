export const BRACKET_CATEGORIES = [
  { id: "food-drink", name: "Food & Drink" },
  { id: "movies-tv", name: "Movies & TV" },
  { id: "sports", name: "Sports" },
  { id: "video-games", name: "Video Games" },
  { id: "tabletop-party", name: "Tabletop & Party Games" },
  { id: "music", name: "Music" },
  { id: "books-stories", name: "Books & Stories" },
  { id: "pop-culture", name: "Pop Culture" },
  { id: "nature-animals", name: "Nature & Animals" },
  { id: "everything-else", name: "Everything Else" },
] as const;

export type BracketCategory = typeof BRACKET_CATEGORIES[number]["id"];
export function categoryName(id?: string) {
  return (BRACKET_CATEGORIES.find(category => category.id === id) ?? BRACKET_CATEGORIES[9]).name;
}

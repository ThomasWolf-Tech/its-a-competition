import { configCompetitors, type BracketConfig } from "./bracket-config";
import type { Competitor } from "./bracket";
import { categoryName, type BracketCategory } from "./bracket-categories";
import { customProgressId } from "./bracket-schedule";

// Future trending data refreshes on page load/reload, with no live subscription.
// Current demo slides remain examples until real trending discovery is connected.
export const MAX_TRENDING_CAROUSEL_BRACKETS = 10;

const concepts = [
  { id: "snacks", title: "The ultimate snack showdown", category: "food-drink", description: "Sweet. Salty. Seriously debatable. Sixteen snack-time favorites enter the bracket. Only one gets the last bite.", creator: "SnackCouncil", votes: 2847, trophyId: "donut", names: ["Popcorn", "Chips", "Cookies", "Pretzels", "Nachos", "Brownies", "Ice cream", "Donuts", "Trail mix", "Gummy bears", "Crackers", "Chocolate", "Granola bars", "Fruit snacks", "Cheese puffs", "Cupcakes"] },
  { id: "movies", title: "The movie night hall of fame", category: "movies-tv", description: "The rewatchables. The quotables. The one your friend won't stop talking about. Give movie night a winner.", creator: "ReelRivals", votes: 1936, trophyId: "director", names: ["Jurassic Park", "The Matrix", "Back to the Future", "The Dark Knight", "Toy Story", "Spirited Away", "Jaws", "The Princess Bride", "Die Hard", "The Incredibles", "Interstellar", "Shrek", "The Lion King", "Ghostbusters", "The Avengers", "Finding Nemo"] },
  { id: "games", title: "Game night gets competitive", category: "tabletop-party", description: "Cards on the table. Friendships on the line. Find out which game deserves a permanent seat at game night.", creator: "TableTalk", votes: 1264, trophyId: "crystal", names: ["Uno", "Catan", "Chess", "Codenames", "Ticket to Ride", "Jenga", "Scrabble", "Clue", "Monopoly", "Yahtzee", "Pictionary", "Boggle", "Carcassonne", "Azul", "Risk", "Exploding Kittens"] },
] satisfies (BracketConfig & { id: string; category: BracketCategory; creator: string; votes: number })[];

export const SHOWCASES = concepts.map(item => ({
  ...item, kicker: categoryName(item.category), tags: item.names,
  initials: configCompetitors(item).map(competitor => competitor.initials),
  competitors: configCompetitors(item), href: `/bracket?showcase=${item.id}`,
}));
export type Showcase = BracketConfig & { id: string; progressId?: string; category: BracketCategory; description: string; creator: string; votes: number; kicker: string; tags: string[]; initials: string[]; competitors: Competitor[]; href: string };

export function customShowcase(config: BracketConfig): Showcase {
  const competitors = configCompetitors(config);
  return {
    ...config, description: config.description ?? "",
    id: "custom", progressId: customProgressId(config), category: config.category ?? "everything-else",
    creator: "You", votes: 0, kicker: categoryName(config.category), tags: config.names,
    initials: competitors.map(competitor => competitor.initials), competitors, href: "/bracket/custom",
  };
}

import { getTrophy } from './trophies';

// Display-only metadata. Never include exclusive awards in the builder catalog.
export function getRoomTrophy(id: string) {
  if (id === 'the-creator') return {
    id: 'the-creator', name: 'The Creator', category: 'One of one',
    subjectLabel: 'Obsidian Guy Fawkes mask surrounded by ethereal black smoke',
    src: '/trophies/exclusive/the-creator-smoke.png',
  };
  return getTrophy(id);
}

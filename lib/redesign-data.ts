export type Book = {
  id: string
  title: string
  author: string
  cover: string
  rating: number
  ratings: number
  mood: string[]
  genre: string
  pages: number
  year: number
  color: string
}

export type User = {
  id: string
  name: string
  handle: string
  avatar: string | null
  color: string
  bio?: string
}

export type Mood = { name: string; count: number; emoji: string }

const covers = {
  hailMary: 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg',
  road: 'https://covers.openlibrary.org/b/isbn/9780307387899-L.jpg',
  stranger: 'https://covers.openlibrary.org/b/isbn/9780679720201-L.jpg',
  nineteen: 'https://covers.openlibrary.org/b/isbn/9780452284234-L.jpg',
  threeBody: 'https://covers.openlibrary.org/b/isbn/9780765382030-L.jpg',
  dune: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
  annihilation: 'https://covers.openlibrary.org/b/isbn/9780374104092-L.jpg',
  piranesi: 'https://covers.openlibrary.org/b/isbn/9781635575637-L.jpg',
  klara: 'https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg',
  babel: 'https://covers.openlibrary.org/b/isbn/9780063021426-L.jpg',
  circe: 'https://covers.openlibrary.org/b/isbn/9780316556347-L.jpg',
  secretHistory: 'https://covers.openlibrary.org/b/isbn/9781400031702-L.jpg',
  normalPeople: 'https://covers.openlibrary.org/b/isbn/9781984822185-L.jpg',
  tomorrow: 'https://covers.openlibrary.org/b/isbn/9780593321201-L.jpg',
  severance: 'https://covers.openlibrary.org/b/isbn/9781250214997-L.jpg',
}

export const books: Book[] = [
  { id: 'hm', title: 'Project Hail Mary', author: 'Andy Weir', cover: covers.hailMary, rating: 4.5, ratings: 2134, mood: ['Hopeful', 'Epic', 'Lonely'], genre: 'Sci-Fi', pages: 476, year: 2021, color: '#1a1a1a' },
  { id: 'rd', title: 'The Road', author: 'Cormac McCarthy', cover: covers.road, rating: 4.3, ratings: 3402, mood: ['Bleak', 'Haunting'], genre: 'Lit Fiction', pages: 287, year: 2006, color: '#222' },
  { id: 'sb', title: 'The Secret History', author: 'Donna Tartt', cover: covers.secretHistory, rating: 4.6, ratings: 8821, mood: ['Dark Academia', 'Obsessive'], genre: 'Lit Fiction', pages: 559, year: 1992, color: '#2c1810' },
  { id: 'tb', title: 'The Three-Body Problem', author: 'Liu Cixin', cover: covers.threeBody, rating: 4.2, ratings: 4120, mood: ['Epic', 'Cerebral'], genre: 'Sci-Fi', pages: 400, year: 2008, color: '#0a1e3a' },
  { id: 'pr', title: 'Piranesi', author: 'Susanna Clarke', cover: covers.piranesi, rating: 4.4, ratings: 2201, mood: ['Dreamy', 'Haunting'], genre: 'Fantasy', pages: 245, year: 2020, color: '#4a3a2a' },
  { id: 'kl', title: 'Klara and the Sun', author: 'Kazuo Ishiguro', cover: covers.klara, rating: 4.1, ratings: 1923, mood: ['Melancholic', 'Lyrical'], genre: 'Lit Fiction', pages: 303, year: 2021, color: '#c9b896' },
  { id: 'bb', title: 'Babel', author: 'R.F. Kuang', cover: covers.babel, rating: 4.5, ratings: 5302, mood: ['Dark Academia', 'Angry'], genre: 'Fantasy', pages: 544, year: 2022, color: '#4a2a1a' },
  { id: 'cr', title: 'Circe', author: 'Madeline Miller', cover: covers.circe, rating: 4.5, ratings: 6710, mood: ['Lyrical', 'Epic'], genre: 'Fantasy', pages: 393, year: 2018, color: '#b85a3a' },
  { id: 'tm', title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', cover: covers.tomorrow, rating: 4.3, ratings: 4810, mood: ['Nostalgic', 'Bittersweet'], genre: 'Lit Fiction', pages: 401, year: 2022, color: '#2a4a8a' },
  { id: 'nv', title: 'Nineteen Eighty-Four', author: 'George Orwell', cover: covers.nineteen, rating: 4.2, ratings: 12400, mood: ['Bleak', 'Political'], genre: 'Classic', pages: 328, year: 1949, color: '#1a1a1a' },
  { id: 'ds', title: 'Dune', author: 'Frank Herbert', cover: covers.dune, rating: 4.4, ratings: 9820, mood: ['Epic', 'Political'], genre: 'Sci-Fi', pages: 688, year: 1965, color: '#3a2a1a' },
  { id: 'st', title: 'The Stranger', author: 'Albert Camus', cover: covers.stranger, rating: 4.0, ratings: 5401, mood: ['Existential', 'Bleak'], genre: 'Classic', pages: 123, year: 1942, color: '#dcc9a8' },
  { id: 'np', title: 'Normal People', author: 'Sally Rooney', cover: covers.normalPeople, rating: 4.0, ratings: 3210, mood: ['Melancholic', 'Romantic'], genre: 'Lit Fiction', pages: 273, year: 2018, color: '#c9a868' },
  { id: 'sv', title: 'Severance', author: 'Ling Ma', cover: covers.severance, rating: 4.0, ratings: 1820, mood: ['Bleak', 'Dark Humor'], genre: 'Lit Fiction', pages: 291, year: 2018, color: '#e85a3a' },
  { id: 'an', title: 'Annihilation', author: 'Jeff VanderMeer', cover: covers.annihilation, rating: 4.1, ratings: 3401, mood: ['Haunting', 'Weird'], genre: 'Sci-Fi', pages: 208, year: 2014, color: '#2a4a2a' },
]

export const users: User[] = [
  { id: 'ava', name: 'Ava Chen', handle: 'avareads', avatar: null, color: 'oklch(66% 0.18 42)', bio: 'dark academia enjoyer · slow reader · 2026 goal: 30' },
  { id: 'maya', name: 'Maya Okonkwo', handle: 'mayamoss', avatar: null, color: 'oklch(50% 0.12 150)', bio: 'sci-fi · trans lit · book twin w/ @jules' },
  { id: 'leo', name: 'Leo Park', handle: 'leopark', avatar: null, color: 'oklch(58% 0.14 240)' },
  { id: 'jules', name: 'Jules Rivera', handle: 'julesr', avatar: null, color: 'oklch(48% 0.14 340)' },
  { id: 'sam', name: 'Sam Hale', handle: 'samreads', avatar: null, color: 'oklch(62% 0.16 85)' },
  { id: 'brett', name: 'Brett', handle: 'brett', avatar: null, color: 'oklch(66% 0.18 42)' },
]

export const moods: Mood[] = [
  { name: 'Dark Academia', count: 142, emoji: '🕯️' },
  { name: 'Haunting', count: 98, emoji: '🪞' },
  { name: 'Hopeful', count: 204, emoji: '🌱' },
  { name: 'Bleak', count: 76, emoji: '🌑' },
  { name: 'Dreamy', count: 88, emoji: '🌊' },
  { name: 'Epic', count: 156, emoji: '⚔️' },
  { name: 'Lyrical', count: 102, emoji: '🪶' },
  { name: 'Existential', count: 63, emoji: '🚬' },
  { name: 'Romantic', count: 178, emoji: '🌹' },
  { name: 'Cozy', count: 132, emoji: '☕' },
  { name: 'Suspenseful', count: 91, emoji: '🗝️' },
  { name: 'Weird', count: 44, emoji: '🍄' },
]

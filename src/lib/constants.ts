export const CATEGORIES = [
  { value: "bioscoop", label: "Bioscoop" },
  { value: "theater", label: "Theater" },
  { value: "sport", label: "Sport" },
  { value: "museum", label: "Museum" },
  { value: "bowling", label: "Bowling" },
  { value: "klimbos", label: "Klimbos" },
  { value: "escaperoom", label: "Escaperoom" },
  { value: "arcade", label: "Arcade" },
  { value: "verhuur", label: "Verhuur" },
  { value: "paintball", label: "Paintball" },
  { value: "concert", label: "Concert" },
  { value: "voetbal", label: "Voetbal" },
  { value: "basketbal", label: "Basketbal" },
  { value: "overig", label: "Overig" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  bioscoop: "Bioscoop",
  theater: "Theater",
  sport: "Sport",
  museum: "Museum",
  bowling: "Bowling",
  klimbos: "Klimbos",
  escaperoom: "Escaperoom",
  arcade: "Arcade",
  verhuur: "Verhuur",
  paintball: "Paintball",
  concert: "Concert",
  voetbal: "Voetbal",
  basketbal: "Basketbal",
  overig: "Overig",
};

export type VenueCategory = typeof CATEGORIES[number]["value"];

export const CATEGORIES = [
  { value: "bioscoop", label: "Bioscoop" },
  { value: "theater", label: "Theater" },
  { value: "sport", label: "Sport" },
  { value: "museum", label: "Museum" },
  { value: "bowling", label: "Bowling" },
  { value: "paintball", label: "Paintball" },
  { value: "stadion", label: "Stadion" },
  { value: "concert", label: "Concert" },
  { value: "overig", label: "Overig" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  bioscoop: "Bioscoop",
  theater: "Theater",
  sport: "Sport",
  museum: "Museum",
  bowling: "Bowling",
  paintball: "Paintball",
  stadion: "Stadion",
  concert: "Concert",
  overig: "Overig",
};

export type VenueCategory = typeof CATEGORIES[number]["value"];

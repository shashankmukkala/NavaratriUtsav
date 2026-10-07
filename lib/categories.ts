import type { ListingCategory } from "@/lib/types";

/** The three kinds of celebration that share the one map. Everything that
 * names, filters, colours or labels a listing by kind reads from here, so
 * the map chips, pins, forms, cards and admin can never drift apart. */
export interface CategoryInfo {
  value: ListingCategory;
  /** Singular, for a single listing's badge ("Dandiya Night"). */
  label: string;
  /** Plural, for filter chips and list titles ("Dandiya Nights"). */
  plural: string;
  /** Pin ring / badge colour. */
  color: string;
  /** Tinted badge background + text, as Tailwind classes. */
  badgeClass: string;
  photoLabel: string;
  namePlaceholder: string;
  organizerPlaceholder: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    value: "pandal",
    label: "Pandal",
    plural: "Pandals",
    color: "#e8a93a",
    badgeClass: "bg-[#fde8b0] text-[#7a4a00]",
    photoLabel: "Durga Maa / pandal photo",
    namePlaceholder: "e.g. Khairatabad Durga Pandal",
    organizerPlaceholder: "e.g. Khairatabad Durga Puja Samiti",
  },
  {
    value: "dandiya",
    label: "Dandiya Night",
    plural: "Dandiya Nights",
    color: "#e8338a",
    badgeClass: "bg-[#fbd3e6] text-[#8a1250]",
    photoLabel: "Event poster or photo",
    namePlaceholder: "e.g. Shilparamam Dandiya Night",
    organizerPlaceholder: "e.g. Madhapur Garba Club",
  },
  {
    value: "cultural",
    label: "Cultural Event / Workshop",
    plural: "Cultural Events & Workshops",
    color: "#4f7cff",
    badgeClass: "bg-[#dbe4ff] text-[#23408e]",
    photoLabel: "Event or workshop photo",
    namePlaceholder: "e.g. Garba Dance Workshop",
    organizerPlaceholder: "e.g. Hyderabad Dance Collective",
  },
];

const BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c])) as Record<ListingCategory, CategoryInfo>;

/** Rows created before categories existed have no value — they were all pandals. */
export function categoryInfo(category: ListingCategory | null | undefined): CategoryInfo {
  return BY_VALUE[category ?? "pandal"] ?? BY_VALUE.pandal;
}

export function isListingCategory(value: unknown): value is ListingCategory {
  return value === "pandal" || value === "dandiya" || value === "cultural";
}

/** The map's filter: everything, one kind, or just the starred listings. */
export type MapFilter = "all" | ListingCategory | "star";

export function parseMapFilter(value: string | null): MapFilter {
  if (value === "star" || isListingCategory(value)) return value;
  return "all";
}

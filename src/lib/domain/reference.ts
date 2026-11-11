/** Reference data: countries, fields of study, tests, levels. */
import type { Level } from "./types";

export interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
  lat: number;
  lng: number;
}

export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", currency: "INR", flag: "🇮🇳", lat: 20.6, lng: 78.9 },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸", lat: 39.8, lng: -98.6 },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧", lat: 54.0, lng: -2.0 },
  { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦", lat: 56.1, lng: -106.3 },
  { code: "AU", name: "Australia", currency: "AUD", flag: "🇦🇺", lat: -25.3, lng: 133.8 },
  { code: "DE", name: "Germany", currency: "EUR", flag: "🇩🇪", lat: 51.2, lng: 10.4 },
  { code: "FR", name: "France", currency: "EUR", flag: "🇫🇷", lat: 46.2, lng: 2.2 },
  { code: "NL", name: "Netherlands", currency: "EUR", flag: "🇳🇱", lat: 52.1, lng: 5.3 },
  { code: "IE", name: "Ireland", currency: "EUR", flag: "🇮🇪", lat: 53.4, lng: -8.2 },
  { code: "SG", name: "Singapore", currency: "SGD", flag: "🇸🇬", lat: 1.35, lng: 103.8 },
  { code: "JP", name: "Japan", currency: "JPY", flag: "🇯🇵", lat: 36.2, lng: 138.3 },
  { code: "NZ", name: "New Zealand", currency: "NZD", flag: "🇳🇿", lat: -40.9, lng: 174.9 },
  { code: "AE", name: "United Arab Emirates", currency: "AED", flag: "🇦🇪", lat: 23.4, lng: 53.8 },
  { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬", lat: 9.1, lng: 8.7 },
  { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪", lat: -0.02, lng: 37.9 },
  { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭", lat: 7.9, lng: -1.0 },
  { code: "PK", name: "Pakistan", currency: "PKR", flag: "🇵🇰", lat: 30.4, lng: 69.3 },
  { code: "BD", name: "Bangladesh", currency: "BDT", flag: "🇧🇩", lat: 23.7, lng: 90.4 },
  { code: "LK", name: "Sri Lanka", currency: "LKR", flag: "🇱🇰", lat: 7.9, lng: 80.8 },
  { code: "NP", name: "Nepal", currency: "NPR", flag: "🇳🇵", lat: 28.4, lng: 84.1 },
  { code: "BR", name: "Brazil", currency: "BRL", flag: "🇧🇷", lat: -14.2, lng: -51.9 },
  { code: "MX", name: "Mexico", currency: "MXN", flag: "🇲🇽", lat: 23.6, lng: -102.6 },
  { code: "ID", name: "Indonesia", currency: "IDR", flag: "🇮🇩", lat: -0.8, lng: 113.9 },
  { code: "PH", name: "Philippines", currency: "PHP", flag: "🇵🇭", lat: 12.9, lng: 121.8 },
  { code: "VN", name: "Vietnam", currency: "VND", flag: "🇻🇳", lat: 14.1, lng: 108.3 },
  { code: "CN", name: "China", currency: "CNY", flag: "🇨🇳", lat: 35.9, lng: 104.2 },
  { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦", lat: -30.6, lng: 22.9 },
  { code: "EG", name: "Egypt", currency: "EGP", flag: "🇪🇬", lat: 26.8, lng: 30.8 },
];

export const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

/** Popular study destinations shown first in the onboarding globe. */
export const DESTINATIONS = ["US", "GB", "CA", "AU", "DE", "IE", "NL", "FR", "SG", "JP", "NZ"];

/** Broad fields of study, loosely based on ISCED-F 2013. */
export const FIELDS: { code: string; label: string; emoji: string }[] = [
  { code: "ENGINEERING", label: "Engineering", emoji: "⚙️" },
  { code: "ICT", label: "Computer Science & IT", emoji: "💻" },
  { code: "SCIENCES", label: "Natural Sciences & Maths", emoji: "🔬" },
  { code: "BUSINESS", label: "Business & Economics", emoji: "📈" },
  { code: "HEALTH", label: "Medicine & Health", emoji: "🩺" },
  { code: "SOCIAL", label: "Social Sciences", emoji: "🌍" },
  { code: "ARTS", label: "Arts & Humanities", emoji: "🎨" },
  { code: "LAW", label: "Law", emoji: "⚖️" },
  { code: "EDUCATION", label: "Education", emoji: "📚" },
  { code: "AGRICULTURE", label: "Agriculture & Environment", emoji: "🌱" },
];
export const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  FIELDS.map((f) => [f.code, f.label]),
);

export const LEVEL_LABEL: Record<Level, string> = {
  SECONDARY: "High school",
  DIPLOMA: "Diploma",
  BACHELOR: "Bachelor's",
  MASTER: "Master's",
  DOCTORATE: "PhD / Doctorate",
  OTHER: "Other",
};

export const TESTS: { code: string; label: string; min: number; max: number; step: number }[] = [
  { code: "IELTS", label: "IELTS", min: 0, max: 9, step: 0.5 },
  { code: "TOEFL", label: "TOEFL iBT", min: 0, max: 120, step: 1 },
  { code: "SAT", label: "SAT", min: 400, max: 1600, step: 10 },
  { code: "ACT", label: "ACT", min: 1, max: 36, step: 1 },
  { code: "GRE", label: "GRE", min: 260, max: 340, step: 1 },
  { code: "GMAT", label: "GMAT", min: 205, max: 805, step: 5 },
];

export function countryName(code: string): string {
  return COUNTRY_BY_CODE[code]?.name ?? code;
}

export function flag(code: string): string {
  return COUNTRY_BY_CODE[code]?.flag ?? "🌐";
}

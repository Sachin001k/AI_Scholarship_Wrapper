import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/** Installable web app (design doc §3.15, P0). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Scholarships",
    description: "Scholarships, programs and education loans that fit you.",
    start_url: "/matches",
    display: "standalone",
    background_color: "#05060f",
    theme_color: "#05060f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

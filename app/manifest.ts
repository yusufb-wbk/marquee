import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marquee",
    short_name: "Marquee",
    description: "Track shows and movies, then see what to watch next.",
    start_url: "/up-next",
    display: "standalone",
    background_color: "#14110e",
    theme_color: "#14110e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

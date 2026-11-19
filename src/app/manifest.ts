import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Personal Trainer",
    short_name: "Trainer",
    description: "Catat makan dan olahraga, AI bantu hitung kalori dan beri rekomendasi harian.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ee",
    theme_color: "#f4f2ee",
    lang: "id",
    icons: [
      // Placeholder icons (orange square, "PT"): replace once a logo exists.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

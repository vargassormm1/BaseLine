import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Baseline", short_name: "Baseline", description: "Log your tennis matches, climb the rankings.", start_url: "/home", display: "standalone", background_color: "#0d0f0c", theme_color: "#0d0f0c", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}

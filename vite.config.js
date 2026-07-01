import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/laudo-doppler/",
  build: {
    outDir: "dist",
  },
});

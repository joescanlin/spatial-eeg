import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000/",
        secure: false,
      },
    },
  }
});

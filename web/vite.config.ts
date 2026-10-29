import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const brainPort = Number(environment.BRAIN_PORT || 8787);
  return {
    plugins: [react(), tailwindcss()],
    server: {
      strictPort: true,
      proxy: { "/api": "http://127.0.0.1:" + brainPort },
    },
  };
});

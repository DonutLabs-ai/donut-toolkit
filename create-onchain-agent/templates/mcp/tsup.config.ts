import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "build",
});

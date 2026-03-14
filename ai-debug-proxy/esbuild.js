const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: [path.join(__dirname, "src", "extension.ts")],
  bundle: true,
  outfile: path.join(__dirname, "out", "extension.js"),
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  minify: false,
  treeShaking: true,
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("[esbuild] Watching for changes...");
  } else {
    await esbuild.build(buildOptions);
    console.log("[esbuild] Build complete.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: [
    { in: path.join(__dirname, "src", "vscode", "extension.ts"), out: "extension" },
    { in: path.join(__dirname, "src", "test", "runTest.ts"), out: "test/runTest" },
    { in: path.join(__dirname, "src", "test", "suite", "index.ts"), out: "test/suite/index" },
    { in: path.join(__dirname, "src", "test", "suite", "extension.test.ts"), out: "test/suite/extension.test" },
    { in: path.join(__dirname, "src", "test", "suite", "a-session-lifecycle.test.ts"), out: "test/suite/a-session-lifecycle.test" },
    { in: path.join(__dirname, "src", "test", "suite", "b-breakpoint-management.test.ts"), out: "test/suite/b-breakpoint-management.test" },
    { in: path.join(__dirname, "src", "test", "suite", "c-execution-control.test.ts"), out: "test/suite/c-execution-control.test" },
    { in: path.join(__dirname, "src", "test", "suite", "d-stack-frame-navigation.test.ts"), out: "test/suite/d-stack-frame-navigation.test" },
    { in: path.join(__dirname, "src", "test", "suite", "e-variable-inspection.test.ts"), out: "test/suite/e-variable-inspection.test" },
    { in: path.join(__dirname, "src", "test", "suite", "f-source-navigation.test.ts"), out: "test/suite/f-source-navigation.test" },
    { in: path.join(__dirname, "src", "test", "suite", "g-memory-registers.test.ts"), out: "test/suite/g-memory-registers.test" },
    { in: path.join(__dirname, "src", "test", "suite", "h-validation-errors.test.ts"), out: "test/suite/h-validation-errors.test" },
    { in: path.join(__dirname, "src", "test", "suite", "i-agent-workflow.test.ts"), out: "test/suite/i-agent-workflow.test" },
    { in: path.join(__dirname, "src", "test", "suite", "j-multithread.test.ts"), out: "test/suite/j-multithread.test" },
    { in: path.join(__dirname, "src", "test", "suite", "k-extended-operations.test.ts"), out: "test/suite/k-extended-operations.test" },
    { in: path.join(__dirname, "src", "test", "suite", "l-remaining-operations.test.ts"), out: "test/suite/l-remaining-operations.test" },
  ],
  bundle: true,
  outdir: path.join(__dirname, "out"),
  external: ["vscode", "mocha", "axios"],
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

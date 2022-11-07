import { analyzeMetafile, build } from "esbuild";

(async () => {
  try {
    const startTime = Date.now();
    console.info("🚀 junit-report-annotations Build\n");

    const result = await build({
      entryPoints: ["./index.js"],
      outfile: "dist/index.js",
      metafile: true,
      bundle: true,
      platform: "node",
      target: ["node16"],
      format: "cjs",
      treeShaking: true,
    });

    const analysis = await analyzeMetafile(result.metafile);
    console.info(`📝 Bundle Analysis:${analysis}`);

    console.info(`✔ Bundled successfully! (${Date.now() - startTime}ms)`);
  } catch (error) {
    console.error(`🧨 Failed: ${error.message}`);
    console.debug(`📚 Stack: ${error.stack}`);
    process.exit(1);
  }
})();

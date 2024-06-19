import { writeFileSync } from "fs";
import { RepoWithFiletypesAndModuleTypes } from "./getModuleTypes.js";

function main() {
  const tallies: RepoWithFiletypesAndModuleTypes[] = require("../data/filetypes-and-modules.json");

  const js = tallies.filter((_) => _.language === "javascript");
  const ts = tallies.filter((_) => _.language === "typescript");

  // modules
  const modules = {
    percentOfReposThatHaveAtLeastOnePackageJSONWhereTypeIsDefined: {
      javascript:
        js.reduce(
          (p, c) =>
            c.moduleTypes.hasOwnProperty("module") ||
            c.moduleTypes.hasOwnProperty("commonjs")
              ? p + 1
              : p,
          0
        ) / tallies.length,
      typescript:
        ts.reduce(
          (p, c) =>
            c.moduleTypes.hasOwnProperty("module") ||
            c.moduleTypes.hasOwnProperty("commonjs")
              ? p + 1
              : p,
          0
        ) / tallies.length,
    },
    percentOfReposThatHaveAtLeastOnePackageJSONWhereTypeIsModule: {
      javascript:
        js.reduce(
          (p, c) => (c.moduleTypes.hasOwnProperty("module") ? p + 1 : p),
          0
        ) / tallies.length,
      typescript:
        ts.reduce(
          (p, c) => (c.moduleTypes.hasOwnProperty("module") ? p + 1 : p),
          0
        ) / tallies.length,
    },
    percentOfPackageJSONsWhereTypeIsDefined: {
      javascript:
        js.reduce(
          (p, c) =>
            p + (c.moduleTypes.module ?? 0) + (c.moduleTypes.commonjs ?? 0),
          0
        ) /
        js.reduce(
          (p, c) =>
            p +
            (c.moduleTypes.module ?? 0) +
            (c.moduleTypes.commonjs ?? 0) +
            (c.moduleTypes.undefined ?? 0),
          0
        ),
      typescript:
        ts.reduce(
          (p, c) =>
            p + (c.moduleTypes.module ?? 0) + (c.moduleTypes.commonjs ?? 0),
          0
        ) /
        ts.reduce(
          (p, c) =>
            p +
            (c.moduleTypes.module ?? 0) +
            (c.moduleTypes.commonjs ?? 0) +
            (c.moduleTypes.undefined ?? 0),
          0
        ),
    },
    percentOfPackageJSONsWhereTypeIsModule: {
      javascript:
        js.reduce((p, c) => p + (c.moduleTypes.module ?? 0), 0) /
        js.reduce(
          (p, c) =>
            p +
            (c.moduleTypes.module ?? 0) +
            (c.moduleTypes.commonjs ?? 0) +
            (c.moduleTypes.undefined ?? 0),
          0
        ),
      typescript:
        ts.reduce((p, c) => p + (c.moduleTypes.module ?? 0), 0) /
        ts.reduce(
          (p, c) =>
            p +
            (c.moduleTypes.module ?? 0) +
            (c.moduleTypes.commonjs ?? 0) +
            (c.moduleTypes.undefined ?? 0),
          0
        ),
    },
  };

  // filetypes
  const totals = {
    percentOfFilesThatUseJSModuleFileExtensions: {
      javascript: 0,
      typescript: 0,
    },
    rawCountsJavascript: {
      // js
      js: 0,
      jsx: 0,
      cjs: 0,
      cjsx: 0,
      mjs: 0,
      mjsx: 0,
      // ts
      ts: 0,
      tsx: 0,
      cts: 0,
      ctsx: 0,
      mts: 0,
      mtsx: 0,
    },
    rawCountsTypescript: {
      // js
      js: 0,
      jsx: 0,
      cjs: 0,
      cjsx: 0,
      mjs: 0,
      mjsx: 0,
      // ts
      ts: 0,
      tsx: 0,
      cts: 0,
      ctsx: 0,
      mts: 0,
      mtsx: 0,
    },
  };
  tallies.forEach((_) => {
    Object.entries(_.tallies).forEach(([ext, tally]) => {
      const obj =
        _.language === "javascript"
          ? totals.rawCountsJavascript
          : totals.rawCountsTypescript;
      if (!obj.hasOwnProperty(ext)) {
        return;
      }
      obj[ext] += tally;
    });
    console.log(`counted totals for ${_.owner}/${_.repo}`);
  });

  totals.percentOfFilesThatUseJSModuleFileExtensions.javascript =
    (totals.rawCountsJavascript.cjs +
      totals.rawCountsJavascript.cjsx +
      totals.rawCountsJavascript.mjs +
      totals.rawCountsJavascript.mjsx +
      totals.rawCountsTypescript.cjs +
      totals.rawCountsTypescript.cjsx +
      totals.rawCountsTypescript.mjs +
      totals.rawCountsTypescript.mjsx) /
    (totals.rawCountsJavascript.cjs +
      totals.rawCountsJavascript.cjsx +
      totals.rawCountsJavascript.js +
      totals.rawCountsJavascript.jsx +
      totals.rawCountsJavascript.mjs +
      totals.rawCountsJavascript.mjsx +
      totals.rawCountsTypescript.cjs +
      totals.rawCountsTypescript.cjsx +
      totals.rawCountsTypescript.js +
      totals.rawCountsTypescript.jsx +
      totals.rawCountsTypescript.mjs +
      totals.rawCountsTypescript.mjsx);

  totals.percentOfFilesThatUseJSModuleFileExtensions.typescript =
    (totals.rawCountsJavascript.cts +
      totals.rawCountsJavascript.ctsx +
      totals.rawCountsJavascript.mts +
      totals.rawCountsJavascript.mtsx +
      totals.rawCountsTypescript.cts +
      totals.rawCountsTypescript.ctsx +
      totals.rawCountsTypescript.mts +
      totals.rawCountsTypescript.mtsx) /
    (totals.rawCountsJavascript.cts +
      totals.rawCountsJavascript.ctsx +
      totals.rawCountsJavascript.ts +
      totals.rawCountsJavascript.tsx +
      totals.rawCountsJavascript.mts +
      totals.rawCountsJavascript.mtsx +
      totals.rawCountsTypescript.cts +
      totals.rawCountsTypescript.ctsx +
      totals.rawCountsTypescript.ts +
      totals.rawCountsTypescript.tsx +
      totals.rawCountsTypescript.mts +
      totals.rawCountsTypescript.mtsx);

  writeFileSync(
    "data/totals.json",
    JSON.stringify({ ...modules, ...totals }, null, 4)
  );
}

main();

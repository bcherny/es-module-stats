import { readFileSync, writeFileSync } from "fs";
import { type ModuleType } from "./getNPMModuleTypes.mjs";

function main() {
  const fileTypes: {
    [packageName: string]: { [fileExtension: string]: number };
  } = JSON.parse(
    readFileSync("./data/top-1k-npm-downloads-file-types.json", "utf8")
  );
  const moduleTypes: {
    [packageName: string]: ModuleType | null;
  } = JSON.parse(
    readFileSync("./data/top-1k-npm-downloads-module-types.json", "utf8")
  );

  // modules
  const modules = {
    percentOfPackageJSONsWhereTypeOrExportsIsDefined:
      Object.values(moduleTypes).filter((_) => _ !== null).length /
      Object.values(moduleTypes).length,
    percentOfPackagesThatAreModules:
      Object.values(moduleTypes).filter((_) => _ === "module").length /
      Object.values(moduleTypes).length,
  };

  // filetypes
  const totals = {
    percentOfFilesThatUseJSModuleFileExtensions: 0,
    percentOfFilesThatAreJSModules: 0,
    rawCounts: {
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

  for (const packageName in fileTypes) {
    for (const ext in fileTypes[packageName]) {
      if (!totals.rawCounts.hasOwnProperty(ext)) {
        continue;
      }
      totals.rawCounts[ext] += fileTypes[packageName][ext];
    }
    console.log(`counted totals for ${packageName}`);
  }

  totals.percentOfFilesThatUseJSModuleFileExtensions =
    (totals.rawCounts.cts +
      totals.rawCounts.ctsx +
      totals.rawCounts.mts +
      totals.rawCounts.mtsx +
      totals.rawCounts.cts +
      totals.rawCounts.ctsx +
      totals.rawCounts.mts +
      totals.rawCounts.mtsx) /
    (totals.rawCounts.cts +
      totals.rawCounts.ctsx +
      totals.rawCounts.ts +
      totals.rawCounts.tsx +
      totals.rawCounts.mts +
      totals.rawCounts.mtsx +
      totals.rawCounts.cts +
      totals.rawCounts.ctsx +
      totals.rawCounts.ts +
      totals.rawCounts.tsx +
      totals.rawCounts.mts +
      totals.rawCounts.mtsx);

  // percentOfFilesThatAreJSModules

  // 1. count cjs/mts file extensions for each module
  const moduleFileCountsByPackage: {
    [packageName: string]: { ctsAndMts: number; all: number };
  } = {};
  for (const packageName in fileTypes) {
    moduleFileCountsByPackage[packageName] = {
      ctsAndMts:
        (fileTypes[packageName].cts ?? 0) +
        (fileTypes[packageName].ctsx ?? 0) +
        (fileTypes[packageName].mts ?? 0) +
        (fileTypes[packageName].mtsx ?? 0) +
        (fileTypes[packageName].cts ?? 0) +
        (fileTypes[packageName].ctsx ?? 0) +
        (fileTypes[packageName].mts ?? 0) +
        (fileTypes[packageName].mtsx ?? 0),
      all:
        (fileTypes[packageName].cts ?? 0) +
        (fileTypes[packageName].ctsx ?? 0) +
        (fileTypes[packageName].ts ?? 0) +
        (fileTypes[packageName].tsx ?? 0) +
        (fileTypes[packageName].mts ?? 0) +
        (fileTypes[packageName].mtsx ?? 0) +
        (fileTypes[packageName].cts ?? 0) +
        (fileTypes[packageName].ctsx ?? 0) +
        (fileTypes[packageName].ts ?? 0) +
        (fileTypes[packageName].tsx ?? 0) +
        (fileTypes[packageName].mts ?? 0) +
        (fileTypes[packageName].mtsx ?? 0),
    };
  }

  // 2. add all files if the package is a module
  for (const packageName in moduleTypes) {
    if (!moduleFileCountsByPackage.hasOwnProperty(packageName)) {
      // skip deprecated packages (included in moduleTypes but not fileTypes)
      continue;
    }
    if (
      moduleTypes[packageName] === "module" ||
      moduleTypes[packageName] === "commonjs"
    ) {
      moduleFileCountsByPackage[packageName].ctsAndMts =
        moduleFileCountsByPackage[packageName].all;
    }
  }

  // 3. sum it up
  totals.percentOfFilesThatAreJSModules =
    sum(Object.values(moduleFileCountsByPackage).map((_) => _.ctsAndMts)) /
    sum(Object.values(moduleFileCountsByPackage).map((_) => _.all));

  console.log(
    `Summed ${Object.values(moduleFileCountsByPackage).length} packages`
  );

  writeFileSync(
    "./data/totals-npm.json",
    JSON.stringify({ ...modules, ...totals }, null, 4)
  );
}

function sum(as: number[]): number {
  return as.reduce((p, c) => p + c, 0);
}

main();

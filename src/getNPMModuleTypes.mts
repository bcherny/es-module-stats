import { readFileSync, writeFileSync } from "fs";
import all from "p-all";

const INPUT = "./data/top-1k-npm-downloads.json";
const OUTPUT = "./data/top-1k-npm-downloads-module-types.json";

export type ModuleType = "module" | "commonjs" | "ts-typing";

async function getModuleTypeFromPackageName(
  packageName: string
): Promise<ModuleType | undefined> {
  const res = await fetch(`https://registry.npmjs.com/${packageName}/latest`);
  if (!res.ok) {
    console.log(
      `error fetching moduleType for ${packageName}: ${res.statusText}`
    );
    return null;
  }
  const json = await res.json();
  console.log(`fetched moduleType for ${packageName}:`, json.type);
  if (json.type) {
    return json.type || null;
  }
  if (typeof json.exports == "object") {
    if (json.exports.import) {
      return "module";
    }
    if (json.exports.require) {
      return "commonjs";
    }
  }
  return null;
}

async function main() {
  const input = JSON.parse(readFileSync(INPUT, "utf8")) as {
    [repo: string]: number;
  };

  const packageNames = Object.keys(input);
  const moduleTypes = await all(
    packageNames.map((_) => () => getModuleTypeFromPackageName(_)),
    { concurrency: 2 } // don't get rate limited
  );

  writeFileSync(
    OUTPUT,
    JSON.stringify(Object.fromEntries(zip(packageNames, moduleTypes)), null, 4)
  );
}

function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, i) => [a, bs[i]]);
}

main();

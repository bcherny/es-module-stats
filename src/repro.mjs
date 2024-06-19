import { readFileSync, writeFileSync } from "fs";

async function main() {
  const largestNumbers = readFileSync("data/repro.csv", "utf8")
    .split("\n")
    .map((_) => parseInt(_))
    .filter((_) => _ > 0)
    .sort((a, b) => b - a)
    .slice(0, 100);

  writeFileSync(
    "./data/v8-sort-bug-fixed.json",
    JSON.stringify(largestNumbers, null, 4)
  );
}

main();

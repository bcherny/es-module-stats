import { readFileSync, writeFileSync } from "fs";

async function main() {
  const topRepos = readFileSync("data/npm-downloads.csv", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((_) => {
      const [packageNameRaw, downloadCountRaw] = _.split(",");
      const downloadCount = downloadCountRaw.trim();
      return [
        packageNameRaw.trim(),
        downloadCount === "null" ? null : parseInt(downloadCount),
      ] as const;
    })
    .filter((_) => _[1] !== null && _[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1000);

  writeFileSync(
    "./data/top-1k-npm-downloads.json",
    JSON.stringify(Object.fromEntries(topRepos), null, 4)
  );
}

main();

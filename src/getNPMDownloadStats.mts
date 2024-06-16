import { createReadStream, writeFileSync } from "fs";
import fetch from "node-fetch";
import { createInterface } from "readline";

/**
 * eg. `@foo/bar`
 */
async function fetchDownloadsScoped(packageNames: string[]): Promise<number[]> {
  const responses = await Promise.all(
    packageNames.map((_) =>
      fetch(`https://api.npmjs.org/downloads/point/last-week/${_}`)
    )
  );
  const jsons = await Promise.all(responses.map((_) => _.json()));
  return jsons.map((_) => (_ as { downloads: number }).downloads);
}

/**
 * @see https://github.com/npm/registry/blob/main/docs/download-counts.mds
 *
 * eg. `foo`
 */
async function fetchDownloadsNotScoped(
  packageNames: string[]
): Promise<number[]> {
  if (packageNames.length > 128) {
    throw RangeError("can only fetch up to 128, per NPM limit");
  }
  const res = await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${packageNames.join(",")}`
  );
  const json = await res.json();
  return packageNames.map((_) => json[_].downloads);
}

async function* readFileChunked(filePath: string): AsyncGenerator<string[]> {
  const fileStream = createReadStream(filePath, "utf8");
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  let lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
    if (lines.length === 128) {
      yield lines;
      lines = [];
    }
  }
  if (lines.length > 0) {
    yield lines;
  }
}

async function main() {
  for await (const packageNames of readFileChunked("../npm/_all_docs")) {
    const { scoped, notScoped } = Object.groupBy(packageNames, (_) =>
      _.startsWith("@") ? "scoped" : "notScoped"
    );
    const [scopedDownloads, notScopedDownloads] = await Promise.all([
      fetchDownloadsScoped(scoped).then((downloads) =>
        scoped.map((_, i) => [_, downloads[i]] as const)
      ),
      fetchDownloadsNotScoped(notScoped).then((downloads) =>
        notScoped.map((_, i) => [_, downloads[i]] as const)
      ),
    ]);
    writeFileSync(
      "data/npm-downloads.json",
      JSON.stringify(
        {
          ...Object.fromEntries(scopedDownloads),
          ...Object.fromEntries(notScopedDownloads),
        },
        null,
        4
      ),
      { flag: "a" }
    );
  }
}

main();

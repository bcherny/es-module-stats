import { createReadStream, readFileSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import { createInterface } from "readline";

const NPM_API_CONCURRENCY_LIMIT = 128;
const OUTPUT_FILENAME = "data/npm-downloads.csv";
const RETRY_WAIT_TIME_SECONDS = 60 * 10;

/**
 * eg. `@foo/bar`
 */
async function fetchDownloadsScoped(
  packageNames: string[]
): Promise<(number | null)[]> {
  if (!packageNames.length) {
    return [];
  }
  return await Promise.all(packageNames.map(fetchDownloadScoped));
}

async function fetchDownloadScoped(
  packageName: string
): Promise<number | null> {
  const _ = await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${packageName}`
  );
  if (_.ok) {
    return ((await _.json()) as { downloads: number | null }).downloads;
  }
  switch (_.statusText) {
    case "Not Found":
      return null;
    case "Too Many Requests":
      console.error(
        `Request for ${packageName} was rate limited. Retrying in ${RETRY_WAIT_TIME_SECONDS} seconds.`
      );
      return setTimeoutPromise(
        () => fetchDownloadScoped(packageName),
        RETRY_WAIT_TIME_SECONDS * 1000
      );
    default:
      throw Error(_.statusText);
  }
}

function setTimeoutPromise<A>(f: () => Promise<A>, t: number): Promise<A> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(f());
    }, t)
  );
}

/**
 * @see https://github.com/npm/registry/blob/main/docs/download-counts.mds
 *
 * eg. `foo`
 */
async function fetchDownloadsNotScoped(
  packageNames: string[]
): Promise<(number | null)[]> {
  if (packageNames.length > NPM_API_CONCURRENCY_LIMIT) {
    throw RangeError(
      `can only fetch up to ${NPM_API_CONCURRENCY_LIMIT}, per NPM limit`
    );
  }
  if (!packageNames.length) {
    return [];
  }
  const res = await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${packageNames.join(",")}`
  );
  const json = await res.json();
  return packageNames.map((_) => json[_]?.downloads ?? 0);
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
    if (lines.length === NPM_API_CONCURRENCY_LIMIT) {
      yield lines;
      lines = [];
    }
  }
  if (lines.length > 0) {
    yield lines;
  }
}

// parses json without parsing json, since it won't have opening/closing {}
const PREFIX = '{"id":"';
async function* readPackageNamesChunked(
  filePath: string
): AsyncGenerator<string[]> {
  for await (const lines of readFileChunked(filePath)) {
    yield lines
      .filter((_) => _.startsWith(PREFIX))
      .map((_) => _.slice(PREFIX.length))
      .map((_) => _.slice(0, _.indexOf('"')));
  }
}

function groupBy<A, B extends string>(as: A[], f: (a: A) => B): Record<B, A[]> {
  const res: Record<B, A[]> = {} as any;
  as.forEach((a) => {
    const key = f(a);
    if (!res.hasOwnProperty(key)) {
      res[key] = [];
    }
    res[key].push(a);
  });
  return res;
}

async function main() {
  const downloadedPackageNames = getDownloadedPackageNames();
  for await (const packageNames of readPackageNamesChunked("./npm/_all_docs")) {
    // support resuming downloads
    const packageNamesToDownload = packageNames.filter(
      (_) => !downloadedPackageNames.has(_)
    );
    const { scoped = [], notScoped = [] } = groupBy(
      packageNamesToDownload,
      (_) => (_.startsWith("@") ? "scoped" : "notScoped")
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
      OUTPUT_FILENAME,
      [...scopedDownloads, ...notScopedDownloads]
        .map(([k, v]) => `${k}, ${v}`)
        .join("\n") + "\n",
      { flag: "a" }
    );
    [...scoped, ...notScoped].forEach((_) => {
      console.log(`wrote download counts for ${_} to ${OUTPUT_FILENAME}`);
    });
  }
}

function getDownloadedPackageNames(): ReadonlySet<string> {
  const csv = readFileSync(OUTPUT_FILENAME, "utf8");
  return new Set(csv.split("\n").map((_) => _.split(",")[0]));
}

main();

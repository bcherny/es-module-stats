import { createReadStream, readFileSync, writeFileSync } from "fs";
import fetch, { FetchError } from "node-fetch";
import { createInterface } from "readline";

const NPM_API_CONCURRENCY_LIMIT = 20;
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
  try {
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
        console.error(
          `Error fetching downloads for ${packageName}: ` + (await _.text())
        );
        return null;
    }
  } catch (e) {
    // npm api socket hangs up sometimes
    if (e instanceof FetchError) {
      return await fetchDownloadScoped(packageName);
    }
    throw e;
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
  const _ = await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${packageNames.join(",")}`
  );
  if (_.ok) {
    const json = await _.json();
    return packageNames.map((_) => json[_]?.downloads ?? 0);
  }
  switch (_.statusText) {
    case "Not Found":
      return null;
    case "Too Many Requests":
      console.error(
        `Request for ${packageNames.length} packages was rate limited. Retrying in ${RETRY_WAIT_TIME_SECONDS} seconds.`
      );
      return setTimeoutPromise(
        () => fetchDownloadsNotScoped(packageNames),
        RETRY_WAIT_TIME_SECONDS * 1000
      );
    default:
      throw Error(await _.text());
  }
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

  const numStart = downloadedPackageNames.size;
  const numTotal =
    readFileSync("./npm/_all_docs", "utf8").split("\n").length - 1;
  let numDownloaded = 0;

  for await (const packageNames of readPackageNamesChunked("./npm/_all_docs")) {
    // support resuming downloads
    const packageNamesToDownload = packageNames
      .filter((_) => !downloadedPackageNames.has(_))
      .filter((_) => _.startsWith("@"));

    const downloads = await fetchDownloadsScoped(packageNamesToDownload).then(
      (d) => packageNamesToDownload.map((_, i) => [_, d[i]] as const)
    );
    if (downloads.length) {
      writeFileSync(
        OUTPUT_FILENAME,
        downloads
          .map(([k, v]) => `${k}, ${v}`)
          .filter(Boolean)
          .join("\n") + "\n",
        { flag: "a" }
      );
      numDownloaded += downloads.length;
      packageNamesToDownload.forEach((_) => {
        const progress = Math.round(
          (100 * (numStart + numDownloaded)) / numTotal
        );
        console.log(
          `${progress}% wrote download counts for ${_} to ${OUTPUT_FILENAME}`
        );
      });
    }
  }
}

function getDownloadedPackageNames(): ReadonlySet<string> {
  const csv = readFileSync(OUTPUT_FILENAME, "utf8");
  return new Set(csv.split("\n").map((_) => _.split(",")[0]));
}

main();

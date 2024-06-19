import { readFileSync, writeFileSync } from "fs";
import all from "p-all";
import { extname } from "path";
import { ModuleType } from "./getNPMModuleTypes.js";
import { FiletypeTallies, Tallies, getFiletypes } from "./getFiletypes.js";
import { octokit } from "./octokit.js";

const INPUT = "./data/top-1k-npm-downloads.json";
const OUTPUT = "./data/top-1k-npm-downloads-file-types.json";

async function getMainFileTypeFromPackageName(
  packageName: string
): Promise<ModuleType | undefined | "SKIP"> {
  const res = await fetch(`https://registry.npmjs.com/${packageName}/latest`);
  if (!res.ok) {
    console.log(`error fetching main for ${packageName}: ${res.statusText}`);
    return undefined;
  }
  const packageJSON = await res.json();
  if (packageJSON.deprecated) {
    return "SKIP";
  }
  const mainFileType = await getMainFileTypeFromPackageJSON(packageJSON);
  console.log(`fetched main for ${packageName}:`, mainFileType);
  return mainFileType;
}

const EMPTY = { tallies: undefined, packageJSONs: [] };

async function getPackageJSONAndFiletypes(
  packageName: string
): Promise<FiletypeTallies> {
  if (packageName.startsWith("@types/")) {
    return EMPTY;
  }

  const res = await fetch(`https://registry.npmjs.com/${packageName}/latest`);
  if (!res.ok) {
    console.log(`error fetching main for ${packageName}: ${res.statusText}`);
    return EMPTY;
  }
  const packageJSON = await res.json();
  if (packageJSON.deprecated) {
    console.log(`DEPRECATED ${packageName}`);
    return EMPTY;
  }

  const [owner, repo] = parseGitURL(packageJSON.repository.url);
  try {
    const branch = await getDefaultBranch(owner, repo);
    const result = await getFiletypes(owner, repo, branch);
    console.log(
      `OK ${packageName} => ${owner}/${repo}: ${JSON.stringify(
        result.tallies,
        null,
        2
      )}`
    );
    return result;
  } catch (e) {
    console.log(`ERROR ${packageName}`, e);
    return EMPTY;
  }
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await octokit.request(`GET /repos/{owner}/{repo}`, {
    owner,
    repo,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return res.data.default_branch;
}

function getModuleTypeFromFilename(filename: string): ModuleType | undefined {
  switch (extname(filename)) {
    case ".cjs":
      return "commonjs";
    case ".mjs":
      return "module";
    case ".d.ts":
      return "ts-typing";
    default:
      return undefined;
  }
}

async function getMainFileTypeFromPackageJSON(
  packageJSON: any
): Promise<ModuleType | "SKIP" | undefined> {
  if (packageJSON.main) {
    return getModuleTypeFromFilename(packageJSON.main);
  }
  if (typeof packageJSON.exports == "object") {
    if (packageJSON.exports.import) {
      return "module";
    }
    if (packageJSON.exports.require) {
      return "commonjs";
    }
    if (packageJSON.exports.default) {
      return getModuleTypeFromFilename(packageJSON.exports?.default);
    }
  }
  if (typeof packageJSON.exports === "string") {
    return getModuleTypeFromFilename(packageJSON.exports);
  }
  const files = await getFilesFieldFromPackageJSON(
    parseGitURL(packageJSON.repository.url)
  );
  if (Array.isArray(files)) {
    if (files.find((_) => _.endsWith("index.mjs"))) {
      return "module";
    }
    if (files.find((_) => _.endsWith("index.cjs"))) {
      return "commonjs";
    }
    if (files.find((_) => _.endsWith("index.d.ts"))) {
      return "ts-typing";
    }
    if (files.find((_) => _.endsWith("index.js"))) {
      return undefined;
    }
  }
  return "SKIP";
}

/**
 * @param rawURL eg. git+https://github.com/Qix-/color-convert.git
 */
function parseGitURL(rawURL: string): [string, string] {
  return rawURL
    .replace("git+", "")
    .replace("git@", "")
    .replace("ssh://", "")
    .replace("git://", "")
    .replace("https://", "")
    .replace("github.com/", "")
    .replace(".git", "")
    .split("/") as [string, string];
}

async function getFilesFieldFromPackageJSON([owner, repo]: [
  string,
  string
]): Promise<string[] | undefined> {
  try {
    const res = await octokit.request(
      `GET /repos/{owner}/{repo}/contents/package.json`,
      {
        owner,
        repo,
        headers: {
          Accept: "application/vnd.github.raw+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    const { files } = JSON.parse(res.data);
    return files;
  } catch {
    return undefined;
  }
}

async function main() {
  const input = JSON.parse(readFileSync(INPUT, "utf8")) as {
    [repo: string]: number;
  };

  let output = JSON.parse(readFileSync(OUTPUT, "utf8")) as {
    [repo: string]: Tallies | undefined;
  };

  // support resumable downloads
  for (const packageName of Object.keys(input).filter(
    (_) => !output.hasOwnProperty(_)
  )) {
    const { tallies } = await getPackageJSONAndFiletypes(packageName);
    output = { ...output, [packageName]: tallies };
    writeFileSync(OUTPUT, JSON.stringify(output, null, 4));
  }
}

main();

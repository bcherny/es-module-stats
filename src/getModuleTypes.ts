import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { RepoWithFiletypes } from "./getFiletypes.js";

export type RepoWithFiletypesAndModuleTypes = RepoWithFiletypes & {
  moduleTypes: { [k: string]: number };
};

async function getModuleTypeFromPackageJSON(
  octokit: any, // todo
  owner: string,
  repo: string,
  branch: string,
  path: string // path to package.json
): Promise<string | void> {
  try {
    const res = await octokit.request(
      `GET /repos/{owner}/{repo}/contents/${path}?ref=${branch}`,
      {
        owner,
        repo,
        branch,
        headers: {
          Accept: "application/vnd.github.raw+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    try {
      const { type } = JSON.parse(res.data);
      console.log(
        `got module types for ${owner}/${repo}/${path} (${branch}):`,
        type
      );
      return type;
    } catch (e) {
      return undefined; // skip malformed json
    }
  } catch (e) {
    // don't fail when we see 404s
    if (e.status === 404) {
      return undefined;
    }
    throw e;
  }
}

async function main() {
  const octokit = await getOctokit();
  const all = (await import("p-all")).default; // todo

  const tallies = (
    JSON.parse(
      readFileSync("./data/filetypes.json", "utf8")
    ) as RepoWithFiletypes[]
  ).filter((_) => !("moduleTypes" in _));

  for (const tally of tallies) {
    const moduleTypes = await all(
      (tally.packageJSONs ?? [])
        .filter((_) => !_.includes("#"))
        .filter((_) => !_.includes("/node_modules/"))
        .filter((_) => !_.includes("/__tests__/"))
        .filter((_) => !_.includes("/test/"))
        .filter((_) => !_.includes("/system-tests/"))
        .map(
          (p) => () =>
            getModuleTypeFromPackageJSON(
              octokit,
              tally.owner,
              tally.repo,
              tally.branch,
              p
            )
        ),
      { concurrency: 1 }
    );

    (tally as RepoWithFiletypesAndModuleTypes).moduleTypes = moduleTypes.reduce(
      (p, c) => {
        const moduleType = c || "undefined";
        if (!p.hasOwnProperty(moduleType)) {
          p[moduleType] = 0;
        }
        p[moduleType]++;
        return p;
      },
      {}
    );

    if ((tally as RepoWithFiletypesAndModuleTypes).moduleTypes.length) {
      console.log(
        `Found module types for ${tally.owner}/${tally.repo}:`,
        (tally as RepoWithFiletypesAndModuleTypes).moduleTypes
      );
    }

    // save each time since this endpoint tends to get rate limited
    writeFileSync(
      "data/filetypes-and-modules.json",
      JSON.stringify(tallies, null, 4)
    );
  }
}

async function getOctokit() {
  const { Octokit } = await import("octokit"); // todo
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
}

main();

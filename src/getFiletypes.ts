import "dotenv/config";
import { extname } from "path";
import { Repo } from "./getRepos";
import { writeFileSync } from "fs";

async function getOctokit() {
  const { Octokit } = await import("octokit"); // todo
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
}

type Tallies = { [ext: string]: number };
export type RepoWithFiletypes = Repo & {
  packageJSONs: string[];
  tallies: Tallies;
};

async function getFiletypes(
  octokit: any, // todo
  owner: string,
  repo: string,
  branch: string
): Promise<{ packageJSONs: string[]; tallies: Tallies }> {
  const res = await octokit.request(
    `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`,
    {
      owner,
      repo,
      branch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const paths: string[] = res.data.tree.map((_) => _.path);
  // todo: handle trees with >100k files
  return {
    packageJSONs: paths.filter((_) => _.endsWith("package.json")),
    tallies: computeTallies(paths),
  };
}

function computeTallies(paths: string[]): Tallies {
  return paths
    .map((_) => extname(_).slice(1))
    .filter(Boolean)
    .reduce((tallies, ext) => {
      if (!tallies.hasOwnProperty(ext)) {
        tallies[ext] = 0;
      }
      tallies[ext]++;
      return tallies;
    }, {});
}

async function main() {
  const octokit = await getOctokit();
  const repos: Repo[] = require("../data/repos.json");
  const tallies = await Promise.all(
    repos.map(async (_) => {
      const { packageJSONs, tallies } = await getFiletypes(
        octokit,
        _.owner,
        _.repo,
        _.branch
      );
      console.info(`got filetypes for ${_.owner}/${_.repo}`);
      return { ..._, packageJSONs, tallies };
    })
  );
  console.log(`got ${tallies.length} filetypes`);
  writeFileSync("data/filetypes.json", JSON.stringify(tallies, null, 4));
}

main();

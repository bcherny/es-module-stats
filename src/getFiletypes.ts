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

async function getFiletypes(
  owner: string,
  repo: string,
  branch: string
): Promise<{ [ext: string]: number }> {
  const octokit = await getOctokit();
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

  // todo: handle trees with >100k files
  return res.data.tree
    .map((_) => extname(_.path).slice(1))
    .filter(Boolean)
    .reduce((tallies, ext) => {
      if (!tallies.hasOwnProperty(ext)) {
        tallies[ext] = 0;
      }
      tallies[ext]++;
      return tallies;
    }, {});
}

export type RepoWithFiletypes = Repo & { tallies: { [ext: string]: number } };

async function main() {
  const repos: Repo[] = require("../data/repos.json");
  const tallies = await Promise.all(
    repos.map(async (_) => {
      const tallies = await getFiletypes(_.owner, _.repo, _.branch);
      console.info(`got filetypes for ${_.owner}/${_.repo}`);
      return { ..._, tallies };
    })
  );
  console.log(`got ${tallies.length} filetypes`);
  writeFileSync("data/filetypes.json", JSON.stringify(tallies, null, 4));
}

main();

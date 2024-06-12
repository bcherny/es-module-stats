import { writeFileSync } from "fs";
import { RepoWithFiletypes } from "./getFiletypes";

async function getModuleTypeFromPackageJSON(
  octokit: any, // todo
  owner: string,
  repo: string,
  branch: string,
  path: string // path to package.json
): Promise<string | void> {
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
  return res.data.type;
}

type TODO = any;

async function main() {
  const octokit = await getOctokit();
  const tallies: RepoWithFiletypes[] = require("../data/filetypes.json");
  await Promise.all(
    tallies
      .filter((_) => !("moduleTypes" in _))
      .map(async (_) => {
        (_ as TODO).moduleTypes = (
          await Promise.all(
            (_.packageJSONs ?? []).map((p) =>
              getModuleTypeFromPackageJSON(
                octokit,
                _.owner,
                _.repo,
                _.branch,
                p
              )
            )
          )
        ).filter(Boolean) as string[]; // todo;

        // save each time since this endpoint tends to get rate limited
        writeFileSync("data/filetypes.json", JSON.stringify(tallies, null, 4));
      })
  );
  console.log(`got ${tallies.length} module types`);
}

async function getOctokit() {
  const { Octokit } = await import("octokit"); // todo
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
}

main();

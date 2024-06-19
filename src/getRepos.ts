import { exec as execCb } from "child_process";
import { writeFileSync } from "fs";
import { promisify } from "util";

const exec = promisify(execCb);

export type Repo = {
  repo: string;
  branch: string;
  language: string;
  owner: string;
};

async function getReposAtPage(language: string, page: number): Promise<Repo[]> {
  const { stdout, stderr } = await exec(
    `gh api -X GET search/repositories -F page=${page} -F per_page=100 -f q='language:${language} stars:>=5000 archived:false sort:stars'`
  );
  if (stderr) {
    throw stderr;
  }
  const res = JSON.parse(stdout).items.map((_) => {
    const [owner, repo] = _.full_name.split("/");
    return {
      owner,
      repo,
      branch: _.default_branch,
      language,
    };
  });
  console.info(`got ${res.length} ${language} repos`);
  return res;
}

async function getRepos(language: string): Promise<Repo[]> {
  return (
    await Promise.all(
      [...Array(10)]
        .map((_, k) => k + 1)
        .map((_) => getReposAtPage(language, _))
    )
  )
    .flat()
    .filter(Boolean);
}

async function main() {
  const repos = (
    await Promise.all([getRepos("javascript"), getRepos("typescript")])
  ).flat();
  console.log(`got ${repos.length} repos`);
  writeFileSync("data/repos.json", JSON.stringify(repos, null, 4));
}

main().then((res) => {
  console.log("done", res);
});

> This project collects statistics about ES Module adoption across TypeScript and JavaScript projects, across NPM and Github.

## Context

ES Modules (`import`/`export`) were introduced in [2015](https://262.ecma-international.org/6.0/#sec-modules), and NodeJS has supported `type=module/commonjs`, .mjs, and .cjs, with the goal of replacing .js, since [2019](https://nodejs.org/api/packages.html#type).

This repo tries to understand the degree to which .mjs, .cjs, and `type` have been adopted across the JavaScript/TypeScript ecosystems.

Also see [this history](https://gist.github.com/jkrems/769a8cd8806f7f57903b641c74b5f08a).

## Results

Github (1.8k most popular JS/TS repos)

|                                                                  | JavaScript | TypeScript |
| ---------------------------------------------------------------- | ---------- | ---------- |
| % of package.jsons that have a `type` field                      | 9%         | 13%        |
| % of package.jsons that have `type=module`                       | 8%         | 12%        |
| % of files that use ESM file extensions (.mjs, .cjs, .mts, etc.) | 6%         | <1%        |

## Pull NPM data

```sh
$ curl -L -O https://replicate.npmjs.com/_all_docs
$ node --loader ts-node/esm src/getNPMDownloadStats.mts
```

## Generate data

```sh
$ npm install
$ npx ts-node src/getRepos.ts
$ npx ts-node src/getFiletypes.ts
$ npx ts-node src/getModuleTypes.ts
$ npx ts-node src/getTotals.ts
```

## Future improvements

- Get a more accurate count, computing whether each file is an ESM or not (requires moving package.json type collection first)

> This project collects statistics about ES Module adoption across TypeScript and JavaScript projects, across NPM and Github.

## Context

ES Modules (`import`/`export`) were introduced in [2015](https://262.ecma-international.org/6.0/#sec-modules), and NodeJS has supported `type=module/commonjs`, .mjs, and .cjs, with the goal of replacing .js, since [2019](https://nodejs.org/api/packages.html#type).

This repo tries to understand the degree to which .mjs, .cjs, and `type` have been adopted across the JavaScript/TypeScript ecosystems.

Also see [this history](https://gist.github.com/jkrems/769a8cd8806f7f57903b641c74b5f08a).

## Results

tl;dr:

1. Adoption of ES Modules is between 8-27%, depending how you measure it
2. Adoption of ES Modules is between 9-27% via package.json, and 0-6% via file extension

### Github

1.8k most popular JS/TS repos, via Github API

| Metric                                                           | JavaScript | TypeScript |
| ---------------------------------------------------------------- | ---------- | ---------- |
| % of package.jsons that have a `type` field                      | 9%         | 13%        |
| % of package.jsons that have `type=module`                       | 8%         | 12%        |
| % of files that use ESM file extensions (.mjs, .cjs, .mts, etc.) | 6%         | <1%        |

### NPM

935 packages with the most weekly downloads, via NPM API

| Metric                                                                                               | %   |
| ---------------------------------------------------------------------------------------------------- | --- |
| % of package.jsons that have a `type` field (or `exports` field with `commonjs` or `module` defined) | 27% |
| % of package.jsons that have `type=module`                                                           | 16% |
| % of files that use ESM file extensions (.mjs, .cjs, .mts, etc.)                                     | <1% |
| % of files that are ES modules (either via package.json or via file extension)                       | 22% |

## Pull NPM data

```sh
$ curl -L -O https://replicate.npmjs.com/_all_docs
$ node --loader ts-node/esm src/getNPMDownloadStats.ts
$ node --loader ts-node/esm src/getTopNPMRepos.ts
$ node --loader ts-node/esm src/getNPMModuleTypes.ts
$ node --loader ts-node/esm src/getNPMTotals.ts
```

## Generate data

```sh
$ npm install
$ node --loader ts-node/esm src/getRepos.ts
$ node --loader ts-node/esm src/getFiletypes.ts
$ node --loader ts-node/esm src/getModuleTypes.ts
$ node --loader ts-node/esm src/getTotals.ts
```

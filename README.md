# Pull NPM data

```sh
$ curl -L -O https://replicate.npmjs.com/_all_docs
```

# Generate data

```sh
$ npm install
$ npx ts-node src/getRepos.ts
$ npx ts-node src/getFiletypes.ts
$ npx ts-node src/getModuleTypes.ts
$ npx ts-node src/getTotals.ts
```

## Future improvements

- Get a more accurate count, computing whether each file is an ESM or not (requires moving package.json type collection first)

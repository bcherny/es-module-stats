import { writeFileSync } from "fs";
import { RepoWithFiletypes } from "./getFiletypes";

function main() {
  const tallies: RepoWithFiletypes[] = require("../data/filetypes.json");
  const totals = {
    javascript: {
      // js
      js: 0,
      jsx: 0,
      cjs: 0,
      cjsx: 0,
      mjs: 0,
      mjsx: 0,
      // ts
      ts: 0,
      tsx: 0,
      cts: 0,
      ctsx: 0,
      mts: 0,
      mtsx: 0,
    },
    typescript: {
      // js
      js: 0,
      jsx: 0,
      cjs: 0,
      cjsx: 0,
      mjs: 0,
      mjsx: 0,
      // ts
      ts: 0,
      tsx: 0,
      cts: 0,
      ctsx: 0,
      mts: 0,
      mtsx: 0,
    },
  };
  tallies.forEach((_) => {
    Object.entries(_.tallies).forEach(([ext, tally]) => {
      if (!totals[_.language].hasOwnProperty(ext)) {
        return;
      }
      totals[_.language][ext] += tally;
    });
    console.log(`counted totals for ${_.owner}/${_.repo}`);
  });
  writeFileSync(
    "data/totals-by-filetype.json",
    JSON.stringify(totals, null, 4)
  );
}

main();

import { hashBlob } from "isomorphic-git";
import { join } from "path";
import { hashObject } from "./utils/hashObject";
import { GitTree, IndexEntries as IndexEntry } from "./utils/tree";

const run = async () => {
  console.log(
    hashObject({
      data: "blob",
      objectType: "blob",
    })?.data
  );

  console.log((await hashBlob({ object: "data" })).object);

  new GitTree();

  new IndexEntry(join(__dirname, ".."), join("README.md"));
};

run();

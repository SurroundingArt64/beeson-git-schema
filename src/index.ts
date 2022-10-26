import { hashBlob } from "isomorphic-git";
import { join } from "path";
import { hashObject } from "./utils/hashObject";
import { GitTree } from "./utils/tree";

const run = async () => {
  console.log(
    hashObject({
      data: "blob",
      objectType: "blob",
    })?.data
  );

  console.log((await hashBlob({ object: "data" })).object);

  const tree = new GitTree(join(__dirname, ".."));
  const readmeIndexEntry = tree.addIndexEntry("README.md");

  const data = readmeIndexEntry.deserialize();
  console.log(data);
};

run();

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

  const tree = GitTree.create(join(__dirname, ".."));
  const readMeEntry = tree.addIndexEntry("README.md");
  const gitIgnoreEntry = tree.addIndexEntry(".gitignore");

  console.log("====from initial====");
  gitIgnoreEntry.deserialize();
  console.log(gitIgnoreEntry.filePath);
  readMeEntry.deserialize();
  console.log(readMeEntry.filePath);

  console.log("====from buffer====");
  const treeFromBuffer = GitTree.fromBuffer(tree.currentBuffer, tree.objects);

  treeFromBuffer.indexEntries.map((e) => {
    e.deserialize();
    console.log(e.filePath, e.getFileData());
  });
};

run();

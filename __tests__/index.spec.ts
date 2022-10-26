import { hashBlob } from "isomorphic-git";
import { hashObject } from "../src/utils/hashObject";
import { GitState, GitTree, IndexEntry } from "../src";
import { join } from "path";
import { BeeSon } from "@fairdatasociety/beeson";
describe("test", () => {
  it("ok", async () => {
    console.log(
      hashObject({
        data: "blob",
        objectType: "blob",
      })?.data
    );

    console.log((await hashBlob({ object: "data" })).object);

    GitState.initialize(join(__dirname, ".."));

    const tree = GitTree.create(".");

    const readMeEntry = tree.addIndexEntry("README.md");
    const gitIgnoreEntry = tree.addIndexEntry(".gitignore");

    console.log("====from initial====");
    gitIgnoreEntry.deserialize();
    console.log(gitIgnoreEntry.filePath);
    readMeEntry.deserialize();
    console.log(readMeEntry.filePath);

    console.log("====from buffer====");
    const treeFromBuffer = GitTree.fromBuffer(tree.currentBuffer, ".");

    treeFromBuffer.entries.map((e) => {
      e.deserialize();
      if (e instanceof IndexEntry) {
        console.log(e.filePath, e.getFileData());
      }
    });

    // complete end to end flow
    GitState.resetState();
    const authorData = {
      email: "97761020+SurroundingArt64@users.noreply.github.com",
      name: "SurroundingArt64",
      time: Math.floor(Date.now() / 1000),
      timeZoneOffset: {
        negative: false,
        value: "0000",
      },
    };
    GitState.initializeTreeAndCommit(join(__dirname, "..", "test_repo"), {
      author: authorData,
      committer: authorData,
      message: "feat: initial commit",
      treeHash: "",
    }).entries.map((e) => {
      if (e instanceof IndexEntry) {
        console.log(
          `${e.definitions.mode.value.toString(8)} blob ${
            e.definitions.sha.value
          }   ${e.filePath}`
        );
      } else {
        console.log(`040000 tree ${e.sha}   ${e.filePath}`);
      }
    });

    const beeSon = new BeeSon({
      json: { refs: GitState.toArray(), indexHash: GitState.indexCommitHash },
    });

    /// schema definition
    expect(beeSon).toBe;
  });
});

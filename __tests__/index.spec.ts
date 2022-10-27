import { hashBlob } from "isomorphic-git";
import { hashObject } from "../src/utils/hashObject";
import { GitState, GitTree, IndexEntry } from "../src";
import { join } from "path";
import { BeeSon } from "@fairdatasociety/beeson";
import { GitSchemaError } from "../src/error";
describe("test", () => {
  it("GitTree cannot add root as child", () => {
    let gitState = new GitState();
    try {
      GitTree.create(gitState, ".").addTree(GitTree.create(gitState, "."));
    } catch (error) {
      expect(error instanceof GitSchemaError).toBe(true);

      if (error instanceof GitSchemaError) {
        expect(error.message).toBe("Cannot have root as a child");
      }
    }
  });

  it("runs (ok)", async () => {
    console.log(
      hashObject({
        data: "blob",
        objectType: "blob",
      })?.data
    );

    console.log((await hashBlob({ object: "data" })).object);

    let gitState = new GitState();

    gitState.initialize(join(__dirname, ".."));

    const tree = GitTree.create(gitState, ".");

    const readMeEntry = tree.addIndexEntry("README.md");
    tree.addIndexEntry("README.md");
    const gitIgnoreEntry = tree.addIndexEntry(".gitignore");

    console.log("====from initial====");
    gitIgnoreEntry.deserialize();
    console.log(gitIgnoreEntry.filePath);
    readMeEntry.deserialize();
    console.log(readMeEntry.filePath);

    console.log("====from buffer====");
    const treeFromBuffer = GitTree.fromBuffer(
      gitState,
      tree.currentBuffer,
      "."
    );

    treeFromBuffer.entries.map((e) => {
      e.deserialize();
      if (e instanceof IndexEntry) {
        console.log(e.filePath, e.getFileData());
      }
    });

    // complete end to end flow
    // can also create a new gitState now
    gitState.resetState();
    const authorData = {
      email: "97761020+SurroundingArt64@users.noreply.github.com",
      name: "SurroundingArt64",
      time: Math.floor(Date.now() / 1000),
      timeZoneOffset: {
        negative: false,
        value: "0000",
      },
    };
    gitState
      .initializeTreeAndCommit(join(__dirname, "..", "test_repo"), {
        author: authorData,
        committer: authorData,
        message: "feat: initial commit",
        treeHash: "",
      })
      .entries.map((e) => {
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
      json: { refs: gitState.toArray(), indexHash: gitState.indexCommitHash },
    });

    /// schema definition
    expect(beeSon).toMatchObject({});
  });
});

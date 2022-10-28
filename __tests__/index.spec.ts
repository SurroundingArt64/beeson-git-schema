import { hashBlob } from "isomorphic-git";
import { hashObject } from "../src/utils/hashObject";
import { GitState, GitTree, IndexEntry } from "../src";
import { join } from "path";
import { BeeSon } from "@fairdatasociety/beeson";
import { GitSchemaError } from "../src/error";

import { expect } from "chai";

describe("test", () => {
  it("GitTree cannot add root as child", () => {
    let gitState = new GitState();
    expect(gitState.version()).to.eq("2");
    try {
      GitTree.create(gitState, ".").addTree(GitTree.create(gitState, "."));
    } catch (error) {
      expect(error instanceof GitSchemaError).to.eq(true);

      if (error instanceof GitSchemaError) {
        expect(error.message).to.eq("Cannot have root as a child");
      }
    }
  });

  it("runs (ok)", async () => {
    const fromLib = hashObject({
      data: "data",
      objectType: "blob",
    })?.data;

    const fromIso = (await hashBlob({ object: "data" })).object;

    expect(fromIso.toString()).to.eq(fromLib.toString());

    let gitState = new GitState();

    gitState.initialize(join(__dirname, "..", "test_repo"));

    const tree = GitTree.create(gitState, ".");

    const readMeEntry = tree.addIndexEntry("README.md");
    tree.addIndexEntry("README.md");
    const gitIgnoreEntry = tree.addIndexEntry(".gitignore");

    gitIgnoreEntry.deserialize();
    expect(gitIgnoreEntry.filePath).to.eq(".gitignore");
    readMeEntry.deserialize();
    expect(readMeEntry.filePath).to.eq("README.md");

    const treeFromBuffer = GitTree.fromBuffer(
      gitState,
      tree.currentBuffer,
      "."
    );

    treeFromBuffer.entries.map((e) => {
      e.deserialize();
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
    gitState.initializeTreeAndCommit(join(__dirname, "..", "test_repo"), {
      author: authorData,
      committer: authorData,
      message: "feat: initial commit",
      treeHash: "",
    });

    const beeSon = new BeeSon({
      json: { refs: gitState.toArray(), indexHash: gitState.indexCommitHash },
    });

    /// schema definition
    expect(beeSon).ok;
  });
});

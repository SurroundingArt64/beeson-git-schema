import { join } from "path";
import { GitState } from "../src";

describe("Tree", () => {
  it("add tree", () => {
    let gitState = new GitState();
    gitState.initializeTree(join(__dirname, "..", "test_repo"));
    gitState.root.deserialize();
  });
});

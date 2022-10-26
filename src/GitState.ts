import { lstatSync, readdirSync } from "fs";
import { join } from "path";
import { GitSchemaError } from "./error";
import { GitTree } from "./utils/tree";

export type ObjectsType = {
  [key: string]: {
    data: Buffer;
    type: "blob" | "commit" | "tree";
  };
};

export class GitState {
  private static _objects: ObjectsType = {};

  public static get objects(): ObjectsType {
    return this._objects;
  }

  private static _repoPath: string = "";
  public static get repoPath(): string {
    return GitState._repoPath;
  }

  static root: GitTree;

  public static initialize(repoPath: string) {
    this._repoPath = repoPath;
  }

  public static initializeTree(repoPath: string) {
    this._repoPath = repoPath;
    return this._createTree(repoPath, ".", true);
  }

  private static _createTree(
    relativePath: string,
    dirPath: string,
    root?: boolean
  ) {
    const completePath = join(relativePath, dirPath);
    if (!lstatSync(completePath).isDirectory()) {
      throw new GitSchemaError("Received a non directory");
    }

    let tree: GitTree = GitTree.create(root ? "." : dirPath);

    const files = readdirSync(completePath);

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const stats = lstatSync(join(completePath, file));

      if (stats.isDirectory()) {
        tree.addTree(this._createTree(relativePath, join(dirPath, file)));
      } else {
        tree.addIndexEntry(join(dirPath, file));
      }
    }
    return tree;
  }

  public static resetState() {
    this._repoPath = "";
    this._objects = {};
  }
}

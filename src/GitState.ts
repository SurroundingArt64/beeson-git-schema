import { lstatSync, readdirSync } from "fs";
import { join } from "path";
import { GitSchemaError } from "./error";
import { Commit, CommitConstructor } from "./utils/commit";
import { GitTree } from "./utils/tree";

export type ObjectsType = {
  [key: string]: {
    data: Buffer;
    type: "blob" | "commit" | "tree";
  };
};

export class GitState {
  private _objects: ObjectsType = {};

  public get objects(): ObjectsType {
    return this._objects;
  }

  public toArray() {
    const data: {
      key: string;
      data: Buffer;
      type: "blob" | "commit" | "tree";
    }[] = [];
    Object.entries(this._objects).map(([key, value]) => {
      data.push({ ...value, key });
    });
    return data;
  }

  private _repoPath: string = "";
  public get repoPath(): string {
    return this._repoPath;
  }

  root: GitTree;
  indexCommitHash: string;

  public initialize(repoPath: string) {
    this._repoPath = repoPath;
  }

  public initializeTree(repoPath: string) {
    this._repoPath = repoPath;
    return this._createTree(repoPath, ".", true);
  }

  initializeTreeAndCommit = (
    repoPath: string,
    commitData: CommitConstructor
  ) => {
    this.initializeTree(repoPath);
    this.addCommit(commitData);

    return this.root;
  };

  private _commits: Commit[] = [];
  public get commits(): Commit[] {
    return this._commits;
  }

  addCommit = (commitData: CommitConstructor) => {
    if (this.commits.length === 0) {
      this.commits.push(
        Commit.create(this, { ...commitData, treeHash: this.root.sha })
      );
    } else {
      const createdCommit = Commit.create(this, {
        ...commitData,
        treeHash: this.root.sha,
        parent: this.commits.at(-1),
      });

      if (this.commits.at(-1)!.deserialize().tree !== this.root.sha) {
        this.commits.push(createdCommit);
      }
    }

    this.indexCommitHash = this.commits.at(-1)!.sha;
  };

  private _createTree = (
    relativePath: string,
    dirPath: string,
    root?: boolean
  ) => {
    const completePath = join(relativePath, dirPath);
    if (!lstatSync(completePath).isDirectory()) {
      throw new GitSchemaError("Received a non directory");
    }

    let tree: GitTree = GitTree.create(this, root ? "." : dirPath);

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

    if (root) {
      this.root = tree;
    }
    return tree;
  };

  public resetState = () => {
    this._repoPath = "";
    this._objects = {};
  };
}

import { assert } from "./index";
import { GitState } from "../GitState";
import { hashObject } from "./hashObject";
import { GitSchemaError } from "../error";
import { IndexEntry } from "./indexEntry";
import { getNumberFromBuffer } from ".";

/**
 * All binary numbers are in network byte order.
 *
 * In a repository using the traditional SHA-1, checksums and object IDs
 * (object names) mentioned below are all computed using SHA-1.
 */
export class GitTree {
  /// 12 byte header
  header = {
    /// 4-byte signature
    signature: { value: "DIRC", length: 4 },
    /// 4-byte version number
    version: { value: 2, length: 4 },
    /// 32-bit number of index entries
    entries: { value: 0, length: 4 },
  };

  private _sha: string;
  public get sha(): string {
    return this._sha;
  }

  private _filePath: string;
  public get filePath(): string {
    return this._filePath;
  }

  private _indexEntries: (IndexEntry | GitTree)[] = [];
  public get entries(): (IndexEntry | GitTree)[] {
    return this._indexEntries;
  }

  private _currentBuffer = Buffer.from([]);
  public get currentBuffer() {
    return this._currentBuffer;
  }

  private _gitState: GitState;
  public get gitState(): GitState {
    return this._gitState;
  }

  static fromBuffer(
    gitState: GitState,
    buf: Buffer,
    filePath: string
  ): GitTree {
    const _object = new GitTree();

    _object._currentBuffer = buf;

    _object._filePath = filePath;

    _object._gitState = gitState;

    _object.deserialize();

    return _object;
  }

  static create(gitState: GitState, filePath: string): GitTree {
    const _object = new GitTree();

    _object.serialize();

    _object._filePath = filePath;

    _object._gitState = gitState;

    return _object;
  }

  deserialize() {
    let currentBuffer = this._currentBuffer;

    assert(currentBuffer.subarray(0, 4).toString() === "DIRC");
    assert(getNumberFromBuffer(currentBuffer.subarray(4, 8)) === 2);
    const numberOfEntries = getNumberFromBuffer(currentBuffer.subarray(8, 12));

    let leftOverBuffer = currentBuffer.subarray(12);

    for (let index = 0; index < numberOfEntries; index++) {
      let indexEntry = IndexEntry.withoutDeserialization(leftOverBuffer);
      ({ leftOverBuffer } = indexEntry.deserialize());
      indexEntry.updateCompressed(
        this._gitState.objects[indexEntry.definitions.sha.value].data
      );
      this._indexEntries.push(indexEntry);
    }

    this._sha = hashObject({
      data: this._currentBuffer.toString(),
      objectType: "tree",
    }).hash;

    return { numberOfEntries };
  }

  private serialize() {
    let currentBuffer = Buffer.from([]);
    Object.entries(this.header).map(([_key, { value, length }]) => {
      let buf = Buffer.alloc(length);
      if (typeof value === "number") {
        buf.writeInt32BE(value);
      } else {
        buf.write(value, length - value.length);
      }
      currentBuffer = Buffer.concat([currentBuffer, buf]);
    });

    this._indexEntries.forEach((e) => {
      currentBuffer = Buffer.concat([currentBuffer, e.currentBuffer]);
    });

    this._currentBuffer = currentBuffer;

    this._sha = hashObject({
      data: this._currentBuffer.toString(),
      objectType: "tree",
    }).hash;
  }

  addTree(tree: GitTree) {
    const loc = this.entries.map((e) => e.filePath).indexOf(tree.filePath);

    if (loc === -1) {
      this.entries.push(tree);
    }
    this.entries.sort((a, b) => {
      if (b.filePath === "." || a.filePath === ".") {
        throw new GitSchemaError("Cannot have root as a child");
      }
      return a.filePath.localeCompare(b.filePath);
    });

    this.header.entries.value = this.entries.length;

    this._gitState.objects[tree.sha] = {
      data: tree.currentBuffer,
      type: "tree",
    };
  }

  addIndexEntry(filePath: string) {
    const loc = this.entries.map((e) => e.filePath).indexOf(filePath);

    const indexEntry =
      loc === -1
        ? IndexEntry.create(this._gitState.repoPath, filePath)
        : this.entries[loc];

    if (indexEntry instanceof IndexEntry) {
      this._gitState.objects[indexEntry.definitions.sha.value] = {
        data: indexEntry.compressed,
        type: "blob",
      };

      if (loc === -1) {
        this.entries.push(indexEntry);
      } else {
        (this.entries[loc] as IndexEntry).serialize(this._gitState.repoPath);
      }
    }

    this.header.entries.value = this.entries.length;

    this.entries.sort((a, b) => {
      if (b.filePath === "." || a.filePath === ".") {
        throw new GitSchemaError("Cannot have root as a child");
      }
      return a.filePath.localeCompare(b.filePath);
    });

    this.serialize();

    return this.entries[this.entries.map((e) => e.filePath).indexOf(filePath)];
  }
}

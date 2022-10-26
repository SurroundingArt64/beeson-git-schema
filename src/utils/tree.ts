import assert from "assert";
import { readFileSync } from "fs";
import { GitState } from "../GitState";
import { deflateSync } from "zlib";
import { hashObject } from "./hashObject";
import { GitSchemaError } from "../error";
import { IndexEntry } from "./indexEntry";

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

  static fromBuffer(buf: Buffer, filePath: string): GitTree {
    const _object = new GitTree();

    _object._currentBuffer = buf;

    _object._filePath = filePath;

    _object.deserialize();

    return _object;
  }

  static create(filePath: string): GitTree {
    const _object = new GitTree();

    _object.serialize();

    _object._filePath = filePath;

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
        GitState.objects[indexEntry.definitions.sha.value].data
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

    GitState.objects[tree.sha] = {
      data: tree.currentBuffer,
      type: "tree",
    };
  }

  addIndexEntry(filePath: string) {
    const loc = this.entries.map((e) => e.filePath).indexOf(filePath);

    const indexEntry =
      loc === -1
        ? IndexEntry.create(GitState.repoPath, filePath)
        : this.entries[loc];

    if (indexEntry instanceof IndexEntry) {
      GitState.objects[indexEntry.definitions.sha.value] = {
        data: indexEntry.compressed,
        type: "blob",
      };

      if (loc === -1) {
        this.entries.push(indexEntry);
      } else {
        (this.entries[loc] as IndexEntry).serialize(GitState.repoPath);
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

export function msToNano(timeInMs: number) {
  return ((timeInMs * 1000) % 1000000) * 1000;
}

export function getNumberFromBuffer(buf: Buffer) {
  return Number("0x" + buf.toString("hex"));
}

export function getFlags(base: number) {
  let baseEncoded = base.toString(2);
  baseEncoded =
    new Array(16 - baseEncoded.length).fill(0).join("") + baseEncoded;
  /// ignored
  const valid_flag = baseEncoded.slice(0, 1);
  /// ignored
  const extended_flag = baseEncoded.slice(1, 2);
  /// ignored
  const stage_flag = Number(baseEncoded.slice(2, 4));
  /// ignored
  const file_name_length = Number("0b" + baseEncoded.slice(4));
  return {
    base: baseEncoded,
    valid_flag,
    extended_flag,
    stage_flag,
    file_name_length,
  };
}

export const getBlob = (completePath: string) => {
  const data = readFileSync(completePath).toString();
  const buf = deflateSync(data);
  return buf;
};

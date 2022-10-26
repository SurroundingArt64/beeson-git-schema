import assert from "assert";
import { readFileSync, statSync } from "fs";
import { userInfo } from "os";
import { resolve } from "path";
import { deflateSync, inflateSync } from "zlib";
import { hashObject } from "./hashObject";

type ObjectsType = {
  [key: string]: {
    data: Buffer;
    type: "blob" | "commit" | "tree";
  };
};

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

  private _indexEntries: IndexEntry[] = [];
  public get indexEntries(): IndexEntry[] {
    return this._indexEntries;
  }

  private _currentBuffer = Buffer.from([]);
  public get currentBuffer() {
    return this._currentBuffer;
  }

  private _repoPath: string;
  public get repoPath(): string {
    return this._repoPath;
  }

  static fromBuffer(buf: Buffer, gitObjects: ObjectsType): GitTree {
    const _object = new GitTree();

    _object._currentBuffer = buf;

    _object._objects = gitObjects;

    _object._repoPath = "";
    _object.deserialize();

    return _object;
  }

  static create(repoPath: string): GitTree {
    const _object = new GitTree();
    _object._repoPath = repoPath;
    _object.serialize();

    return _object;
  }

  private _objects: ObjectsType = {};

  public get objects(): {
    [key: string]: { data: Buffer; type: "blob" | "commit" | "tree" };
  } {
    return this._objects;
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
        this.objects[indexEntry.definitions.sha.value].data
      );
      this._indexEntries.push(indexEntry);
    }

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
      currentBuffer = Buffer.concat([currentBuffer, e.baseBuffer]);
    });

    this._currentBuffer = currentBuffer;
  }

  addIndexEntry(filePath: string) {
    const loc = this.indexEntries.map((e) => e.filePath).indexOf(filePath);
    const indexEntry =
      loc === -1
        ? IndexEntry.create(this._repoPath, filePath)
        : this.indexEntries[loc];

    this.objects[indexEntry.definitions.sha.value] = {
      data: indexEntry.compressed,
      type: "blob",
    };

    if (loc === -1) {
      this.indexEntries.push(indexEntry);
    } else {
      this.indexEntries[loc].serialize(this._repoPath);
    }

    this.header.entries.value = this.indexEntries.length;

    this.indexEntries.sort((a, b) => {
      return a.filePath.localeCompare(b.filePath);
    });

    this.serialize();

    return this.indexEntries[
      this.indexEntries.map((e) => e.filePath).indexOf(filePath)
    ];
  }
}

/**
 * Index entries are sorted in ascending order on the name field,
 * interpreted as a string of unsigned bytes (i.e. memcmp() order, no
 * localization, no special casing of directory separator '/'). Entries
 * with the same name are sorted by their stage field.
 */
export class IndexEntry {
  private _baseBuffer = Buffer.from([]);

  private _compressed: Buffer;
  public get compressed(): Buffer {
    return this._compressed;
  }

  updateCompressed(compressed: Buffer) {
    this._compressed = compressed;
  }

  getFileData() {
    return inflateSync(this._compressed).toString();
  }

  public get baseBuffer() {
    return this._baseBuffer;
  }

  private _filePath: string;
  public get filePath(): string {
    return this._filePath;
  }

  static withoutDeserialization(baseBuffer: Buffer): IndexEntry {
    let _object = new IndexEntry();

    _object._filePath = "";

    _object._baseBuffer = baseBuffer;

    return _object;
  }

  static fromBuffer(baseBuffer: Buffer): IndexEntry {
    let _object = new IndexEntry();

    _object._filePath = "";

    _object._baseBuffer = baseBuffer;

    _object.deserialize();

    return _object;
  }

  static create(repoPath: string, filePath: string): IndexEntry {
    let _object = new IndexEntry();

    _object._filePath = filePath;

    _object.serialize(repoPath);

    return _object;
  }

  definitions: {
    ctime: { value: number; length?: number };
    ctimeNano: { value: number; length?: number };
    /// metadata
    mtime: { value: number; length?: number };
    mtimeNano: { value: number; length?: number };
    /// dev id
    dev: { value: number; length?: number };
    ino: { value: number; length?: number };
    mode: { value: number; length?: number };
    uid: { value: number; length?: number };
    gid: { value: number; length?: number };
    fileSize: { value: number; length?: number };
    sha: { value: string; length?: number };
    flags: {
      value: number;
      length?: number;
    };
  };

  deserialize() {
    let baseBuffer = this._baseBuffer;

    const definitions = {
      ctime: {
        value: getNumberFromBuffer(baseBuffer.subarray(0, 4)),
        length: 4,
      },
      ctimeNano: {
        value: getNumberFromBuffer(baseBuffer.subarray(4, 8)),
        length: 4,
      },
      /// metadata
      mtime: {
        value: getNumberFromBuffer(baseBuffer.subarray(8, 12)),
        length: 4,
      },
      mtimeNano: {
        value: getNumberFromBuffer(baseBuffer.subarray(12, 16)),
        length: 4,
      },
      /// dev id
      dev: {
        value: getNumberFromBuffer(baseBuffer.subarray(16, 20)),
        length: 4,
      },
      ino: {
        value: getNumberFromBuffer(baseBuffer.subarray(20, 24)),
        length: 4,
      },
      mode: {
        value: getNumberFromBuffer(baseBuffer.subarray(24, 28)),
        length: 4,
      },
      uid: {
        value: getNumberFromBuffer(baseBuffer.subarray(28, 32)),
        length: 4,
      },
      gid: {
        value: getNumberFromBuffer(baseBuffer.subarray(32, 36)),
        length: 4,
      },
      fileSize: {
        value: getNumberFromBuffer(baseBuffer.subarray(36, 40)),
        length: 4,
      },
      sha: { value: baseBuffer.subarray(40, 60).toString("hex"), length: 20 },
      flags: {
        value: getFlags(getNumberFromBuffer(baseBuffer.subarray(60, 62)))
          .file_name_length,
        length: 2,
      },
    };

    this.definitions = definitions;

    const internalIndexLength = 62 + definitions.flags.value;
    this._filePath = baseBuffer.subarray(62, internalIndexLength).toString();

    const addedNullLength = 8 - (internalIndexLength % 8);

    const leftOverBuffer = baseBuffer.subarray(
      internalIndexLength + addedNullLength
    );

    // const compressedLength = getNumberFromBuffer(
    //   compressedBuffer.subarray(0, 4)
    // );

    // const fileData = inflateSync(
    //   compressedBuffer.subarray(4, compressedLength + 4)
    // ).toString();

    // this._compressed = compressedBuffer.subarray(4, compressedLength + 4);

    // const leftOverBuffer = compressedBuffer.subarray(compressedLength + 4);

    this._baseBuffer = this._baseBuffer.subarray(
      0,
      this._baseBuffer.length - leftOverBuffer.length
    );

    return {
      ...definitions,
      leftOverBuffer,
    };
  }

  serialize(repoPath: string) {
    const filePath = this._filePath;
    let baseBuffer = Buffer.from([]);
    const completePath = resolve(repoPath, filePath);

    const stats = statSync(completePath);
    const ctime = Math.floor(stats.ctimeMs / 1000);
    const mtime = Math.floor(stats.mtimeMs / 1000);

    const data = readFileSync(completePath).toString();
    const sha = hashObject({
      data: data.toString() ?? "",
      objectType: "blob",
    })!.hash;

    const filePathLength = filePath.length > 0xfff ? 0xfff : filePath.length;
    const definitions = {
      ctime: { value: ctime, length: 4 },
      ctimeNano: { value: msToNano(stats.ctimeMs), length: 4 },
      /// metadata
      mtime: { value: mtime, length: 4 },
      mtimeNano: { value: msToNano(stats.mtimeMs), length: 4 },
      /// dev id
      dev: { value: stats.dev, length: 4 },
      ino: { value: stats.ino, length: 4 },
      mode: { value: stats.mode, length: 4 },
      uid: { value: userInfo().uid, length: 4 },
      gid: { value: userInfo().gid, length: 4 },
      fileSize: { value: stats.size, length: 4 },
      sha: { value: sha, length: 20 },
      flags: {
        value: filePathLength,
        length: 2,
      },
    };

    this.definitions = definitions;

    Object.entries(definitions).map(([key, { value, length }]) => {
      let buf = Buffer.alloc(length);
      if (typeof value === "number") {
        if (key === "flags") {
          buf.writeInt16BE(value);
        } else {
          buf.writeInt32BE(value);
        }
        assert(parseInt(buf.toString("hex"), 16) === value);
      } else {
        buf = Buffer.from(sha, "hex");
      }
      baseBuffer = Buffer.concat([baseBuffer, buf]);
    });

    const addedNullLength = 8 - ((baseBuffer.length + filePathLength) % 8);
    const addedNull = Array.from({ length: addedNullLength }, () => "\0").join(
      ""
    );
    const buf = Buffer.alloc(filePathLength + addedNullLength);
    buf.write(filePath + addedNull);

    baseBuffer = Buffer.concat([baseBuffer, buf]);

    /// add final file data here
    const compressed = getBlob(completePath);
    this._compressed = compressed;

    this._baseBuffer = baseBuffer;
  }
}

function msToNano(timeInMs: number) {
  return ((timeInMs * 1000) % 1000000) * 1000;
}

function getNumberFromBuffer(buf: Buffer) {
  return Number("0x" + buf.toString("hex"));
}

function getFlags(base: number) {
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

const getBlob = (completePath: string) => {
  const data = readFileSync(completePath).toString();
  const buf = deflateSync(data);
  return buf;
};

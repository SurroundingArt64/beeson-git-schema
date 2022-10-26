import assert from "assert";
import { readFileSync, statSync } from "fs";
import { userInfo } from "os";
import { resolve } from "path";
import { hashObject } from "./hashObject";

/**
 * All binary numbers are in network byte order.
 *
 * In a repository using the traditional SHA-1, checksums and object IDs
 * (object names) mentioned below are all computed using SHA-1.
 * Similarly in SHA-256 repositories, these values are computed using SHA-256.
 * Version 2 is described here unless stated otherwise.
 */
export class GitTree {
  /// 12 byte header
  header = {
    /// 4-byte signature
    signature: { value: "DIRC", length: 4 },
    /// 4-byte version number
    version: { value: "2", length: 4 },
    /// 32-bit number of index entries
    entries: { value: "0", length: 4 },
  };

  currentBuffer: Uint8Array[];

  constructor() {
    let buffers: any[] = [];
    Object.entries(this.header).map(([_key, { value, length }]) => {
      let buf = Buffer.alloc(length);
      buf.write(value, length - value.length);
      buffers.push(buf);
    });
  }
}

/**
 * Index entries are sorted in ascending order on the name field,
 * interpreted as a string of unsigned bytes (i.e. memcmp() order, no
 * localization, no special casing of directory separator '/'). Entries
 * with the same name are sorted by their stage field.
 */
export class IndexEntries {
  constructor(repoPath: string, filePath: string) {
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
      console.log(baseBuffer.length);
    });

    // const buf = Buffer.alloc(filePathLength);
    // buf.write(filePath + "\0");

    // baseBuffer = Buffer.concat([baseBuffer, buf]);
    // console.log(baseBuffer.length);
  }
}

function msToNano(timeInMs: number) {
  return ((timeInMs * 1000) % 1000000) * 1000;
}

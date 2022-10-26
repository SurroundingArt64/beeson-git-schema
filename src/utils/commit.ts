import { assert } from "console";
import { GitState } from "../GitState";
import { hashObject } from "./hashObject";

type Author = {
  name: string;
  email: string;
  time: number;
  timeZoneOffset: {
    negative: boolean;
    value: string;
  };
};

export type CommitConstructor = {
  treeHash: string;
  parent?: Commit;
  author: Author;
  committer: Author;
  message: string;
};

export class Commit {
  private _currentBuffer = Buffer.from([]);
  public get currentBuffer() {
    return this._currentBuffer;
  }

  private _sha: string = "";
  public get sha(): string {
    return this._sha;
  }

  static create({
    treeHash,
    parent,
    author,
    committer,
    message,
  }: CommitConstructor): Commit {
    let _commit = new Commit();
    _commit.serialize(treeHash, parent, author, committer, message);

    return _commit;
  }

  static fromBuffer(buf: Buffer): Commit {
    let _commit = new Commit();

    _commit._currentBuffer = buf;

    _commit.deserialize();

    return _commit;
  }

  deserialize() {
    let lines = this._currentBuffer.toString().split("\n");
    let data = { message: "", tree: "" };
    for (let index = 0; index < lines.length; index++) {
      const m = lines[index].match(/^([^ ]+) (.+)$/);
      if (!m) {
        if (lines[index] !== "") {
          throw new Error("Invalid commit line " + index);
        }
        data.message = lines.slice(index + 1).join("\n");
        break;
      } else {
        const key = m[1];
        const value = m[2];

        (data as any)[key] = value;
      }
    }
    return data;
  }

  private serialize(
    treeHash: string,
    parent: Commit | undefined,
    author: Author,
    committer: Author,
    message: string
  ) {
    assert(message && message !== "", "Message cannot be empty");
    const data: string[] = [];

    data.push(`tree ${treeHash}`);
    if (parent) {
      data.push(`parent ${parent.sha}`);
    }
    data.push(
      `author ${author.name} <${author.email}> ${author.time} ${
        author.timeZoneOffset.negative ? "-" : "+"
      }${author.timeZoneOffset.value}`
    );
    data.push(
      `committer ${committer.name} <${committer.email}> ${committer.time} ${
        committer.timeZoneOffset.negative ? "-" : "+"
      }${committer.timeZoneOffset.value}`
    );

    data.push("");

    data.push(message);

    this._sha = hashObject({
      data: data.join("\n"),
      objectType: "commit",
    }).hash;

    this._currentBuffer = Buffer.from(data.join("\n"));

    GitState.objects[this.sha] = {
      type: "commit",
      data: this._currentBuffer,
    };
  }
}

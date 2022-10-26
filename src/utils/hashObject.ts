import { GitSchemaError } from "../error";
import * as crypto from "crypto";
type ObjectType = "blob" | "commit" | "tree";

type ShaVersion = "sha1" | "sha256";

export const hashObject = ({
  data,
  objectType,
  shaVersion,
}: {
  /// > utf-8 string supported
  data: string;
  /// can be blob or tree or commit
  objectType: ObjectType;
  /// sha code
  shaVersion?: ShaVersion;
}) => {
  shaVersion = shaVersion ?? "sha1";
  if (!data && data !== "") {
    throw new GitSchemaError("Nothing to hash");
  }

  if (objectType === "blob") {
    const dataToHash = `${objectType} ${data.length}\0${data.toString()}`;
    const hash = crypto
      .createHash(shaVersion!)
      .update(dataToHash)
      .digest("hex");

    return { hash, data: new TextEncoder().encode(dataToHash) };
  }

  if (objectType === "commit") {
  }

  return;
};

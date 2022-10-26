import git from "isomorphic-git";
import { join } from "path";

export const serialize = async (
  fileData: string,
  type: "blob" | "commit" | "tree" | "tag" = "blob"
) => {
  if (type === "blob")
    return await git.hashBlob({
      object: fileData,
    });
  return;
};

const main = async () => {
  /// blob
  console.log(await serialize("Hello"));

  let sha = await git.resolveRef({
    fs: require("fs"),
    dir: join(__dirname, "..", ".git"),
    ref: "master",
  });

  console.log(sha);
};

main();

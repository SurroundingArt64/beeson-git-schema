# Git-BeeSon-Schema

## Usage

```ts
GitState.resetState();
const authorData = {
  email: "97761020+SurroundingArt64@users.noreply.github.com",
  name: "SurroundingArt64",
  time: Math.floor(Date.now() / 1000),
  timeZoneOffset: {
    negative: false,
    value: "0000",
  },
};
GitState.initializeTreeAndCommit(join(__dirname, "..", "test_repo"), {
  author: authorData,
  committer: authorData,
  message: "feat: initial commit",
  treeHash: "",
}).entries.map((e) => {
  if (e instanceof IndexEntry) {
    console.log(
      `${e.definitions.mode.value.toString(8)} blob ${
        e.definitions.sha.value
      }   ${e.filePath}`
    );
  } else {
    console.log(`040000 tree ${e.sha}   ${e.filePath}`);
  }
});

const beeSon = new BeeSon({
  json: { refs: GitState.toArray(), indexHash: GitState.indexCommitHash },
});
```

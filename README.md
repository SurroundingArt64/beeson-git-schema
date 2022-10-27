# Git-BeeSon-Schema

## Usage

Check output of the following

```sh
NODE_RUN_TEST=true ts-node ./src/index.ts
```

```ts
// A state machine
const gitState = new GitState();

// Author data. Can be varied between commits.
const authorData = {
  email: "97761020+SurroundingArt64@users.noreply.github.com",
  name: "SurroundingArt64",
  time: Math.floor(Date.now() / 1000),
  timeZoneOffset: {
    negative: false,
    value: "0000",
  },
};

// Takes a path to a folder.
// Initializes a git tree with index at the top.
// Recursively updates the tree and creates deflated blobs of all files
// and stores as refs.

// Second argument is the commit data with an empty treeHash.
// The treeHash is computed at run-time.
gitState
  .initializeTreeAndCommit(join(__dirname, "..", "test_repo"), {
    author: authorData,
    committer: authorData,
    message: "feat: initial commit",
    treeHash: "",
  })
  .entries.map((e) => {
    // Logging data of the tree
    if (e instanceof IndexEntry) {
      console.log(
        `${e.definitions.mode.value.toString(8)} blob ${
          e.definitions.sha.value
        }   ${e.filePath}`
      );
    } else {
      // Indicates a subtree/directory
      console.log(`040000 tree ${e.sha}   ${e.filePath}`);
    }
  });

const beeSon = new BeeSon({
  json: { refs: gitState.toArray(), indexHash: gitState.indexCommitHash },
});

console.log(beeSon);
```

export class GitSchemaError extends Error {
  constructor(message: string) {
    super();
    console.error("GitSchemaError: ", message);
  }
}

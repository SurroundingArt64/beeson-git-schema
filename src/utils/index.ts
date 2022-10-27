import { readFileSync } from "fs";
import { deflateSync } from "zlib";

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

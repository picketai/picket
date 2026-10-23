import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

export type ZipEntry = { name: string; method: number; compressedSize: number; size: number; offset: number };

const END_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const END_LENGTH = 22;
const CENTRAL_LENGTH = 46;
const LOCAL_LENGTH = 30;
const MAX_COMMENT = 0xffff;
const ZIP64_MARK_16 = 0xffff;
const ZIP64_MARK_32 = 0xffffffff;
const ENCRYPTED_FLAG = 0x1;
const STORED = 0;
const DEFLATED = 8;

function withFile<T>(path: string, read: (fd: number) => T): T {
  const fd = openSync(path, "r");
  try {
    return read(fd);
  } finally {
    closeSync(fd);
  }
}

function readAt(fd: number, position: number, length: number): Buffer {
  const buffer = Buffer.alloc(length);
  return buffer.subarray(0, readSync(fd, buffer, 0, length, position));
}

function endRecord(fd: number): Buffer {
  const size = fstatSync(fd).size;
  const start = Math.max(0, size - END_LENGTH - MAX_COMMENT);
  const tail = readAt(fd, start, size - start);
  for (let at = tail.length - END_LENGTH; at >= 0; at--) {
    if (tail.readUInt32LE(at) === END_SIGNATURE) return tail.subarray(at);
  }
  throw new Error("not a zip file: no end of central directory record");
}

function centralEntry(directory: Buffer, at: number): { entry: ZipEntry; length: number } {
  if (directory.readUInt32LE(at) !== CENTRAL_SIGNATURE) throw new Error(`broken central directory at byte ${at}`);
  const nameLength = directory.readUInt16LE(at + 28);
  const entry = {
    name: directory.toString("utf8", at + CENTRAL_LENGTH, at + CENTRAL_LENGTH + nameLength),
    method: directory.readUInt16LE(at + 10),
    compressedSize: directory.readUInt32LE(at + 20),
    size: directory.readUInt32LE(at + 24),
    offset: directory.readUInt32LE(at + 42),
  };
  if (directory.readUInt16LE(at + 8) & ENCRYPTED_FLAG) throw new Error(`${entry.name} is encrypted`);
  if ([entry.compressedSize, entry.size, entry.offset].includes(ZIP64_MARK_32)) throw new Error(`${entry.name} needs zip64, which is not supported`);
  const length = CENTRAL_LENGTH + nameLength + directory.readUInt16LE(at + 30) + directory.readUInt16LE(at + 32);
  return { entry, length };
}

export function readEntries(path: string): ZipEntry[] {
  return withFile(path, (fd) => {
    const end = endRecord(fd);
    const count = end.readUInt16LE(10);
    const directorySize = end.readUInt32LE(12);
    const directoryOffset = end.readUInt32LE(16);
    if (count === ZIP64_MARK_16 || directorySize === ZIP64_MARK_32 || directoryOffset === ZIP64_MARK_32) throw new Error("zip64 archives are not supported");
    const directory = readAt(fd, directoryOffset, directorySize);
    const entries: ZipEntry[] = [];
    let at = 0;
    for (let i = 0; i < count; i++) {
      const { entry, length } = centralEntry(directory, at);
      entries.push(entry);
      at += length;
    }
    return entries;
  });
}

function contentOf(entry: ZipEntry, data: Buffer): Buffer {
  if (entry.method === STORED) return data;
  if (entry.method === DEFLATED) return inflateRawSync(data, { maxOutputLength: Math.max(1, entry.size) });
  throw new Error(`${entry.name} uses compression method ${entry.method}; only stored and deflate are supported`);
}

export function extractEntry(path: string, entry: ZipEntry): Buffer {
  return withFile(path, (fd) => {
    const header = readAt(fd, entry.offset, LOCAL_LENGTH);
    if (header.length < LOCAL_LENGTH || header.readUInt32LE(0) !== LOCAL_SIGNATURE) throw new Error(`${entry.name}: no local header at byte ${entry.offset}`);
    const dataStart = entry.offset + LOCAL_LENGTH + header.readUInt16LE(26) + header.readUInt16LE(28);
    const content = contentOf(entry, readAt(fd, dataStart, entry.compressedSize));
    if (content.length !== entry.size) throw new Error(`${entry.name}: expected ${entry.size} bytes, got ${content.length}`);
    return content;
  });
}

import fs from "fs";
import os from "os";
import path from "path";
import { resetDbForTests } from "@/lib/db";

export const createTestDbDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "vote-tracker-"));

export const useTestDb = () => {
  const dir = createTestDbDir();
  process.env.VOTE_TRACKER_DATA_DIR = dir;
  resetDbForTests();
  return dir;
};

export const cleanupTestDb = (dir: string) => {
  resetDbForTests();
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.VOTE_TRACKER_DATA_DIR;
};

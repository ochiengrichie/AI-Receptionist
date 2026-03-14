import fs from "fs/promises";

export async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // ignore delete errors
  }
}
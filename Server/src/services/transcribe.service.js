import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function transcribeAudio(filePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../../python/transcribe.py");

    const pythonProcess = spawn("python", [scriptPath, filePath]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || "Python STT process failed"));
      }

      try {
        const parsed = JSON.parse(stdout);

        if (parsed.error) {
          return reject(new Error(parsed.error));
        }

        resolve(parsed);
      } catch (error) {
        reject(new Error("Failed to parse STT response"));
      }
    });
  });
}
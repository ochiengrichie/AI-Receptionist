import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateSpeech(text) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../../python/tts.py");
    const fileName = `tts-${Date.now()}.wav`;
    const outputPath = path.resolve(__dirname, "../../outputs", fileName);

    if (!fs.existsSync(path.resolve(__dirname, "../../outputs"))) {
      fs.mkdirSync(path.resolve(__dirname, "../../outputs"), { recursive: true });
    }

    const pythonExe = process.platform === "win32" ? "py" : "python";
    let pythonProcess = spawn(pythonExe, [scriptPath, text, outputPath]);

    pythonProcess.on("error", (err) => {
      if (err.code === "ENOENT" && pythonExe === "python") {
        // Windows fallback if python command is unavailable
        pythonProcess = spawn("py", [scriptPath, text, outputPath]);
        pythonProcess.on("error", (err2) => reject(err2));
      } else {
        reject(err);
      }
    });

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
        const errMessage = stderr || stdout || "TTS process failed with non-zero exit code";
        return reject(new Error(errMessage));
      }

      try {
        const parsed = JSON.parse(stdout);

        if (parsed.error) {
          return reject(new Error(parsed.error));
        }

        if (!parsed.success || !parsed.file) {
          return reject(new Error("TTS script did not return success/file information"));
        }

        resolve({
          fileName,
          outputPath,
        });
      } catch (error) {
        reject(new Error(`Failed to parse TTS response: ${error.message}. stdout=${stdout} stderr=${stderr}`));
      }
    });
  });
}

export default generateSpeech;
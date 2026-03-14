import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateSpeech(text) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../../python/tts.py");
    const fileName = `tts-${Date.now()}.mp3`;
    const outputPath = path.resolve(__dirname, "../../outputs", fileName);

    if (!fs.existsSync(path.resolve(__dirname, "../../outputs"))) {
      fs.mkdirSync(path.resolve(__dirname, "../../outputs"), { recursive: true });
    }

    const pythonCandidateCommands = process.platform === "win32"
      ? [
          {cmd: "py", args: ["-3.11"]},
          {cmd: "py", args: ["-3.10"]},
          {cmd: "py", args: []},
          {cmd: "python", args: []},
        ]
      : [
          {cmd: "python3.11", args: []},
          {cmd: "python3", args: []},
          {cmd: "python", args: []},
        ];

    let pythonProcess;
    let currentCandidate = 0;

    function startPythonProcess() {
      const candidate = pythonCandidateCommands[currentCandidate];
      if (!candidate) {
        return reject(new Error("No usable Python binary found. Install Python >=3.7 and TTS dependencies."));
      }

      pythonProcess = spawn(candidate.cmd, [...candidate.args, scriptPath, text, outputPath]);

      pythonProcess.on("error", (err) => {
        if (err.code === "ENOENT" || err.code === "EPERM") {
          currentCandidate += 1;
          return startPythonProcess();
        }

        reject(err);
      });

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", handleClose);
    }

    function handleClose(code) {
      if (code !== 0) {
        const errMessage = stderr || stdout || "TTS process failed with non-zero exit code";
        return reject(new Error(errMessage));
      }

      try {
        const lines = stdout
          .trim()
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        const parsed = lines.reduce((acc, line) => {
          try {
            const item = JSON.parse(line);
            return item;
          } catch {
            return acc;
          }
        }, null);

        if (!parsed) {
          throw new Error("No valid JSON output from TTS script");
        }

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
    }

    let stdout = "";
    let stderr = "";

    startPythonProcess();
  });
}

export default generateSpeech;
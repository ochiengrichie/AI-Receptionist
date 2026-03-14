import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import ffmpegPath from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function transcribeAudio(filePath) {
  return new Promise(async (resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../../python/transcribe.py");

    const ext = path.extname(filePath).toLowerCase();
    let workFilePath = filePath;
    let cleanupTemp = false;

    if (ext === ".webm") {
      const wavPath = path.resolve(path.dirname(filePath), `${path.basename(filePath, ext)}.wav`);
      workFilePath = wavPath;
      cleanupTemp = true;

      await new Promise((convResolve, convReject) => {
        if (!ffmpegPath) {
          return convReject(new Error("ffmpeg binary not found (ffmpeg-static is required)"));
        }

        const ffmpegProc = spawn(ffmpegPath, ["-y", "-i", filePath, "-ar", "16000", "-ac", "1", wavPath]);

        let stderrConv = "";
        ffmpegProc.stderr.on("data", (data) => {
          stderrConv += data.toString();
        });

        ffmpegProc.on("close", (code) => {
          if (code !== 0) {
            return convReject(new Error(`ffmpeg conversion failed: ${stderrConv || "unknown error"}`));
          }
          convResolve();
        });

        ffmpegProc.on("error", (err) => convReject(err));
      });
    }

    const pythonCandidates = [
      { cmd: "py", args: ["-3.11"] },
      { cmd: "py", args: ["-3.10"] },
      { cmd: "py", args: [] },
      { cmd: "python", args: [] },
    ];

    let stdout = "";
    let stderr = "";
    let candidateIndex = 0;

    function cleanup() {
      if (cleanupTemp && workFilePath && workFilePath !== filePath && fs.existsSync(workFilePath)) {
        fs.unlinkSync(workFilePath);
      }
    }

    function startCandidate() {
      if (candidateIndex >= pythonCandidates.length) {
        cleanup();
        return reject(new Error("No suitable Python interpreter found for STT"));
      }

      const candidate = pythonCandidates[candidateIndex];
      const pythonProcess = spawn(candidate.cmd, [...candidate.args, scriptPath, workFilePath]);

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("error", (err) => {
        if (err.code === "ENOENT" || err.code === "EPERM") {
          candidateIndex += 1;
          return startCandidate();
        }
        cleanup();
        reject(err);
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          cleanup();
          const errMessage = stderr || stdout || "Python STT process failed";
          return reject(new Error(errMessage));
        }

        try {
          const parsed = JSON.parse(stdout);

          if (parsed.error) {
            cleanup();
            return reject(new Error(parsed.error));
          }

          cleanup();
          resolve(parsed);
        } catch (err) {
          cleanup();
          reject(new Error(`Failed to parse STT response: ${err.message}. stdout=${stdout} stderr=${stderr}`));
        }
      });
    }

    startCandidate();
  });
}
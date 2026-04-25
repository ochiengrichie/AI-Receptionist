import express from "express";
import transcribeRoute from "./stt.route.js";
import aiRoute from "./ai.route.js";
import ttsRoute from "./tts.route.js";

const router = express.Router();

router.use("/transcribe", transcribeRoute);
router.use("/ai", aiRoute);
router.use("/tts", ttsRoute);

export default router;
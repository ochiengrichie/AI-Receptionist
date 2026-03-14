import express from "express";
import { handleTTS } from "../controllers/tts.controller.js";

const router = express.Router();

router.post("/", handleTTS);

export const ttsRoute = router;
export default router;
import express from "express";
import { handleAIReply } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/", handleAIReply);

export default router;
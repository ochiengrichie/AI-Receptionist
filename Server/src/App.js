import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes/routes.index.js";
import { corsOptions } from "./config/cors.config.js";
import { notFound, errorHandler } from "./middlewares/errorHandlingMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

//STATIC FILES 
// serves generated TTS audio
app.use("/audio", express.static(path.resolve(__dirname, "../outputs")));

app.use("/api", routes);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

//ERROR HANDLING 
app.use(notFound);
app.use(errorHandler);

export default app;
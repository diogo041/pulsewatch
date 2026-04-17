import "dotenv/config";
import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const monitorCount = await prisma.monitor.count();

    res.json({
      status: "ok",
      service: "pulsewatch-api",
      database: "connected",
      monitorCount
    });
  } catch {
    res.status(500).json({
      status: "error",
      service: "pulsewatch-api",
      database: "disconnected"
    });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

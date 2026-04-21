import "dotenv/config";
import cors from "cors";
import express from "express";
import { startMonitorScheduler } from "./lib/monitor-scheduler";
import { prisma } from "./lib/prisma";
import monitorsRouter from "./routes/monitors";

const app = express();
const port = Number(process.env.PORT ?? 4001);

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const monitorCount = await prisma.monitor.count();

    res.json({
      status: "ok",
      service: "pulsewatch-api",
      database: "connected",
      scheduler: "running",
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

app.use("/monitors", monitorsRouter);

app.listen(port, () => {
  startMonitorScheduler();
  console.log(`API listening on http://localhost:${port}`);
});

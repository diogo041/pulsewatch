import "dotenv/config";
import cors from "cors";
import express from "express";
import { startMonitorScheduler } from "./lib/monitor-scheduler";
import { prisma } from "./lib/prisma";
import incidentsRouter from "./routes/incidents";
import monitorsRouter from "./routes/monitors";

const app = express();
const port = Number(process.env.PORT ?? 4001);

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const [monitorCount, openIncidentCount] = await Promise.all([
      prisma.monitor.count(),
      prisma.incident.count({
        where: {
          status: "OPEN"
        }
      })
    ]);

    res.json({
      status: "ok",
      service: "pulsewatch-api",
      database: "connected",
      scheduler: "running",
      monitorCount,
      openIncidentCount
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
app.use("/incidents", incidentsRouter);

app.listen(port, () => {
  startMonitorScheduler();
  console.log(`API listening on http://localhost:${port}`);
});

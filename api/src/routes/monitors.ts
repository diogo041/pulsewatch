import { Router } from "express";
import { runMonitorCheck } from "../lib/monitor-checks";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const monitors = await prisma.monitor.findMany({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      checkResults: {
        orderBy: {
          checkedAt: "desc"
        },
        take: 1
      }
    }
  });

  res.json(monitors);
});

router.post("/", async (req, res) => {
  const { name, url, intervalSecs } = req.body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "name is required" });
  }

  if (typeof url !== "string" || url.trim().length === 0) {
    return res.status(400).json({ error: "url is required" });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "url must be a valid URL" });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "url must start with http or https" });
  }

  const parsedInterval = Number(intervalSecs ?? 60);

  if (!Number.isInteger(parsedInterval) || parsedInterval < 30) {
    return res
      .status(400)
      .json({ error: "intervalSecs must be an integer of at least 30" });
  }

  const monitor = await prisma.monitor.create({
    data: {
      name: name.trim(),
      url: url.trim(),
      intervalSecs: parsedInterval
    },
    include: {
      checkResults: {
        orderBy: {
          checkedAt: "desc"
        },
        take: 1
      }
    }
  });

  res.status(201).json(monitor);
});

router.post("/:id/run", async (req, res) => {
  const { id } = req.params;

  const existingMonitor = await prisma.monitor.findUnique({
    where: { id }
  });

  if (!existingMonitor) {
    return res.status(404).json({ error: "monitor not found" });
  }

  const checkResult = await runMonitorCheck(id);

  res.status(201).json(checkResult);
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive must be a boolean" });
  }

  const existingMonitor = await prisma.monitor.findUnique({
    where: { id }
  });

  if (!existingMonitor) {
    return res.status(404).json({ error: "monitor not found" });
  }

  const updatedMonitor = await prisma.monitor.update({
    where: { id },
    data: { isActive },
    include: {
      checkResults: {
        orderBy: {
          checkedAt: "desc"
        },
        take: 1
      }
    }
  });

  res.json(updatedMonitor);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const existingMonitor = await prisma.monitor.findUnique({
    where: { id }
  });

  if (!existingMonitor) {
    return res.status(404).json({ error: "monitor not found" });
  }

  await prisma.monitor.delete({
    where: { id }
  });

  res.status(204).send();
});

export default router;

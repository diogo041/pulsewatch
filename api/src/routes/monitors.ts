import { Router } from "express";
import { runMonitorCheck } from "../lib/monitor-checks";
import { prisma } from "../lib/prisma";

const router = Router();

function isValidHttpUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

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

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      error: "Monitor name is required"
    });
  }

  if (typeof url !== "string" || !isValidHttpUrl(url)) {
    return res.status(400).json({
      error: "A valid URL is required"
    });
  }

  if (
    typeof intervalSecs !== "number" ||
    Number.isNaN(intervalSecs) ||
    intervalSecs < 30
  ) {
    return res.status(400).json({
      error: "Interval must be a number greater than or equal to 30"
    });
  }

  const monitor = await prisma.monitor.create({
    data: {
      name: name.trim(),
      url,
      intervalSecs,
      isActive: true
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

router.get("/:id/checks", async (req, res) => {
  const { id } = req.params;

  const monitor = await prisma.monitor.findUnique({
    where: { id }
  });

  if (!monitor) {
    return res.status(404).json({
      error: "Monitor not found"
    });
  }

  const checks = await prisma.checkResult.findMany({
    where: {
      monitorId: id
    },
    orderBy: {
      checkedAt: "desc"
    },
    take: 10
  });

  res.json(checks);
});

router.post("/:id/run", async (req, res) => {
  const { id } = req.params;

  const checkResult = await runMonitorCheck(id);

  if (!checkResult) {
    return res.status(404).json({
      error: "Monitor not found"
    });
  }

  res.status(201).json(checkResult);
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      error: "isActive must be a boolean"
    });
  }

  const existingMonitor = await prisma.monitor.findUnique({
    where: { id }
  });

  if (!existingMonitor) {
    return res.status(404).json({
      error: "Monitor not found"
    });
  }

  const updatedMonitor = await prisma.monitor.update({
    where: { id },
    data: {
      isActive
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

  res.json(updatedMonitor);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const existingMonitor = await prisma.monitor.findUnique({
    where: { id }
  });

  if (!existingMonitor) {
    return res.status(404).json({
      error: "Monitor not found"
    });
  }

  await prisma.checkResult.deleteMany({
    where: {
      monitorId: id
    }
  });

  await prisma.monitor.delete({
    where: {
      id
    }
  });

  res.status(204).send();
});

export default router;

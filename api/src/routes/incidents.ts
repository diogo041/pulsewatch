import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const incidents = await prisma.incident.findMany({
    orderBy: {
      startedAt: "desc"
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true
        }
      }
    }
  });

  res.json(incidents);
});

export default router;

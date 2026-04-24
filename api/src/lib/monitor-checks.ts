import { prisma } from "./prisma";

type IncidentCheckPayload = {
  status: "UP" | "DOWN";
  statusCode: number | null;
  errorMessage: string | null;
  checkedAt: Date;
};

async function syncIncidentForCheckResult(
  monitorId: string,
  checkResult: IncidentCheckPayload
) {
  const openIncident = await prisma.incident.findFirst({
    where: {
      monitorId,
      status: "OPEN"
    },
    orderBy: {
      startedAt: "desc"
    }
  });

  if (checkResult.status === "DOWN") {
    if (openIncident) {
      await prisma.incident.update({
        where: {
          id: openIncident.id
        },
        data: {
          lastStatusCode: checkResult.statusCode,
          lastErrorMessage: checkResult.errorMessage
        }
      });

      return;
    }

    await prisma.incident.create({
      data: {
        monitorId,
        status: "OPEN",
        startedAt: checkResult.checkedAt,
        lastStatusCode: checkResult.statusCode,
        lastErrorMessage: checkResult.errorMessage
      }
    });

    return;
  }

  if (!openIncident) {
    return;
  }

  await prisma.incident.update({
    where: {
      id: openIncident.id
    },
    data: {
      status: "RESOLVED",
      resolvedAt: checkResult.checkedAt,
      lastStatusCode: checkResult.statusCode,
      lastErrorMessage: checkResult.errorMessage
    }
  });
}

export async function runMonitorCheck(monitorId: string) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId }
  });

  if (!monitor) {
    return null;
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(monitor.url, {
      method: "GET",
      signal: AbortSignal.timeout(10000)
    });

    const responseTimeMs = Date.now() - startedAt;
    const status = response.ok ? "UP" : "DOWN";

    const checkResult = await prisma.checkResult.create({
      data: {
        monitorId: monitor.id,
        status,
        statusCode: response.status,
        responseTimeMs
      }
    });

    await syncIncidentForCheckResult(monitor.id, {
      status,
      statusCode: response.status,
      errorMessage: null,
      checkedAt: checkResult.checkedAt
    });

    return checkResult;
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown check error";

    const checkResult = await prisma.checkResult.create({
      data: {
        monitorId: monitor.id,
        status: "DOWN",
        responseTimeMs,
        errorMessage
      }
    });

    await syncIncidentForCheckResult(monitor.id, {
      status: "DOWN",
      statusCode: null,
      errorMessage,
      checkedAt: checkResult.checkedAt
    });

    return checkResult;
  }
}

import { prisma } from "./prisma";

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

    const checkResult = await prisma.checkResult.create({
      data: {
        monitorId: monitor.id,
        status: response.ok ? "UP" : "DOWN",
        statusCode: response.status,
        responseTimeMs
      }
    });

    return checkResult;
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;

    const checkResult = await prisma.checkResult.create({
      data: {
        monitorId: monitor.id,
        status: "DOWN",
        responseTimeMs,
        errorMessage:
          error instanceof Error ? error.message : "Unknown check error"
      }
    });

    return checkResult;
  }
}

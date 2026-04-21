import { prisma } from "./prisma";
import { runMonitorCheck } from "./monitor-checks";

const SCHEDULER_INTERVAL_MS = 15000;

let schedulerStarted = false;
let schedulerBusy = false;

async function runDueMonitorChecks() {
  if (schedulerBusy) {
    return;
  }

  schedulerBusy = true;

  try {
    const monitors = await prisma.monitor.findMany({
      where: {
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

    for (const monitor of monitors) {
      const latestCheck = monitor.checkResults[0];
      const lastCheckedAt = latestCheck
        ? new Date(latestCheck.checkedAt).getTime()
        : null;

      const isDue =
        lastCheckedAt === null ||
        Date.now() - lastCheckedAt >= monitor.intervalSecs * 1000;

      if (isDue) {
        await runMonitorCheck(monitor.id);
      }
    }
  } catch (error) {
    console.error("Automatic monitor scheduler failed:", error);
  } finally {
    schedulerBusy = false;
  }
}

export function startMonitorScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  void runDueMonitorChecks();

  setInterval(() => {
    void runDueMonitorChecks();
  }, SCHEDULER_INTERVAL_MS);

  console.log(
    `Monitor scheduler started. Checking for due monitors every ${
      SCHEDULER_INTERVAL_MS / 1000
    } seconds.`
  );
}

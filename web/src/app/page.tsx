"use client";

import { FormEvent, useEffect, useState } from "react";

type CheckResult = {
  id: string;
  status: "UP" | "DOWN";
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
};

type Monitor = {
  id: string;
  name: string;
  url: string;
  intervalSecs: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  checkResults: CheckResult[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

async function fetchMonitorHistory(monitorId: string) {
  const response = await fetch(`${API_BASE_URL}/monitors/${monitorId}/checks`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to load check history");
  }

  const data: CheckResult[] = await response.json();
  return data;
}

export default function HomePage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalSecs, setIntervalSecs] = useState("60");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMonitorId, setPendingMonitorId] = useState<string | null>(null);
  const [runningCheckId, setRunningCheckId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [historyByMonitor, setHistoryByMonitor] = useState<Record<string, CheckResult[]>>({});
  const [error, setError] = useState("");

  const activeMonitorCount = monitors.filter((monitor) => monitor.isActive).length;

  async function loadMonitors(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await fetch(`${API_BASE_URL}/monitors`);
      if (!response.ok) {
        throw new Error("Failed to load monitors");
      }

      const data: Monitor[] = await response.json();
      setMonitors(data);

      if (expandedHistoryId) {
        const expandedMonitor = data.find((monitor) => monitor.id === expandedHistoryId);
        const latestCheck = expandedMonitor?.checkResults[0];

        if (latestCheck) {
          setHistoryByMonitor((current) => {
            const existingHistory = current[expandedHistoryId] ?? [];

            if (existingHistory[0]?.id === latestCheck.id) {
              return current;
            }

            return {
              ...current,
              [expandedHistoryId]: [latestCheck, ...existingHistory].slice(0, 10)
            };
          });
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while loading monitors"
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  async function loadHistory(monitorId: string, showLoader = true) {
    try {
      if (showLoader) {
        setHistoryLoadingId(monitorId);
      }

      setError("");

      const data = await fetchMonitorHistory(monitorId);

      setHistoryByMonitor((current) => ({
        ...current,
        [monitorId]: data
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading check history"
      );
    } finally {
      if (showLoader) {
        setHistoryLoadingId(null);
      }
    }
  }

  useEffect(() => {
    void loadMonitors();

    const intervalId = window.setInterval(() => {
      void loadMonitors(false);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expandedHistoryId]);

  useEffect(() => {
    if (!expandedHistoryId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const data = await fetchMonitorHistory(expandedHistoryId);

          setHistoryByMonitor((current) => ({
            ...current,
            [expandedHistoryId]: data
          }));
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading check history"
          );
        }
      })();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expandedHistoryId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/monitors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          url,
          intervalSecs: Number(intervalSecs)
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create monitor");
      }

      const createdMonitor: Monitor = await response.json();

      setMonitors((current) => [createdMonitor, ...current]);
      setName("");
      setUrl("");
      setIntervalSecs("60");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while creating the monitor"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleMonitor(id: string, nextIsActive: boolean) {
    try {
      setPendingMonitorId(id);
      setError("");

      const response = await fetch(`${API_BASE_URL}/monitors/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isActive: nextIsActive
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update monitor");
      }

      const updatedMonitor: Monitor = await response.json();

      setMonitors((current) =>
        current.map((monitor) =>
          monitor.id === id ? updatedMonitor : monitor
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while updating the monitor"
      );
    } finally {
      setPendingMonitorId(null);
    }
  }

  async function handleDeleteMonitor(id: string, monitorName: string) {
    const confirmed = window.confirm(
      `Delete monitor "${monitorName}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPendingMonitorId(id);
      setError("");

      const response = await fetch(`${API_BASE_URL}/monitors/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete monitor");
      }

      setMonitors((current) =>
        current.filter((monitor) => monitor.id !== id)
      );

      setHistoryByMonitor((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });

      if (expandedHistoryId === id) {
        setExpandedHistoryId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while deleting the monitor"
      );
    } finally {
      setPendingMonitorId(null);
    }
  }

  async function handleRunCheck(id: string) {
    try {
      setRunningCheckId(id);
      setError("");

      const response = await fetch(`${API_BASE_URL}/monitors/${id}/run`, {
        method: "POST"
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to run check");
      }

      const newCheckResult: CheckResult = await response.json();

      setMonitors((current) =>
        current.map((monitor) =>
          monitor.id === id
            ? { ...monitor, checkResults: [newCheckResult] }
            : monitor
        )
      );

      setHistoryByMonitor((current) => ({
        ...current,
        [id]: [newCheckResult, ...(current[id] ?? [])].slice(0, 10)
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while running the check"
      );
    } finally {
      setRunningCheckId(null);
    }
  }

  async function handleToggleHistory(id: string) {
    if (expandedHistoryId === id) {
      setExpandedHistoryId(null);
      return;
    }

    setExpandedHistoryId(id);
    await loadHistory(id, !historyByMonitor[id]);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7ff,_#eef2ff_40%,_#ffffff_75%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              PulseWatch
            </span>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Monitor your endpoints from one clean dashboard.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Create monitors, run live checks, and explore recent check history
                directly from the dashboard.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Total Monitors
              </div>
              <div className="mt-2 text-2xl font-semibold">{monitors.length}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-700">
                Active Monitors
              </div>
              <div className="mt-2 text-2xl font-semibold text-emerald-800">
                {activeMonitorCount}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Add a monitor</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with one URL and a simple interval. You can now run checks
                and store the latest result.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="name">
                  Monitor name
                </label>
                <input
                  id="name"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                  placeholder="Main website"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="url">
                  URL
                </label>
                <input
                  id="url"
                  type="url"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="intervalSecs"
                >
                  Interval (seconds)
                </label>
                <input
                  id="intervalSecs"
                  type="number"
                  min="30"
                  step="1"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-500"
                  value={intervalSecs}
                  onChange={(event) => setIntervalSecs(event.target.value)}
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving monitor..." : "Create monitor"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Saved monitors</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Run checks on demand, inspect recent history, and keep track of
                  your latest responses in one place.
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-400">
                  Auto-refreshes every 15 seconds
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadMonitors()}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Refresh now
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-slate-500">
                Loading monitors...
              </div>
            ) : monitors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-slate-500">
                No monitors yet. Add your first one from the form.
              </div>
            ) : (
              <div className="space-y-4">
                {monitors.map((monitor) => {
                  const isPending = pendingMonitorId === monitor.id;
                  const isRunningCheck = runningCheckId === monitor.id;
                  const latestCheck = monitor.checkResults[0];
                  const history = historyByMonitor[monitor.id] ?? [];
                  const isHistoryOpen = expandedHistoryId === monitor.id;

                  return (
                    <article
                      key={monitor.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {monitor.name}
                          </h3>
                          <p className="break-all text-sm text-slate-600">
                            {monitor.url}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${
                            monitor.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {monitor.isActive ? "Active" : "Paused"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="rounded-full bg-white px-3 py-1">
                          Every {monitor.intervalSecs}s
                        </span>
                        <span className="rounded-full bg-white px-3 py-1">
                          Added {new Date(monitor.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        {latestCheck ? (
                          <div className="space-y-1">
                            <div className="font-medium text-slate-900">
                              Last check:{" "}
                              <span
                                className={
                                  latestCheck.status === "UP"
                                    ? "text-emerald-700"
                                    : "text-rose-700"
                                }
                              >
                                {latestCheck.status}
                              </span>
                            </div>
                            <div>
                              {latestCheck.statusCode
                                ? `HTTP ${latestCheck.statusCode}`
                                : latestCheck.errorMessage ?? "No status code"}
                              {" · "}
                              {latestCheck.responseTimeMs ?? "N/A"} ms
                              {" · "}
                              {new Date(latestCheck.checkedAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div>No checks recorded yet. Run the first one now.</div>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={isRunningCheck}
                          onClick={() => void handleRunCheck(monitor.id)}
                          className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRunningCheck ? "Running check..." : "Run check"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleToggleHistory(monitor.id)}
                          className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                        >
                          {isHistoryOpen ? "Hide history" : "Show history"}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            void handleToggleMonitor(monitor.id, !monitor.isActive)
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPending
                            ? "Working..."
                            : monitor.isActive
                              ? "Pause monitor"
                              : "Resume monitor"}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            void handleDeleteMonitor(monitor.id, monitor.name)
                          }
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPending ? "Working..." : "Delete monitor"}
                        </button>
                      </div>

                      {isHistoryOpen ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                            Recent checks
                          </div>

                          {historyLoadingId === monitor.id ? (
                            <div className="text-sm text-slate-500">Loading history...</div>
                          ) : history.length === 0 ? (
                            <div className="text-sm text-slate-500">No check history yet.</div>
                          ) : (
                            <div className="space-y-3">
                              {history.map((check) => (
                                <div
                                  key={check.id}
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                >
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <div
                                      className={`text-sm font-semibold ${
                                        check.status === "UP"
                                          ? "text-emerald-700"
                                          : "text-rose-700"
                                      }`}
                                    >
                                      {check.status}
                                    </div>

                                    <div className="text-sm text-slate-600">
                                      {check.statusCode
                                        ? `HTTP ${check.statusCode}`
                                        : check.errorMessage ?? "No status code"}
                                      {" · "}
                                      {check.responseTimeMs ?? "N/A"} ms
                                      {" · "}
                                      {new Date(check.checkedAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

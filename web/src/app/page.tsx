"use client";

import { FormEvent, useEffect, useState } from "react";

type Monitor = {
  id: string;
  name: string;
  url: string;
  intervalSecs: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function HomePage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalSecs, setIntervalSecs] = useState("60");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadMonitors() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/monitors`);
      if (!response.ok) {
        throw new Error("Failed to load monitors");
      }

      const data: Monitor[] = await response.json();
      setMonitors(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while loading monitors"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonitors();
  }, []);

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
        const data = await response.json();
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
                Create monitors, track uptime, and build your own self-hosted
                status platform one feature at a time.
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
                API Status
              </div>
              <div className="mt-2 text-2xl font-semibold text-emerald-800">
                Online
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Add a monitor</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with one URL and a simple interval. We’ll build checks,
                incidents, and alerts next.
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
                  Your first production-style resource list. This will become the
                  dashboard home.
                </p>
              </div>

              <button
                type="button"
                onClick={loadMonitors}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Refresh
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
                {monitors.map((monitor) => (
                  <article
                    key={monitor.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {monitor.name}
                        </h3>
                        <p className="break-all text-sm text-slate-600">{monitor.url}</p>
                      </div>

                      <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
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
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

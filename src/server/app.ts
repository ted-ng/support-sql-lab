import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { LabStore } from "./database.js";
import { createStore } from "./database.js";

export const buildApp = async (store: LabStore = createStore()) => {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ status: "ok", service: "support-sql-lab", database: "sqlite-disposable" }));
  app.get("/api/scenarios", async () => store.list());
  app.get<{ Params: { id: string } }>("/api/scenarios/:id", async (request, reply) =>
    store.get(request.params.id) ?? reply.code(404).send({ message: "Scenario not found" })
  );
  app.post<{ Params: { id: string } }>("/api/scenarios/:id/query", async (request, reply) => {
    try { return store.runQuery(request.params.id); } catch { return reply.code(404).send({ message: "Scenario not found" }); }
  });
  app.post<{ Params: { id: string } }>("/api/scenarios/:id/repair", async (request, reply) => {
    try { return store.applyRepair(request.params.id); } catch (error) {
      return reply.code(error instanceof Error && error.message === "Scenario not found" ? 404 : 409).send({ message: error instanceof Error ? error.message : "Repair failed" });
    }
  });
  app.post("/api/reset", async () => {
    store.reset();
    return { status: "reset" };
  });
  const webRoot = resolve(process.cwd(), "dist/web");
  if (existsSync(webRoot)) {
    await app.register(staticPlugin, { root: webRoot });
    app.setNotFoundHandler((request, reply) => request.raw.url?.startsWith("/api/")
      ? reply.code(404).send({ message: "Not found" })
      : reply.sendFile("index.html"));
  }
  return app;
};

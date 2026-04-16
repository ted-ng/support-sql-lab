import { resolve } from "node:path";
import { buildApp } from "./app.js";
import { createStore } from "./database.js";

const store = createStore(process.env.DATABASE_PATH ?? resolve(process.cwd(), "data/support-lab.sqlite"));
const app = await buildApp(store);
await app.listen({ host: "127.0.0.1", port: Number(process.env.PORT ?? 4474) });

import { resolve } from "node:path";
import { createStore } from "./database.js";

const store = createStore(process.env.DATABASE_PATH ?? resolve(process.cwd(), "data/support-lab.sqlite"));
store.reset();
console.log(`Seeded ${store.list().length} broken support investigation scenarios.`);
store.db.close();

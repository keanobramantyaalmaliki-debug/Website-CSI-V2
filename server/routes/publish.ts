/**
 * Tombol Publish dan angka di sebelahnya.
 */

import { Hono } from "hono";

import type { Env } from "../app";
import { pendingCount, publish } from "../publish";

const publishRoute = new Hono<Env>();

publishRoute.get("/status", async (c) => {
  return c.json({ pending: await pendingCount() });
});

publishRoute.post("/", async (c) => {
  const result = await publish(c.get("actor"));
  return c.json(result);
});

export default publishRoute;

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";

import ws from "ws";
neonConfig.webSocketConstructor = ws;

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
neonConfig.poolQueryViaFetch = true;

// Type definitions
// declare global {
//   var prisma: PrismaClient | undefined
// }

const connectionString = `${process.env.DATABASE_URL}`;

// Use the Neon serverless (WebSocket) adapter ONLY on the edge runtime. On Node
// (Vercel serverless functions + local dev) use the standard Prisma client over the
// pooled connection: the WebSocket driver relies on `ws` masking (bufferutil), which
// fails in Vercel's bundled function ("b.mask is not a function" -> connection
// terminated) on writes/transactions — e.g. creating an order.
const adapter = new PrismaNeon(new Pool({ connectionString }));
const prisma =
  global.prisma ||
  new PrismaClient(process.env.NEXT_RUNTIME === "edge" ? { adapter } : {});

if (process.env.NEXT_RUNTIME !== "edge") global.prisma = prisma;

export default prisma;

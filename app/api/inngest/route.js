import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  syncUserCreated,
  syncUserDeleted,
  syncUserUpdated,
  deleteCouponOnExpiry,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncUserCreated,
    syncUserUpdated,
    syncUserDeleted,
    deleteCouponOnExpiry,
  ],
});

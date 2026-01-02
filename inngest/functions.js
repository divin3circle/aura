import prisma from "@/lib/prisma";
import { inngest } from "./client";

// save users on signup to the database,
export const syncUserCreated = inngest.createFunction(
  { id: "sync-user-created" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email_addresses[0]?.email_address || "",
        name: data.first_name + " " + data.last_name,
        image: data.profile_image_url,
      },
    });
  }
);

// update users on update to the database
export const syncUserUpdated = inngest.createFunction(
  { id: "sync-user-updated" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data.email_addresses[0]?.email_address || "",
        name: data.first_name + " " + data.last_name,
        image: data.profile_image_url,
      },
    });
  }
);

// delete user from database on delete
export const syncUserDeleted = inngest.createFunction(
  { id: "sync-user-deleted" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.delete({
      where: { id: data.id },
    });
  }
);

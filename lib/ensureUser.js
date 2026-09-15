import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Guarantees a DB `User` row exists for a signed-in Clerk user.
//
// The primary sync is the Inngest `clerk/user.created` handler (inngest/functions.js),
// but that depends on the Clerk->Inngest event integration being configured and can be
// delayed. This is a synchronous safety net so cart/address/checkout work for a brand-new
// signup regardless. Only hits the Clerk API when the row is actually missing; the upsert
// is race-safe if Inngest creates the row at the same time.
export const ensureUser = async (userId) => {
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const client = await clerkClient();
  const u = await client.users.getUser(userId);

  const email =
    u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)
      ?.emailAddress ||
    u.emailAddresses?.[0]?.emailAddress ||
    "";
  const name =
    [u.firstName, u.lastName].filter(Boolean).join(" ") || email || "User";

  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email,
      name,
      image: u.imageUrl || "",
    },
  });
};

export default ensureUser;

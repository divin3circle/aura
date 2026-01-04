import prisma from "@/lib/prisma";

const authSeller = async (userId) => {
  try {
    const store = await prisma.store.findUnique({
      where: { userId: userId },
    });

    if (store && store.status === "approved" && store.isActive) {
      return store.id;
    }
    return false;
  } catch (error) {
    console.error("Error in authSeller middleware:", error);
    return false;
  }
};

export default authSeller;

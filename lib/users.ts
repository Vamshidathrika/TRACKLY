import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type UserOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
};

export const getAllUsers = cache(async (): Promise<UserOption[]> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name || u.email || "Teammate",
      avatarUrl: u.avatarUrl,
      email: u.email,
    }));
  } catch (e) {
    console.error("Failed to fetch users:", e);
    return [];
  }
});

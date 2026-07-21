"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { getNotifications, markNotificationsAsRead } from "@/lib/notifications";

export async function fetchUserNotificationsAction() {
  const user = await getAuthUser();
  return getNotifications(user.id);
}

export async function markReadAction() {
  const user = await getAuthUser();
  await markNotificationsAsRead(user.id);
  revalidatePath("/");
  return { success: true };
}

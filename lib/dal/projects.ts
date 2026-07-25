import { cache } from "react";
import { getProjects, getProjectByKey, getProjectsForUser, resolveProjectByKey, createProject } from "../projects";

export const getCachedProjectByKey = cache(async (siteId: string, key: string) => {
  return getProjectByKey(siteId, key);
});

export const getCachedProjectsForUser = cache(async (siteId: string, userId: string) => {
  return getProjectsForUser(siteId, userId);
});

export { getProjects, getProjectByKey, getProjectsForUser, resolveProjectByKey, createProject };

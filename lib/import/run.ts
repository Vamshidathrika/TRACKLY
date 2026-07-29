/**
 * Execute an ImportPlan against the database.
 *
 * Dry run and real run take the SAME path. `write` gates only the mutations,
 * so a dry run still reads the workspace, still resolves projects and issues,
 * and therefore still reports accurate create/update splits. A dry run that
 * guessed would be worse than no dry run at all.
 *
 * Deliberately NOT wrapped in one transaction. A 5,000-issue import cannot
 * finish inside Prisma's interactive-transaction timeout, and a mid-run
 * failure would roll back work the operator can see succeeded. Instead every
 * write is idempotent, so the recovery procedure for a failed run is "run it
 * again" — see the per-entity writers for how each one dedupes.
 */
import { prisma } from "../prisma";
import { grantProjectAccess } from "../tenant";
import { UserResolver } from "./users";
import { writeIssueChildren, chunk, type IssueTarget } from "./writers";
import type {
  EntityCounts,
  ImportOptions,
  ImportPlan,
  ImportReport,
  ImportSummary,
  ImportWarning,
  JiraUserRef,
  NormalizedIssue,
  PlannedProject,
  RowIssue,
} from "./types";
import { emptySummary } from "./types";

export type RunImportInput = {
  siteId: string;
  /** The admin running the import; fallback owner for unresolvable authorship. */
  importerUserId: string;
  plan: ImportPlan;
  options: ImportOptions;
};

/** Issues are ordered by number so a partial run leaves a contiguous prefix. */
const RANK_STEP = 1000;

export async function runImport({ siteId, importerUserId, plan, options }: RunImportInput): Promise<ImportReport> {
  const write = !options.dryRun;
  const summary = emptySummary();
  const rowIssues: RowIssue[] = [...plan.rowIssues];
  const warnings: ImportWarning[] = [...plan.warnings];

  const resolver = new UserResolver({
    siteId,
    importerUserId,
    createMissingUsers: options.createMissingUsers,
    grantMembershipToStubs: options.grantMembershipToStubs,
    dryRun: options.dryRun,
  });
  await resolver.preload(collectUserRefs(plan));

  summary.users.created = resolver.createdCount();
  summary.users.skipped = resolver.matchedCount();

  if (options.grantMembershipToStubs && resolver.createdCount() > 0) {
    warnings.push({
      code: "stubs-granted-membership",
      message: `${resolver.createdCount()} imported user(s) were given workspace membership. Anyone who can sign in with one of those email addresses now has access to this workspace without an invite.`,
    });
  }

  /** Jira key -> Trackly issue id, populated as projects are written. */
  const issueIdByKey = new Map<string, string>();
  const projectReports: ImportReport["projects"] = [];

  for (const planned of plan.projects) {
    const project = await resolveProject(planned, siteId, importerUserId, write, summary.projects, warnings);
    if (!project) {
      // Dry run with a project that does not exist yet: everything under it is
      // a create, and there is no id to hang children off.
      countProjectAsFullCreate(planned, summary);
      projectReports.push({
        jiraProjectKey: planned.jiraProjectKey,
        tracklyKey: planned.tracklyKey,
        name: planned.name,
        issueCount: planned.issues.length,
      });
      continue;
    }

    await writeSprintsAndComponents(planned, project.id, write, summary);
    await writeCustomFields(planned, project.id, write, summary.customFields);

    const { targets, unwritten } = await writeIssues(
      planned,
      project.id,
      resolver,
      write,
      summary.issues,
      issueIdByKey
    );

    // `targets` covers issues that have a real id — everything in a real run,
    // and the already-existing subset in a dry run. Children of the rest are
    // pure creates by definition, so they are counted from the plan rather
    // than guessed at.
    const childCounts = await writeIssueChildren(targets, resolver, write);
    mergeCounts(summary.comments, childCounts.comments);
    mergeCounts(summary.workLogs, childCounts.workLogs);
    mergeCounts(summary.history, childCounts.history);
    mergeCounts(summary.attachments, childCounts.attachments);
    countChildrenAsCreates(unwritten, summary);

    await assignSprints(planned, project.id, issueIdByKey, write);
    if (write) await syncIssueCounter(project.id, planned);

    projectReports.push({
      jiraProjectKey: planned.jiraProjectKey,
      tracklyKey: project.key,
      name: project.name,
      issueCount: planned.issues.length,
    });
  }

  await applyParents(plan, issueIdByKey, write, rowIssues);
  await applyLinks(plan, issueIdByKey, write, summary.links);

  return {
    dryRun: options.dryRun,
    source: plan.source,
    sourceRowCount: plan.sourceRowCount,
    plannedIssueCount: plan.projects.reduce((n, p) => n + p.issues.length, 0),
    summary,
    projects: projectReports,
    unmapped: plan.unmapped,
    rowIssues: rowIssues.sort((a, b) => a.row - b.row),
    warnings,
    users: resolver.report(),
  };
}

// ─── Users ──────────────────────────────────────────────────────────────────

function collectUserRefs(plan: ImportPlan): (JiraUserRef | null)[] {
  const refs: (JiraUserRef | null)[] = [];
  for (const project of plan.projects) {
    for (const { source } of project.issues) {
      refs.push(source.reporter, source.assignee);
      for (const c of source.comments) refs.push(c.author);
      for (const w of source.workLogs) refs.push(w.author);
      for (const h of source.history) refs.push(h.author);
      for (const a of source.attachments) refs.push(a.uploader);
    }
  }
  return refs;
}

// ─── Projects ───────────────────────────────────────────────────────────────

async function resolveProject(
  planned: PlannedProject,
  siteId: string,
  importerUserId: string,
  write: boolean,
  counts: EntityCounts,
  warnings: ImportWarning[]
): Promise<{ id: string; key: string; name: string } | null> {
  const existing = await prisma.project.findFirst({
    where: { siteId, key: planned.tracklyKey },
    select: { id: true, key: true, name: true },
  });

  if (existing) {
    counts.skipped += 1;
    warnings.push({
      code: "project-reused",
      // Reuse is what makes a re-run idempotent, but it is also how an import
      // could land on top of an unrelated project that happens to share a key.
      message: `Jira project ${planned.jiraProjectKey} will import into the EXISTING Trackly project "${existing.name}" (${existing.key}). If that is not the same project, set a different target key before running for real.`,
    });
    return existing;
  }

  counts.created += 1;
  if (!write) return null;

  const project = await prisma.project.create({
    data: {
      siteId,
      name: planned.name,
      key: planned.tracklyKey,
      type: planned.sprints.length > 0 ? "SCRUM" : "KANBAN",
      leadId: importerUserId,
    },
    select: { id: true, key: true, name: true },
  });

  await grantProjectAccess(project.id, importerUserId, "ADMIN");
  return project;
}

/** Dry run, project does not exist yet: everything beneath it is a create. */
function countProjectAsFullCreate(planned: PlannedProject, summary: ImportSummary): void {
  summary.issues.created += planned.issues.length;
  summary.sprints.created += planned.sprints.length;
  summary.components.created += planned.components.length;
  summary.customFields.created += planned.customFieldNames.length;
  countChildrenAsCreates(planned.issues.map((i) => i.source), summary);
}

function countChildrenAsCreates(sources: NormalizedIssue[], summary: ImportSummary): void {
  for (const source of sources) {
    summary.comments.created += source.comments.length;
    summary.workLogs.created += source.workLogs.length;
    summary.history.created += source.history.length;
    summary.attachments.created += source.attachments.length;
  }
}

// ─── Sprints, components, custom fields ─────────────────────────────────────

async function writeSprintsAndComponents(
  planned: PlannedProject,
  projectId: string,
  write: boolean,
  summary: ImportReport["summary"]
): Promise<void> {
  const existingSprints = await prisma.sprint.findMany({
    where: { projectId },
    select: { id: true, name: true },
  });
  const sprintNames = new Set(existingSprints.map((s) => s.name));

  for (const sprint of planned.sprints) {
    if (sprintNames.has(sprint.name)) {
      summary.sprints.skipped += 1;
      continue;
    }
    summary.sprints.created += 1;
    sprintNames.add(sprint.name);
    if (!write) continue;
    // Sprint has no @@unique([projectId, name]), so this is check-then-create.
    // Two concurrent imports of the same file could duplicate a sprint; the
    // importer is an admin-triggered action, not a concurrent write path.
    await prisma.sprint.create({
      data: {
        projectId,
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
    });
  }

  const existingComponents = await prisma.projectComponent.findMany({
    where: { projectId },
    select: { name: true },
  });
  const componentNames = new Set(existingComponents.map((c) => c.name));

  for (const name of planned.components) {
    if (componentNames.has(name)) {
      summary.components.skipped += 1;
      continue;
    }
    summary.components.created += 1;
    if (!write) continue;
    await prisma.projectComponent.upsert({
      where: { projectId_name: { projectId, name } },
      create: { projectId, name },
      update: {},
    });
  }
}

async function writeCustomFields(
  planned: PlannedProject,
  projectId: string,
  write: boolean,
  counts: EntityCounts
): Promise<void> {
  if (planned.customFieldNames.length === 0) return;

  const existing = await prisma.customField.findMany({ where: { projectId }, select: { name: true } });
  const names = new Set(existing.map((f) => f.name));

  const rows = planned.customFieldNames.filter((name) => {
    if (names.has(name)) {
      counts.skipped += 1;
      return false;
    }
    names.add(name);
    counts.created += 1;
    return true;
  });

  if (write && rows.length > 0) {
    await prisma.customField.createMany({
      data: rows.map((name) => ({ projectId, name, fieldType: "STRING" })),
    });
  }
}

// ─── Issues ─────────────────────────────────────────────────────────────────

async function writeIssues(
  planned: PlannedProject,
  projectId: string,
  resolver: UserResolver,
  write: boolean,
  counts: EntityCounts,
  issueIdByKey: Map<string, string>
): Promise<{ targets: IssueTarget[]; unwritten: NormalizedIssue[] }> {
  const numbers = planned.issues.map((i) => i.source.jiraNumber);
  const existing = await prisma.issue.findMany({
    where: { projectId, number: { in: numbers } },
    select: { id: true, number: true },
  });
  const existingByNumber = new Map(existing.map((i) => [i.number, i.id]));

  const targets: IssueTarget[] = [];
  const unwritten: NormalizedIssue[] = [];

  for (const batch of chunk(planned.issues)) {
    for (const item of batch) {
      const { source } = item;
      const number = source.jiraNumber;
      const key = `${planned.tracklyKey}-${number}`;
      const existingId = existingByNumber.get(number);

      if (existingId) counts.updated += 1;
      else counts.created += 1;

      if (!write) {
        // Dry run. An issue that already exists still has a real id, so its
        // children can be diffed against the database for an accurate
        // create/skip split. One that does not exist has no id, so its
        // children are counted from the plan by the caller.
        if (existingId) {
          issueIdByKey.set(source.jiraKey, existingId);
          targets.push({ issueId: existingId, source });
        } else {
          unwritten.push(source);
        }
        continue;
      }

      const data = {
        summary: source.summary,
        description: source.description,
        type: item.type,
        status: item.status,
        priority: item.priority,
        storyPoints: item.storyPoints,
        originalEstimate: item.originalEstimateHours,
        assigneeId: resolver.resolve(source.assignee),
        labels: item.labels,
        startDate: source.startDate,
        dueDate: source.dueDate,
        rank: number * RANK_STEP,
      };

      const issue = await prisma.issue.upsert({
        where: { projectId_number: { projectId, number } },
        create: {
          projectId,
          number,
          key,
          reporterId: resolver.resolveRequired(source.reporter),
          createdAt: source.createdAt ?? undefined,
          ...data,
        },
        // reporterId is intentionally NOT updated: a re-run must not reassign
        // authorship that a Trackly admin may have corrected by hand.
        update: data,
        select: { id: true },
      });

      issueIdByKey.set(source.jiraKey, issue.id);
      targets.push({ issueId: issue.id, source });
    }
  }

  return { targets, unwritten };
}

/**
 * Project.issueCounter must sit at or above MAX(number) or the next natively
 * created issue collides on @@unique([projectId, number]). createIssue retries
 * past that drift, but leaving it correct saves five wasted round trips per
 * create for the rest of the project's life.
 */
async function syncIssueCounter(projectId: string, planned: PlannedProject): Promise<void> {
  const highest = planned.issues.reduce((max, i) => Math.max(max, i.source.jiraNumber), 0);
  if (highest === 0) return;

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { issueCounter: true } });
  if (!project || project.issueCounter >= highest) return;

  await prisma.project.update({ where: { id: projectId }, data: { issueCounter: highest } });
}

// ─── Sprint assignment ──────────────────────────────────────────────────────

async function assignSprints(
  planned: PlannedProject,
  projectId: string,
  issueIdByKey: Map<string, string>,
  write: boolean
): Promise<void> {
  if (!write || planned.sprints.length === 0) return;

  const sprints = await prisma.sprint.findMany({ where: { projectId }, select: { id: true, name: true } });
  const sprintIdByName = new Map(sprints.map((s) => [s.name, s.id]));

  for (const sprint of planned.sprints) {
    const sprintId = sprintIdByName.get(sprint.name);
    if (!sprintId) continue;

    const issueIds = sprint.issueKeys
      .map((key) => issueIdByKey.get(key))
      .filter((id): id is string => !!id);

    for (const batch of chunk(issueIds)) {
      await prisma.issue.updateMany({ where: { id: { in: batch } }, data: { sprintId } });
    }
  }
}

// ─── Second pass: hierarchy and links ───────────────────────────────────────

async function applyParents(
  plan: ImportPlan,
  issueIdByKey: Map<string, string>,
  write: boolean,
  rowIssues: RowIssue[]
): Promise<void> {
  if (!write) return;

  for (const edge of plan.parents) {
    const childId = issueIdByKey.get(edge.childKey);
    const parentId = issueIdByKey.get(edge.parentKey);
    if (!childId || !parentId) {
      rowIssues.push({
        row: 0,
        jiraKey: edge.childKey,
        field: "parent",
        severity: "warning",
        message: `Parent link ${edge.childKey} -> ${edge.parentKey} was not applied because one of the issues failed to import.`,
      });
      continue;
    }
    if (childId === parentId) continue;
    await prisma.issue.update({ where: { id: childId }, data: { parentId } });
  }
}

async function applyLinks(
  plan: ImportPlan,
  issueIdByKey: Map<string, string>,
  write: boolean,
  counts: EntityCounts
): Promise<void> {
  if (!write) {
    // Nothing has been written, so most keys are absent from the map. The plan
    // count is the honest upper bound; the real run reports the exact figure.
    counts.created += plan.links.length;
    return;
  }

  const rows = plan.links.flatMap((link) => {
    const sourceIssueId = issueIdByKey.get(link.sourceKey);
    const targetIssueId = issueIdByKey.get(link.targetKey);
    if (!sourceIssueId || !targetIssueId || sourceIssueId === targetIssueId) return [];
    return [{ sourceIssueId, targetIssueId, relation: link.relation }];
  });

  counts.created += rows.length;
  if (rows.length === 0) return;

  for (const batch of chunk(rows)) {
    // @@unique([sourceIssueId, targetIssueId, relation]) makes this the one
    // place idempotency is enforced by the database rather than by a read.
    await prisma.issueLink.createMany({ data: batch, skipDuplicates: true });
  }
}

// ─── Counting ───────────────────────────────────────────────────────────────

function mergeCounts(into: EntityCounts, from: EntityCounts): void {
  into.created += from.created;
  into.updated += from.updated;
  into.skipped += from.skipped;
}

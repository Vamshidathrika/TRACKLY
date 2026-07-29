import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function testDatabaseRelations() {
  console.log("=== Starting Exhaustive Database Relations Integration Test ===");
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`✗ [FAIL] ${testName}`);
      failedCount++;
    }
  }

  try {
    // 1. Test Site <-> User <-> Membership relation
    const site = await prisma.site.create({
      data: { name: "Relational Test Site", slug: `test-site-${Date.now()}` },
    });
    const user = await prisma.user.create({
      data: {
        email: `dbtest-${Date.now()}@trackly.dev`,
        name: "DB Tester",
        passwordHash: "hash123",
      },
    });
    const membership = await prisma.membership.create({
      data: { userId: user.id, siteId: site.id, role: "ADMIN" },
      include: { user: true, site: true },
    });
    assert(membership.user.id === user.id && membership.site.id === site.id, "Site <-> User <-> Membership join");

    // 2. Test Project <-> User (Lead) & Site relation
    const project = await prisma.project.create({
      data: {
        siteId: site.id,
        name: "Relational Project",
        key: `REL${Date.now().toString().slice(-4)}`,
        leadId: user.id,
        type: "KANBAN",
      },
      include: { lead: true, site: true },
    });
    assert(project.lead.id === user.id && project.site.id === site.id, "Project <-> Lead & Site join");

    // 3. Test ProjectMember relation
    const pm = await prisma.projectMember.create({
      data: { projectId: project.id, userId: user.id, role: "ADMIN" },
      include: { project: true, user: true },
    });
    assert(pm.project.id === project.id && pm.user.id === user.id, "ProjectMember relation");

    // 4. Test Sprint <-> Project relation
    const sprint = await prisma.sprint.create({
      data: { projectId: project.id, name: "Sprint 1", status: "ACTIVE" },
      include: { project: true },
    });
    assert(sprint.project.id === project.id, "Sprint <-> Project relation");

    // 5. Test Release <-> Project relation
    const release = await prisma.release.create({
      data: { projectId: project.id, name: "v1.0.0", status: "UNRELEASED" },
      include: { project: true },
    });
    assert(release.project.id === project.id, "Release <-> Project relation");

    // 6. Test Parent Issue <-> Subtask Issue Hierarchy
    const parentIssue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number: 1,
        key: `${project.key}-1`,
        summary: "Parent Feature Task",
        type: "STORY",
        reporterId: user.id,
        assigneeId: user.id,
        sprintId: sprint.id,
        releaseId: release.id,
      },
    });

    const subtaskIssue = await prisma.issue.create({
      data: {
        projectId: project.id,
        number: 2,
        key: `${project.key}-2`,
        summary: "Subtask 1",
        type: "SUBTASK",
        reporterId: user.id,
        parentId: parentIssue.id,
      },
      include: { parent: true },
    });
    assert(subtaskIssue.parent?.id === parentIssue.id, "Issue Parent <-> Subtask Hierarchy relation");

    // 7. Test Comment <-> Issue & User relation
    const comment = await prisma.comment.create({
      data: { issueId: parentIssue.id, authorId: user.id, body: "Test relation comment" },
      include: { issue: true, author: true },
    });
    assert(comment.issue.id === parentIssue.id && comment.author.id === user.id, "Comment <-> Issue & Author relation");

    // 8. Test IssueHistory relation
    const history = await prisma.issueHistory.create({
      data: { issueId: parentIssue.id, authorId: user.id, field: "status", oldValue: "TO_DO", newValue: "IN_PROGRESS" },
      include: { issue: true, author: true },
    });
    assert(history.issue.id === parentIssue.id && history.author.id === user.id, "IssueHistory relation");

    // 9. Test Attachment relation
    const attachment = await prisma.attachment.create({
      data: {
        issueId: parentIssue.id,
        uploaderId: user.id,
        filename: "test.pdf",
        url: "https://blob.vercel.com/test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
      include: { issue: true, uploader: true },
    });
    assert(attachment.issue.id === parentIssue.id && attachment.uploader.id === user.id, "Attachment relation");

    // 10. Test IssueLink relation (source & target)
    const issueLink = await prisma.issueLink.create({
      data: {
        sourceIssueId: parentIssue.id,
        targetIssueId: subtaskIssue.id,
        relation: "BLOCKS",
      },
      include: { sourceIssue: true, targetIssue: true },
    });
    assert(issueLink.sourceIssue.id === parentIssue.id && issueLink.targetIssue.id === subtaskIssue.id, "IssueLink source <-> target relation");

    // 11. Test WorkLog relation
    const workLog = await prisma.workLog.create({
      data: { issueId: parentIssue.id, authorId: user.id, hours: 2.5, description: "Worked on design" },
      include: { issue: true, author: true },
    });
    assert(workLog.issue.id === parentIssue.id && workLog.author.id === user.id, "WorkLog relation");

    // 12. Test Watcher relation
    const watcher = await prisma.watcher.create({
      data: { issueId: parentIssue.id, userId: user.id },
      include: { issue: true, user: true },
    });
    assert(watcher.issue.id === parentIssue.id && watcher.user.id === user.id, "Watcher relation");

    // 13. Test Notification relation (user & actor)
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        actorId: user.id,
        type: "ASSIGNMENT",
        title: "Assigned issue",
        message: "You were assigned REL-1",
        link: "/projects/REL-1",
      },
      include: { user: true, actor: true },
    });
    assert(notification.user.id === user.id && notification.actor.id === user.id, "Notification user & actor relation");

    // 14. Test SavedFilter relation
    const filter = await prisma.savedFilter.create({
      data: { userId: user.id, name: "High Priority Issues", jql: 'priority = "HIGH"' },
      include: { user: true },
    });
    assert(filter.user.id === user.id, "SavedFilter relation");

    // 15. Test AutomationRule relation
    const autoRule = await prisma.automationRule.create({
      data: {
        projectId: project.id,
        name: "Auto Assign",
        eventTrigger: "ISSUE_CREATED",
        action: "ASSIGN_USER",
        targetValue: user.id,
      },
      include: { project: true },
    });
    assert(autoRule.project.id === project.id, "AutomationRule relation");

    // 16. Test CustomField relation
    const customField = await prisma.customField.create({
      data: { projectId: project.id, name: "Environment", fieldType: "STRING" },
      include: { project: true },
    });
    assert(customField.project.id === project.id, "CustomField relation");

    // 17. Test Star relation
    const star = await prisma.star.create({
      data: { userId: user.id, projectId: project.id },
      include: { user: true, project: true },
    });
    assert(star.user.id === user.id && star.project.id === project.id, "Star user & project relation");

    // 18. Test Invite relation
    const invite = await prisma.invite.create({
      data: {
        siteId: site.id,
        email: "invitee@trackly.dev",
        token: `inv-${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400000),
      },
      include: { site: true },
    });
    assert(invite.site.id === site.id, "Invite relation");

    // 19. Test GitInstallation <-> GitRepository relation
    const gitInst = await prisma.gitInstallation.create({
      data: { siteId: site.id, installationId: `inst-${Date.now()}`, accountName: "acme-org" },
    });
    const gitRepo = await prisma.gitRepository.create({
      data: {
        siteId: site.id,
        projectId: project.id,
        installationId: gitInst.id,
        owner: "acme-org",
        repoName: "core-repo",
      },
      include: { site: true, project: true, installation: true },
    });
    assert(gitRepo.installation?.id === gitInst.id && gitRepo.project.id === project.id, "GitRepository <-> Installation & Project relation");

    // 20. Test GitCommit <-> Issue relation
    const gitCommit = await prisma.gitCommit.create({
      data: {
        siteId: site.id,
        repositoryId: gitRepo.id,
        hash: `hash-${Date.now()}`,
        message: `Fix ${parentIssue.key} auth redirect`,
        authorName: "Dev Tester",
        committedAt: new Date(),
        issueId: parentIssue.id,
      },
      include: { repository: true, issue: true },
    });
    assert(gitCommit.repository.id === gitRepo.id && gitCommit.issue?.id === parentIssue.id, "GitCommit <-> Repository & Issue relation");

    // 21. Test PullRequest <-> Issue relation
    const pullReq = await prisma.pullRequest.create({
      data: {
        siteId: site.id,
        repositoryId: gitRepo.id,
        prNumber: 101,
        title: `PR for ${parentIssue.key}`,
        status: "OPEN",
        authorName: "Dev Tester",
        issueId: parentIssue.id,
      },
      include: { repository: true, issue: true },
    });
    assert(pullReq.repository.id === gitRepo.id && pullReq.issue?.id === parentIssue.id, "PullRequest <-> Repository & Issue relation");

    // 22. Test GitBranch <-> Issue relation
    const gitBranch = await prisma.gitBranch.create({
      data: {
        siteId: site.id,
        repositoryId: gitRepo.id,
        name: `feature/${parentIssue.key}-login-fix`,
        issueId: parentIssue.id,
      },
      include: { repository: true, issue: true },
    });
    assert(gitBranch.repository.id === gitRepo.id && gitBranch.issue?.id === parentIssue.id, "GitBranch <-> Repository & Issue relation");

    // 23. Test SiteIntegration relation
    const integration = await prisma.siteIntegration.create({
      data: { siteId: site.id, provider: `SLACK_${Date.now()}`, status: "CONNECTED" },
      include: { site: true },
    });
    assert(integration.site.id === site.id, "SiteIntegration relation");

    // 24. Test ProjectComponent relation
    const comp = await prisma.projectComponent.create({
      data: { projectId: project.id, name: "Auth Module", leadId: user.id },
      include: { project: true, lead: true },
    });
    assert(comp.project.id === project.id && comp.lead?.id === user.id, "ProjectComponent <-> Project & Lead relation");

    // 25. Test SlaPolicy relation
    const sla = await prisma.slaPolicy.create({
      data: { projectId: project.id, name: "P1 Support SLA", targetResponseMins: 15 },
      include: { project: true },
    });
    assert(sla.project.id === project.id, "SlaPolicy relation");

    // 26. Test Idea relation
    const idea = await prisma.idea.create({
      data: { projectId: project.id, title: "SAML 2.0 Okta SSO", impactScore: 9.5, effortScore: 4.0 },
      include: { project: true },
    });
    assert(idea.project.id === project.id, "Idea relation");

    // 27. Test CASCADE Delete (Deleting Site cascades to Project, Memberships, Invites, GitRepos, etc.)
    await prisma.site.delete({ where: { id: site.id } });
    const remainingProj = await prisma.project.findUnique({ where: { id: project.id } });
    const remainingIssue = await prisma.issue.findUnique({ where: { id: parentIssue.id } });
    assert(remainingProj === null && remainingIssue === null, "CASCADE Deletion (Site delete purges nested Projects and Issues)");

    // Cleanup user
    await prisma.user.delete({ where: { id: user.id } });

    console.log(`\n=== Database Relations Test Results: ${passedCount} PASSED, ${failedCount} FAILED ===`);
    return failedCount === 0;
  } catch (error) {
    console.error("Database relation test exception:", error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testDatabaseRelations().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export interface TestDomainSpec {
  id: string;
  name: string;
  url: string;
  goal: string;
  expectedElements: string[];
}

export const TRACKLY_TEST_DOMAINS: TestDomainSpec[] = [
  {
    id: 'D1',
    name: 'Authentication & Identity',
    url: 'http://localhost:3000/login',
    goal: 'Verify email/password form, demo login button, and auth redirection to /projects',
    expectedElements: ['Demo Login', 'Sign in', 'Email']
  },
  {
    id: 'D2',
    name: 'Multi-Tenancy & Site Access',
    url: 'http://localhost:3000/settings/members',
    goal: 'Inspect site settings, member list, and invite generation controls',
    expectedElements: ['Members', 'Invite', 'Role']
  },
  {
    id: 'D3',
    name: 'Project Management',
    url: 'http://localhost:3000/projects',
    goal: 'Browse project list, star/favorite projects, and inspect project lead details',
    expectedElements: ['Projects', 'Create Project', 'Lead']
  },
  {
    id: 'D4',
    name: 'Interactive Kanban Board',
    url: 'http://localhost:3000/projects/demo/board',
    goal: 'Inspect 4-column workflow grid (TO DO, IN PROGRESS, IN REVIEW, DONE), card story points, and filters',
    expectedElements: ['TO DO', 'IN PROGRESS', 'IN REVIEW', 'DONE']
  },
  {
    id: 'D5',
    name: 'Issue Lifecycle & Detail Drawer',
    url: 'http://localhost:3000/projects/demo/issues',
    goal: 'Open issue detail drawer, edit priority, assign story points, assign user, and update dates',
    expectedElements: ['Summary', 'Priority', 'Assignee', 'Story Points']
  },
  {
    id: 'D6',
    name: 'Collaboration & History',
    url: 'http://localhost:3000/projects/demo/issues',
    goal: 'Post comment, log work hours, attach file, and inspect audit history log',
    expectedElements: ['Comments', 'Work Log', 'History', 'Attachments']
  },
  {
    id: 'D7',
    name: 'Sprint & Agile Backlog',
    url: 'http://localhost:3000/projects/demo/backlog',
    goal: 'Inspect backlog issues, active sprint section, start sprint control, and retro board',
    expectedElements: ['Backlog', 'Sprint', 'Start Sprint']
  },
  {
    id: 'D8',
    name: 'Release Management',
    url: 'http://localhost:3000/projects/demo/releases',
    goal: 'Inspect release versions, release status tags, and markdown release notes generator',
    expectedElements: ['Releases', 'Create Version', 'Release Notes']
  },
  {
    id: 'D9',
    name: 'Search & JQL Engine',
    url: 'http://localhost:3000/search',
    goal: 'Execute JQL search query, inspect results grid, and save custom filter',
    expectedElements: ['Search', 'JQL', 'Save Filter']
  },
  {
    id: 'D10',
    name: 'Dashboards & Reporting Analytics',
    url: 'http://localhost:3000/projects/demo/reports',
    goal: 'Verify Burndown chart, Velocity chart, and Cumulative Flow Diagram tabs',
    expectedElements: ['Burndown', 'Velocity', 'Cumulative Flow']
  },
  {
    id: 'D11',
    name: 'Automation Engine',
    url: 'http://localhost:3000/projects/demo/automation',
    goal: 'View active automation rules, trigger event settings, and AI rule builder',
    expectedElements: ['Automation Rules', 'Create Rule', 'Trigger']
  },
  {
    id: 'D12',
    name: 'AI Copilot & Assistant',
    url: 'http://localhost:3000/projects/demo/board',
    goal: 'Open Rovo AI agent assistant drawer and request project summary',
    expectedElements: ['AI Copilot', 'Rovo', 'Ask AI']
  },
  {
    id: 'D13',
    name: 'Developer Integrations & VCS',
    url: 'http://localhost:3000/projects/demo/dev',
    goal: 'Inspect connected Git repositories, branches, pull requests, and webhook event log',
    expectedElements: ['Development', 'Repositories', 'Pull Requests', 'Branches']
  },
  {
    id: 'D14',
    name: 'Chrome & User Preferences',
    url: 'http://localhost:3000/projects/demo/board',
    goal: 'Toggle Dark/Light theme, open global search, test hotkeys, and check notification bell',
    expectedElements: ['Theme', 'Notifications', 'Quick Search']
  }
];

export async function runTestDomainSuite() {
  console.log('=== Harness E2E Testing Suite Strategy ===');
  console.log(`Total domains to test: ${TRACKLY_TEST_DOMAINS.length}`);
  for (const domain of TRACKLY_TEST_DOMAINS) {
    console.log(`[${domain.id}] ${domain.name} -> Target: ${domain.url}`);
    console.log(`     Goal: ${domain.goal}`);
  }
  console.log('=== Strategy Ready for Harness MCP Agent Execution ===');
}

if (require.main === module) {
  runTestDomainSuite();
}

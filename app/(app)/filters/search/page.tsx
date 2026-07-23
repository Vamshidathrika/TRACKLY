import { getSavedFiltersAction, executeJQLQueryAction } from "@/app/(app)/filters/actions";
import { getAllUsers } from "@/lib/users";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { JQLNavigator } from "@/components/search/JQLNavigator";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function FilterSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ jql?: string }>;
}) {
  const { jql } = await searchParams;

  const [savedFilters, allUsers] = await Promise.all([
    getSavedFiltersAction(),
    getAllUsers(),
  ]);

  const initialJql = jql || "status = IN_PROGRESS OR status = TO_DO";
  const initialIssues = await executeJQLQueryAction(initialJql);

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Filters", href: "/filters/search" }, { label: "Search Issues" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Search Issues & JQL Navigator</h1>
          <p className="text-xs text-text-subtle">Advanced issue search and filter management</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
      </div>

      <JQLNavigator
        initialJql={initialJql}
        initialIssues={initialIssues.map((i) => ({ ...i, project: { key: i.project.key, name: i.project.name } }))}
        savedFilters={savedFilters}
        availableUsers={allUsers}
      />
    </div>
  );
}

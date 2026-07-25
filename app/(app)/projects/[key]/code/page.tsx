import { CodeView } from "@/components/board/SpaceViews";

export default async function ProjectCodePage() {
  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <CodeView />
    </main>
  );
}

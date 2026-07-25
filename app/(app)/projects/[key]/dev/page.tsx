import { DevView } from "@/components/board/SpaceViews";

export default async function ProjectDevPage() {
  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <DevView />
    </main>
  );
}

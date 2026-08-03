import { notFound } from "next/navigation";
import { Board } from "@/components/Board";
import { parseWorkspaceSlug } from "@/lib/workspace";

export default async function WorkspaceHome({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: slug } = await params;
  const workspace = parseWorkspaceSlug(slug);
  if (!workspace) notFound();

  return <Board key={workspace} workspace={workspace} />;
}

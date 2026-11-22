import { ShowStatusControls } from "@/components/show-status-controls";
import { readCsrfToken } from "@/components/csrf-field";
import type { ShowStatus } from "@/lib/library/database";

export async function ShowStatusForm({
  showId,
  current,
  nextPath,
  finished,
}: {
  showId: number;
  current: ShowStatus | null;
  nextPath: string;
  finished: boolean;
}) {
  const csrf = await readCsrfToken();
  return (
    <ShowStatusControls
      csrf={csrf}
      showId={showId}
      current={current}
      nextPath={nextPath}
      finished={finished}
    />
  );
}

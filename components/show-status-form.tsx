import { ShowStatusControls } from "@/components/show-status-controls";
import { readCsrfToken } from "@/components/csrf-field";
import type { ShowStatus } from "@/lib/library/database";

export async function ShowStatusForm({
  showId,
  current,
  rating,
  nextPath,
}: {
  showId: number;
  current: ShowStatus | null;
  rating: number | null;
  nextPath: string;
}) {
  const csrf = await readCsrfToken();
  return (
    <ShowStatusControls
      csrf={csrf}
      showId={showId}
      current={current}
      rating={rating}
      nextPath={nextPath}
    />
  );
}

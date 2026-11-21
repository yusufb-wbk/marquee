export type LibraryPost =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

function isLibraryPost(value: unknown): value is LibraryPost {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return false;
  }
  if (value.ok === true) {
    return true;
  }
  return (
    value.ok === false &&
    "error" in value &&
    typeof value.error === "string" &&
    value.error.length > 0
  );
}

export function submitterOf(
  event: { nativeEvent: Event },
): HTMLButtonElement | null {
  const native = event.nativeEvent;
  if (!(native instanceof SubmitEvent)) {
    return null;
  }
  return native.submitter instanceof HTMLButtonElement ? native.submitter : null;
}

/** Saves a library form without navigating away from the page. */
export async function submitLibraryForm(
  form: HTMLFormElement,
  submitter: HTMLButtonElement | null,
): Promise<LibraryPost> {
  const body = new FormData(form);
  if (submitter?.name) {
    body.set(submitter.name, submitter.value);
  }

  let response: Response;
  try {
    response = await fetch(form.action, {
      method: "POST",
      body,
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
  } catch {
    return { ok: false, error: "save" };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { ok: false, error: "save" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "save" };
  }
  if (!isLibraryPost(payload)) {
    return { ok: false, error: "save" };
  }
  return payload;
}

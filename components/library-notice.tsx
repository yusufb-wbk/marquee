import { Message } from "@/components/message";
import { libraryNotice } from "@/lib/library/notices";

export function LibraryNotice({ code }: { code: string }) {
  if (code === "schema") {
    return null;
  }
  const copy = libraryNotice(code);
  if (!copy) {
    return null;
  }
  return (
    <Message tone="error" title={copy.title}>
      {copy.body}
    </Message>
  );
}

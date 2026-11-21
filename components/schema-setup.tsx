import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Message } from "@/components/message";

function readSchema(): string {
  try {
    return readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");
  } catch {
    return "Open supabase/schema.sql in the project and run it in the Supabase SQL editor.";
  }
}

export function SchemaSetup() {
  return (
    <Message tone="error" title="Your list needs a database table">
      <p>
        In the Supabase dashboard, open SQL Editor, paste this, and run it
        once. Then reload this page.
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
        {readSchema()}
      </pre>
    </Message>
  );
}

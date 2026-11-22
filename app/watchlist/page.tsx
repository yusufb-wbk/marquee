import { redirect } from "next/navigation";

import { firstQueryValue } from "@/lib/format";

type PageProps = {
  searchParams: Promise<{ library?: string | string[] }>;
};

export default async function WatchlistPage({ searchParams }: PageProps) {
  const library = firstQueryValue((await searchParams).library);
  const extra = library.length > 0 ? `&library=${encodeURIComponent(library)}` : "";
  redirect(`/profile?tab=watchlist${extra}`);
}

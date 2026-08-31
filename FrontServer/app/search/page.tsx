import { Suspense } from "react";
import SearchResultsView from "@/components/search/SearchResultsView";

export const metadata = { title: "검색 · VidShare" };

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <h1 className="text-2xl font-bold">검색</h1>
        </main>
      }
    >
      <SearchResultsView />
    </Suspense>
  );
}

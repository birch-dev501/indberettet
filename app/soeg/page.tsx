import { Suspense } from "react";
import type { Metadata } from "next";
import { FullSearch } from "@/components/full-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Søg",
  description: "Søg i stoffer, præparater, firmaer, bødesager og sider.",
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main id="indhold" className="wrap page-head">
        <Suspense fallback={<p>Henter søgning…</p>}>
          <FullSearch />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

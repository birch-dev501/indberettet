import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="indhold" className="wrap page-head">
        <h1>Siden findes ikke</h1>
        <p>Stoffet er ikke blandt dem, vi har hentet.</p>
        <p>
          <Link href="/katalog">Gå til søgningen</Link>
        </p>
      </main>
    </>
  );
}

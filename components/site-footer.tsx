import Link from "next/link";
import { ReportIssue } from "@/components/report-issue";
import { formatDate } from "@/lib/format";
import { getIndex, getStatus } from "@/lib/data";

export function SiteFooter() {
  const index = getIndex();
  const status = getStatus();
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <strong>Indberettet</strong>
          <p>
            Uafhængig visning af Lægemiddelstyrelsens åbne bivirkningsoversigter. Sitet er ikke
            Lægemiddelstyrelsen og giver ikke lægelige råd. Stop ikke ordineret medicin uden at tale med en læge.
          </p>
        </div>
        <div>
          <p>
            Data opdateret: {formatDate(index.dataExtractionDateMax)}
            <br />
            Sidst hentet: {formatDate(status.generatedAt)}
          </p>
          <p>
            <a href={status.indexUrl}>Interaktive bivirkningsoversigter</a>
          </p>
        </div>
        <div>
          <p>
            <Link href="/kategori">Grupper efter ATC</Link>
            <br />
            <Link href="/om-data">Sådan læses tallene</Link>
            <br />
            <Link href="/forstaa-forskning">Sådan læses forsøgstal</Link>
            <br />
            <a href="https://laegemiddelstyrelsen.dk/da/bivirkninger/bivirkninger-ved-medicin/meld-en-bivirkning/">
              Meld en bivirkning
            </a>
            <br />
            <a href="https://github.com/birch-dev501/indberettet">Kildekode</a>
            <br />
            <ReportIssue />
          </p>
        </div>
      </div>
    </footer>
  );
}

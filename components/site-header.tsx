import Link from "next/link";

export function SiteHeader({ current }: { current?: "home" | "katalog" | "kategori" | "sygdom" | "firma" | "om" }) {
  return (
    <header className="site-header">
      <a className="skip" href="#indhold">
        Spring til indhold
      </a>
      <div className="wrap header-inner">
        <Link className="brand" href="/">
          <span className="mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">
            Ind<em>berettet</em>
          </span>
        </Link>
        <nav className="nav" aria-label="Hovedmenu">
          <Link href="/katalog" aria-current={current === "katalog" ? "page" : undefined}>
            Stoffer og præparater
          </Link>
          <Link href="/kategori" aria-current={current === "kategori" ? "page" : undefined}>
            Grupper
          </Link>
          <Link href="/sygdom" aria-current={current === "sygdom" ? "page" : undefined}>
            Efter sygdom
          </Link>
          <Link href="/firma" aria-current={current === "firma" ? "page" : undefined}>
            Firmaer
          </Link>
          <Link href="/om-data" aria-current={current === "om" ? "page" : undefined}>
            Om data
          </Link>
        </nav>
      </div>
    </header>
  );
}

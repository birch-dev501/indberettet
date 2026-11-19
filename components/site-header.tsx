"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/katalog", id: "katalog", label: "Stoffer og præparater" },
  { href: "/kategori", id: "kategori", label: "Grupper" },
  { href: "/sygdom", id: "sygdom", label: "Efter sygdom" },
  { href: "/firma", id: "firma", label: "Firmaer" },
  { href: "/om-data", id: "om", label: "Om data" },
  { href: "/forstaa-forskning", id: "forskning", label: "Forsøgstal" },
] as const;

export function SiteHeader({ current }: { current?: (typeof LINKS)[number]["id"] | "home" }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="skip" href="#indhold">
        Spring til indhold
      </a>
      <div className="wrap header-inner">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
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
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="hovedmenu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Luk" : "Menu"}
        </button>
        <nav id="hovedmenu" className={open ? "nav open" : "nav"} aria-label="Hovedmenu">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current === link.id ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

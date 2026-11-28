import type { Metadata } from "next";
import { readFileSync } from "fs";
import path from "path";
import Link from "next/link";
import { ArticleBlocks } from "@/components/article-blocks";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { parseArticle, type ArticleBlock } from "@/lib/article-markdown";

export const metadata: Metadata = {
  title: "Kan man forebygge vinterens luftvejsinfektioner uden vaccine?",
  description:
    "D-vitamin beskytter ikke sikkert mod forkølelse, influenza eller covid. Saltvand i næsen har en beskeden, dokumenteret effekt, mens påstande om at desinficere næse og svælg ikke er vist i forsøg.",
};

export default function LuftvejsinfektionerUdenVaccinePage() {
  const markdown = readFileSync(path.join(process.cwd(), "content", "luftvejsinfektioner-uden-vaccine.md"), "utf8");
  const blocks = parseArticle(markdown);
  const title = blocks.find((block) => block.type === "h1");
  const rest = blocks.filter((block) => block !== title);
  const sections: { heading: string; blocks: ArticleBlock[] }[] = [];
  const lead: ArticleBlock[] = [];
  for (const block of rest) {
    if (block.type === "h2") {
      sections.push({ heading: block.text, blocks: [] });
      continue;
    }
    if (sections.length === 0) lead.push(block);
    else sections[sections.length - 1].blocks.push(block);
  }
  return (
    <>
      <SiteHeader />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Alternativer til medicin. Om forebyggelse.</p>
        <h1 className="article-title">{title?.type === "h1" ? title.text : ""}</h1>
        <ArticleBlocks blocks={lead} />
        {sections.map((section) => (
          <article className="card section" key={section.heading}>
            <h2>{section.heading}</h2>
            <ArticleBlocks blocks={section.blocks} />
          </article>
        ))}
        <p className="small muted">
          <Link href="/">Tilbage til forsiden</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

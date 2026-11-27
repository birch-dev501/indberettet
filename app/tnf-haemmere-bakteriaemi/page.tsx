import type { Metadata } from "next";
import { readFileSync } from "fs";
import path from "path";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { parseArticle, parseInline, type ArticleBlock, type InlinePart } from "@/lib/article-markdown";

export const metadata: Metadata = {
  title: "TNF-hæmmere og bakterier i blodet ved tarmsygdom: Hvad viser det danske studie?",
  description:
    "Et dansk studie fandt 73 % højere rate af bakteriæmi hos IBD-patienter på TNF-hæmmere. Siden forklarer tallene. Den er ikke lægelig rådgivning.",
};

function inlineNodes(parts: InlinePart[]): ReactNode[] {
  return parts.map((part, index) => {
    if (part.type === "strong") return <strong key={index}>{part.text}</strong>;
    if (part.type === "em") return <em key={index}>{part.text}</em>;
    if (part.type === "link") {
      return (
        <a key={index} href={part.href} rel="noopener noreferrer">
          {part.text}
        </a>
      );
    }
    return <span key={index}>{part.text}</span>;
  });
}

function Paragraph({ text }: { text: string }) {
  const disclaimer = text.includes("ikke lægelig rådgivning");
  return <p className={disclaimer ? "note" : undefined}>{inlineNodes(parseInline(text))}</p>;
}

function Blocks({ blocks }: { blocks: ArticleBlock[] }) {
  return blocks.map((block, index) => {
    if (block.type === "p") return <Paragraph key={index} text={block.text} />;
    if (block.type === "ul") {
      return (
        <ul key={index}>
          {block.items.map((item) => (
            <li key={item}>{inlineNodes(parseInline(item))}</li>
          ))}
        </ul>
      );
    }
    return null;
  });
}

export default function TnfBakteriaemiPage() {
  const markdown = readFileSync(path.join(process.cwd(), "content", "tnf-haemmere-bakteriaemi.md"), "utf8");
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
        <p className="kicker">Studier. Ikke indberetninger.</p>
        <h1 className="article-title">{title?.type === "h1" ? title.text : ""}</h1>
        <Blocks blocks={lead} />
        {sections.map((section) => (
          <article className="card section" key={section.heading}>
            <h2>{section.heading}</h2>
            <Blocks blocks={section.blocks} />
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

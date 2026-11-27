import type { ReactNode } from "react";
import { isSitePath, sitePathHref } from "@/lib/article-href";
import { parseInline, type ArticleBlock, type InlinePart } from "@/lib/article-markdown";

function inlineNodes(parts: InlinePart[]): ReactNode[] {
  return parts.map((part, index) => {
    if (part.type === "strong") return <strong key={index}>{part.text}</strong>;
    if (part.type === "em") return <em key={index}>{part.text}</em>;
    if (part.type === "link") {
      if (isSitePath(part.href)) {
        return (
          <a key={index} href={sitePathHref(part.href)}>
            {part.text}
          </a>
        );
      }
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

export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
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

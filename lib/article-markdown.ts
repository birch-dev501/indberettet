export type ArticleBlock =
  | { type: "h1" | "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export function parseArticle(markdown: string): ArticleBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").trim().split("\n");
  const blocks: ArticleBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h2", text: line.slice(4).trim() });
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h1", text: line.slice(3).trim() });
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].slice(2).trim());
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("- ")
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "p", text: paragraph.join(" ") });
  }
  return blocks;
}

const LINK_PATTERN = /\[[^\]]+\]\((https?:\/\/(?:[^()]|\([^()]*\))+)\)/g;

export function articleLinks(markdown: string): string[] {
  return [...markdown.matchAll(LINK_PATTERN)].map((match) => match[1]);
}

export function articleHeadings(markdown: string): string[] {
  return parseArticle(markdown).flatMap((block) => (block.type === "h1" || block.type === "h2" ? [block.text] : []));
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:[^()]|\([^()]*\))+\))/g;

export type InlinePart =
  | { type: "text"; text: string }
  | { type: "strong" | "em"; text: string }
  | { type: "link"; text: string; href: string };

export function parseInline(text: string): InlinePart[] {
  const parts = text.split(INLINE);
  return parts.filter((part) => part !== "").map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) return { type: "strong", text: part.slice(2, -2) };
    if (part.startsWith("*") && part.endsWith("*")) return { type: "em", text: part.slice(1, -1) };
    const link = part.match(/^\[([^\]]+)\]\(((?:[^()]|\([^()]*\))+)\)$/);
    if (link) return { type: "link", text: link[1], href: link[2] };
    return { type: "text", text: part };
  });
}

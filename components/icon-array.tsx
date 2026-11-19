export function IconArray({
  filled,
  tone,
  caption,
}: {
  filled: number;
  tone: "placebo" | "vaccine";
  caption: string;
}) {
  return (
    <figure className="icon-figure">
      <figcaption>{caption}</figcaption>
      <div className="icon-array" aria-hidden="true">
        {Array.from({ length: 1000 }, (_, index) => (
          <span key={index} className={index < filled ? `on ${tone}` : ""} />
        ))}
      </div>
    </figure>
  );
}

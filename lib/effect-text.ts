export function learnMore(record: { learnMoreHref?: string; learnMoreLabel?: string }): { href: string; label: string } {
  if (record.learnMoreHref && record.learnMoreLabel) {
    return { href: record.learnMoreHref, label: record.learnMoreLabel };
  }
  return {
    href: "/forstaa-forskning/",
    label: "Sådan læses en relativ risikoreduktion, NNT og NNH",
  };
}

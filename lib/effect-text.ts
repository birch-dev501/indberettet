export function effectAnchor(id: string): string {
  return `effekt-${id}`;
}

export function groupName(group: string): string {
  return group.replace(/^i\s+/i, "");
}

export function unsizedCount(events: string, group: string, verb: string): string {
  return `${events} ${verb} i ${groupName(group)}`;
}

export function learnMore(record: { learnMoreHref?: string; learnMoreLabel?: string }): { href: string; label: string } {
  if (record.learnMoreHref && record.learnMoreLabel) {
    return { href: record.learnMoreHref, label: record.learnMoreLabel };
  }
  return {
    href: "/forstaa-forskning/",
    label: "Sådan læses en relativ risikoreduktion, NNT og NNH",
  };
}

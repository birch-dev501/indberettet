import { REPORT_NOTE, reportChooserHref, reportPageHref } from "@/lib/report";

export function ReportIssue({ path }: { path?: string }) {
  const href = path ? reportPageHref(path) : reportChooserHref();
  return (
    <span className="report-issue">
      <a href={href}>{path ? "Meld fejl på denne side" : "Fandt du en fejl? / Foreslå en forbedring"}</a>
      <span className="small muted"> {REPORT_NOTE}</span>
    </span>
  );
}

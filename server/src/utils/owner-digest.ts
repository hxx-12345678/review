import { escapeHtml } from "./billing";
import type { IssueReport } from "./issue-report";

export interface OwnerDigest {
  subject: string;
  text: string;
  html: string;
}

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

/**
 * The weekly owner summary. Pure so it can be tested without SMTP, and so the
 * same content can be rendered in-app or emailed.
 */
export function buildOwnerDigest({
  businessName,
  report,
  dashboardUrl,
}: {
  businessName: string;
  report: IssueReport;
  dashboardUrl: string;
}): OwnerDigest {
  const safeName = (businessName.trim() || "Your restaurant").replace(/[\r\n]+/g, " ");
  const windowLabel = `${report.windowDays}-day`;
  const subject = `${windowLabel} guest-experience summary — ${safeName}`;

  const topIssues = report.recurringIssues.slice(0, 5);
  const attention = report.needsAttention.slice(0, 5);
  const resolutions = report.recentResolutions.slice(0, 3);

  const lines: string[] = [
    `${windowLabel} guest-experience summary — ${safeName}`,
    "",
    `Issues in this period: ${report.totalIssues}`,
    `Open issues: ${report.openIssues}`,
    `Resolved in this period: ${report.resolvedIssues}`,
    `Resolution rate: ${report.resolutionRate}%`,
    `Average resolution time: ${formatHours(report.avgResolutionHours)}`,
    `Recurring problems still open: ${report.recurringIssuesOpen}`,
    `Came back after being marked resolved: ${report.postResolutionRecurrences}`,
  ];

  if (topIssues.length > 0) {
    lines.push("", "Top recurring problems");
    for (const issue of topIssues) {
      const suffix =
        issue.recurredAfterResolutionCount > 0
          ? `, ${issue.recurredAfterResolutionCount} after a fix`
          : "";
      lines.push(`- ${issue.label}: ${plural(issue.occurrences, "guest report")}${suffix}`);
    }
  }

  if (attention.length > 0) {
    lines.push("", "Needs attention");
    for (const item of attention) {
      const flag = item.recurredAfterResolution ? " (recurred after a fix)" : "";
      lines.push(`- ${item.label}: ${item.status}${flag}`);
    }
  }

  if (resolutions.length > 0) {
    lines.push("", "Recently resolved");
    for (const item of resolutions) {
      lines.push(`- ${item.label}: ${item.resolutionNotes}`);
    }
  }

  lines.push(
    "",
    report.postResolutionRecurrences > 0
      ? "A recorded fix did not hold. Review the resolution note and the current process before closing the new issue."
      : "Keep recording what was actually changed so next week's report can show whether it held.",
    "",
    `Open the manager queue: ${dashboardUrl}`,
  );

  const issueRows = topIssues
    .map((issue) => {
      const suffix =
        issue.recurredAfterResolutionCount > 0
          ? ` · <strong style="color:#b91c1c;">${issue.recurredAfterResolutionCount} after a fix</strong>`
          : "";
      return `<li style="margin:4px 0;">${escapeHtml(issue.label)} — ${plural(
        issue.occurrences,
        "guest report",
      )}${suffix}</li>`;
    })
    .join("");

  const attentionRows = attention
    .map(
      (item) =>
        `<li style="margin:4px 0;">${escapeHtml(item.label)} — ${escapeHtml(item.status)}${
          item.recurredAfterResolution
            ? ' · <strong style="color:#b91c1c;">recurred after a fix</strong>'
            : ""
        }</li>`,
    )
    .join("");

  const resolutionRows = resolutions
    .map(
      (item) =>
        `<li style="margin:4px 0;"><strong>${escapeHtml(item.label)}</strong> — ${escapeHtml(
          item.resolutionNotes,
        )}</li>`,
    )
    .join("");

  const recurrenceBanner =
    report.postResolutionRecurrences > 0
      ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:4px;">
          <strong style="color:#b91c1c;">${plural(
            report.postResolutionRecurrences,
            "issue",
          )} came back after being marked resolved.</strong>
          <p style="margin:6px 0 0;font-size:13px;color:#7f1d1d;">The recorded fix did not hold. Check the resolution note and the current process.</p>
        </div>`
      : "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;max-width:640px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#0d9488;padding:18px 24px;color:#fff;">
        <h2 style="margin:0;font-size:20px;">${windowLabel} guest-experience summary</h2>
        <p style="margin:4px 0 0;opacity:.9;font-size:14px;">${escapeHtml(safeName)}</p>
      </div>
      <div style="padding:24px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#475569;">Issues in this period</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;">${report.totalIssues}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Open issues</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;">${report.openIssues}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Resolved in this period</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;">${report.resolvedIssues}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Resolution rate</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;">${report.resolutionRate}%</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Average resolution time</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;">${formatHours(report.avgResolutionHours)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Recurring problems still open</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;">${report.recurringIssuesOpen}</td>
          </tr>
        </table>

        ${recurrenceBanner}

        ${topIssues.length > 0 ? `<h3 style="margin:20px 0 8px;font-size:15px;">Top recurring problems</h3><ul style="margin:0;padding-left:18px;font-size:14px;color:#1e293b;">${issueRows}</ul>` : ""}
        ${attention.length > 0 ? `<h3 style="margin:20px 0 8px;font-size:15px;">Needs attention</h3><ul style="margin:0;padding-left:18px;font-size:14px;color:#1e293b;">${attentionRows}</ul>` : ""}
        ${resolutions.length > 0 ? `<h3 style="margin:20px 0 8px;font-size:15px;">Recently resolved</h3><ul style="margin:0;padding-left:18px;font-size:14px;color:#1e293b;">${resolutionRows}</ul>` : ""}

        <div style="margin-top:24px;">
          <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 22px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Open the manager queue</a>
        </div>
        <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">You are receiving this because you own this BeyondVyu business.</p>
      </div>
    </div>
  `;

  return { subject, text: lines.join("\n"), html };
}

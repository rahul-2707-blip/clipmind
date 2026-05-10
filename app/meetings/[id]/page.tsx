import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { db, meetings, actionItems } from "@/lib/db";
import { formatDuration } from "@/lib/utils";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { MeetingAutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return null;

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)));

  if (!meeting) notFound();

  const items = await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.meetingId, id))
    .orderBy(asc(actionItems.priority));

  const isProcessing =
    meeting.status === "uploaded" ||
    meeting.status === "transcribing" ||
    meeting.status === "extracting";

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 w-full">
      {isProcessing && <MeetingAutoRefresh />}

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {new Date(meeting.createdAt).toLocaleString()} ·{" "}
          {formatDuration(meeting.durationSeconds)}
        </p>
      </header>

      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 mb-6 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-medium">
              {meeting.status === "transcribing"
                ? "Transcribing audio…"
                : meeting.status === "extracting"
                  ? "Extracting insights with Claude…"
                  : "Queued for processing…"}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              This usually takes 30–90 seconds. Page will auto-refresh.
            </p>
          </div>
        </div>
      )}

      {meeting.status === "failed" && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-4 mb-6">
          <p className="font-medium">Processing failed</p>
          <p className="text-sm text-red-700 mt-1">{meeting.errorMessage}</p>
        </div>
      )}

      {meeting.summary && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Summary
          </h2>
          <p className="text-neutral-800 leading-relaxed">{meeting.summary}</p>
        </section>
      )}

      {meeting.decisions && meeting.decisions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Decisions
          </h2>
          <ul className="space-y-2">
            {meeting.decisions.map((d, i) => (
              <li
                key={i}
                className="bg-white border border-neutral-200 rounded-lg p-3 text-sm"
              >
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Action Items
          </h2>
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left text-xs uppercase text-neutral-500">
                  <th className="px-4 py-2 font-medium">Task</th>
                  <th className="px-4 py-2 font-medium">Owner</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-neutral-200"
                  >
                    <td className="px-4 py-3">{item.task}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {item.owner ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {item.dueDate ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityPill priority={item.priority} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {meeting.transcript && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Full Transcript
          </h2>
          <details className="bg-white border border-neutral-200 rounded-lg p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Show transcript
            </summary>
            <p className="text-sm text-neutral-700 mt-3 whitespace-pre-wrap leading-relaxed">
              {meeting.transcript}
            </p>
          </details>
        </section>
      )}
    </main>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

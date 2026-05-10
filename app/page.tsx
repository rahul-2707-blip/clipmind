import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { desc, eq } from "drizzle-orm";
import { db, meetings } from "@/lib/db";
import { UploadZone } from "@/components/upload-zone";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) return null;

  const userMeetings = await db
    .select()
    .from(meetings)
    .where(eq(meetings.userId, userId))
    .orderBy(desc(meetings.createdAt))
    .limit(50);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 w-full">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ClipMind</h1>
          <p className="text-sm text-neutral-500">
            Meeting recordings → structured action items
          </p>
        </div>
        <UserButton />
      </header>

      <section className="mb-10">
        <UploadZone />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent meetings</h2>
        {userMeetings.length === 0 ? (
          <p className="text-neutral-500 text-sm">
            No meetings yet. Upload an audio file to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {userMeetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg hover:border-neutral-400 transition"
                >
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {new Date(m.createdAt).toLocaleString()} ·{" "}
                      {formatDuration(m.durationSeconds)}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    uploaded: "bg-neutral-100 text-neutral-600",
    transcribing: "bg-blue-100 text-blue-700",
    extracting: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status] ?? styles.uploaded}`}
    >
      {status}
    </span>
  );
}

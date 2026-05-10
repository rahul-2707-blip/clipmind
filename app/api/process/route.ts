import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, meetings, actionItems } from "@/lib/db";
import { transcribeAudioFromUrl } from "@/lib/groq";
import { extractMeetingInsights } from "@/lib/llm";

export const maxDuration = 300; // 5 min on Vercel Pro; 60s on Hobby

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== (process.env.INTERNAL_SECRET ?? "dev")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = (await req.json()) as { meetingId: string };
  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  try {
    // 1. Transcribe
    await db
      .update(meetings)
      .set({ status: "transcribing" })
      .where(eq(meetings.id, meetingId));

    const transcription = await transcribeAudioFromUrl(meeting.audioUrl);

    // 2. Extract insights
    await db
      .update(meetings)
      .set({
        status: "extracting",
        transcript: transcription.text,
        durationSeconds: transcription.durationSeconds,
      })
      .where(eq(meetings.id, meetingId));

    const insights = await extractMeetingInsights(transcription.text);

    // 3. Save everything
    await db
      .update(meetings)
      .set({
        title: insights.title,
        summary: insights.summary,
        decisions: insights.decisions,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    if (insights.actionItems.length > 0) {
      await db.insert(actionItems).values(
        insights.actionItems.map((item) => ({
          meetingId,
          task: item.task,
          owner: item.owner,
          dueDate: item.dueDate,
          priority: item.priority,
        }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Processing failed:", err);
    await db
      .update(meetings)
      .set({ status: "failed", errorMessage: message })
      .where(eq(meetings.id, meetingId));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

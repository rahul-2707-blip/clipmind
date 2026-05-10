import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { db, meetings } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  audioUploader: f({
    audio: { maxFileSize: "32MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new UploadThingError("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [meeting] = await db
        .insert(meetings)
        .values({
          userId: metadata.userId,
          title: file.name.replace(/\.[^/.]+$/, ""),
          audioUrl: file.ufsUrl,
          audioKey: file.key,
          status: "uploaded",
        })
        .returning({ id: meetings.id });

      // Kick off processing — fire and forget. We do not await so the upload
      // response returns fast. The /api/process route handles the heavy work.
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000");

      fetch(`${baseUrl}/api/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_SECRET ?? "dev",
        },
        body: JSON.stringify({ meetingId: meeting.id }),
      }).catch((err) => console.error("Failed to trigger processing:", err));

      return { meetingId: meeting.id };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

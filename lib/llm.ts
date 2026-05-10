import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ExtractionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  decisions: z.array(z.string()),
  actionItems: z.array(
    z.object({
      task: z.string(),
      owner: z.string().nullable(),
      dueDate: z.string().nullable(),
      priority: z.enum(["low", "medium", "high"]),
    })
  ),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You are an expert meeting analyst. Given a raw meeting transcript, extract:
1. A short descriptive title (4-8 words)
2. A concise executive summary (3-5 sentences)
3. Concrete decisions that were made
4. Action items with owners and due dates when explicitly mentioned

Rules:
- Only extract action items that are CLEARLY stated, not implied
- Owner must be a real name mentioned in the transcript, or null
- Due date only if explicitly stated (ISO format YYYY-MM-DD), otherwise null
- Today's date for relative date resolution: ${new Date().toISOString().split("T")[0]}
- Be terse and specific. No fluff.

Respond ONLY with valid JSON matching this exact shape:
{
  "title": string,
  "summary": string,
  "decisions": string[],
  "actionItems": [{ "task": string, "owner": string | null, "dueDate": string | null, "priority": "low" | "medium" | "high" }]
}`;

export async function extractMeetingInsights(
  transcript: string
): Promise<ExtractionResult> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Transcript:\n\n${transcript}\n\nReturn the JSON now.` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");

  const parsed = JSON.parse(content);
  return ExtractionSchema.parse(parsed);
}

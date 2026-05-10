import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type TranscriptionResult = {
  text: string;
  durationSeconds: number;
  segments: Array<{ start: number; end: number; text: string }>;
};

export async function transcribeAudioFromUrl(
  audioUrl: string
): Promise<TranscriptionResult> {
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to download audio: ${audioRes.status}`);
  }
  const audioBlob = await audioRes.blob();
  const file = new File([audioBlob], "audio.mp3", { type: audioBlob.type || "audio/mpeg" });

  const result = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "verbose_json",
    temperature: 0,
  });

  // verbose_json returns segments with timestamps
  const r = result as unknown as {
    text: string;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  return {
    text: r.text,
    durationSeconds: Math.round(r.duration ?? 0),
    segments: r.segments ?? [],
  };
}

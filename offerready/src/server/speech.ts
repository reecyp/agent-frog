import "server-only";

export function speechConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

/**
 * Transcribes one recorded answer with Deepgram. filler_words keeps "um" and "uh", which most
 * speech-to-text services strip, so practice feedback can count them.
 */
export async function transcribe(audio: Blob): Promise<string> {
  const params = new URLSearchParams({ model: "nova-3", filler_words: "true", smart_format: "true", language: "en" });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, "Content-Type": audio.type || "audio/webm" },
    body: audio,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "The Deepgram API key was rejected. Check DEEPGRAM_API_KEY." : `Transcription failed (${res.status}).`);
  const body = (await res.json()) as { results?: { channels?: { alternatives?: { transcript?: string }[] }[] } };
  return body.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}

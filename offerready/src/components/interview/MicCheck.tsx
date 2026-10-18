"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "offerready.micDeviceId";

export function savedMicId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "default";
  } catch {
    return "default";
  }
}

/**
 * Lets the student pick which microphone to use, with a live level bar. Browsers keep their own
 * microphone choice per site and don't follow the computer's default (a phone connected through
 * Continuity can win), so the choice is explicit and remembered on this device.
 */
export function MicCheck({ value, onChange, active }: { value: string; onChange: (id: string) => void; active: boolean }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bar = useRef<number>(0);

  const show = (all: MediaDeviceInfo[]) => {
    // Chrome's "default" entry is labeled with the device it actually uses ("Default - iPhone Microphone"), which shows the problem at a glance.
    const inputs = all.filter((d) => d.kind === "audioinput" && d.deviceId !== "communications");
    setDevices(inputs);
    // Labels are only exposed after permission is granted.
    setAllowed(inputs.some((d) => d.label));
    return inputs;
  };
  const list = () => navigator.mediaDevices.enumerateDevices().then(show);

  useEffect(() => {
    const refresh = () => navigator.mediaDevices.enumerateDevices().then(show, () => null);
    refresh();
    // Plugging in or removing a microphone (or a phone joining over Continuity) updates the list.
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, []);

  const allow = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      await list();
    } catch {
      setError("Microphone access is blocked. Allow it from the icon at the left of the address bar, then try again.");
    }
  };

  // Live input level for the chosen microphone, paused while a practice run owns the mic.
  useEffect(() => {
    if (!allowed || !value || active) return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: value === "default" ? true : { deviceId: { exact: value } } });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(1, peak / 64));
          bar.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError("That microphone couldn't be opened. Pick another one.");
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(bar.current);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
      setLevel(0);
    };
  }, [allowed, value, active]);

  const choose = (id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Remembering the choice is a convenience only.
    }
    onChange(id);
  };

  if (!allowed) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-secondary self-start" onClick={allow}>Choose microphone</button>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="mic" className="t-label">Microphone</label>
      <div className="flex flex-wrap items-center gap-3">
        <select id="mic" className="input min-w-0 max-w-[22rem] flex-[1_1_14rem]" value={value} onChange={(e) => choose(e.target.value)}>
          {!devices.some((d) => d.deviceId === value) && <option value="">Choose a microphone</option>}
          {devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
        </select>
        <span className="h-2 w-32 overflow-hidden rounded-full bg-[var(--bg-muted)]" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
          <span className="block h-full rounded-full bg-[var(--ok)] transition-[width] duration-75" style={{ width: `${level * 100}%` }} />
        </span>
      </div>
      <p className="t-meta">Say something: the bar should move. If it doesn&apos;t, pick another microphone.</p>
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

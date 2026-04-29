export type ToneConfig = {
  critical?: boolean;
  label: string;
  path: string;
  warning?: boolean;
};

export const toneConfig: ToneConfig[] = [
  { label: "Fire Tone", path: "/audio/tones/fire-tone.mp3" },
  { label: "EMS Tone", path: "/audio/tones/ems-tone.mp3" },
  { label: "All Call", path: "/audio/tones/all-call.mp3" },
  { critical: true, label: "Signal 100", path: "/audio/tones/signal-100.mp3" },
  { critical: true, label: "Panic Alert", path: "/audio/tones/panic-alert.mp3" },
  { critical: true, label: "Officer Needs Assistance", path: "/audio/tones/officer-needs-assistance.mp3" },
  { label: "Evacuation", path: "/audio/tones/evacuation.mp3", warning: true },
  { label: "Severe Weather", path: "/audio/tones/severe-weather.mp3", warning: true },
  { label: "Tow Request", path: "/audio/tones/tow-request.mp3" },
];

export type ToneConfig = {
  critical?: boolean;
  id: "ems" | "fire" | "panic" | "signal-100";
  label: string;
  path: string;
  volume: number;
  warning?: boolean;
};

export const toneConfig: ToneConfig[] = [
  { id: "fire", label: "Fire Station 5/6", path: "/audio/tones/fire_tones_station_5_6.mp3", volume: 0.62 },
  { id: "ems", label: "EMS Dispatch", path: "/audio/tones/ems_dispatch_tone.mp3", volume: 0.58 },
  { critical: true, id: "panic", label: "Police Panic", path: "/audio/tones/police_panic_button.mp3", volume: 0.78 },
  { critical: true, id: "signal-100", label: "Signal 100", path: "/audio/tones/signal_100.mp3", volume: 0.46 },
];

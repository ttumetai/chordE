import { chordFormulaMap, type ChordFormula } from "../data/chordFormulas";

export const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const ROOT_OPTIONS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"] as const;
export const KEY_CENTER_OPTIONS = ["Auto", "C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"] as const;

export type AccidentalMode = "sharp" | "flat";

export type BuiltChord = {
  root: string;
  formula: ChordFormula;
  name: string;
  pitchClasses: number[];
  noteNames: string[];
  degreeLabels: string[];
};

export function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function noteNameToPitchClass(note: string): number {
  const normalized = note.trim();
  const sharpIndex = NOTE_NAMES_SHARP.indexOf(normalized);
  if (sharpIndex >= 0) {
    return sharpIndex;
  }

  const flatIndex = NOTE_NAMES_FLAT.indexOf(normalized);
  if (flatIndex >= 0) {
    return flatIndex;
  }

  throw new Error(`Unsupported note name: ${note}`);
}

export function getPreferredAccidental(root: string): AccidentalMode {
  if (root.includes("b")) {
    return "flat";
  }

  return "sharp";
}

export function getPreferredAccidentalForContext(root: string, keyCenter = "Auto"): AccidentalMode {
  if (keyCenter !== "Auto") {
    return getPreferredAccidental(keyCenter);
  }

  return getPreferredAccidental(root);
}

export function pitchClassToNoteName(pitchClass: number, mode: AccidentalMode): string {
  const normalized = mod12(pitchClass);
  return mode === "flat" ? NOTE_NAMES_FLAT[normalized] : NOTE_NAMES_SHARP[normalized];
}

export function buildChord(root: string, formulaId: string): BuiltChord {
  const formula = chordFormulaMap.get(formulaId);
  if (!formula) {
    throw new Error(`Unknown chord formula: ${formulaId}`);
  }

  const rootPc = noteNameToPitchClass(root);
  const accidentalMode = getPreferredAccidental(root);
  const pitchClasses = formula.intervals.map((interval) => mod12(rootPc + interval));
  const noteNames = pitchClasses.map((pitchClass) => pitchClassToNoteName(pitchClass, accidentalMode));

  return {
    root: pitchClassToNoteName(rootPc, accidentalMode),
    formula,
    name: `${pitchClassToNoteName(rootPc, accidentalMode)}${formula.symbol}`,
    pitchClasses,
    noteNames,
    degreeLabels: formula.intervals.map(intervalToDegreeLabel),
  };
}

export function getDisplayNotes(
  pitchClasses: number[],
  mode: AccidentalMode,
): string[] {
  return pitchClasses.map((pitchClass) => pitchClassToNoteName(pitchClass, mode));
}

export function midiToPitchClass(midi: number): number {
  return mod12(midi);
}

export function midiToNoteName(midi: number, mode: AccidentalMode): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${pitchClassToNoteName(midiToPitchClass(midi), mode)}${octave}`;
}

export function uniquePitchClasses(values: number[]): number[] {
  return Array.from(new Set(values.map((value) => mod12(value)))).sort((a, b) => a - b);
}

export function intervalToDegreeLabel(interval: number): string {
  const normalized = ((interval % 24) + 24) % 24;
  const labelMap: Record<number, string> = {
    0: "R",
    1: "b9",
    2: "9",
    3: "m3",
    4: "3",
    5: "11",
    6: "b5",
    7: "5",
    8: "#5",
    9: "6",
    10: "b7",
    11: "7",
    13: "b9",
    14: "9",
    15: "#9",
    17: "11",
    18: "#11",
    20: "b13",
    21: "13",
    22: "#13",
  };

  return labelMap[normalized] ?? `${interval}`;
}

export function getMajorScalePitchClasses(keyCenter: string): number[] {
  const tonic = noteNameToPitchClass(keyCenter);
  return [0, 2, 4, 5, 7, 9, 11].map((interval) => mod12(tonic + interval));
}

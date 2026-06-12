import { chordFormulas, type ChordFormula } from "../data/chordFormulas";
import {
  getDisplayNotes,
  getMajorScalePitchClasses,
  getPreferredAccidentalForContext,
  intervalToDegreeLabel,
  midiToPitchClass,
  mod12,
  noteNameToPitchClass,
  pitchClassToNoteName,
  uniquePitchClasses,
} from "./music";

export type ChordDetectionOptions = {
  keyCenter?: string;
};

export type ChordMatch = {
  name: string;
  compactName: string;
  root: string;
  bass: string | null;
  formula: ChordFormula;
  noteNames: string[];
  degreeLabels: string[];
  pitchClasses: number[];
  score: number;
  isExact: boolean;
  rootPitchClass: number;
  bassPitchClass: number;
};

function setEquals(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function getBassPitchClass(selectedMidiNotes: number[]): number {
  return midiToPitchClass(Math.min(...selectedMidiNotes));
}

function scoreMatch(
  formula: ChordFormula,
  rootPitchClass: number,
  selectedPitchClasses: number[],
  bassPitchClass: number,
  keyCenter?: string,
): number {
  const formulaPitchClasses = uniquePitchClasses(formula.intervals.map((interval) => mod12(rootPitchClass + interval)));
  const shared = formulaPitchClasses.filter((pitchClass) => selectedPitchClasses.includes(pitchClass)).length;
  const missing = formulaPitchClasses.length - shared;
  const extra = selectedPitchClasses.length - shared;
  const isExact = missing === 0 && extra === 0;
  const bassBonus = bassPitchClass === rootPitchClass ? 30 : formulaPitchClasses.includes(bassPitchClass) ? 10 : 0;
  const simplicityBonus = Math.max(0, 65 - formula.priority);
  const keyBonus =
    keyCenter && keyCenter !== "Auto"
      ? getMajorScalePitchClasses(keyCenter).includes(rootPitchClass)
        ? 18
        : -6
      : 0;

  return (isExact ? 260 : 0) + shared * 22 - missing * 18 - extra * 15 + bassBonus + simplicityBonus + keyBonus;
}

function buildMatch(
  formula: ChordFormula,
  rootPitchClass: number,
  selectedPitchClasses: number[],
  bassPitchClass: number,
  keyCenter?: string,
): ChordMatch {
  const accidentalMode = getPreferredAccidentalForContext(
    pitchClassToNoteName(rootPitchClass, "sharp"),
    keyCenter,
  );
  const root = pitchClassToNoteName(rootPitchClass, accidentalMode);
  const bass = pitchClassToNoteName(bassPitchClass, accidentalMode);
  const pitchClasses = uniquePitchClasses(formula.intervals.map((interval) => mod12(rootPitchClass + interval)));
  const isExact = setEquals(pitchClasses, selectedPitchClasses);
  const noteNames = getDisplayNotes(pitchClasses, accidentalMode);
  const compactName = `${root}${formula.symbol}`;
  const name = bassPitchClass !== rootPitchClass ? `${compactName}/${bass}` : compactName;

  return {
    name,
    compactName,
    root,
    bass: bassPitchClass !== rootPitchClass ? bass : null,
    formula,
    noteNames,
    degreeLabels: formula.intervals.map(intervalToDegreeLabel),
    pitchClasses,
    score: scoreMatch(formula, rootPitchClass, selectedPitchClasses, bassPitchClass, keyCenter),
    isExact,
    rootPitchClass,
    bassPitchClass,
  };
}

export function detectChords(selectedMidiNotes: number[], options: ChordDetectionOptions = {}): ChordMatch[] {
  const normalizedSelection = uniquePitchClasses(selectedMidiNotes.map((midi) => midiToPitchClass(midi)));
  if (normalizedSelection.length < 2 || selectedMidiNotes.length === 0) {
    return [];
  }

  const bassPitchClass = getBassPitchClass(selectedMidiNotes);
  const candidates: ChordMatch[] = [];

  for (const rootPitchClass of normalizedSelection) {
    for (const formula of chordFormulas) {
      const formulaPitchClasses = uniquePitchClasses(
        formula.intervals.map((interval) => mod12(rootPitchClass + interval)),
      );
      const isExact = setEquals(formulaPitchClasses, normalizedSelection);
      if (!isExact && normalizedSelection.length < 4) {
        continue;
      }

      candidates.push(buildMatch(formula, rootPitchClass, normalizedSelection, bassPitchClass, options.keyCenter));
    }
  }

  return candidates
    .sort((left, right) => {
      if (left.isExact !== right.isExact) {
        return left.isExact ? -1 : 1;
      }
      if ((left.bass === null) !== (right.bass === null)) {
        return left.bass === null ? -1 : 1;
      }
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      if (left.formula.priority !== right.formula.priority) {
        return left.formula.priority - right.formula.priority;
      }
      return left.name.localeCompare(right.name);
    })
    .filter((candidate, index, all) => all.findIndex((entry) => entry.name === candidate.name) === index)
    .slice(0, 10);
}

export function buildForwardSelectionFromMatch(match: ChordMatch): { root: string; formulaId: string } {
  return {
    root: match.root,
    formulaId: match.formula.id,
  };
}

export function noteSetToPitchClasses(notes: string[]): number[] {
  return notes.map((note) => noteNameToPitchClass(note));
}

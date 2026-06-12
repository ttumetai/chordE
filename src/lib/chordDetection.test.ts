import { describe, expect, it } from "vitest";
import { detectChords } from "./chordDetection";
import { noteNameToPitchClass } from "./music";

function midis(notes: string[]): number[] {
  return notes.map((note, index) => 60 + noteNameToPitchClass(note) + index * 12);
}

describe("detectChords", () => {
  it("detects major triads", () => {
    expect(detectChords(midis(["C", "E", "G"]))[0]?.name).toBe("C");
  });

  it("detects minor seventh flat five", () => {
    expect(detectChords(midis(["B", "D", "F", "A"]))[0]?.name).toBe("Bm7b5");
  });

  it("detects dominant thirteenth", () => {
    expect(detectChords(midis(["C", "E", "G", "Bb", "D", "F", "A"]))[0]?.name).toBe("C13");
  });

  it("shows slash chords when bass is not root", () => {
    expect(detectChords([52, 60, 64, 67])[0]?.name).toBe("C/E");
  });
});

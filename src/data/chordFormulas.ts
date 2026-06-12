export type ChordCategory =
  | "triad"
  | "sixth"
  | "seventh"
  | "ninth"
  | "eleventh"
  | "thirteenth"
  | "altered";

export type ChordFormula = {
  id: string;
  symbol: string;
  label: string;
  aliases: string[];
  intervals: number[];
  category: ChordCategory;
  priority: number;
};

export const chordFormulas: ChordFormula[] = [
  { id: "maj", symbol: "", label: "大三和弦", aliases: ["maj", "M"], intervals: [0, 4, 7], category: "triad", priority: 10 },
  { id: "min", symbol: "m", label: "小三和弦", aliases: ["min", "-"], intervals: [0, 3, 7], category: "triad", priority: 10 },
  { id: "aug", symbol: "aug", label: "增三和弦", aliases: ["+", "#5"], intervals: [0, 4, 8], category: "triad", priority: 12 },
  { id: "dim", symbol: "dim", label: "减三和弦", aliases: ["o"], intervals: [0, 3, 6], category: "triad", priority: 12 },
  { id: "sus2", symbol: "sus2", label: "挂二和弦", aliases: [], intervals: [0, 2, 7], category: "triad", priority: 14 },
  { id: "sus4", symbol: "sus4", label: "挂四和弦", aliases: ["sus"], intervals: [0, 5, 7], category: "triad", priority: 14 },
  { id: "6", symbol: "6", label: "大六和弦", aliases: [], intervals: [0, 4, 7, 9], category: "sixth", priority: 18 },
  { id: "m6", symbol: "m6", label: "小六和弦", aliases: ["min6"], intervals: [0, 3, 7, 9], category: "sixth", priority: 18 },
  { id: "7", symbol: "7", label: "属七和弦", aliases: ["dom7"], intervals: [0, 4, 7, 10], category: "seventh", priority: 16 },
  { id: "maj7", symbol: "maj7", label: "大七和弦", aliases: ["M7", "Δ7"], intervals: [0, 4, 7, 11], category: "seventh", priority: 16 },
  { id: "m7", symbol: "m7", label: "小七和弦", aliases: ["min7", "-7"], intervals: [0, 3, 7, 10], category: "seventh", priority: 16 },
  { id: "mMaj7", symbol: "mMaj7", label: "小大七和弦", aliases: ["m(maj7)", "minMaj7"], intervals: [0, 3, 7, 11], category: "seventh", priority: 20 },
  { id: "dim7", symbol: "dim7", label: "减七和弦", aliases: ["o7"], intervals: [0, 3, 6, 9], category: "seventh", priority: 19 },
  { id: "m7b5", symbol: "m7b5", label: "半减七和弦", aliases: ["half-diminished", "ø7"], intervals: [0, 3, 6, 10], category: "seventh", priority: 18 },
  { id: "7sus4", symbol: "7sus4", label: "属七挂四", aliases: [], intervals: [0, 5, 7, 10], category: "seventh", priority: 19 },
  { id: "7sus2", symbol: "7sus2", label: "属七挂二", aliases: [], intervals: [0, 2, 7, 10], category: "seventh", priority: 19 },
  { id: "maj7b5", symbol: "maj7b5", label: "大七降五", aliases: ["M7b5"], intervals: [0, 4, 6, 11], category: "seventh", priority: 22 },
  { id: "add9", symbol: "add9", label: "加九和弦", aliases: ["2"], intervals: [0, 4, 7, 14], category: "ninth", priority: 22 },
  { id: "add11", symbol: "add11", label: "加十一和弦", aliases: ["add4"], intervals: [0, 4, 7, 17], category: "eleventh", priority: 24 },
  { id: "6/9", symbol: "6/9", label: "六九和弦", aliases: ["69"], intervals: [0, 4, 7, 9, 14], category: "ninth", priority: 23 },
  { id: "9", symbol: "9", label: "属九和弦", aliases: [], intervals: [0, 4, 7, 10, 14], category: "ninth", priority: 23 },
  { id: "maj9", symbol: "maj9", label: "大九和弦", aliases: ["M9", "Δ9"], intervals: [0, 4, 7, 11, 14], category: "ninth", priority: 23 },
  { id: "m9", symbol: "m9", label: "小九和弦", aliases: ["min9"], intervals: [0, 3, 7, 10, 14], category: "ninth", priority: 23 },
  { id: "7b9", symbol: "7b9", label: "属七降九", aliases: [], intervals: [0, 4, 7, 10, 13], category: "ninth", priority: 25 },
  { id: "7#9", symbol: "7#9", label: "属七升九", aliases: [], intervals: [0, 4, 7, 10, 15], category: "ninth", priority: 25 },
  { id: "11", symbol: "11", label: "属十一和弦", aliases: [], intervals: [0, 4, 7, 10, 14, 17], category: "eleventh", priority: 28 },
  { id: "maj11", symbol: "maj11", label: "大十一和弦", aliases: [], intervals: [0, 4, 7, 11, 14, 17], category: "eleventh", priority: 29 },
  { id: "m11", symbol: "m11", label: "小十一和弦", aliases: [], intervals: [0, 3, 7, 10, 14, 17], category: "eleventh", priority: 29 },
  { id: "9sus4", symbol: "9sus4", label: "九挂四和弦", aliases: [], intervals: [0, 5, 7, 10, 14], category: "eleventh", priority: 28 },
  { id: "13", symbol: "13", label: "属十三和弦", aliases: [], intervals: [0, 4, 7, 10, 14, 17, 21], category: "thirteenth", priority: 32 },
  { id: "maj13", symbol: "maj13", label: "大十三和弦", aliases: [], intervals: [0, 4, 7, 11, 14, 17, 21], category: "thirteenth", priority: 33 },
  { id: "m13", symbol: "m13", label: "小十三和弦", aliases: [], intervals: [0, 3, 7, 10, 14, 17, 21], category: "thirteenth", priority: 33 },
  { id: "7b5", symbol: "7b5", label: "属七降五", aliases: [], intervals: [0, 4, 6, 10], category: "altered", priority: 24 },
  { id: "7#5", symbol: "7#5", label: "属七升五", aliases: ["7+", "aug7"], intervals: [0, 4, 8, 10], category: "altered", priority: 24 },
  { id: "maj7#5", symbol: "maj7#5", label: "大七升五", aliases: ["maj7+", "M7#5"], intervals: [0, 4, 8, 11], category: "altered", priority: 26 },
  { id: "alt", symbol: "alt", label: "属变化和弦", aliases: ["7alt"], intervals: [0, 4, 8, 10, 15], category: "altered", priority: 30 },
];

export const chordFormulaMap = new Map(chordFormulas.map((formula) => [formula.id, formula]));

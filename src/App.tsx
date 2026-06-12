import { useEffect, useMemo, useRef, useState } from "react";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { chordFormulaMap } from "./data/chordFormulas";
import { pianoAudio } from "./lib/audio";
import { buildForwardSelectionFromMatch, detectChords, type ChordMatch } from "./lib/chordDetection";
import {
  buildChord,
  getDisplayNotes,
  getPreferredAccidental,
  getPreferredAccidentalForContext,
  intervalToDegreeLabel,
  KEY_CENTER_OPTIONS,
  mod12,
  midiToPitchClass,
  ROOT_OPTIONS,
  uniquePitchClasses,
} from "./lib/music";

type Mode = "forward" | "reverse";
type ForwardFamilyId = "major" | "minor" | "dominant" | "suspended" | "diminished" | "augmented";
type KeyboardSpan = "auto" | "1" | "2";
type PlayMode = "block" | "arp";

type ForwardFamily = {
  id: ForwardFamilyId;
  label: string;
  formulas: Array<{
    id: string;
    label: string;
  }>;
};

const DEFAULT_ROOT = "C";
const DEFAULT_FAMILY_ID: ForwardFamilyId = "major";
const DEFAULT_FORMULA = "maj";
const DEFAULT_KEY_CENTER = "Auto";
const DEFAULT_KEYBOARD_SPAN: KeyboardSpan = "auto";
const DEFAULT_PLAY_MODE: PlayMode = "block";

const FORWARD_FAMILIES: ForwardFamily[] = [
  {
    id: "major",
    label: "Maj",
    formulas: [
      { id: "maj", label: "Triad" },
      { id: "6", label: "6th" },
      { id: "maj7", label: "Maj7" },
      { id: "maj7b5", label: "Maj7b5" },
      { id: "add9", label: "Add9" },
      { id: "add11", label: "Add11" },
      { id: "6/9", label: "6/9" },
      { id: "maj9", label: "Maj9" },
      { id: "maj11", label: "Maj11" },
      { id: "maj13", label: "Maj13" },
    ],
  },
  {
    id: "minor",
    label: "Min",
    formulas: [
      { id: "min", label: "Triad" },
      { id: "m6", label: "6th" },
      { id: "m7", label: "7th" },
      { id: "mMaj7", label: "MinMaj7" },
      { id: "m9", label: "9th" },
      { id: "m11", label: "11th" },
      { id: "m13", label: "13th" },
    ],
  },
  {
    id: "dominant",
    label: "Dom",
    formulas: [
      { id: "7", label: "7th" },
      { id: "9", label: "9th" },
      { id: "11", label: "11th" },
      { id: "13", label: "13th" },
      { id: "7b9", label: "7(b9)" },
      { id: "7#9", label: "7(#9)" },
      { id: "7b5", label: "7(b5)" },
      { id: "7#5", label: "7(#5)" },
      { id: "alt", label: "Alt" },
    ],
  },
  {
    id: "suspended",
    label: "Sus",
    formulas: [
      { id: "sus2", label: "Sus2" },
      { id: "sus4", label: "Sus4" },
      { id: "7sus2", label: "7sus2" },
      { id: "7sus4", label: "7sus4" },
      { id: "9sus4", label: "9sus4" },
    ],
  },
  {
    id: "diminished",
    label: "Dim",
    formulas: [
      { id: "dim", label: "Triad" },
      { id: "m7b5", label: "m7b5" },
      { id: "dim7", label: "Dim7" },
    ],
  },
  {
    id: "augmented",
    label: "Aug",
    formulas: [
      { id: "aug", label: "Triad" },
      { id: "maj7#5", label: "Maj7#5" },
      { id: "7#5", label: "7#5" },
    ],
  },
];

const ROOT_TO_PITCH_CLASS: Record<(typeof ROOT_OPTIONS)[number], number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const FORMULA_TO_FAMILY = new Map(
  FORWARD_FAMILIES.flatMap((family) => family.formulas.map((formula) => [formula.id, family.id] as const)),
);

function getForwardMidiNotes(root: string, formulaId: string): number[] {
  const formula = chordFormulaMap.get(formulaId);
  if (!formula) {
    return [];
  }

  const rootPitchClass = mod12(ROOT_TO_PITCH_CLASS[root as keyof typeof ROOT_TO_PITCH_CLASS] ?? 0);
  const rootMidi = 48 + rootPitchClass;
  return formula.intervals.map((interval) => rootMidi + interval);
}

function getForwardMarkerLabels(root: string, formulaId: string): Record<number, string> {
  const formula = chordFormulaMap.get(formulaId);
  if (!formula) {
    return {};
  }

  const rootPitchClass = mod12(ROOT_TO_PITCH_CLASS[root as keyof typeof ROOT_TO_PITCH_CLASS] ?? 0);
  const rootMidi = 48 + rootPitchClass;
  return Object.fromEntries(
    formula.intervals.map((interval) => [rootMidi + interval, intervalToDegreeLabel(interval)]),
  );
}

function getKeyboardRange(midiNotes: number[], keyboardSpan: KeyboardSpan): { startMidi: number; endMidi: number } {
  if (midiNotes.length === 0) {
    return { startMidi: 48, endMidi: 59 };
  }

  const minMidi = Math.min(...midiNotes);
  const startMidi = Math.floor(minMidi / 12) * 12;

  if (keyboardSpan === "1") {
    return { startMidi, endMidi: startMidi + 11 };
  }

  if (keyboardSpan === "2") {
    return { startMidi, endMidi: startMidi + 23 };
  }

  const maxMidi = Math.max(...midiNotes);
  return maxMidi <= startMidi + 11
    ? { startMidi, endMidi: startMidi + 11 }
    : { startMidi, endMidi: startMidi + 23 };
}

type PickerOption = {
  value: string;
  label: string;
};

type PickerColumnProps = {
  label: string;
  options: PickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

function PickerColumn({ label, options, selectedValue, onSelect }: PickerColumnProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const selectedElement = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("[data-value]") ?? []).find(
      (element) => element.dataset.value === selectedValue,
    );
    selectedElement?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedValue]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const syncSelectionFromScroll = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const optionElements = Array.from(container.querySelectorAll<HTMLElement>("[data-value]"));
    if (optionElements.length === 0) {
      return;
    }

    const containerCenter = container.scrollTop + container.clientHeight / 2;
    const closest = optionElements.reduce(
      (best, element) => {
        const center = element.offsetTop + element.offsetHeight / 2;
        const distance = Math.abs(center - containerCenter);
        if (distance < best.distance) {
          return { element, distance };
        }
        return best;
      },
      { element: optionElements[0], distance: Number.POSITIVE_INFINITY },
    );

    closest.element.scrollIntoView({ block: "center", behavior: "smooth" });
    const nextValue = closest.element.dataset.value;
    if (nextValue && nextValue !== selectedValue) {
      onSelect(nextValue);
    }
  };

  return (
    <div className="picker-column">
      <span className="picker-label">{label}</span>
      <div className="picker-frame">
        <div
          className="picker-scroll"
          ref={containerRef}
          onScroll={() => {
            if (scrollTimerRef.current !== null) {
              window.clearTimeout(scrollTimerRef.current);
            }
            scrollTimerRef.current = window.setTimeout(() => {
              syncSelectionFromScroll();
            }, 100);
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              data-value={option.value}
              className={`picker-option${selectedValue === option.value ? " active" : ""}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("forward");
  const [selectedRoot, setSelectedRoot] = useState<string>(DEFAULT_ROOT);
  const [selectedFamilyId, setSelectedFamilyId] = useState<ForwardFamilyId>(DEFAULT_FAMILY_ID);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(DEFAULT_FORMULA);
  const [selectedMidiNotes, setSelectedMidiNotes] = useState<number[]>([]);
  const [reverseAnchorStartMidi, setReverseAnchorStartMidi] = useState<number>(48);
  const [keyCenter, setKeyCenter] = useState<string>(DEFAULT_KEY_CENTER);
  const [keyboardSpan, setKeyboardSpan] = useState<KeyboardSpan>(DEFAULT_KEYBOARD_SPAN);
  const [playMode, setPlayMode] = useState<PlayMode>(DEFAULT_PLAY_MODE);

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (!demo) {
      return;
    }

    if (demo === "forward") {
      setMode("forward");
      setSelectedRoot("C");
      setSelectedFamilyId("major");
      setSelectedFormulaId("maj");
      return;
    }

    if (demo === "forward-extended") {
      setMode("forward");
      setSelectedRoot("D");
      setSelectedFamilyId("major");
      setSelectedFormulaId("add11");
      return;
    }

    if (demo === "reverse-empty") {
      setMode("reverse");
      setSelectedMidiNotes([]);
      setReverseAnchorStartMidi(48);
      setKeyboardSpan("2");
      return;
    }

    if (demo === "reverse-detected") {
      setMode("reverse");
      setSelectedMidiNotes([48, 52, 55]);
      setReverseAnchorStartMidi(48);
      setKeyboardSpan("1");
      setKeyCenter("C");
    }
  }, []);

  const selectedFamily = useMemo(
    () => FORWARD_FAMILIES.find((family) => family.id === selectedFamilyId) ?? FORWARD_FAMILIES[0],
    [selectedFamilyId],
  );
  const forwardChord = useMemo(
    () => buildChord(selectedRoot, selectedFormulaId),
    [selectedFormulaId, selectedRoot],
  );
  const forwardMidiNotes = useMemo(
    () => getForwardMidiNotes(selectedRoot, selectedFormulaId),
    [selectedFormulaId, selectedRoot],
  );
  const forwardMarkerLabels = useMemo(
    () => getForwardMarkerLabels(selectedRoot, selectedFormulaId),
    [selectedFormulaId, selectedRoot],
  );
  const reversePitchClasses = useMemo(
    () => uniquePitchClasses(selectedMidiNotes.map((midi) => midiToPitchClass(midi))),
    [selectedMidiNotes],
  );
  const detectedChords = useMemo(
    () => detectChords(selectedMidiNotes, { keyCenter }),
    [keyCenter, selectedMidiNotes],
  );

  useEffect(() => {
    if (mode === "forward") {
      setSelectedMidiNotes([...forwardMidiNotes].sort((a, b) => a - b));
    }
  }, [forwardMidiNotes, mode]);

  const displayMode = useMemo(() => {
    if (mode === "forward") {
      return getPreferredAccidental(selectedRoot);
    }
    if (detectedChords[0]) {
      return getPreferredAccidentalForContext(detectedChords[0].root, keyCenter);
    }
    return getPreferredAccidentalForContext("C", keyCenter);
  }, [detectedChords, keyCenter, mode, selectedRoot]);

  const displayedSelectedNotes = useMemo(
    () => getDisplayNotes(reversePitchClasses, displayMode),
    [displayMode, reversePitchClasses],
  );
  const forwardKeyboardRange = useMemo(
    () => getKeyboardRange(forwardMidiNotes, keyboardSpan),
    [forwardMidiNotes, keyboardSpan],
  );
  const reverseKeyboardRange = useMemo(
    () => {
      if (keyboardSpan === "1") {
        return getKeyboardRange(selectedMidiNotes.length > 0 ? selectedMidiNotes : [48], "1");
      }

      if (keyboardSpan === "2") {
        return getKeyboardRange(selectedMidiNotes.length > 0 ? selectedMidiNotes : [48], "2");
      }

      return { startMidi: reverseAnchorStartMidi, endMidi: reverseAnchorStartMidi + 23 };
    },
    [keyboardSpan, reverseAnchorStartMidi, selectedMidiNotes],
  );

  const rootOptions = useMemo(
    () => ROOT_OPTIONS.map((root) => ({ value: root, label: root })),
    [],
  );
  const familyOptions = useMemo(
    () => FORWARD_FAMILIES.map((family) => ({ value: family.id, label: family.label })),
    [],
  );
  const formulaOptions = useMemo(
    () => selectedFamily.formulas.map((formula) => ({ value: formula.id, label: formula.label })),
    [selectedFamily],
  );

  const handleToggleMidi = async (midi: number) => {
    setMode("reverse");
    setSelectedMidiNotes((current) => {
      const exists = current.includes(midi);
      const next = exists ? current.filter((value) => value !== midi) : [...current, midi].sort((a, b) => a - b);
      if (next.length === 0) {
        setReverseAnchorStartMidi(48);
      }
      return next;
    });
    await pianoAudio.playMidi(midi);
  };

  const handlePlayCurrent = async () => {
    await pianoAudio.playChord(selectedMidiNotes, playMode);
  };

  const handlePlayForward = async () => {
    setMode("forward");
    await pianoAudio.playChord(selectedMidiNotes, playMode);
  };

  const handleUseDetectedChord = (match: ChordMatch) => {
    const forwardSelection = buildForwardSelectionFromMatch(match);
    setSelectedRoot(forwardSelection.root);
    setSelectedFamilyId(FORMULA_TO_FAMILY.get(forwardSelection.formulaId) ?? DEFAULT_FAMILY_ID);
    setSelectedFormulaId(forwardSelection.formulaId);
    setMode("forward");
  };

  const primaryMatch = detectedChords[0];
  const candidateMatches = detectedChords.slice(1);
  const currentChordName = mode === "forward" ? forwardChord.name : primaryMatch?.name ?? "Waiting";
  const currentChordMeta =
    mode === "forward"
      ? `${selectedRoot} · ${selectedFamily.label} · ${chordFormulaMap.get(selectedFormulaId)?.label ?? ""}`
      : primaryMatch
        ? `${primaryMatch.formula.label}${primaryMatch.bass ? " · slash chord" : ""}`
        : "点击键盘中的音符开始识别";
  const currentDegrees = mode === "forward" ? forwardChord.degreeLabels : primaryMatch?.degreeLabels ?? [];

  return (
    <main className="app-shell">
      <section className="phone-stage">
        <div className="phone-shell">
          <header className="phone-header">
            <p className="eyebrow">ChordE</p>
            <h1>和弦工具</h1>
            <p className="hero-copy">正推显示组成音，反推识别和弦名称。</p>
          </header>

          {mode === "reverse" ? (
            <section className="result-card sticky-current-card">
              <p className="result-label">Current Chord</p>
              <h3>{currentChordName}</h3>
              <p>{currentChordMeta}</p>
              <div className="chip-row compact-row">
                {currentDegrees.length > 0 ? (
                  currentDegrees.map((degree) => (
                    <span key={degree} className="chip secondary">
                      {degree}
                    </span>
                  ))
                ) : (
                  <span className="muted">选择和弦或点击键盘后会显示组成解释</span>
                )}
              </div>
            </section>
          ) : null}

          <div className="mode-switch" role="tablist" aria-label="模式切换">
            <button
              type="button"
              className={`mode-tab${mode === "forward" ? " active" : ""}`}
              onClick={() => setMode("forward")}
            >
              正推
            </button>
            <button
              type="button"
              className={`mode-tab${mode === "reverse" ? " active" : ""}`}
              onClick={() => {
                setSelectedMidiNotes([]);
                setReverseAnchorStartMidi(48);
                setMode("reverse");
              }}
            >
              反推
            </button>
          </div>

          {mode === "forward" ? (
            <article className="panel mobile-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Forward</p>
                  <h2>选择和弦</h2>
                </div>
                <button type="button" className="ghost-button" onClick={handlePlayForward}>
                  播放
                </button>
              </div>

              <div className="controls-grid">
                <div className="inline-controls">
                  <div className="pill-toggle">
                    {(["auto", "1", "2"] as KeyboardSpan[]).map((span) => (
                      <button
                        key={span}
                        type="button"
                        className={`pill-button${keyboardSpan === span ? " active" : ""}`}
                        onClick={() => setKeyboardSpan(span)}
                      >
                        {span === "auto" ? "Auto Range" : `${span} Oct`}
                      </button>
                    ))}
                  </div>
                  <div className="pill-toggle">
                    {(["block", "arp"] as PlayMode[]).map((nextMode) => (
                      <button
                        key={nextMode}
                        type="button"
                        className={`pill-button${playMode === nextMode ? " active" : ""}`}
                        onClick={() => setPlayMode(nextMode)}
                      >
                        {nextMode === "block" ? "Block" : "Arp"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="picker-row">
                  <PickerColumn
                    label="音名"
                    options={rootOptions}
                    selectedValue={selectedRoot}
                    onSelect={(value) => {
                      setMode("forward");
                      setSelectedRoot(value);
                    }}
                  />
                  <PickerColumn
                    label="属性"
                    options={familyOptions}
                    selectedValue={selectedFamilyId}
                    onSelect={(value) => {
                      setMode("forward");
                      const nextFamilyId = value as ForwardFamilyId;
                      const nextFamily =
                        FORWARD_FAMILIES.find((family) => family.id === nextFamilyId) ?? FORWARD_FAMILIES[0];
                      setSelectedFamilyId(nextFamilyId);
                      setSelectedFormulaId(nextFamily.formulas[0].id);
                    }}
                  />
                  <PickerColumn
                    label="层级"
                    options={formulaOptions}
                    selectedValue={selectedFormulaId}
                    onSelect={(value) => {
                      setMode("forward");
                      setSelectedFormulaId(value);
                    }}
                  />
                </div>
              </div>

              <div className="result-card primary-card">
                <p className="result-label">当前和弦</p>
                <h3>{forwardChord.name}</h3>
                <p>
                  {selectedRoot} · {selectedFamily.label} · {chordFormulaMap.get(selectedFormulaId)?.label}
                </p>
                <div className="chip-row">
                  {forwardChord.noteNames.map((note) => (
                    <span key={note} className="chip">
                      {note}
                    </span>
                  ))}
                </div>
                <div className="chip-row compact-row">
                  {forwardChord.degreeLabels.map((degree) => (
                    <span key={degree} className="chip secondary">
                      {degree}
                    </span>
                  ))}
                </div>
              </div>

              <div className="result-card keyboard-card">
                <p className="result-label">钢琴键盘结果</p>
                <PianoKeyboard
                  activeMidiNotes={forwardMidiNotes}
                  selectedMidiNotes={selectedMidiNotes}
                  markerLabels={forwardMarkerLabels}
                  range={forwardKeyboardRange}
                  onToggleMidi={(midi) => {
                    void handleToggleMidi(midi);
                  }}
                />
              </div>
            </article>
          ) : (
            <article className="panel mobile-panel">
              <div className="panel-header reverse-header">
                <div>
                  <p className="panel-kicker">Reverse</p>
                  <h2>点击键盘识别</h2>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handlePlayCurrent}
                    disabled={selectedMidiNotes.length === 0}
                  >
                    播放
                  </button>
                  <button
                    type="button"
                    className="ghost-button secondary-button"
                    onClick={() => {
                      setSelectedMidiNotes([]);
                      setReverseAnchorStartMidi(48);
                    }}
                    disabled={selectedMidiNotes.length === 0}
                  >
                    清空
                  </button>
                </div>
              </div>

              <div className="result-card keyboard-card">
                <p className="result-label">选择音符</p>
                <div className="inline-controls stacked-controls">
                  <div className="pill-toggle scroll-pills">
                    {KEY_CENTER_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`pill-button${keyCenter === option ? " active" : ""}`}
                        onClick={() => setKeyCenter(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="pill-toggle">
                    {(["auto", "1", "2"] as KeyboardSpan[]).map((span) => (
                      <button
                        key={span}
                        type="button"
                        className={`pill-button${keyboardSpan === span ? " active" : ""}`}
                        onClick={() => setKeyboardSpan(span)}
                      >
                        {span === "auto" ? "Auto Range" : `${span} Oct`}
                      </button>
                    ))}
                  </div>
                </div>
                <PianoKeyboard
                  selectedMidiNotes={selectedMidiNotes}
                  showSelectionDots
                  range={reverseKeyboardRange}
                  onToggleMidi={(midi) => {
                    void handleToggleMidi(midi);
                  }}
                />
              </div>

              <div className="result-grid">
                <div className="result-card">
                  <p className="result-label">已选音</p>
                  <div className="chip-row">
                    {displayedSelectedNotes.length > 0 ? (
                      displayedSelectedNotes.map((note) => (
                        <span key={note} className="chip secondary">
                          {note}
                        </span>
                      ))
                    ) : (
                      <span className="muted">至少选择 2 个音开始识别，3-5 个音通常最稳定。</span>
                    )}
                  </div>
                </div>

                <div className="result-card primary-card">
                  <p className="result-label">最佳匹配</p>
                  {primaryMatch ? (
                    <>
                      <h3>{primaryMatch.name}</h3>
                      <p>{primaryMatch.formula.label}</p>
                      <div className="chip-row">
                        {primaryMatch.noteNames.map((note) => (
                          <span key={note} className="chip">
                            {note}
                          </span>
                        ))}
                      </div>
                      <div className="chip-row compact-row">
                        {primaryMatch.degreeLabels.map((degree) => (
                          <span key={degree} className="chip secondary">
                            {degree}
                          </span>
                        ))}
                      </div>
                      <button type="button" className="ghost-button action-button" onClick={() => handleUseDetectedChord(primaryMatch)}>
                        回填到正推
                      </button>
                    </>
                  ) : (
                    <p className="muted">点击钢琴键开始反推，系统会结合调性偏好和低音位置排序结果。</p>
                  )}
                </div>

                <div className="result-card">
                  <p className="result-label">候选名称</p>
                  {candidateMatches.length > 0 ? (
                    <ul className="candidate-list">
                      {candidateMatches.map((match) => (
                        <li key={match.name}>
                          <button type="button" className="candidate-button" onClick={() => handleUseDetectedChord(match)}>
                            <strong>{match.name}</strong>
                            <span>{match.noteNames.join(" · ")}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">当前没有更多候选。</p>
                  )}
                </div>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}

import { midiToNoteName, midiToPitchClass } from "../lib/music";

type PianoKeyboardProps = {
  activePitchClasses?: number[];
  activeMidiNotes?: number[];
  selectedMidiNotes: number[];
  markerLabels?: Record<number, string>;
  showSelectionDots?: boolean;
  onToggleMidi: (midi: number) => void;
  range?: {
    startMidi: number;
    endMidi: number;
  };
};

type PianoKey = {
  midi: number;
  isBlack: boolean;
  left: number;
};

const DEFAULT_START_MIDI = 48;
const DEFAULT_END_MIDI = 71;
const WHITE_KEY_WIDTH = 54;
const BLACK_KEY_WIDTH = 34;

function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midiToPitchClass(midi));
}

function buildKeys(startMidi: number, endMidi: number): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteIndex = 0;

  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    const black = isBlackKey(midi);

    if (black) {
      keys.push({
        midi,
        isBlack: true,
        left: whiteIndex * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
      });
      continue;
    }

    keys.push({
      midi,
      isBlack: false,
      left: whiteIndex * WHITE_KEY_WIDTH,
    });
    whiteIndex += 1;
  }

  return keys;
}

export function PianoKeyboard({
  activePitchClasses,
  activeMidiNotes,
  selectedMidiNotes,
  markerLabels,
  showSelectionDots = false,
  onToggleMidi,
  range,
}: PianoKeyboardProps) {
  const startMidi = range?.startMidi ?? DEFAULT_START_MIDI;
  const endMidi = range?.endMidi ?? DEFAULT_END_MIDI;
  const keys = buildKeys(startMidi, endMidi);
  const whiteKeyCount = keys.filter((key) => !key.isBlack).length;
  const keyboardWidth = whiteKeyCount * WHITE_KEY_WIDTH;

  return (
    <div className="keyboard-shell">
      <div className="keyboard" style={{ width: keyboardWidth }}>
        {keys.filter((key) => !key.isBlack).map((key) => {
          const pitchClass = midiToPitchClass(key.midi);
          const active = activeMidiNotes
            ? activeMidiNotes.includes(key.midi)
            : activePitchClasses?.includes(pitchClass) ?? false;
          const selected = selectedMidiNotes.includes(key.midi);
          const markerLabel = markerLabels?.[key.midi];
          const showMarker = Boolean(markerLabel) || (showSelectionDots && selected);

          return (
            <button
              key={key.midi}
              type="button"
              className={`piano-key white${active ? " active" : ""}${selected ? " selected" : ""}${showMarker ? " marked" : ""}`}
              style={{ left: key.left }}
              onClick={() => onToggleMidi(key.midi)}
            >
              {showMarker ? (
                <span className={`key-marker${markerLabel ? " label" : " dot"}`}>{markerLabel ?? ""}</span>
              ) : null}
              <span>{midiToNoteName(key.midi, "sharp")}</span>
            </button>
          );
        })}

        {keys.filter((key) => key.isBlack).map((key) => {
          const pitchClass = midiToPitchClass(key.midi);
          const active = activeMidiNotes
            ? activeMidiNotes.includes(key.midi)
            : activePitchClasses?.includes(pitchClass) ?? false;
          const selected = selectedMidiNotes.includes(key.midi);
          const markerLabel = markerLabels?.[key.midi];
          const showMarker = Boolean(markerLabel) || (showSelectionDots && selected);

          return (
            <button
              key={key.midi}
              type="button"
              className={`piano-key black${active ? " active" : ""}${selected ? " selected" : ""}${showMarker ? " marked" : ""}`}
              style={{ left: key.left }}
              onClick={() => onToggleMidi(key.midi)}
            >
              {showMarker ? (
                <span className={`key-marker${markerLabel ? " label" : " dot"}`}>{markerLabel ?? ""}</span>
              ) : null}
              <span>{midiToNoteName(key.midi, "sharp")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

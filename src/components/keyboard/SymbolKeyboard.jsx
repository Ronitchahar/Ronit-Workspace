import SymbolButton from "./SymbolButton";

const symbols = [
  "Σ",
  "Π",
  "Ω",
  "µ",
  "π",
  "√",
  "∞",
  "∑",
  "∏",
  "∫",
  "∆",
  "∂",
  "∇",
  "±",
  "≈",
  "≠",
  "≤",
  "≥",
  "÷",
  "∧",
  "∨",
  "¬",
  "∩",
  "∪",
  "∈",
  "∉",
  "∅",
  "♯",
  "♭",
  "⌘",
  "♦",
  "♧",
  "♣",
  "★",
  "☆",
  "♥",
  "♪",
  "⚡",
  "☀",
  "☁",
  "☂",
  "☕",
  "☺",
  "☻",
];

function SymbolKeyboard({ onInsert }) {
  return (
    <div className="symbol-keyboard">
      <div className="symbol-keyboard-header">Special symbols for notes</div>
      <div className="symbol-keyboard-grid">
        {symbols.map((symbol) => (
          <SymbolButton
            key={symbol}
            symbol={symbol}
            onClick={() => onInsert(symbol)}
          />
        ))}
      </div>
    </div>
  );
}

export default SymbolKeyboard;

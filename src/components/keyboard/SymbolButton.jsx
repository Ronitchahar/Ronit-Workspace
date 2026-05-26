function SymbolButton({ symbol, onClick }) {
  return (
    <button type="button" className="symbol-button" onClick={onClick}>
      {symbol}
    </button>
  );
}

export default SymbolButton;

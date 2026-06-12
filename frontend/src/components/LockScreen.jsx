import { useState } from 'react';

function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [keyboardMode, setKeyboardMode] = useState('numeric'); // 'numeric' | 'alpha'
  const [error, setError] = useState(null);

  const numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const alphaKeys = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
  ];

  const handleKeyPress = (char) => {
    if (pin.length < 6) {
      setError(null);
      const newPin = pin + char;
      setPin(newPin);

      // Automatically submit when the 6-character passcode is reached
      if (newPin.length === 6) {
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(null);
    setPin('');
  };

  const handleSubmit = (finalPin) => {
    // Basic structural check: 5 digits + 1 letter
    const digits = finalPin.slice(0, 5);
    const letter = finalPin.charAt(5);

    const isDigitsOk = /^\d{5}$/.test(digits);
    const isLetterOk = /^[A-Z]$/i.test(letter);

    if (isDigitsOk && isLetterOk) {
      onUnlock(finalPin.toUpperCase());
    } else {
      setError('INVALID PIN STRUCTURE (5 DIGITS + 1 LETTER)');
      // Reset pin after short delay to let user retry
      setTimeout(() => {
        setPin('');
        setError(null);
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 max-w-sm mx-auto glass-panel border border-bf-cyan/30 clip-hud">
      <div className="w-full text-center space-y-4">
        <div className="text-[10px] text-bf-cyan font-bold tracking-widest uppercase animate-pulse">
          // SECURITY_GATEWAY // SECURE_SHELL
        </div>
        <h2 className="text-xl font-black text-white tracking-widest uppercase">
          ENTER ACCESS CREDENTIALS
        </h2>

        {/* PIN Code Verification */}

        {/* Display placeholders for 6 characters */}
        <div className="flex justify-center gap-2.5 py-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-9 h-12 border flex items-center justify-center font-bold text-lg rounded transition-all duration-200 ${
                i < pin.length
                  ? 'border-bf-cyan bg-bf-cyan/10 text-bf-cyan'
                  : 'border-bf-border bg-bf-dark/50 text-slate-600'
              }`}
            >
              {i < pin.length ? pin[i] : ''}
            </div>
          ))}
        </div>

        {error ? (
          <div className="text-[10px] text-bf-orange font-bold uppercase tracking-wider py-1 animate-pulse min-h-[20px]">
            {error}
          </div>
        ) : (
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider py-1 min-h-[20px]">
            STRUCTURE: [ 0 - 9 ] x 5 + [ A - Z ] x 1
          </div>
        )}

        {/* Keyboard Layout */}
        <div className="space-y-3 pt-4">
          {keyboardMode === 'numeric' ? (
            /* Numeric Keypad Grid */
            <div className="grid grid-cols-3 gap-2 justify-items-center">
              {numKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="w-16 h-12 bg-bf-slate/80 border border-bf-border text-white text-base font-bold clip-btn hover:border-bf-cyan/70 active:bg-bf-cyan active:text-bf-dark transition-all duration-150"
                >
                  {key}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="w-16 h-12 bg-bf-slate/80 border border-bf-border text-bf-orange font-bold clip-btn hover:border-bf-orange/70 active:bg-bf-orange active:text-bf-dark transition-all"
              >
                ⌫
              </button>
              <button
                onClick={handleClear}
                className="w-16 h-12 bg-bf-slate/80 border border-bf-border text-slate-500 font-bold clip-btn hover:border-slate-400 transition-all"
              >
                CLR
              </button>
            </div>
          ) : (
            /* Alphabet Keypad Grid (A-Z) */
            <div className="grid grid-cols-6 gap-1 justify-items-center max-w-[280px] mx-auto">
              {alphaKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="w-10 h-10 bg-bf-slate/80 border border-bf-border text-white text-xs font-bold clip-btn hover:border-bf-cyan/70 active:bg-bf-cyan active:text-bf-dark transition-all duration-150"
                >
                  {key}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="col-span-2 w-full h-10 bg-bf-slate/80 border border-bf-border text-bf-orange text-xs font-bold clip-btn hover:border-bf-orange/70 active:bg-bf-orange active:text-bf-dark transition-all"
              >
                ⌫
              </button>
              <button
                onClick={handleClear}
                className="col-span-2 w-full h-10 bg-bf-slate/80 border border-bf-border text-slate-500 text-xs font-bold clip-btn hover:border-slate-400 transition-all"
              >
                CLR
              </button>
            </div>
          )}

          {/* Toggle between Numeric and Alpha keypad modes */}
          <div className="pt-2">
            <button
              onClick={() => setKeyboardMode((prev) => (prev === 'numeric' ? 'alpha' : 'numeric'))}
              className="w-full py-2 bg-bf-dark border border-bf-cyan/30 text-bf-cyan text-[10px] font-black uppercase clip-btn hover:border-bf-cyan/80 hover:bg-bf-cyan/10 transition-all duration-200"
            >
              SWITCH TO {keyboardMode === 'numeric' ? 'LETTERS [A-Z]' : 'NUMBERS [0-9]'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LockScreen;

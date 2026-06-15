import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext.jsx';

function LockScreen({ onUnlock }) {
  const { t } = useTranslation();
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

      // Automatically switch to letters when 5 digits are entered
      if (newPin.length === 5) {
        setKeyboardMode('alpha');
      }

      // Automatically submit when the 6-character passcode is reached
      if (newPin.length === 6) {
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    setPin((prev) => {
      const newPin = prev.slice(0, -1);
      // Automatically switch back to numbers if length falls below 5
      if (newPin.length < 5) {
        setKeyboardMode('numeric');
      }
      return newPin;
    });
  };

  const handleClear = () => {
    setError(null);
    setPin('');
    setKeyboardMode('numeric');
  };

  const handleSubmit = async (finalPin) => {
    // Basic structural check: 5 digits + 1 letter
    const digits = finalPin.slice(0, 5);
    const letter = finalPin.charAt(5);

    const isDigitsOk = /^\d{5}$/.test(digits);
    const isLetterOk = /^[A-Z]$/i.test(letter);

    if (isDigitsOk && isLetterOk) {
      try {
        await onUnlock(finalPin.toUpperCase());
      } catch (err) {
        setError(err.message ? err.message.toUpperCase() : t('lock.accessDenied'));
        setTimeout(() => {
          setPin('');
          setError(null);
          setKeyboardMode('numeric');
        }, 1500);
      }
    } else {
      setError(t('lock.invalidPin'));
      // Reset pin after short delay to let user retry
      setTimeout(() => {
        setPin('');
        setError(null);
        setKeyboardMode('numeric');
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 max-w-sm mx-auto glass-panel border border-bf-cyan/30 clip-hud">
      <div className="w-full text-center space-y-4">
        <div className="text-[10px] text-bf-cyan font-bold tracking-widest uppercase animate-pulse">
          {t('lock.secureShell')}
        </div>
        {(() => {
          const lastOperatorStr = localStorage.getItem('dvora_last_operator');
          let lastOperator = lastOperatorStr ? JSON.parse(lastOperatorStr) : null;

          // Fallback to Telegram Web App SDK context if no local storage cache exists
          if (!lastOperator && window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            if (tgUser.username) {
              lastOperator = {
                tg_username: tgUser.username,
                avatar_url: tgUser.photo_url || null,
              };
            }
          }

          if (lastOperator) {
            return (
              <div className="flex flex-col items-center gap-2 mb-2 p-3 bg-bf-dark/60 border border-bf-cyan/20 clip-btn">
                <div className="w-14 h-14 bg-bf-slate border border-bf-cyan/30 relative flex items-center justify-center overflow-hidden rounded-full shrink-0">
                  {lastOperator.avatar_url ? (
                    <img
                      src={lastOperator.avatar_url}
                      alt="Tactical Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-bf-cyan text-xl font-black">⚡</span>
                  )}
                </div>
                <div>
                  <div className="text-[8px] text-slate-500 font-mono font-bold tracking-widest uppercase">
                    {t('lock.currentOperator')}
                  </div>
                  <div className="text-white font-black text-xs uppercase tracking-wider">
                    {lastOperator.tg_username
                      ? `@${lastOperator.tg_username.replace(/^@/, '')}`
                      : 'SECURE_NODE'}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <h2 className="text-xl font-black text-white tracking-widest uppercase">
              {t('lock.enterCredentials')}
            </h2>
          );
        })()}

        {/* PIN Code Verification */}

        {/* Display placeholders for 6 characters */}
        <div className="flex justify-center gap-2.5 py-4" dir="ltr">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-9 h-12 border flex items-center justify-center font-bold text-lg rounded transition-all duration-200 ${i < pin.length
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
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider py-1 min-h-[20px]" dir="ltr">
            STRUCTURE: [ 0 - 9 ] x 5 + [ A - Z ] x 1
          </div>
        )}

        {/* Keyboard Layout */}
        <div className="space-y-3 pt-4" dir="ltr">
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
                className="w-16 h-12 bg-bf-slate/80 border border-bf-border text-bf-orange text-xl font-bold clip-btn hover:border-bf-orange/70 active:bg-bf-orange active:text-bf-dark transition-all"
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
                className="col-span-2 w-full h-10 bg-bf-slate/80 border border-bf-border text-bf-orange text-sm font-bold clip-btn hover:border-bf-orange/70 active:bg-bf-orange active:text-bf-dark transition-all"
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

          {/* Keyboard toggle is now automatic */}
        </div>
      </div>
    </div>
  );
}

export default LockScreen;

import React, { useState } from 'react';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  const buttons = [
    'C', '(', ')', '/',
    '7', '8', '9', '*',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '=',
  ];

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4 p-4 bg-white rounded-lg shadow-inner text-right">
        <div className="text-xs text-slate-400 h-4">{equation}</div>
        <div className="text-3xl font-bold text-slate-800 truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2 flex-1">
        {buttons.map(btn => (
          <button
            key={btn}
            onClick={() => {
              if (btn === 'C') clear();
              else if (btn === '=') calculate();
              else if (['+', '-', '*', '/'].includes(btn)) handleOperator(btn);
              else handleNumber(btn);
            }}
            className={`
              p-4 rounded-lg font-medium transition-all active:scale-95
              ${btn === '=' ? 'bg-win-accent text-white col-span-2' : 'bg-white hover:bg-slate-100'}
              ${['+', '-', '*', '/', 'C', '(', ')'].includes(btn) ? 'text-win-accent' : 'text-slate-700'}
            `}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Calculator;

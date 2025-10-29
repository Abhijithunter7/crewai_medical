
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-3 h-3 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-3 h-3 rounded-full bg-slate-400 animate-bounce"></div>
    </div>
  );
};

export default Loader;

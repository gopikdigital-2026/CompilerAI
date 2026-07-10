import React from 'react';
import { Cpu } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = {
  sm: { icon: 18, text: 'text-base', wrapper: 'w-7 h-7' },
  md: { icon: 22, text: 'text-xl', wrapper: 'w-9 h-9' },
  lg: { icon: 28, text: 'text-2xl', wrapper: 'w-11 h-11' },
};

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${s.wrapper} rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow-brand`}>
        <Cpu size={s.icon} className="text-white" />
      </div>
      {showText && (
        <div className="leading-tight">
          <span className={`${s.text} font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent`}>
            compiler
          </span>
          <span className={`${s.text} font-bold text-neutral-100`}>ai</span>
          <span className={`text-xs font-medium text-neutral-500`}>.io</span>
        </div>
      )}
    </div>
  );
}

"use client";

import React from 'react';
import { Coins } from 'lucide-react';

interface CreditBalanceProps {
  balance?: number;
  onBalanceUpdate?: (newBalance: number) => void;
  className?: string;
}

export function CreditBalance({ 
  balance = 480, 
  onBalanceUpdate, 
  className = '' 
}: CreditBalanceProps) {
  void onBalanceUpdate;
  const currentBalance = balance;

  return (
    <div
      className={`group flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-all ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        color: 'var(--text)',
        backdropFilter: 'blur(8px)',
      }}
      title="Баланс токенов ИИ (Демо)"
      aria-label="Баланс токенов ИИ (Демо)"
    >
      <Coins className="h-4 w-4 text-emerald-400 transition-colors" />
      <span className="font-semibold tabular-nums">
        {currentBalance.toLocaleString()}
      </span>
      <span className="text-emerald-400 text-xs">💎</span>
    </div>
  );
}

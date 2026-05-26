"use client";

import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import { BillingModal } from './BillingModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(balance);

  const handleOpenBilling = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePurchase = (credits: number, price: number) => {
    // In real app: call Stripe, then update via Supabase
    const newBalance = currentBalance + credits;
    setCurrentBalance(newBalance);
    
    if (onBalanceUpdate) {
      onBalanceUpdate(newBalance);
    }
    
    // Close modal after "purchase"
    setTimeout(() => {
      setIsModalOpen(false);
    }, 1500);
    
    console.log(`Purchased ${credits} credits for $${price}. New balance: ${newBalance}`);
  };

  return (
    <>
      <button
        onClick={handleOpenBilling}
        className={`group flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${className}`}
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          color: 'var(--text)',
          backdropFilter: 'blur(8px)',
        }}
        title="Ваш баланс для генераций"
      >
        <Coins className="h-4 w-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
        <span className="font-semibold tabular-nums">
          {currentBalance.toLocaleString()}
        </span>
        <span className="text-emerald-400 text-xs">💎</span>
      </button>

      <BillingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        currentBalance={currentBalance}
        onPurchase={handlePurchase}
      />
    </>
  );
}

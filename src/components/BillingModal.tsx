"use client";

import React from 'react';
import { X, CreditCard, Zap } from 'lucide-react';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onPurchase?: (credits: number, price: number) => void;
}

const PACKAGES = [
  { credits: 500, price: 10, label: "Стартовый", popular: false },
  { credits: 1500, price: 25, label: "Популярный", popular: true },
  { credits: 5000, price: 75, label: "Профессиональный", popular: false },
];

export function BillingModal({ 
  isOpen, 
  onClose, 
  currentBalance, 
  onPurchase 
}: BillingModalProps) {
  if (!isOpen) return null;

  const handlePurchase = (pkg: typeof PACKAGES[0]) => {
    if (onPurchase) {
      onPurchase(pkg.credits, pkg.price);
    } else {
      // Fallback demo
      console.log(`Stripe checkout for ${pkg.credits} credits ($${pkg.price})`);
      // Simulate success
      setTimeout(() => {
        onClose();
      }, 800);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl border p-6"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Zap className="h-6 w-6 text-emerald-400" />
              Пополнение баланса
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Текущий баланс: <span className="font-semibold text-emerald-400">{currentBalance.toLocaleString()} 💎</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 transition"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Packages */}
        <div className="space-y-3">
          {PACKAGES.map((pkg, index) => (
            <div
              key={index}
              className={`group relative flex items-center justify-between rounded-xl border p-4 transition-all hover:border-emerald-400/50 cursor-pointer ${pkg.popular ? 'ring-1 ring-emerald-400/30' : ''}`}
              style={{
                background: pkg.popular ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-elevated)',
                borderColor: pkg.popular ? 'rgba(16, 185, 129, 0.4)' : 'var(--border)',
              }}
              onClick={() => handlePurchase(pkg)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{pkg.credits.toLocaleString()} 💎</span>
                  {pkg.popular && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                      Лучший выбор
                    </span>
                  )}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {pkg.label}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold">${pkg.price}</div>
                <div className="text-[10px] text-emerald-400/70">одноразово</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              // Trigger first popular package or show Stripe
              handlePurchase(PACKAGES[1]);
            }}
            className="w-full rounded-xl py-3 font-semibold text-white flex items-center justify-center gap-2 transition active:scale-[0.985]"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #6d28d9)',
            }}
          >
            <CreditCard className="h-4 w-4" />
            Оплатить через Stripe
          </button>
          
          <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Кредиты не сгорают. Используйте для всех генераций Nexus и AI-артефактов.
          </p>
        </div>
      </div>
    </div>
  );
}

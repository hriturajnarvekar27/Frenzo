import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Check, Copy, ShieldCheck, QrCode, User as UserIcon, Building, Zap, Layers, Palette, Users } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { PaymentRequest } from '../types';

interface PaymentRequestPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PaymentRequest | null;
  onMarkAsPaid?: (request: PaymentRequest) => Promise<void>;
  appTheme?: string;
}

type DisplayOption = 'all' | 'upi' | 'bank';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export interface PassThemeConfig {
  id: string;
  name: string;
  passLabel: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  primaryAccent: string;
  secondaryAccent: string;
  highlightText: string;
  perforationColor: string;
  tagBg: string;
  tagColor: string;
  tagBorder: string;
  cardBg: string;
  cardBorder: string;
  radialGlowTop: string;
  radialGlowBottom: string;
}

export function detectPassTypeTheme(request: PaymentRequest | null): string {
  if (!request) return 'request';

  if (request.status === 'paid' || (request as any).isReceipt) {
    return 'receipt';
  }

  const title = (request.title || '').toLowerCase();
  const note = (request.note || '').toLowerCase();

  if (request.status === 'overdue' || title.includes('overdue') || title.includes('late') || note.includes('overdue')) {
    return 'overdue';
  }
  if (request.requestType === 'split') {
    return 'split';
  }
  if (title.includes('subscription') || title.includes('recurring') || title.includes('sub') || note.includes('subscription')) {
    return 'subscription';
  }
  if (title.includes('refund') || title.includes('return') || note.includes('refund')) {
    return 'refund';
  }
  if (title.includes('donation') || title.includes('charity') || title.includes('cause') || note.includes('donation')) {
    return 'donation';
  }
  if (title.includes('vip') || title.includes('membership') || title.includes('platinum') || note.includes('vip')) {
    return 'vip';
  }

  return 'request';
}

export function getPassThemeConfig(themeKey?: string): PassThemeConfig {
  const key = (themeKey || 'request').toLowerCase();

  // 1. Payment Receipt - Emerald Green (#22C55E)
  if (key.includes('receipt') || key.includes('emerald') || key.includes('mint')) {
    return {
      id: 'receipt',
      name: 'Payment Receipt',
      passLabel: 'Payment Receipt Pass',
      bgGradient: 'linear-gradient(180deg, #0A2F1D 0%, #082416 50%, #05170E 100%)',
      borderColor: 'rgba(34, 197, 94, 0.35)',
      glowColor: 'rgba(34, 197, 94, 0.18)',
      primaryAccent: '#22C55E',
      secondaryAccent: '#4ADE80',
      highlightText: '#22C55E',
      perforationColor: 'rgba(34, 197, 94, 0.30)',
      tagBg: 'rgba(34, 197, 94, 0.15)',
      tagColor: '#4ADE80',
      tagBorder: '#22C55E',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorder: 'rgba(34, 197, 94, 0.15)',
      radialGlowTop: 'radial-gradient(circle, rgba(34, 197, 94, 0.18) 0%, transparent 65%)',
      radialGlowBottom: 'radial-gradient(circle, rgba(74, 222, 128, 0.12) 0%, transparent 65%)',
    };
  }

  // 2. Split Pass - Royal Gold (#F4C430)
  if (key.includes('split') || key.includes('gold')) {
    return {
      id: 'split',
      name: 'Split Pass',
      passLabel: 'Split Payment Pass',
      bgGradient: 'linear-gradient(180deg, #17120C 0%, #1C160E 50%, #110D09 100%)',
      borderColor: 'rgba(244, 196, 48, 0.35)',
      glowColor: 'rgba(244, 196, 48, 0.18)',
      primaryAccent: '#F4C430',
      secondaryAccent: '#EAB308',
      highlightText: '#F4C430',
      perforationColor: 'rgba(244, 196, 48, 0.30)',
      tagBg: 'rgba(244, 196, 48, 0.15)',
      tagColor: '#F4C430',
      tagBorder: '#F4C430',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorder: 'rgba(244, 196, 48, 0.15)',
      radialGlowTop: 'radial-gradient(circle, rgba(244, 196, 48, 0.18) 0%, transparent 65%)',
      radialGlowBottom: 'radial-gradient(circle, rgba(234, 179, 8, 0.12) 0%, transparent 65%)',
    };
  }

  // 3. Subscription - Sapphire Blue (#3B82F6)
  if (key.includes('subscription') || key.includes('blue') || key.includes('sapphire')) {
    return {
      id: 'subscription',
      name: 'Subscription',
      passLabel: 'Subscription Pass',
      bgGradient: 'linear-gradient(180deg, #0C1B3A 0%, #0A162F 50%, #060D1D 100%)',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      glowColor: 'rgba(59, 130, 246, 0.18)',
      primaryAccent: '#3B82F6',
      secondaryAccent: '#60A5FA',
      highlightText: '#60A5FA',
      perforationColor: 'rgba(59, 130, 246, 0.30)',
      tagBg: 'rgba(59, 130, 246, 0.15)',
      tagColor: '#60A5FA',
      tagBorder: '#3B82F6',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorder: 'rgba(59, 130, 246, 0.15)',
      radialGlowTop: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 65%)',
      radialGlowBottom: 'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, transparent 65%)',
    };
  }

  // 4. Refund - Neo Cyan (#22D3EE)
  if (key.includes('refund') || key.includes('cyan')) {
    return {
      id: 'refund',
      name: 'Refund',
      passLabel: 'Refund Pass',
      bgGradient: 'linear-gradient(180deg, #082932 0%, #062028 50%, #04141A 100%)',
      borderColor: 'rgba(34, 211, 238, 0.35)',
      glowColor: 'rgba(34, 211, 238, 0.18)',
      primaryAccent: '#22D3EE',
      secondaryAccent: '#38BDF8',
      highlightText: '#22D3EE',
      perforationColor: 'rgba(34, 211, 238, 0.30)',
      tagBg: 'rgba(34, 211, 238, 0.15)',
      tagColor: '#38BDF8',
      tagBorder: '#22D3EE',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorder: 'rgba(34, 211, 238, 0.15)',
      radialGlowTop: 'radial-gradient(circle, rgba(34, 211, 238, 0.18) 0%, transparent 65%)',
      radialGlowBottom: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 65%)',
    };
  }

  // 5. Donation - Rose Pink (#EC4899)
  if (key.includes('donation') || key.includes('pink') || key.includes('rose')) {
    return {
      id: 'donation',
      name: 'Donation',
      passLabel: 'Donation Pass',
      bgGradient: 'linear-gradient(180deg, #330F23 0%, #290B1B 50%, #1A0711 100%)',
      borderColor: 'rgba(236, 72, 153, 0.35)',
      glowColor: 'rgba(236, 72, 153, 0.18)',
      primaryAccent: '#EC4899',
      secondaryAccent: '#F472B6',
      highlightText: '#F472B6',
      perforationColor: 'rgba(236, 72, 153, 0.30)',
      tagBg: 'rgba(236, 72, 153, 0.15)',
      tagColor: '#F472B6',
      tagBorder: '#EC4899',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorder: 'rgba(236, 72, 153, 0.15)',
      radialGlowTop: 'radial-gradient(circle, rgba(236, 72, 153, 0.18) 0%, transparent 65%)',
      radialGlowBottom: 'radial-gradient(circle, rgba(244, 114, 182, 0.12) 0%, transparent 65%)',
    };
  }

  // 6. Overdue Invoice - Ruby Red (#EF4444)
  if (key.includes('overdue') || key.includes('red') || key.includes('ruby')) {
    return {
      id: 'overdue',
      name: 'Overdue Invoice',
      passLabel: 'Overdue Invoice Pass',
      bgGradient: 'linear-gradient(180deg, #381216 0%, #290D10 50%, #1A080A 100%)',
      borderColor: 'rgba(239, 68, 68, 0.35)',
      glowColor: 'rgba(239, 68, 68, 0.18)',
      primaryAccent: '#EF4444',
      secondaryAccent: '#F87171',
      highlightText: '#F87171',
      perforationColor: 'rgba(239, 68, 68, 0.30)',
      tagBg: 'rgba(239, 68, 68, 0.15)',
      tagColor: '#F87171',
      tagBorder: '#EF4444',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorder: 'rgba(239, 68, 68, 0.15)',
      radialGlowTop: 'radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, transparent 65%)',
      radialGlowBottom: 'radial-gradient(circle, rgba(248, 113, 113, 0.12) 0%, transparent 65%)',
    };
  }

  // 7. VIP Membership - Platinum Silver (#E5E7EB)
  if (key.includes('vip') || key.includes('silver') || key.includes('platinum')) {
    return {
      id: 'vip',
      name: 'VIP Membership',
      passLabel: 'VIP Membership Pass',
      bgGradient: 'linear-gradient(180deg, #22252A 0%, #1A1D21 50%, #111316 100%)',
      borderColor: 'rgba(229, 231, 235, 0.35)',
      glowColor: 'rgba(229, 231, 235, 0.18)',
      primaryAccent: '#E5E7EB',
      secondaryAccent: '#F3F4F6',
      highlightText: '#E5E7EB',
      perforationColor: 'rgba(229, 231, 235, 0.30)',
      tagBg: 'rgba(229, 231, 235, 0.15)',
      tagColor: '#F3F4F6',
      tagBorder: '#E5E7EB',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorder: 'rgba(229, 231, 235, 0.15)',
      radialGlowTop: 'radial-gradient(circle, rgba(229, 231, 235, 0.18) 0%, transparent 65%)',
      radialGlowBottom: 'radial-gradient(circle, rgba(243, 244, 246, 0.12) 0%, transparent 65%)',
    };
  }

  // 8. Payment Request (Default) - Electric Violet (#8B5CF6)
  return {
    id: 'request',
    name: 'Payment Request',
    passLabel: 'Payment Request Pass',
    bgGradient: 'linear-gradient(180deg, #24163F 0%, #1D1735 50%, #14121F 100%)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    glowColor: 'rgba(139, 92, 246, 0.18)',
    primaryAccent: '#8B5CF6',
    secondaryAccent: '#A855F7',
    highlightText: '#A855F7',
    perforationColor: 'rgba(139, 92, 246, 0.30)',
    tagBg: 'rgba(139, 92, 246, 0.15)',
    tagColor: '#A855F7',
    tagBorder: '#8B5CF6',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(139, 92, 246, 0.15)',
    radialGlowTop: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 65%)',
    radialGlowBottom: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 65%)',
  };
}

function CustomQRCode({ value, size = 160, theme }: { value: string; size?: number; theme: PassThemeConfig }) {
  const grid = useMemo(() => {
    const s = 21;
    const matrix = Array.from({ length: s }, () => Array(s).fill(false));
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    const drawFinder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            matrix[r + i][c + j] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, 14);
    drawFinder(14, 0);

    for (let i = 8; i < 13; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    let currentHash = Math.abs(hash) || 54321;
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
        if (r === 6 || c === 6) continue;
        currentHash = (currentHash * 1664525 + 1013904223) % 4294967296;
        matrix[r][c] = currentHash % 2 === 0;
      }
    }
    return matrix;
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 21"
      style={{
        backgroundColor: '#FFFFFF',
        padding: '12px',
        borderRadius: '22px',
        border: `1px solid ${theme.borderColor}`,
        boxShadow: `0 0 28px ${theme.glowColor}`
      }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#110D09" rx={0.2} /> : null
        )
      )}
    </svg>
  );
}

export function PaymentRequestPassModal({
  isOpen,
  onClose,
  request,
  onMarkAsPaid,
  appTheme
}: PaymentRequestPassModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>('request');
  const [displayOption, setDisplayOption] = useState<DisplayOption>('all');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Automatically assign dynamic theme based on pass type when request loads or changes
  React.useEffect(() => {
    if (request) {
      if (appTheme) {
        setSelectedThemeKey(appTheme);
      } else {
        setSelectedThemeKey(detectPassTypeTheme(request));
      }
    }
  }, [request, appTheme]);

  if (!isOpen || !request) return null;

  const theme = getPassThemeConfig(selectedThemeKey);

  const dateStr = request.date ? format(request.date.toDate(), 'dd MMM yyyy • hh:mm a') : format(new Date(), 'dd MMM yyyy • hh:mm a');
  const upiUrl = `upi://pay?pa=${encodeURIComponent(request.upiId)}&pn=${encodeURIComponent(request.accountHolderName)}&am=${request.totalAmount}&cu=INR&tn=${encodeURIComponent(request.title)}`;
  const passSerial = `PASS #SP-${(request.id || '2048').slice(-6).toUpperCase()}`;

  const copyUpi = () => {
    navigator.clipboard.writeText(request.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const copyPaymentText = () => {
    let text = `⚡ ${theme.passLabel.toUpperCase()} FROM ${request.accountHolderName.toUpperCase()}\n`;
    text += `Purpose: ${request.title}\n`;
    text += `Amount: ${formatCurrency(request.requestType === 'split' ? (request.perPersonAmount || request.totalAmount) : request.totalAmount)}\n`;
    if (displayOption !== 'bank' && request.upiId) text += `UPI ID: ${request.upiId}\n`;
    if (displayOption !== 'upi' && request.bankName && request.accountNumber) {
      text += `Bank: ${request.bankName} | A/C: ${request.accountNumber} | IFSC: ${request.ifscCode || 'N/A'}\n`;
    }
    if (displayOption !== 'bank') {
      text += `Pay via UPI link: ${upiUrl}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#0B0806',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 540,
      });
      const link = document.createElement('a');
      link.download = `payment-pass-${request.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error(err);
      alert('Could not generate pass image.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#0B0806',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 540,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }
        const file = new File([blob], `payment-pass-${request.title}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Payment Pass: ${request.title}`,
              text: `Payment Pass for ${formatCurrency(request.totalAmount)} to ${request.accountHolderName} (${request.upiId})`,
            });
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              handleDownload();
            }
          }
        } else {
          handleDownload();
          alert('Direct image sharing not supported by browser. The card image has been downloaded!');
        }
        setIsGenerating(false);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const handleMarkPaidClick = async () => {
    if (!onMarkAsPaid) return;
    setIsMarkingPaid(true);
    try {
      await onMarkAsPaid(request);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update request status.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const hasBankDetails = Boolean(request.bankName && request.accountNumber);
  const participantCount = request.numberOfPeople || request.splitBreakdown?.length || 2;

  const themeList = [
    { key: 'receipt', color: '#22C55E', label: 'Receipt' },
    { key: 'request', color: '#8B5CF6', label: 'Request' },
    { key: 'split', color: '#F4C430', label: 'Split' },
    { key: 'subscription', color: '#3B82F6', label: 'Sub' },
    { key: 'refund', color: '#22D3EE', label: 'Refund' },
    { key: 'donation', color: '#EC4899', label: 'Donation' },
    { key: 'overdue', color: '#EF4444', label: 'Overdue' },
    { key: 'vip', color: '#E5E7EB', label: 'VIP' }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#090503]/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-md my-auto flex flex-col gap-3.5 z-10"
        >
          {/* Close button floating top right */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all border border-white/10 z-20"
            title="Close Pass"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Options Bar: Display Choices & Theme Selection */}
          <div className="flex flex-col gap-2.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 text-xs text-white shadow-xl">
            {/* Display Option Switcher */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold shrink-0">
                <Layers className="w-3.5 h-3.5" style={{ color: theme.primaryAccent }} />
                <span>Show Options:</span>
              </div>

              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setDisplayOption('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                    displayOption === 'all'
                      ? 'bg-white text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Details
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayOption('upi')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                    displayOption === 'upi'
                      ? 'bg-white text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>UPI / QR</span>
                </button>
                {hasBankDetails && (
                  <button
                    type="button"
                    onClick={() => setDisplayOption('bank')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                      displayOption === 'bank'
                        ? 'bg-white text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building className="w-3 h-3" />
                    <span>Bank</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Pass Theme Selector (All 8 Themes) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold shrink-0">
                <Palette className="w-3.5 h-3.5" style={{ color: theme.primaryAccent }} />
                <span>Pass Theme:</span>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[260px] no-scrollbar">
                {themeList.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedThemeKey(t.key)}
                    className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                      theme.id === t.key
                        ? 'border-white scale-110 shadow-md ring-2 ring-white/20'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: t.color }}
                    title={`${t.label} Theme`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Ticket Wrapper Area captured by html2canvas */}
          <div
            ref={cardRef}
            data-request-card="true"
            style={{
              backgroundColor: '#0B0806',
              backgroundImage: `radial-gradient(circle at 50% 0%, ${theme.glowColor} 0%, transparent 70%)`,
              width: '100%',
              maxWidth: '440px',
              margin: '0 auto',
              padding: '24px 16px',
              boxSizing: 'border-box',
              fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
            }}
            className="rounded-[36px]"
          >
            {/* VIP Digital Pass Ticket Container */}
            <div
              style={{
                background: theme.bgGradient,
                borderRadius: '28px',
                border: `1px solid ${theme.borderColor}`,
                boxShadow: `0 0 32px ${theme.glowColor}, 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.08)`,
                position: 'relative',
                overflow: 'hidden',
                color: '#FFFFFF'
              }}
            >
              {/* Subtle Premium Diagonal Line Pattern Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)',
                  pointerEvents: 'none',
                  opacity: 0.7
                }}
              />

              {/* 1. Smaller, softer radial glow centered exactly behind the amount */}
              <div
                style={{
                  position: 'absolute',
                  top: '110px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '160px',
                  height: '100px',
                  background: theme.radialGlowTop,
                  filter: 'blur(30px)',
                  pointerEvents: 'none'
                }}
              />

              {/* 2. Soft subtle glow behind bottom QR/Footer */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '50px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '180px',
                  height: '120px',
                  background: theme.radialGlowBottom,
                  filter: 'blur(35px)',
                  pointerEvents: 'none'
                }}
              />

              {/* Card Content Relative */}
              <div style={{ position: 'relative', zIndex: 2 }}>
                {/* Header with App Logo & Aligned Status Pill */}
                <div
                  style={{
                    padding: '20px 24px 12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  {/* Left: App Logo Badge + Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: `linear-gradient(135deg, ${theme.primaryAccent} 0%, ${theme.secondaryAccent} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.id === 'vip' ? '#110D09' : '#FFFFFF',
                        boxShadow: `0 0 16px ${theme.glowColor}`,
                        flexShrink: 0
                      }}
                    >
                      <Zap className="w-5 h-5 fill-current stroke-[1.5]" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h3
                        style={{
                          color: '#FFFFFF',
                          fontSize: '20px',
                          fontWeight: 900,
                          letterSpacing: '0.06em',
                          margin: 0,
                          lineHeight: 1.1
                        }}
                      >
                        FRENZO
                      </h3>
                      <p
                        style={{
                          color: 'rgba(255, 255, 255, 0.65)',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '1.5px',
                          textTransform: 'uppercase',
                          margin: '3px 0 0 0',
                          lineHeight: 1.2
                        }}
                      >
                        {theme.passLabel}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill - Perfect Flex Alignment */}
                  <div
                    style={{
                      backgroundColor: request.status === 'paid' ? 'rgba(34, 197, 94, 0.18)' : theme.tagBg,
                      color: request.status === 'paid' ? '#22C55E' : theme.tagColor,
                      border: `1px solid ${request.status === 'paid' ? '#22C55E' : theme.tagBorder}`,
                      boxShadow: `0 0 12px ${request.status === 'paid' ? 'rgba(34, 197, 94, 0.3)' : theme.glowColor}`,
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '1.5px',
                      padding: '0 12px',
                      height: '26px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span>{request.status === 'paid' ? 'SETTLED' : theme.name.toUpperCase()}</span>
                  </div>
                </div>

                {/* Hero Purpose Block */}
                <div
                  style={{
                    padding: '2px 24px 0px 24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.55)',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase'
                    }}
                  >
                    PURPOSE / TITLE
                  </span>

                  <h2
                    style={{
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      margin: '2px 0 0 0',
                      lineHeight: 1.3,
                      textTransform: 'uppercase'
                    }}
                  >
                    {request.title}
                  </h2>
                </div>

                {/* Amount Section with Improved Hierarchy */}
                <div
                  style={{
                    marginTop: '10px',
                    padding: '0 24px 0 24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* Amount Focus */}
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontSize: '64px',
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.0,
                      textShadow: `0 0 16px ${theme.glowColor}`
                    }}
                  >
                    {formatCurrency(request.totalAmount)}
                  </span>

                  {/* Date - Directly below amount */}
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '12px',
                      fontWeight: 500,
                      marginTop: '8px'
                    }}
                  >
                    {dateStr}
                  </span>

                  {/* Share Info / Subtitle Pill - Below date */}
                  {request.requestType === 'split' && (
                    <div
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${theme.cardBorder}`,
                        padding: '5px 14px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px'
                      }}
                    >
                      <Users className="w-3.5 h-3.5" style={{ color: theme.primaryAccent }} />
                      <span style={{ fontSize: '11px', fontWeight: 800, color: theme.highlightText }}>
                        👥 {formatCurrency(request.perPersonAmount || Math.round(request.totalAmount / participantCount))} per person • {participantCount} Participants
                      </span>
                    </div>
                  )}
                </div>

                {/* Perforated Ticket Divider */}
                <div
                  style={{
                    position: 'relative',
                    height: '20px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '14px 0'
                  }}
                >
                  {/* Left Cutout */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-9px',
                      top: '1px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#0B0806',
                      borderRight: `1px solid ${theme.borderColor}`,
                      boxShadow: 'inset -2px 0 6px rgba(0,0,0,0.5)',
                      zIndex: 3
                    }}
                  />

                  {/* Thinner, cleaner perforated line */}
                  <div
                    style={{
                      width: '100%',
                      height: '0px',
                      borderTop: `1px dashed ${theme.perforationColor}`,
                      margin: '0 24px',
                      opacity: 0.8
                    }}
                  />

                  {/* Right Cutout */}
                  <div
                    style={{
                      position: 'absolute',
                      right: '-9px',
                      top: '1px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#0B0806',
                      borderLeft: `1px solid ${theme.borderColor}`,
                      boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.5)',
                      zIndex: 3
                    }}
                  />
                </div>

                {/* Information Cards */}
                <div style={{ padding: '0px 20px 16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Payee Glass Card */}
                  <div
                    style={{
                      backgroundColor: theme.cardBg,
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: '18px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        backgroundColor: theme.tagBg,
                        border: `1px solid ${theme.borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.tagColor,
                        flexShrink: 0
                      }}
                    >
                      <UserIcon className="w-4.5 h-4.5" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '6px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
                        PAYEE / BENEFICIARY
                      </span>
                      <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word', display: 'block' }}>
                        {request.accountHolderName}
                      </span>
                    </div>
                  </div>

                  {/* UPI Glass Card with Theme Button */}
                  {(displayOption === 'all' || displayOption === 'upi') && (
                    <div
                      style={{
                        backgroundColor: theme.cardBg,
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${theme.cardBorder}`,
                        borderRadius: '18px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '4px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
                          UPI ID / VPA
                        </span>
                        <span style={{ color: theme.highlightText, fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}>
                          {request.upiId}
                        </span>
                      </div>

                      {/* Accent Copy Button */}
                      <button
                        onClick={copyUpi}
                        type="button"
                        style={{
                          backgroundColor: copiedUpi ? '#22C55E' : theme.primaryAccent,
                          color: theme.id === 'vip' ? '#110D09' : (theme.id === 'split' ? '#110D09' : '#FFFFFF'),
                          height: '30px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 900,
                          border: 'none',
                          cursor: 'pointer',
                          display: isGenerating ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          boxShadow: copiedUpi ? '0 0 10px rgba(34, 197, 94, 0.4)' : `0 0 10px ${theme.glowColor}`,
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>{copiedUpi ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                  )}

                  {/* Bank Details Card */}
                  {(displayOption === 'all' || displayOption === 'bank') && request.bankName && request.accountNumber && (
                    <div
                      style={{
                        backgroundColor: theme.cardBg,
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${theme.cardBorder}`,
                        borderRadius: '18px',
                        padding: '14px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '14px',
                          alignItems: 'baseline'
                        }}
                      >
                        <div>
                          <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
                            BANK
                          </span>
                          <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginTop: '3px', display: 'block' }}>
                            {request.bankName}
                          </span>
                        </div>

                        <div>
                          <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
                            ACCOUNT NUMBER
                          </span>
                          <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', marginTop: '3px', display: 'block' }}>
                            {request.accountNumber}
                          </span>
                        </div>
                      </div>

                      {request.ifscCode && (
                        <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block' }}>
                            IFSC CODE
                          </span>
                          <span style={{ color: theme.highlightText, fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', marginTop: '2px', display: 'block' }}>
                            {request.ifscCode}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Premium Participants Card for Split Requests */}
                  {request.requestType === 'split' && request.splitBreakdown && request.splitBreakdown.length > 0 && (
                    <div
                      style={{
                        backgroundColor: theme.cardBg,
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${theme.cardBorder}`,
                        borderRadius: '18px',
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                          Participants
                        </span>
                        <span style={{ fontSize: '11px', color: theme.highlightText, fontWeight: 700 }}>
                          {request.splitBreakdown.length} shares
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                        {request.splitBreakdown.map((person, idx) => {
                          const isSettled = person.status === 'settled';
                          const initial = person.name ? person.name.trim().charAt(0).toUpperCase() : `${idx + 1}`;
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '14px',
                                border: '1px solid rgba(255, 255, 255, 0.06)'
                              }}
                            >
                              {/* Left: Avatar + Name */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: theme.tagBg,
                                    border: `1px solid ${theme.borderColor}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: theme.tagColor,
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    flexShrink: 0
                                  }}
                                >
                                  {initial}
                                </div>
                                <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '13px' }}>
                                  {person.name}
                                </span>
                              </div>

                              {/* Right: Amount + Status Pill */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 800, color: theme.highlightText, fontSize: '13px' }}>
                                  {formatCurrency(person.amount)}
                                </span>
                                
                                {/* Status Badge */}
                                <div
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '9999px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    backgroundColor: isSettled ? 'rgba(34, 197, 94, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                                    color: isSettled ? '#22C55E' : '#F97316',
                                    border: `1px solid ${isSettled ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                                  }}
                                >
                                  <span>{isSettled ? '🟢' : '🟠'}</span>
                                  <span>{isSettled ? 'Settled' : 'Pending'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Note / Reference Section */}
                  {request.note && (
                    <div
                      style={{
                        backgroundColor: theme.cardBg,
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${theme.cardBorder}`,
                        borderRadius: '18px',
                        padding: '14px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        NOTE
                      </span>
                      <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', fontWeight: 400, margin: 0, lineHeight: 1.4 }}>
                        {request.note}
                      </p>
                    </div>
                  )}
                </div>

                {/* QR Section */}
                {(displayOption === 'all' || displayOption === 'upi') ? (
                  <>
                    {/* Perforated Divider 2 */}
                    <div
                      style={{
                        position: 'relative',
                        height: '20px',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '2px 0'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '-9px',
                          top: '1px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#0B0806',
                          borderRight: `1px solid ${theme.borderColor}`,
                          boxShadow: 'inset -2px 0 6px rgba(0,0,0,0.5)',
                          zIndex: 3
                        }}
                      />
                      <div
                        style={{
                          width: '100%',
                          height: '0px',
                          borderTop: `1px dashed ${theme.perforationColor}`,
                          margin: '0 24px',
                          opacity: 0.8
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          right: '-9px',
                          top: '1px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#0B0806',
                          borderLeft: `1px solid ${theme.borderColor}`,
                          boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.5)',
                          zIndex: 3
                        }}
                      />
                    </div>

                    <div style={{ padding: '16px 20px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-block', position: 'relative' }}>
                        {request.qrImageUrl ? (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '22px', border: `1px solid ${theme.borderColor}`, boxShadow: `0 0 28px ${theme.glowColor}` }}>
                            <img src={request.qrImageUrl} alt="UPI QR" style={{ width: '160px', height: '160px', objectFit: 'contain', display: 'block' }} />
                          </div>
                        ) : (
                          <CustomQRCode value={upiUrl} size={160} theme={theme} />
                        )}
                      </div>

                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', margin: 0 }}>
                        Scan with <span style={{ color: '#FFFFFF', fontWeight: 800 }}>Google Pay • PhonePe • Paytm • BHIM</span> or any UPI App
                      </p>

                      {/* Serial Tag & Issuance */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', fontFamily: 'monospace' }}>
                        <span>{passSerial}</span>
                        <span>•</span>
                        <span>ISSUED VIA FRENZO</span>
                      </div>

                      {/* Verified Footer with Shield aligned closer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center' }}>
                        <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                          Verified {theme.name} Pass
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Bank Only Mode Footer */
                  <div style={{ padding: '12px 20px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', fontFamily: 'monospace' }}>
                      <span>{passSerial}</span>
                      <span>•</span>
                      <span>ISSUED VIA FRENZO</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                        Verified Bank Payment Pass
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Bottom Action Controls */}
          <div className="flex flex-col gap-2 px-1">
            <div className="flex items-center gap-2">
              <button
                onClick={copyPaymentText}
                className="flex-1 py-3 px-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-white/10 shadow-lg"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" style={{ color: theme.primaryAccent }} />}
                <span>{copiedLink ? 'Text Copied!' : 'Copy Payment Details'}</span>
              </button>

              <button
                onClick={handleShare}
                disabled={isGenerating}
                className="flex-1 py-3 px-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-white/10 shadow-lg disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" style={{ color: theme.secondaryAccent }} />
                <span>{isGenerating ? 'Sharing...' : 'Share Pass'}</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="py-3 px-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center border border-white/10 shadow-lg disabled:opacity-50"
                title="Download Pass Image"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {request.status !== 'paid' && onMarkAsPaid && (
              <button
                onClick={handleMarkPaidClick}
                disabled={isMarkingPaid}
                className="w-full py-3 px-4 bg-[#22C55E] hover:bg-[#16A34A] text-black font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isMarkingPaid ? 'Updating...' : 'Mark as Settled / Paid'}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

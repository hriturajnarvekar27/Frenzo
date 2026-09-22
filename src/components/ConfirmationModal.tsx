import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-tech-card clay-card p-8 border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className={cn(
              "absolute top-0 left-0 w-full h-1",
              type === 'danger' ? "bg-tech-red" : type === 'warning' ? "bg-tech-orange" : "bg-tech-lime"
            )} />
            
            <div className="flex items-center justify-between mb-6">
              <div className={cn(
                "p-3 rounded-xl",
                type === 'danger' ? "bg-tech-red/10 text-tech-red" : type === 'warning' ? "bg-tech-orange/10 text-tech-orange" : "bg-tech-lime/10 text-tech-lime"
              )}>
                <AlertTriangle size={24} />
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-tech-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <h3 className="font-brand text-2xl text-tech-white mb-2 tracking-tighter">{title}</h3>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-relaxed mb-8">{message}</p>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-tech-gray text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-tech-white transition-all border border-white/5"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg",
                  type === 'danger' ? "bg-tech-red text-tech-white shadow-tech-red/20" : type === 'warning' ? "bg-tech-orange text-tech-black shadow-tech-orange/20" : "bg-tech-lime text-tech-black shadow-tech-lime/20"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

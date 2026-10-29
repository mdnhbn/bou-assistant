/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  QrCode,
  Smartphone,
} from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  accentColor: _accentColor = '#10b981'
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleLink = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsLinked(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c101a] border border-emerald-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-emerald-950/60 font-mono text-slate-200">
        {/* Header Bar matching Stonic video (04:00) */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-widest text-white">
                HERMES WHATSAPP BRIDGE
              </h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                LOCAL CONNECTOR PREVIEW · TODO
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 leading-relaxed flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              WhatsApp connector preview only. This form stays in this screen; no account is linked and no messages are sent. TODO: connect an approved messaging adapter.
            </p>
          </div>

          {/* Status Display */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isLinked ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400 animate-ping'}`} />
              <div>
                <span className="text-xs font-bold text-white block">
                  {isLinked ? 'DEMO LINK PREVIEW' : 'CONNECTOR NOT CONFIGURED'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isLinked ? 'Active Webhook • 24/7 Remote Listen' : 'Waiting for pairing confirmation'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLink}
              disabled={isVerifying}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              {isVerifying ? 'Verifying...' : 'Refresh'}
            </button>
          </div>

          {/* Phone Number Input Form */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              YOUR WHATSAPP NUMBER (WITH COUNTRY CODE)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+880 1700-000000"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
              />
              <button
                onClick={handleLink}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {isLinked ? 'Re-link' : 'Pair Device'}
              </button>
            </div>
          </div>

          {/* QR Code Graphic Simulation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-28 h-28 bg-white p-2 rounded-xl flex items-center justify-center">
              <QrCode className="w-24 h-24 text-slate-950" />
            </div>
            <p className="text-[10px] text-slate-400">
              Scan with WhatsApp on phone: Settings &gt; Linked Devices
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

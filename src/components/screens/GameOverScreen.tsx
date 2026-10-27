import React from 'react';
import { useAppStore, dispatch, calculateScore, getHighScore } from '../../store/gameStore';
import { formatCurrency, formatRps, formatSecondsTime } from '../../constants/gameConfig';
import { audio } from '../../audio/proceduralAudio';
import { Trophy, RefreshCw, Menu, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react';

export const GameOverScreen: React.FC = () => {
  const sim = useAppStore((s) => s.sim);
  const score = calculateScore(sim);
  const currentHighScore = getHighScore();
  const isNewHighScore = score > currentHighScore;

  const net = sim.economy.totalRevenueUsd - sim.economy.totalSpendUsd;
  const isMastered = sim.gameOverReason === 'mastered';
  const isAcquired = sim.gameOverReason === 'acquired';

  const handleNewCluster = () => {
    audio.playDeploy();
    dispatch({ type: 'startNewCluster', difficulty: sim.difficulty });
  };

  const handleMenu = () => {
    audio.playClick();
    dispatch({ type: 'exit' });
  };

  return (
    <div className="ct-app__center ct-app__center--doc">
      <article className={`ct-doc ct-over ${isMastered || isAcquired ? 'ct-over--success' : ''}`}>
        {/* Header */}
        <div className="ct-doc__head">
          <div>
            <h1 className="ct-doc__title" id="over-title">
              {isMastered ? (
                <>
                  <CheckCircle2 size={22} className="inline mr-2 text-green-400" />
                  Operations Mastered
                </>
              ) : isAcquired ? (
                <>
                  <TrendingUp size={22} className="inline mr-2 text-cyan-400" />
                  Acquisition Completed
                </>
              ) : (
                <>
                  <AlertOctagon size={22} className="inline mr-2 text-red-400" />
                  Account Suspended
                </>
              )}
            </h1>
            <p className="ct-doc__subtitle">
              {isMastered
                ? `Simulation target achieved. Maintained operations across ${sim.economy.billsPaid} billing cycles.`
                : isAcquired
                ? `Operating balance reached ${formatCurrency(sim.economy.cashUsd)}. Infrastructure acquisition target met.`
                : `Simulation ended at ${formatSecondsTime(sim.elapsedMs / 1000)}. Resources decommissioned due to unpaid balance.`}
            </p>
          </div>
        </div>

        {/* Post-Mortem Body */}
        <div className="ct-doc__body">
          {/* Status Alert Banner */}
          <div className={`ct-alert ${isMastered || isAcquired ? 'ct-alert--success' : 'ct-alert--danger'}`}>
            {sim.gameOverReason === 'mastered'
              ? 'Successfully fulfilled all reliability targets.'
              : sim.gameOverReason === 'acquired'
              ? 'Cluster acquired with positive operating margin.'
              : sim.gameOverReason || 'Monthly cloud invoice remained unsettled.'}
          </div>

          {/* Operational Metrics */}
          <section className="ct-section">
            <h2 className="ct-section__title">Operational Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
              <div className="p-3 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <span className="text-slate-400 block mb-1">Total Revenue</span>
                <span className="text-sm font-bold text-green-400">{formatCurrency(sim.economy.totalRevenueUsd)}</span>
              </div>
              <div className="p-3 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <span className="text-slate-400 block mb-1">Total Costs</span>
                <span className="text-sm font-bold text-slate-200">{formatCurrency(sim.economy.totalSpendUsd)}</span>
              </div>
              <div className="p-3 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <span className="text-slate-400 block mb-1">Net Margin</span>
                <span className="text-sm font-bold" style={{ color: net >= 0 ? 'var(--ct-green)' : 'var(--ct-red)' }}>
                  {formatCurrency(net)}
                </span>
              </div>
              <div className="p-3 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <span className="text-slate-400 block mb-1">Invoices Settled</span>
                <span className="text-sm font-bold text-slate-200">{sim.economy.billsPaid}</span>
              </div>
              <div className="p-3 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <span className="text-slate-400 block mb-1">Peak Throughput</span>
                <span className="text-sm font-bold text-cyan-400">{formatRps(sim.peakServedRps)}</span>
              </div>
              <div className="p-3 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <span className="text-slate-400 block mb-1">Active Instances</span>
                <span className="text-sm font-bold text-slate-200">{sim.nodeOrder.length}</span>
              </div>
            </div>

            <div className="p-3 bg-[var(--ct-surface-2)] rounded border border-yellow-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-yellow-400" />
                <span className="font-bold text-yellow-300">Final SRE Score:</span>
                <span className="text-lg font-bold text-yellow-400 font-mono">{score}</span>
              </div>
              {isNewHighScore && (
                <span className="text-xs font-bold text-green-400 uppercase tracking-wide">
                  New Personal Record
                </span>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="ct-doc__foot">
          <button type="button" className="ct-btn ct-btn--primary" onClick={handleNewCluster}>
            <RefreshCw size={16} />
            <span>Start New Cluster</span>
          </button>
          <button type="button" className="ct-btn" onClick={handleMenu}>
            <Menu size={16} />
            <span>Main Menu</span>
          </button>
        </div>
      </article>
    </div>
  );
};

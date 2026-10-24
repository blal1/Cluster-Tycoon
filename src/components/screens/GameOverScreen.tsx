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
                  <CheckCircle2 size={24} className="inline mr-2 text-green-400" />
                  Cluster Mastered!
                </>
              ) : isAcquired ? (
                <>
                  <TrendingUp size={24} className="inline mr-2 text-cyan-400" />
                  Cluster Acquired!
                </>
              ) : (
                <>
                  <AlertOctagon size={24} className="inline mr-2 text-red-400" />
                  Cluster Suspended
                </>
              )}
            </h1>
            <p className="ct-doc__subtitle">
              {isMastered
                ? `Outstanding performance! Survived ${sim.economy.billsPaid} consecutive cloud billing cycles with zero outages.`
                : isAcquired
                ? `Reached $${Math.round(sim.economy.cashUsd).toLocaleString()} cash on hand! A major tech titan acquired your infrastructure.`
                : `Account suspended at ${formatSecondsTime(sim.elapsedMs / 1000)} elapsed time. Infrastructure shutdown order executed.`}
            </p>
          </div>
        </div>

        {/* Post-Mortem Body */}
        <div className="ct-doc__body">
          {/* Status Alert Banner */}
          <div className={`ct-alert ${isMastered || isAcquired ? 'ct-alert--success' : 'ct-alert--danger'}`}>
            {sim.gameOverReason || 'Cloud invoice remained unsettled. All resources decommissioned.'}
          </div>

          {/* Post-Mortem Summary */}
          <section className="ct-section">
            <h2 className="ct-section__title">Final Post-Mortem Telemetry</h2>
            <ul className="ct-list">
              <li>
                <strong>Lifetime Revenue:</strong> {formatCurrency(sim.economy.totalRevenueUsd)}
              </li>
              <li>
                <strong>Total Infrastructure Costs:</strong> {formatCurrency(sim.economy.totalSpendUsd)}
              </li>
              <li>
                <strong>Net Profit / Loss:</strong>{' '}
                <span style={{ color: net >= 0 ? 'var(--ct-green)' : 'var(--ct-red)' }}>
                  {formatCurrency(net)}
                </span>
              </li>
              <li>
                <strong>Cloud Invoices Settled:</strong> {sim.economy.billsPaid}
              </li>
              <li>
                <strong>Nodes Deployed:</strong> {sim.nodeOrder.length} instances
              </li>
              <li>
                <strong>Thermal Meltdowns Occurred:</strong> {sim.meltdownCount}
              </li>
              <li>
                <strong>Peak Request Throughput:</strong> {formatRps(sim.peakServedRps)}
              </li>
              <li className="text-lg font-bold text-yellow-300">
                <Trophy size={18} className="inline mr-1" />
                <strong>Final SRE Score:</strong> {score}
                {isNewHighScore && <span className="ml-2 text-green-400">(NEW ALL-TIME RECORD!)</span>}
              </li>
            </ul>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="ct-doc__foot">
          <button type="button" className="ct-btn ct-btn--primary" onClick={handleNewCluster}>
            <RefreshCw size={16} />
            <span>Provision New Cluster</span>
          </button>
          <button type="button" className="ct-btn" onClick={handleMenu}>
            <Menu size={16} />
            <span>Return to Main Menu</span>
          </button>
        </div>
      </article>
    </div>
  );
};

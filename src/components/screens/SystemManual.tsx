import React from 'react';
import { useAppStore, dispatch } from '../../store/gameStore';
import { audio } from '../../audio/proceduralAudio';
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  Shield,
  Zap,
  DollarSign,
  Layers,
  AlertTriangle,
  Server,
  Keyboard,
} from 'lucide-react';

export const SystemManual: React.FC = () => {
  const returnScreen = useAppStore((s) => s.returnScreen);

  const handleBack = () => {
    audio.playClick();
    dispatch({ type: 'screen', screen: returnScreen });
  };

  return (
    <div className="ct-app__center ct-app__center--doc">
      <article className="ct-doc" aria-labelledby="manual-title">
        {/* Header */}
        <div className="ct-doc__head">
          <div>
            <h1 className="ct-doc__title" id="manual-title">
              Operations & Architecture Guide
            </h1>
            <p className="ct-doc__subtitle">
              Reference guide for traffic routing, hardware capacity, financial solvency, and disaster mitigation.
            </p>
          </div>
          <button type="button" className="ct-btn" onClick={handleBack}>
            <ArrowLeft size={16} />
            <span>Return</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="ct-doc__body">
          {/* Section 1: Overview */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <Zap size={15} className="inline mr-1 text-cyan-400" />
              1. Traffic Routing & Flow
            </h2>
            <p className="ct-section__body">
              Traffic enters through the <strong>Entry Point (Ingress)</strong> and flows downstream along connected wire links.
            </p>
            <p className="ct-section__body">
              To balance workload, connect the Entry Point to an <strong>Application Load Balancer (ALB)</strong>,
              which distributes incoming requests evenly across connected <strong>App Servers</strong>.
              Servers forward state queries to <strong>Managed Databases (RDS)</strong> and static assets to <strong>Object Storage (S3)</strong>.
              Placing an <strong>In-Memory Cache (Redis)</strong> in front of databases reduces database query pressure by up to 60%.
            </p>
          </section>

          {/* Section 2: Node Classes */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <Layers size={15} className="inline mr-1 text-cyan-400" />
              2. Infrastructure Components
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-[var(--ct-line)] mb-2">
                <thead>
                  <tr className="bg-[var(--ct-surface-2)] text-[var(--ct-text-strong)] border-b border-[var(--ct-line)]">
                    <th className="p-2 font-mono">Type</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Hourly Cost</th>
                    <th className="p-2">Base Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ct-line)]">
                  <tr>
                    <td className="p-2 font-mono text-cyan-400">ENTRY</td>
                    <td className="p-2">Public ingress point generating inbound user demand.</td>
                    <td className="p-2">$0.00/hr</td>
                    <td className="p-2">Infinite</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-purple-400">LB</td>
                    <td className="p-2">Load balancer distributing requests to downstream targets.</td>
                    <td className="p-2">$0.92/hr</td>
                    <td className="p-2">900 RPS</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-green-400">SRV</td>
                    <td className="p-2">App compute worker. CPU overload causes thermal shutdown.</td>
                    <td className="p-2">$0.41/hr</td>
                    <td className="p-2">220 RPS</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-yellow-400">MEM</td>
                    <td className="p-2">In-memory Redis cache absorbing repetitive database reads.</td>
                    <td className="p-2">$0.35/hr</td>
                    <td className="p-2">800 RPS</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-amber-400">DB</td>
                    <td className="p-2">Durable SQL database with persistent disk storage.</td>
                    <td className="p-2">$1.35/hr</td>
                    <td className="p-2">340 RPS</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-violet-400">S3</td>
                    <td className="p-2">Static object bucket. Billed by stored gigabytes.</td>
                    <td className="p-2">$0.021/hr</td>
                    <td className="p-2">1,200 RPS</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Scaling Strategies */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <Cpu size={15} className="inline mr-1 text-cyan-400" />
              3. Capacity & Scaling
            </h2>
            <p className="ct-section__body">
              <strong>Horizontal Scaling (Scale Out):</strong> Adding server instances behind a load balancer.
              Select any load balancer or server and click <em>"Add Server Behind"</em> to place and wire a new worker.
            </p>
            <p className="ct-section__body">
              <strong>Vertical Scaling (Scale Up):</strong> Upgrading CPU cores, RAM, and disk on an existing node.
              Open the Node Inspector on the right panel and upgrade components to increase individual throughput.
            </p>
          </section>

          {/* Section 4: Incident Response */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <AlertTriangle size={15} className="inline mr-1 text-cyan-400" />
              4. Incidents & Reliability
            </h2>
            <p className="ct-section__body">
              <strong>Thermal Meltdowns:</strong> When an instance exceeds 100% CPU utilization, it enters a 20-second emergency cooling cycle, shedding traffic and dropping requests. Scale up capacity or add workers to prevent saturation.
            </p>
            <p className="ct-section__body">
              <strong>Power Fluctuations:</strong> Datacenter PDU voltage drops cause affected nodes to cycle offline intermittently every 2–3s. Mitigate via the Incident Console (<kbd>Alt + I</kbd>) by deploying a redundant UPS power rail.
            </p>
            <p className="ct-section__body">
              <strong>DDoS Spikes:</strong> Volumetric surges spike inbound traffic up to 4.5x. Enable AWS Shield on the Entry Point or execute emergency scrubbing to protect downstream instances.
            </p>
            <p className="ct-section__body">
              <strong>Memory Leaks:</strong> Unbounded worker allocations gradually consume RAM. Recycle processes before out-of-memory errors occur.
            </p>
          </section>

          {/* Section 5: The Billing Cycle */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <DollarSign size={15} className="inline mr-1 text-cyan-400" />
              5. Financial Model & Solvency
            </h2>
            <p className="ct-section__body">
              Revenue is earned only on <strong>successfully served requests</strong> ($0.0042 per request).
              Dropped requests yield zero revenue and risk customer churn.
            </p>
            <p className="ct-section__body">
              Every 180 seconds, cloud infrastructure usage is billed. If available cash is insufficient to cover the statement balance, the account is suspended and the simulation concludes.
            </p>
          </section>

          {/* Section 6: Shortcuts */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <Keyboard size={15} className="inline mr-1 text-cyan-400" />
              6. Key Shortcuts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>Space</kbd> or <kbd>/</kbd> — Command Palette
              </div>
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>Alt + I</kbd> — Chaos & Incident Console
              </div>
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>Alt + A</kbd> — Accessible Cluster Matrix
              </div>
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>F</kbd> — Frame & Center Canvas
              </div>
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>P</kbd> — Pause / Resume Simulation
              </div>
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>1</kbd>, <kbd>2</kbd>, <kbd>4</kbd> — Simulation Speed
              </div>
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>Alt + Click</kbd> on link — Cut wire link
              </div>
              <div className="p-2 bg-[var(--ct-surface-2)] rounded border border-[var(--ct-line)]">
                <kbd>?</kbd> — Full Hotkeys Reference
              </div>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
};

import React from 'react';
import { useAppStore, dispatch } from '../../store/gameStore';
import { audio } from '../../audio/proceduralAudio';
import { ArrowLeft, BookOpen, Cpu, Shield, Zap, DollarSign, Layers } from 'lucide-react';

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
              <BookOpen size={24} className="inline mr-2 text-cyan-400" />
              Infrastructure Operations Manual
            </h1>
            <p className="ct-doc__subtitle">
              SRE & Cloud Administrator Field Protocol. Required reading before managing production.
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
              <Zap size={15} className="inline mr-1" />
              1. System Architecture & Traffic Flow
            </h2>
            <p className="ct-section__body">
              Your service accepts live HTTP requests from the worldwide web. Traffic enters at an
              <strong> Entry Point (Ingress)</strong> and travels along connected wires to downstream
              infrastructure.
            </p>
            <p className="ct-section__body">
              To handle high traffic, wire the Entry Point to an <strong>Application Load Balancer (ALB)</strong>,
              which distributes requests equally among multiple downstream <strong>App Servers</strong>.
              Servers forward durable state to <strong>Managed Databases (RDS)</strong> and static media
              to <strong>Object Storage (S3)</strong>. Adding an <strong>In-Memory Cache (Redis)</strong> absorbs
              frequent read traffic and shields your database.
            </p>
          </section>

          {/* Section 2: Node Classes */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <Layers size={15} className="inline mr-1" />
              2. Infrastructure Modules
            </h2>
            <ul className="ct-list">
              <li>
                <span className="ct-mono">ENTRY</span> <strong>Entry Point:</strong> Generates internet demand based on the diurnal traffic curve. Costs $0/hr and cannot be upgraded.
              </li>
              <li>
                <span className="ct-mono">LB</span> <strong>Load Balancer:</strong> Distributes inbound request volume evenly across all connected downstream nodes. Saturated load balancers become traffic bottlenecks.
              </li>
              <li>
                <span className="ct-mono">SRV</span> <strong>App Server (EC2):</strong> Executes application logic. Pushing CPU beyond 100% triggers a thermal meltdown!
              </li>
              <li>
                <span className="ct-mono">MEM</span> <strong>In-Memory Cache (Redis):</strong> Blazing fast in-memory key-value store. Absorbs repetitive reads and reduces database load.
              </li>
              <li>
                <span className="ct-mono">DB</span> <strong>Managed Database:</strong> Persistent relational storage. Requires adequate RAM headroom. Heavy write volume continuously grows disk utilization.
              </li>
              <li>
                <span className="ct-mono">S3</span> <strong>Object Storage:</strong> Durable bucket for media files and snapshots. Billed per GB stored per billing cycle.
              </li>
            </ul>
          </section>

          {/* Section 3: Scaling Strategies */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <Cpu size={15} className="inline mr-1" />
              3. Horizontal vs Vertical Scaling
            </h2>
            <p className="ct-section__body">
              <strong>Horizontal Scaling (Scale Out):</strong> Deploying additional server nodes behind a load balancer. Select any server or load balancer and click <em>"Add Server Behind"</em> to immediately instantiate and link another worker.
            </p>
            <p className="ct-section__body">
              <strong>Vertical Scaling (Scale Up):</strong> Upgrading an existing instance with higher core counts, larger RAM, and greater RPS capacity. Click <em>"Scale Up"</em> in the Node Inspector to boost hardware specifications without rewiring.
            </p>
          </section>

          {/* Section 4: Incident Response */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <Shield size={15} className="inline mr-1" />
              4. Incidents & Reliability Engineering
            </h2>
            <p className="ct-section__body">
              <strong>Thermal Meltdowns:</strong> When a node's CPU utilization hits 100%, its thermal threshold is breached. The node enters a 20-second emergency cooldown phase where it sheds all traffic (dropping requests). Ensure adequate capacity to prevent cascade failures.
            </p>
            <p className="ct-section__body">
              <strong>Layer-7 DDoS:</strong> Malicious botnets will periodically flood your ingress. Enable <em>DDoS Shield</em> on the Entry Point to filter hostile traffic.
            </p>
            <p className="ct-section__body">
              <strong>Storage Threshold:</strong> S3 buckets generate warnings at 80% quota and drop writes at 95%. Scale up storage capacity before the quota is exhausted.
            </p>
          </section>

          {/* Section 5: The Billing Cycle */}
          <section className="ct-section">
            <h2 className="ct-section__title">
              <DollarSign size={15} className="inline mr-1" />
              5. Cloud Billing & Solvency
            </h2>
            <p className="ct-section__body">
              Every 180 seconds, Amazon Web Services issues an itemized infrastructure invoice for your compute hours, load balancers, database IOPS, and storage retention.
            </p>
            <p className="ct-section__body">
              You earn revenue only on <strong>successfully served requests</strong> ($0.0042 per RPS). Dropped requests generate zero revenue. If your cash on hand is insufficient to settle the invoice, your cloud provider account will be suspended and the cluster terminated!
            </p>
          </section>

          {/* Section 6: Shortcuts */}
          <section className="ct-section">
            <h2 className="ct-section__title">6. Operator Shortcuts & Controls</h2>
            <ul className="ct-list">
              <li><kbd className="ct-mono">Space</kbd> or <kbd className="ct-mono">/</kbd>: Opens the quick Command Palette.</li>
              <li><kbd className="ct-mono">F</kbd>: Automatically frame and fit all nodes into viewport.</li>
              <li><kbd className="ct-mono">Alt + Click</kbd> or <kbd className="ct-mono">Shift + Click</kbd> on a wire: Sever/disconnect connection link.</li>
              <li><kbd className="ct-mono">Delete</kbd> or <kbd className="ct-mono">Backspace</kbd>: Decommission selected node.</li>
              <li><kbd className="ct-mono">Arrow Keys</kbd>: Move selection between adjacent nodes.</li>
              <li><kbd className="ct-mono">Shift + Arrows</kbd>: Nudge selected node position by 40px grid increments.</li>
            </ul>
          </section>
        </div>
      </article>
    </div>
  );
};

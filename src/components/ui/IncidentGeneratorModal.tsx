import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, dispatch } from '../../store/gameStore';
import {
  INCIDENT_CATALOG,
  calculateResilienceMetrics,
} from '../../sim/incidentGenerator';
import {
  formatCurrency,
  formatSecondsTime,
  formatRps,
} from '../../constants/gameConfig';
import { audio } from '../../audio/proceduralAudio';
import { IncidentKind } from '../../types/game';
import {
  Zap,
  ShieldAlert,
  Flame,
  X,
  Play,
  RotateCcw,
  Activity,
  History,
  AlertTriangle,
  Radio,
  Cpu,
  Layers,
  CheckCircle2,
  Globe,
  PowerOff,
} from 'lucide-react';

interface IncidentGeneratorModalProps {
  open: boolean;
  onClose: () => void;
}

export const IncidentGeneratorModal: React.FC<IncidentGeneratorModalProps> = ({
  open,
  onClose,
}) => {
  const sim = useAppStore((s) => s.sim);
  const settings = useAppStore((s) => s.settings);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<'catalog' | 'active' | 'history'>('catalog');

  const resilience = calculateResilienceMetrics(sim);

  useEffect(() => {
    if (open) {
      audio.playSelect();
      audio.triggerVibrate(20);
      modalRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        audio.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeIncidents = sim.incidentOrder
    .map((id) => sim.incidents[id])
    .filter((inc) => !!inc);

  const handleInjectIncident = (kind: IncidentKind) => {
    dispatch({ type: 'triggerIncident', kind });
    setActiveTab('active');
  };

  const handleMitigate = (incidentId: string) => {
    dispatch({ type: 'mitigateIncident', incidentId });
  };

  const handleToggleChaos = () => {
    dispatch({ type: 'toggleChaosMode' });
  };

  const handleSetInterval = (seconds: number) => {
    audio.playClick();
    dispatch({ type: 'setChaosInterval', seconds });
  };

  return (
    <div
      className="ct-bill-scrim"
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 10, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-gen-title"
        tabIndex={-1}
        className="ct-incident-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          backgroundColor: '#0a0d14',
          border: '1px solid var(--ct-red)',
          boxShadow: '0 0 35px rgba(255, 59, 92, 0.25)',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'inherit',
          color: 'var(--ct-text)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 59, 92, 0.25)',
            backgroundColor: 'rgba(255, 59, 92, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 59, 92, 0.2)',
                color: 'var(--ct-red)',
              }}
            >
              <Flame size={18} />
            </span>
            <div>
              <h2
                id="incident-gen-title"
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--ct-red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Incident & Chaos Console</span>
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--ct-text-muted)',
                  marginTop: '2px',
                }}
              >
                Simulate infrastructure outages and verify failover and disaster recovery procedures.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ct-btn ct-btn--ghost ct-btn--sm"
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            aria-label="Close Incident Console"
            style={{ minWidth: 'auto', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Resilience Telemetry Readout Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ padding: '10px 14px', backgroundColor: '#0e121b' }}>
            <span style={{ fontSize: '10px', color: 'var(--ct-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Uptime SLA
            </span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: resilience.availabilityPercent >= 99 ? 'var(--ct-green)' : 'var(--ct-amber)' }}>
              {resilience.availabilityPercent.toFixed(1)}%
            </span>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: '#0e121b' }}>
            <span style={{ fontSize: '10px', color: 'var(--ct-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Resilience Score
            </span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ct-cyan)' }}>
              {resilience.resilienceScore}/100
            </span>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: '#0e121b' }}>
            <span style={{ fontSize: '10px', color: 'var(--ct-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Mean Time to Failure (MTBF)
            </span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ct-gold)' }}>
              {formatSecondsTime(resilience.mtbfSeconds)}
            </span>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: '#0e121b' }}>
            <span style={{ fontSize: '10px', color: 'var(--ct-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Active Incidents
            </span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: activeIncidents.length > 0 ? 'var(--ct-red)' : 'var(--ct-green)' }}>
              {activeIncidents.length}
            </span>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: '#0e121b', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--ct-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Automated Chaos
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={handleToggleChaos}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  border: '1px solid',
                  backgroundColor: sim.chaosMode ? 'rgba(255, 59, 92, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: sim.chaosMode ? 'var(--ct-red)' : 'var(--ct-border)',
                  color: sim.chaosMode ? 'var(--ct-red)' : 'var(--ct-text-muted)',
                }}
              >
                {sim.chaosMode ? 'Active' : 'Disabled'}
              </button>
              {sim.chaosMode && (
                <span style={{ fontSize: '11px', color: 'var(--ct-text-faint)' }}>
                  ({Math.max(0, Math.round(sim.nextChaosSec))}s)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          role="tablist"
          aria-label="Incident console navigation"
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#0c0f17',
            padding: '0 16px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'catalog' ? '2px solid var(--ct-red)' : '2px solid transparent',
              color: activeTab === 'catalog' ? 'var(--ct-red)' : 'var(--ct-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={14} />
            <span>Simulate Outages</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'active' ? '2px solid var(--ct-red)' : '2px solid transparent',
              color: activeTab === 'active' ? 'var(--ct-red)' : 'var(--ct-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} />
            <span>Active Incidents ({activeIncidents.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid var(--ct-red)' : '2px solid transparent',
              color: activeTab === 'history' ? 'var(--ct-red)' : 'var(--ct-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <History size={14} />
            <span>Audit History ({sim.incidentHistory?.length ?? 0})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {/* TAB 1: FAILURE INJECTION SANDBOX */}
          {activeTab === 'catalog' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--ct-text)' }}>
                    Outage Simulation Catalog
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--ct-text-muted)' }}>
                    Inject real-world operational failure modes to test cluster topology and failover.
                  </p>
                </div>

                {sim.chaosMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--ct-text-muted)' }}>Interval:</span>
                    {[30, 60, 90].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleSetInterval(sec)}
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          backgroundColor: sim.chaosIntervalSec === sec ? 'rgba(255, 59, 92, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid',
                          borderColor: sim.chaosIntervalSec === sec ? 'var(--ct-red)' : 'var(--ct-border)',
                          color: sim.chaosIntervalSec === sec ? '#fff' : 'var(--ct-text-muted)',
                        }}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
                {/* 1. POWER FLUCTUATION CARD */}
                <div
                  style={{
                    backgroundColor: '#111622',
                    border: '1px solid rgba(255, 170, 0, 0.35)',
                    borderRadius: '4px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--ct-amber)' }}>
                        <Zap size={16} />
                        <span>Power Fluctuation</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 170, 0, 0.2)',
                          color: 'var(--ct-amber)',
                          textTransform: 'uppercase',
                        }}
                      >
                        HIGH
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ct-text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      Datacenter PDU voltage drops cause affected rack nodes to cycle offline intermittently every 2–3 seconds, causing traffic drops.
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--ct-text-faint)', marginBottom: '12px' }}>
                      Remediation: Deploy Redundant UPS Power Rail ($160)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ct-btn ct-btn--amber ct-btn--sm"
                    onClick={() => handleInjectIncident('power_fluctuation')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Play size={13} />
                    <span>Simulate Power Fluctuation</span>
                  </button>
                </div>

                {/* 2. DDOS SPIKE CARD */}
                <div
                  style={{
                    backgroundColor: '#111622',
                    border: '1px solid rgba(255, 59, 92, 0.45)',
                    borderRadius: '4px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--ct-red)' }}>
                        <Radio size={16} />
                        <span>DDoS Spike</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 59, 92, 0.2)',
                          color: 'var(--ct-red)',
                          textTransform: 'uppercase',
                        }}
                      >
                        CRITICAL
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ct-text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      A volumetric botnet surge spikes ingress traffic by 4.5x, putting intense load on frontends and load balancers.
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--ct-text-faint)', marginBottom: '12px' }}>
                      Remediation: Engage AWS Shield Scrubbing ($220)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ct-btn ct-btn--red ct-btn--sm"
                    onClick={() => handleInjectIncident('ddos_spike')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Play size={13} />
                    <span>Simulate DDoS Surge</span>
                  </button>
                </div>

                {/* 3. MEMORY LEAK CARD */}
                <div
                  style={{
                    backgroundColor: '#111622',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '4px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--ct-gold)' }}>
                        <Cpu size={16} />
                        <span>Memory Leak</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 215, 0, 0.2)',
                          color: 'var(--ct-gold)',
                          textTransform: 'uppercase',
                        }}
                      >
                        MEDIUM
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ct-text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      Runaway worker allocations steadily exhaust instance RAM until the operating system terminates workers.
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--ct-text-faint)', marginBottom: '12px' }}>
                      Remediation: Recycle Application Process ($80)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ct-btn ct-btn--ghost ct-btn--sm"
                    onClick={() => handleInjectIncident('memory_leak')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Play size={13} />
                    <span>Simulate Memory Leak</span>
                  </button>
                </div>

                {/* 4. HARDWARE FAILURE CARD */}
                <div
                  style={{
                    backgroundColor: '#111622',
                    border: '1px solid rgba(255, 59, 92, 0.3)',
                    borderRadius: '4px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--ct-red)' }}>
                        <ShieldAlert size={16} />
                        <span>Node Outage</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 59, 92, 0.2)',
                          color: 'var(--ct-red)',
                          textTransform: 'uppercase',
                        }}
                      >
                        CRITICAL
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ct-text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      Kernel panic or hardware fault shuts down an active instance completely for maintenance.
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--ct-text-faint)', marginBottom: '12px' }}>
                      Remediation: Hot Standby Migration ($120)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ct-btn ct-btn--ghost ct-btn--sm"
                    onClick={() => handleInjectIncident('hardware_failure')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Play size={13} />
                    <span>Simulate Node Crash</span>
                  </button>
                </div>

                {/* 5. DISASTER RECOVERY DRILL: REGIONAL GRID BLACKOUT */}
                <div
                  style={{
                    backgroundColor: '#111622',
                    border: '1px solid rgba(255, 59, 92, 0.55)',
                    borderRadius: '4px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--ct-red)' }}>
                        <PowerOff size={16} />
                        <span>Regional Grid Blackout</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 59, 92, 0.2)',
                          color: 'var(--ct-red)',
                          textTransform: 'uppercase',
                        }}
                      >
                        DR DRILL
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ct-text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      Substation power transformer explosion knocks an entire cloud region offline. Ingress Geo-DNS failover must route traffic to surviving zones.
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--ct-text-faint)', marginBottom: '12px' }}>
                      Remediation: Emergency Diesel Generators & Geo-DNS Failover ($320)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ct-btn ct-btn--red ct-btn--sm"
                    onClick={() => handleInjectIncident('regional_blackout')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Play size={13} />
                    <span>Simulate Regional Blackout</span>
                  </button>
                </div>

                {/* 6. DISASTER RECOVERY DRILL: SUBSEA FIBER CUT */}
                <div
                  style={{
                    backgroundColor: '#111622',
                    border: '1px solid rgba(255, 170, 0, 0.5)',
                    borderRadius: '4px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: 'var(--ct-amber)' }}>
                        <Globe size={16} />
                        <span>Subsea Fiber Severance</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 170, 0, 0.2)',
                          color: 'var(--ct-amber)',
                          textTransform: 'uppercase',
                        }}
                      >
                        WAN FAULT
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ct-text-muted)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                      Maritime anchor drag cuts transatlantic subsea fiber cable. Cross-region WAN links fail over to emergency satellite with +350ms latency.
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--ct-text-faint)', marginBottom: '12px' }}>
                      Remediation: BGP Anycast WAN Reroute via Terrestrial Fiber ($240)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ct-btn ct-btn--amber ct-btn--sm"
                    onClick={() => handleInjectIncident('fiber_cut')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Play size={13} />
                    <span>Simulate Subsea Fiber Cut</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE OUTAGES */}
          {activeTab === 'active' && (
            <div>
              {activeIncidents.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    backgroundColor: 'rgba(0, 255, 170, 0.03)',
                    border: '1px dashed rgba(0, 255, 170, 0.2)',
                    borderRadius: '4px',
                  }}
                >
                  <CheckCircle2 size={36} style={{ color: 'var(--ct-green)', marginBottom: '10px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--ct-green)' }}>
                    All Systems Nominal
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--ct-text-muted)' }}>
                    No ongoing infrastructure failures or traffic surges detected. Switch to the Failure Injection Sandbox to test cluster failover.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeIncidents.map((inc) => {
                    const tmpl = INCIDENT_CATALOG[inc.kind] || INCIDENT_CATALOG.hardware_failure;
                    const canAffordMitigation = sim.economy.cashUsd >= (inc.mitigationCostUsd ?? 100);

                    return (
                      <div
                        key={inc.id}
                        style={{
                          backgroundColor: '#121724',
                          border: `1px solid ${tmpl.accentColor}`,
                          borderRadius: '4px',
                          padding: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>{tmpl.icon}</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: tmpl.accentColor }}>
                              {inc.title}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: tmpl.accentColor,
                              }}
                            >
                              {inc.severity.toUpperCase()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--ct-gold)', fontWeight: 700 }}>
                              {formatSecondsTime(inc.secondsRemaining)} remaining
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--ct-text)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                          {inc.detail}
                        </p>

                        {/* Power Fluctuation specific telemetry */}
                        {inc.kind === 'power_fluctuation' && (
                          <div
                            style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(255, 170, 0, 0.1)',
                              border: '1px solid rgba(255, 170, 0, 0.25)',
                              borderRadius: '3px',
                              fontSize: '12px',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>
                              <strong>Brownout State:</strong>{' '}
                              <span style={{ color: inc.flappingState === 'offline' ? 'var(--ct-red)' : 'var(--ct-amber)', fontWeight: 700 }}>
                                {inc.flappingState?.toUpperCase()} (cycling every ~2.5s)
                              </span>
                            </span>
                            <span style={{ color: 'var(--ct-text-muted)' }}>
                              Voltage Phase: FLAPPING
                            </span>
                          </div>
                        )}

                        {/* DDoS Spike specific telemetry */}
                        {inc.kind === 'ddos_spike' && (
                          <div
                            style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(255, 59, 92, 0.1)',
                              border: '1px solid rgba(255, 59, 92, 0.25)',
                              borderRadius: '3px',
                              fontSize: '12px',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>
                              <strong>Traffic Multiplier:</strong>{' '}
                              <span style={{ color: 'var(--ct-red)', fontWeight: 700 }}>
                                +{Math.round(((inc.trafficMultiplier ?? 4.5) - 1) * 100)}% Surge
                              </span>
                            </span>
                            <span style={{ color: 'var(--ct-text-muted)' }}>
                              Inbound Demand: {formatRps(sim.inboundRps)}
                            </span>
                          </div>
                        )}

                        {/* Regional Grid Blackout specific telemetry */}
                        {inc.kind === 'regional_blackout' && (
                          <div
                            style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(255, 59, 92, 0.12)',
                              border: '1px solid rgba(255, 59, 92, 0.3)',
                              borderRadius: '3px',
                              fontSize: '12px',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>
                              <strong>Target Region:</strong>{' '}
                              <span style={{ color: 'var(--ct-red)', fontWeight: 700, fontFamily: 'monospace' }}>
                                {inc.targetRegion ?? 'us-east-1'} [GRID COLLAPSED]
                              </span>
                            </span>
                            <span style={{ color: 'var(--ct-cyan)' }}>
                              Geo-DNS Status: {sim.activeFailover ? 'FAILOVER ACTIVE' : 'FAILOVER READY'}
                            </span>
                          </div>
                        )}

                        {/* Fiber Cut specific telemetry */}
                        {inc.kind === 'fiber_cut' && (
                          <div
                            style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(255, 170, 0, 0.12)',
                              border: '1px solid rgba(255, 170, 0, 0.3)',
                              borderRadius: '3px',
                              fontSize: '12px',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>
                              <strong>Severed Trunks:</strong>{' '}
                              <span style={{ color: 'var(--ct-amber)', fontWeight: 700 }}>
                                {inc.severedEdgeIds?.length ?? 1} Cross-Region Optical Links
                              </span>
                            </span>
                            <span style={{ color: 'var(--ct-red)' }}>
                              Penalty: +350ms Satellite Fallback
                            </span>
                          </div>
                        )}

                        {/* Mitigation SOP Execution Bar */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <div style={{ fontSize: '12px', color: 'var(--ct-text-muted)' }}>
                            <span>Recommended SOP Mitigation: </span>
                            <strong style={{ color: 'var(--ct-text)' }}>{inc.mitigationAction}</strong>
                          </div>

                          <button
                            type="button"
                            className="ct-btn ct-btn--green ct-btn--sm"
                            disabled={!canAffordMitigation}
                            onClick={() => handleMitigate(inc.id)}
                            title={
                              canAffordMitigation
                                ? `Execute ${inc.mitigationAction} (${formatCurrency(inc.mitigationCostUsd ?? 100)})`
                                : `Insufficient funds (${formatCurrency(sim.economy.cashUsd)} / ${formatCurrency(inc.mitigationCostUsd ?? 100)})`
                            }
                          >
                            <RotateCcw size={13} />
                            <span>
                              Execute Mitigation ({formatCurrency(inc.mitigationCostUsd ?? 100)})
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RCA HISTORY */}
          {activeTab === 'history' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                  Incident History & Root Cause Analysis (RCA)
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ct-text-muted)' }}>
                  Audit log of past resolved disruptions, durations, and tactical remediations.
                </p>
              </div>

              {(!sim.incidentHistory || sim.incidentHistory.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--ct-text-muted)', fontSize: '13px' }}>
                  No historical incidents recorded yet in this cluster lifecycle.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sim.incidentHistory.map((item, idx) => (
                    <div
                      key={item.id + '_' + idx}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#111520',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ct-text)' }}>
                            {item.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '2px',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--ct-text-muted)',
                            }}
                          >
                            {item.severity.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ct-text-muted)', marginTop: '2px' }}>
                          Remediation: <span style={{ color: 'var(--ct-cyan)' }}>{item.mitigationUsed}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--ct-text-muted)' }}>
                        <div>Duration: <strong>{item.durationSec}s</strong></div>
                        <div style={{ fontSize: '10px', color: 'var(--ct-text-faint)' }}>Resolved</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#0a0d14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--ct-text-muted)' }}>
            Cluster Cash: <strong style={{ color: 'var(--ct-gold)' }}>{formatCurrency(sim.economy.cashUsd)}</strong>
          </span>

          <button
            type="button"
            className="ct-btn ct-btn--ghost ct-btn--sm"
            onClick={() => {
              audio.playClick();
              onClose();
            }}
          >
            <span>Close Console [Esc]</span>
          </button>
        </div>
      </div>
    </div>
  );
};

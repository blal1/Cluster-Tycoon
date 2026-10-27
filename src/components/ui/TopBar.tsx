import React from 'react';
import { useAppStore, dispatch, saveCluster } from '../../store/gameStore';
import { MoneyReadout } from './MoneyReadout';
import { BuildTool, NodeKind } from '../../types/game';
import { audio } from '../../audio/proceduralAudio';
import {
  MousePointer,
  Link as LinkIcon,
  Server,
  Network,
  Database,
  HardDrive,
  Cpu,
  Pause,
  Play,
  FastForward,
  BookOpen,
  Settings,
  Save,
  Menu,
  Keyboard,
  Activity,
  Flame,
} from 'lucide-react';

interface ToolItem {
  tool: BuildTool;
  label: string;
  icon: React.ReactNode;
  cost?: number;
}

const TOOLS: ToolItem[] = [
  { tool: { kind: 'select' }, label: 'Select', icon: <MousePointer size={14} /> },
  { tool: { kind: 'connect' }, label: 'Link', icon: <LinkIcon size={14} /> },
  { tool: { kind: 'loadbalancer' }, label: 'LB', icon: <Network size={14} />, cost: 240 },
  { tool: { kind: 'server' }, label: 'Server', icon: <Server size={14} />, cost: 180 },
  { tool: { kind: 'cache' }, label: 'Cache', icon: <Cpu size={14} />, cost: 150 },
  { tool: { kind: 'database' }, label: 'DB', icon: <Database size={14} />, cost: 420 },
  { tool: { kind: 'storage' }, label: 'S3', icon: <HardDrive size={14} />, cost: 90 },
];

interface TopBarProps {
  onOpenShortcuts?: () => void;
  onOpenMatrix?: () => void;
  onOpenIncidentGen?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenShortcuts, onOpenMatrix, onOpenIncidentGen }) => {
  const sim = useAppStore((s) => s.sim);
  const settings = useAppStore((s) => s.settings);

  const earningsPerSec =
    sim.servedRps * sim.economy.revenuePerRpsUsd -
    Object.values(sim.nodes).reduce((acc, n) => {
      const tmpl = { entry: 0, loadbalancer: 0.92, server: 0.41, cache: 0.35, database: 1.35, storage: 0.021 }[n.kind] || 0;
      return acc + tmpl / 3600;
    }, 0);

  const handleToolClick = (tool: BuildTool) => {
    audio.playClick();
    dispatch({ type: 'setTool', tool });
  };

  const handleSaveClick = () => {
    const success = saveCluster();
    if (success) {
      audio.playSelect();
      audio.triggerVibrate(20);
    } else {
      audio.playDenied();
    }
  };

  const isToolActive = (item: ToolItem) => {
    if (item.tool.kind === 'select' || item.tool.kind === 'connect') {
      return sim.activeTool.kind === item.tool.kind;
    }
    return sim.activeTool.kind === item.tool.kind;
  };

  return (
    <header className="ct-game__topbar">
      <div className="ct-topbar__brand-wrap">
        <span className="ct-game__brand">Cluster Tycoon</span>
        <span className="ct-topbar__badge">v0.2.0</span>
      </div>

      <MoneyReadout
        cashUsd={sim.economy.cashUsd}
        ratePerSecond={earningsPerSec}
      />

      {/* Build Palette */}
      <div className="ct-game__tools" role="group" aria-label="Infrastructure build tools">
        {TOOLS.map((item) => {
          const active = isToolActive(item);
          return (
            <button
              key={item.tool.kind}
              type="button"
              className={`ct-tool ${active ? 'ct-tool--active' : ''}`}
              aria-pressed={active}
              onClick={() => handleToolClick(item.tool)}
              title={item.cost ? `${item.label} ($${item.cost})` : item.label}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.cost && <span className="ct-tool__cost">${item.cost}</span>}
            </button>
          );
        })}
      </div>

      <div className="ct-game__spacer" />

      {/* Speed Controls */}
      <div className="ct-game__tools" role="group" aria-label="Simulation speed">
        <button
          type="button"
          className={`ct-tool ${sim.speed === 0 ? 'ct-tool--active' : ''}`}
          onClick={() => dispatch({ type: 'togglePause' })}
          title={sim.speed === 0 ? 'Resume simulation' : 'Pause simulation'}
        >
          {sim.speed === 0 ? <Play size={14} /> : <Pause size={14} />}
          <span>{sim.speed === 0 ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          type="button"
          className={`ct-tool ${sim.speed === 1 ? 'ct-tool--active' : ''}`}
          onClick={() => dispatch({ type: 'setSpeed', speed: 1 })}
          title="Normal speed (1x)"
        >
          1x
        </button>

        <button
          type="button"
          className={`ct-tool ${sim.speed === 2 ? 'ct-tool--active' : ''}`}
          onClick={() => dispatch({ type: 'setSpeed', speed: 2 })}
          title="Fast forward (2x)"
        >
          <FastForward size={14} />
          <span>2x</span>
        </button>

        <button
          type="button"
          className={`ct-tool ${sim.speed === 4 ? 'ct-tool--active' : ''}`}
          onClick={() => dispatch({ type: 'setSpeed', speed: 4 })}
          title="Hyper speed (4x)"
        >
          4x
        </button>
      </div>

      {/* Session Management */}
      <div className="ct-game__tools" role="group" aria-label="Navigation and system options">
        {onOpenIncidentGen && (
          <button
            type="button"
            className={`ct-tool ${sim.incidentOrder.length > 0 ? 'text-red-400 font-bold animate-pulse' : ''}`}
            onClick={() => {
              audio.playClick();
              onOpenIncidentGen();
            }}
            title="Incidents & Chaos Console (Alt + I)"
            aria-label={`Incidents & Chaos Console (${sim.incidentOrder.length} active outages)`}
          >
            <Flame size={14} className={sim.incidentOrder.length > 0 ? 'text-red-500' : 'text-orange-400'} />
            <span>Incidents{sim.incidentOrder.length > 0 ? ` (${sim.incidentOrder.length})` : ''}</span>
          </button>
        )}

        {onOpenMatrix && (
          <button
            type="button"
            className="ct-tool"
            onClick={() => {
              audio.playClick();
              onOpenMatrix();
            }}
            title="Cluster Topology Matrix (Alt + A)"
            aria-label="Cluster Topology Matrix (Alt + A)"
          >
            <Activity size={14} className="text-cyan-400" />
            <span>Matrix</span>
          </button>
        )}

        {onOpenShortcuts && (
          <button
            type="button"
            className="ct-tool"
            onClick={() => {
              audio.playClick();
              onOpenShortcuts();
            }}
            title="Keyboard shortcuts (Shift + ?)"
          >
            <Keyboard size={14} />
            <span>Shortcuts</span>
          </button>
        )}

        <button
          type="button"
          className="ct-tool"
          onClick={() => {
            audio.playClick();
            dispatch({ type: 'openManual' });
          }}
          title="System manual"
        >
          <BookOpen size={14} />
          <span>Manual</span>
        </button>

        <button
          type="button"
          className="ct-tool"
          onClick={() => {
            audio.playClick();
            dispatch({ type: 'openSettings' });
          }}
          title="Audio & display settings"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>

        <button
          type="button"
          className="ct-tool"
          onClick={handleSaveClick}
          title="Save cluster snapshot"
        >
          <Save size={14} />
          <span>Save</span>
        </button>

        <button
          type="button"
          className="ct-tool"
          onClick={() => {
            audio.playClick();
            dispatch({ type: 'screen', screen: 'menu' });
          }}
          title="Return to main menu"
        >
          <Menu size={14} />
          <span>Menu</span>
        </button>
      </div>
    </header>
  );
};

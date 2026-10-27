import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore, dispatch, saveCluster } from '../../store/gameStore';
import {
  NODE_TEMPLATES,
  formatCurrency,
  getCpuUpgradeCost,
  getRamUpgradeCost,
  MAX_HARDWARE_TIER,
} from '../../constants/gameConfig';
import { audio } from '../../audio/proceduralAudio';
import {
  Search,
  MousePointer,
  Link,
  Server,
  Network,
  Database,
  HardDrive,
  Cpu,
  Layers,
  Pause,
  Play,
  ArrowUpCircle,
  PlusCircle,
  Trash2,
  BookOpen,
  Settings,
  Save,
  Menu,
  Flame,
  Zap,
  Radio,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  hint?: string;
  icon: React.ReactNode;
  keywords: string[];
  disabled?: boolean;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenIncidentGen?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onOpenIncidentGen }) => {
  const sim = useAppStore((s) => s.sim);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedNode = sim.selectedNodeId ? sim.nodes[sim.selectedNodeId] : null;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      {
        id: 'tool:select',
        title: 'Tool: Select & Move',
        hint: 'Drag nodes or pan canvas',
        icon: <MousePointer size={15} />,
        keywords: ['select', 'pointer', 'move'],
        action: () => dispatch({ type: 'setTool', tool: { kind: 'select' } }),
      },
      {
        id: 'tool:connect',
        title: 'Tool: Wire / Link',
        hint: 'Connect nodes with traffic pipes',
        icon: <Link size={15} />,
        keywords: ['link', 'connect', 'wire', 'edge', 'pipe'],
        action: () => dispatch({ type: 'setTool', tool: { kind: 'connect' } }),
      },
      {
        id: 'tool:server',
        title: 'Deploy App Server',
        hint: `$${NODE_TEMPLATES.server.costUsd}`,
        icon: <Server size={15} />,
        keywords: ['server', 'srv', 'ec2', 'node', 'app'],
        action: () => dispatch({ type: 'setTool', tool: { kind: 'server' } }),
      },
      {
        id: 'tool:loadbalancer',
        title: 'Deploy Load Balancer',
        hint: `$${NODE_TEMPLATES.loadbalancer.costUsd}`,
        icon: <Network size={15} />,
        keywords: ['loadbalancer', 'lb', 'alb', 'distribute'],
        action: () => dispatch({ type: 'setTool', tool: { kind: 'loadbalancer' } }),
      },
      {
        id: 'tool:cache',
        title: 'Deploy In-Memory Cache (Redis)',
        hint: `$${NODE_TEMPLATES.cache.costUsd}`,
        icon: <Cpu size={15} />,
        keywords: ['cache', 'redis', 'memcached', 'speed'],
        action: () => dispatch({ type: 'setTool', tool: { kind: 'cache' } }),
      },
      {
        id: 'tool:database',
        title: 'Deploy Managed Database (RDS)',
        hint: `$${NODE_TEMPLATES.database.costUsd}`,
        icon: <Database size={15} />,
        keywords: ['database', 'db', 'rds', 'sql', 'storage'],
        action: () => dispatch({ type: 'setTool', tool: { kind: 'database' } }),
      },
      {
        id: 'tool:storage',
        title: 'Deploy Object Storage (S3)',
        hint: `$${NODE_TEMPLATES.storage.costUsd}`,
        icon: <HardDrive size={15} />,
        keywords: ['storage', 's3', 'bucket', 'blob'],
        action: () => dispatch({ type: 'setTool', tool: { kind: 'storage' } }),
      },
      {
        id: 'sim:pause',
        title: sim.speed === 0 ? 'Resume Simulation' : 'Pause Simulation',
        hint: sim.speed === 0 ? 'Start ticking' : 'Hold time',
        icon: sim.speed === 0 ? <Play size={15} /> : <Pause size={15} />,
        keywords: ['pause', 'resume', 'toggle', 'stop'],
        action: () => dispatch({ type: 'togglePause' }),
      },
      {
        id: 'sim:fast',
        title: 'Simulation Speed: 2x Fast-Forward',
        hint: 'Double simulation frequency',
        icon: <Play size={15} />,
        keywords: ['speed', '2x', 'fast', 'forward'],
        action: () => dispatch({ type: 'setSpeed', speed: 2 }),
      },
      {
        id: 'sim:hyper',
        title: 'Simulation Speed: 4x Hyper-Drive',
        hint: 'Quadruple speed',
        icon: <Play size={15} />,
        keywords: ['speed', '4x', 'hyper', 'turbo'],
        action: () => dispatch({ type: 'setSpeed', speed: 4 }),
      },
      {
        id: 'session:save',
        title: 'Save Cluster Snapshot',
        hint: 'Store to local device',
        icon: <Save size={15} />,
        keywords: ['save', 'store', 'backup'],
        action: () => {
          saveCluster();
        },
      },
      {
        id: 'session:manual',
        title: 'Open System Manual',
        hint: 'View sysadmin handbook',
        icon: <BookOpen size={15} />,
        keywords: ['manual', 'tutorial', 'help', 'docs'],
        action: () => dispatch({ type: 'openManual' }),
      },
      {
        id: 'session:settings',
        title: 'Settings & Audio Controls',
        hint: 'Procedural audio volume and sliders',
        icon: <Settings size={15} />,
        keywords: ['settings', 'audio', 'sound', 'volume', 'options'],
        action: () => dispatch({ type: 'openSettings' }),
      },
      {
        id: 'session:menu',
        title: 'Exit to Main Menu',
        hint: 'Close simulation',
        icon: <Menu size={15} />,
        keywords: ['menu', 'exit', 'quit'],
        action: () => dispatch({ type: 'screen', screen: 'menu' }),
      },
      {
        id: 'chaos:open',
        title: 'Chaos: Open Incident Generator Console',
        hint: 'Disaster simulation & failover tests (Alt + I)',
        icon: <Flame size={15} className="text-red-400" />,
        keywords: ['chaos', 'incident', 'generator', 'outage', 'failure', 'test', 'resilience', 'ddos', 'power'],
        action: () => {
          onClose();
          onOpenIncidentGen?.();
        },
      },
      {
        id: 'chaos:power',
        title: 'Chaos Test: Inject Power Fluctuation Outage',
        hint: 'Trigger intermittent rack brownout cycling',
        icon: <Zap size={15} className="text-yellow-400" />,
        keywords: ['power', 'fluctuation', 'brownout', 'outage', 'voltage', 'flapping'],
        action: () => {
          onClose();
          dispatch({ type: 'triggerIncident', kind: 'power_fluctuation' });
        },
      },
      {
        id: 'chaos:ddos',
        title: 'Chaos Test: Launch DDoS Traffic Surge',
        hint: 'Simulate 4.5x volumetric botnet spike',
        icon: <Radio size={15} className="text-red-400" />,
        keywords: ['ddos', 'spike', 'flood', 'surge', 'attack', 'traffic'],
        action: () => {
          onClose();
          dispatch({ type: 'triggerIncident', kind: 'ddos_spike' });
        },
      },
      {
        id: 'chaos:toggle-mode',
        title: sim.chaosMode ? 'Chaos Mode: Disable Auto-Chaos' : 'Chaos Mode: Enable Automated Chaos Monkey',
        hint: sim.chaosMode ? 'Stop spontaneous outages' : 'Periodic automated chaos outages',
        icon: <Flame size={15} className="text-orange-400" />,
        keywords: ['chaos', 'monkey', 'mode', 'automated', 'random'],
        action: () => {
          dispatch({ type: 'toggleChaosMode' });
        },
      },
    ];

    // Node-specific contextual commands
    if (selectedNode) {
      const tmpl = NODE_TEMPLATES[selectedNode.kind];
      if (tmpl.maxUpgrades > 0) {
        const cpuCost = getCpuUpgradeCost(selectedNode);
        const ramCost = getRamUpgradeCost(selectedNode);

        if (cpuCost > 0 && (selectedNode.cpuTier ?? 0) < MAX_HARDWARE_TIER) {
          list.unshift({
            id: 'node:upgrade-cpu',
            title: `Upgrade CPU: ${selectedNode.name}`,
            hint: `${formatCurrency(cpuCost)} (+4 cores, +35% RPS)`,
            icon: <Cpu size={15} />,
            keywords: ['cpu', 'processor', 'cores', 'upgrade', 'silicon'],
            action: () => dispatch({ type: 'upgradeCpu', nodeId: selectedNode.id }),
          });
        }

        if (ramCost > 0 && selectedNode.ramGb > 0 && (selectedNode.ramTier ?? 0) < MAX_HARDWARE_TIER) {
          list.unshift({
            id: 'node:upgrade-ram',
            title: `Expand RAM: ${selectedNode.name}`,
            hint: `${formatCurrency(ramCost)} (Doubles memory capacity)`,
            icon: <Layers size={15} />,
            keywords: ['ram', 'memory', 'dimm', 'ecc', 'buffer', 'expand'],
            action: () => dispatch({ type: 'upgradeRam', nodeId: selectedNode.id }),
          });
        }

        list.unshift({
          id: 'node:scale',
          title: `Full Unit Scale Up: ${selectedNode.name}`,
          hint: `${formatCurrency(tmpl.upgradeCostUsd)} (All hardware specs)`,
          icon: <ArrowUpCircle size={15} />,
          keywords: ['scale', 'upgrade', 'cores', 'ram'],
          action: () => dispatch({ type: 'scaleVertical', nodeId: selectedNode.id }),
        });
      }

      if (selectedNode.kind === 'loadbalancer' || selectedNode.kind === 'server') {
        list.unshift({
          id: 'node:add-behind',
          title: `Add Server Behind: ${selectedNode.name}`,
          hint: `$${NODE_TEMPLATES.server.costUsd}`,
          icon: <PlusCircle size={15} />,
          keywords: ['add', 'server', 'behind', 'replicate', 'worker'],
          action: () => dispatch({ type: 'addServerBehind', nodeId: selectedNode.id }),
        });
      }

      list.unshift({
        id: 'node:delete',
        title: `Decommission: ${selectedNode.name}`,
        hint: 'Delete node and sever connected links',
        icon: <Trash2 size={15} />,
        keywords: ['delete', 'destroy', 'decommission', 'remove'],
        action: () => dispatch({ type: 'deleteNode', nodeId: selectedNode.id }),
      });
    }

    return list;
  }, [sim.speed, selectedNode]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const kwMatch = item.keywords.some((k) => k.toLowerCase().includes(q));
      return titleMatch || kwMatch;
    });
  }, [items, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredItems.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) {
        audio.playClick();
        item.action();
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="ct-bill-scrim" onClick={onClose}>
      <div
        className="ct-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="ct-palette__search">
          <Search size={18} className="text-cyan-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="ct-palette__input"
            placeholder="Type command or infrastructure tool..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="ct-palette__esc">ESC</kbd>
        </div>

        <ul className="ct-palette__list" role="listbox">
          {filteredItems.length === 0 ? (
            <li className="ct-palette__empty">No matching commands found.</li>
          ) : (
            filteredItems.map((item, idx) => {
              const active = idx === selectedIndex;
              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={active}
                  className={`ct-palette__item ${active ? 'ct-palette__item--active' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    audio.playClick();
                    item.action();
                    onClose();
                  }}
                >
                  <span className="ct-palette__icon">{item.icon}</span>
                  <span className="ct-palette__title">{item.title}</span>
                  {item.hint && <span className="ct-palette__hint">{item.hint}</span>}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

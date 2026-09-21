import React, { useState } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';
import { 
  Activity, Wind, Zap, Thermometer, ShieldCheck, AlertTriangle, RefreshCw, 
  Terminal, Layers, CheckCircle2, AlertCircle, Info, Database, Send, Clock,
  Cpu, ArrowRight, Gauge, Radio, ChevronRight, Check, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { AirVolutionUnit, CommandAudit, CommandAuditState } from '../../types/airvolution';
import { calculateAirVolutionMetrics } from '../../services/airvolutionEngine';
import { SplitSystemTelemetryView } from './SplitSystemTelemetryView';

interface AirVolutionMonitorViewProps {
  units: AirVolutionUnit[];
  onOpenOS?: (unit: AirVolutionUnit, reason: string) => void;
  onSyncPMOC?: (unit: AirVolutionUnit) => void;
}

export function AirVolutionMonitorView({ units: initialUnits, onOpenOS, onSyncPMOC }: AirVolutionMonitorViewProps) {
  const [units, setUnits] = useState<AirVolutionUnit[]>(initialUnits);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnits[0].id);
  const [activeSubTab, setActiveSubTab] = useState<'split_telemetry' | 'telemetry' | 'forecast' | 'provenance' | 'command_audit' | 'gateway_lan'>('split_telemetry');
  
  // Interactive command simulator
  const [newSetpoint, setNewSetpoint] = useState<number>(21.0);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [lastCommandStatus, setLastCommandStatus] = useState<string | null>(null);

  const selectedUnit = units.find(u => u.id === selectedUnitId) || units[0];

  // Quick command dispatch with audit states
  const handleDispatchSetpoint = () => {
    if (isDispatching) return;
    setIsDispatching(true);

    const cmdId = `CMD-${Date.now().toString().slice(-4)}`;
    const newAudit: CommandAudit = {
      id: cmdId,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      command: 'SET_SETPOINT',
      target_value: newSetpoint,
      state: 'REQUESTED',
      operator: 'José Sobrinho (Facilities)',
      raw_hex_sent: `AA 14 AC 00 00 00 00 00 02 40 40 ${newSetpoint.toString(16).toUpperCase()} 00 00 00 00 00 00 7C BA`,
    };

    // Update state to REQUESTED
    setUnits(prev => prev.map(u => {
      if (u.id !== selectedUnit.id) return u;
      return { ...u, commandAudits: [newAudit, ...u.commandAudits] };
    }));

    // Step 2: SENT
    setTimeout(() => {
      setUnits(prev => prev.map(u => {
        if (u.id !== selectedUnit.id) return u;
        return {
          ...u,
          commandAudits: u.commandAudits.map(c => c.id === cmdId ? { ...c, state: 'SENT' as CommandAuditState } : c)
        };
      }));

      // Step 3: ACKNOWLEDGED
      setTimeout(() => {
        setUnits(prev => prev.map(u => {
          if (u.id !== selectedUnit.id) return u;
          return {
            ...u,
            commandAudits: u.commandAudits.map(c => c.id === cmdId ? { 
              ...c, 
              state: 'ACKNOWLEDGED' as CommandAuditState,
              raw_hex_ack: `AA 14 AC 00 00 00 00 00 02 40 00 ${newSetpoint.toString(16).toUpperCase()} 00 00 00 00 00 00 3C AA`
            } : c)
          };
        }));

        // Step 4: VERIFIED / READBACK
        setTimeout(() => {
          setUnits(prev => prev.map(u => {
            if (u.id !== selectedUnit.id) return u;
            const updatedObserved = { ...u.telemetry.observed, setpoint_c: newSetpoint, timestamp_ms: Date.now() };
            const recalc = calculateAirVolutionMetrics(updatedObserved, u.telemetry.observed, u.nameplate);
            
            return {
              ...u,
              telemetry: {
                observed: updatedObserved,
                derived: recalc.derived,
                inferred: recalc.inferred,
              },
              commandAudits: u.commandAudits.map(c => c.id === cmdId ? { 
                ...c, 
                state: 'VERIFIED' as CommandAuditState,
                verification_delay_ms: 124
              } : c)
            };
          }));
          setIsDispatching(false);
          setLastCommandStatus(`Comando ${cmdId} verificado com sucesso pelo Midea LAN Gateway!`);
          setTimeout(() => setLastCommandStatus(null), 4000);
        }, 600);

      }, 400);

    }, 300);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display">AirVolution Monitor R8</h2>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-200">
                  Split System Midea 18KBTU
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                  Release 8 / V7 Arch
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Telemetria física isolada por proveniência: <span className="text-emerald-700 font-bold">MEDIDO</span>, <span className="text-blue-700 font-bold">CALCULADO</span>, <span className="text-purple-700 font-bold">INFERIDO</span> e <span className="text-slate-700 font-bold">PLACA</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 border border-slate-200">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>M-Smart LAN: Online</span>
          </div>
          {onSyncPMOC && (
            <button 
              onClick={() => onSyncPMOC(selectedUnit)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Sincronizar com PMOC
            </button>
          )}
        </div>
      </div>

      {/* Unit Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {units.map((unit) => {
          const isSelected = unit.id === selectedUnitId;
          const status = unit.telemetry.inferred.thermal_status;
          return (
            <div
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className={cn(
                "p-5 rounded-2xl border cursor-pointer transition-all text-left relative overflow-hidden",
                isSelected 
                  ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10" 
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-md"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  "text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                  isSelected ? "bg-slate-800 text-blue-300" : "bg-slate-100 text-slate-600"
                )}>
                  {unit.id} • {unit.blockName.split(' ')[0]}
                </span>
                <span className={cn(
                  "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                  status === 'SEM_ANOMALIA_EVIDENTE' 
                    ? (isSelected ? "bg-emerald-900/80 text-emerald-300 border-emerald-700" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                    : status === 'OBSERVAR'
                    ? (isSelected ? "bg-amber-900/80 text-amber-300 border-amber-700" : "bg-amber-50 text-amber-700 border-amber-200")
                    : (isSelected ? "bg-red-900/80 text-red-300 border-red-700" : "bg-red-50 text-red-700 border-red-200")
                )}>
                  {status === 'SEM_ANOMALIA_EVIDENTE' ? 'Normal' : status === 'OBSERVAR' ? 'Observar' : 'Atenção'}
                </span>
              </div>
              <h4 className="font-bold text-sm leading-tight mb-1">{unit.blockName}</h4>
              <p className={cn("text-[11px] mb-4 truncate", isSelected ? "text-slate-400" : "text-slate-500")}>
                {unit.location}
              </p>
              
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/20 text-center font-mono">
                <div>
                  <span className={cn("block text-[9px] uppercase", isSelected ? "text-slate-400" : "text-slate-400")}>T1 Amb</span>
                  <span className="text-sm font-bold">{unit.telemetry.observed.t1_c}°C</span>
                </div>
                <div>
                  <span className={cn("block text-[9px] uppercase", isSelected ? "text-slate-400" : "text-slate-400")}>ΔT Evap</span>
                  <span className={cn(
                    "text-sm font-bold",
                    (unit.telemetry.derived.delta_t_c ?? 0) < 5 ? "text-amber-400" : ""
                  )}>
                    {unit.telemetry.derived.delta_t_c ?? '--'}°C
                  </span>
                </div>
                <div>
                  <span className={cn("block text-[9px] uppercase", isSelected ? "text-slate-400" : "text-slate-400")}>Corrente</span>
                  <span className="text-sm font-bold">{unit.telemetry.observed.current_a ?? '--'} A</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub navigation for AirVolution modules */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          id="tab-split-telemetry"
          onClick={() => setActiveSubTab('split_telemetry')}
          className={cn(
            "px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeSubTab === 'split_telemetry'
              ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Wind className="w-4 h-4 text-blue-600" />
          <span>Split Systems: Evaporadora & Condensadora</span>
          <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">Físico + IAQ</span>
        </button>
        <button
          id="tab-4-pilares"
          onClick={() => setActiveSubTab('telemetry')}
          className={cn(
            "px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeSubTab === 'telemetry'
              ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Activity className="w-4 h-4" />
          4 Pilares de Proveniência & Telemetria
        </button>
        <button
          onClick={() => setActiveSubTab('forecast')}
          className={cn(
            "px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeSubTab === 'forecast'
              ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Gauge className="w-4 h-4" />
          Forecast Prophet (Gate V7)
        </button>
        <button
          onClick={() => setActiveSubTab('provenance')}
          className={cn(
            "px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeSubTab === 'provenance'
              ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Layers className="w-4 h-4" />
          Cadeia de Proveniência & Evidências
        </button>
        <button
          onClick={() => setActiveSubTab('command_audit')}
          className={cn(
            "px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeSubTab === 'command_audit'
              ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Terminal className="w-4 h-4" />
          Auditoria de Comandos R8
        </button>
        <button
          onClick={() => setActiveSubTab('gateway_lan')}
          className={cn(
            "px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap flex items-center gap-2",
            activeSubTab === 'gateway_lan'
              ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Radio className="w-4 h-4" />
          M-Smart Gateway LAN & Hex Bruto
        </button>
      </div>

      {/* SUBTAB 0: SPLIT SYSTEMS DETAILED TELEMETRY (EVAPORADORA & CONDENSADORA) */}
      {activeSubTab === 'split_telemetry' && (
        <SplitSystemTelemetryView 
          unit={selectedUnit} 
          onOpenOS={onOpenOS} 
        />
      )}

      {/* SUBTAB 1: TELEMETRY & 4 PROVENANCE PILLARS */}
      {activeSubTab === 'telemetry' && (
        <div className="space-y-8">
          {/* Anomaly Alert if ATENCAO or OBSERVAR */}
          {selectedUnit.telemetry.inferred.thermal_status !== 'SEM_ANOMALIA_EVIDENTE' && (
            <div className={cn(
              "p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
              selectedUnit.telemetry.inferred.thermal_status === 'ATENCAO' 
                ? "bg-red-50 border-red-200 text-red-900" 
                : "bg-amber-50 border-amber-200 text-amber-900"
            )}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", selectedUnit.telemetry.inferred.thermal_status === 'ATENCAO' ? "text-red-600" : "text-amber-600")} />
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wide">
                    Alerta de Anomalia Térmica — Score: {selectedUnit.telemetry.inferred.thermal_anomaly_score}/100 ({selectedUnit.telemetry.inferred.thermal_status})
                  </h4>
                  <ul className="text-xs space-y-1 mt-1 font-medium">
                    {selectedUnit.telemetry.inferred.thermal_reasons.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {onOpenOS && (
                <button
                  onClick={() => onOpenOS(selectedUnit, selectedUnit.telemetry.inferred.thermal_reasons.join(', '))}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
                >
                  Abrir Chamado Corretivo PMOC
                </button>
              )}
            </div>
          )}

          {/* THE 4 PILLARS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* PILLAR 1: OBSERVED / MEDIDO */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    🟢 Medido (Observed)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Sensores Reais</span>
                </div>
                
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">T1 (Ambiente/Retorno):</span>
                    <span className="text-sm font-bold text-slate-800">{selectedUnit.telemetry.observed.t1_c}°C</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">T2 (Evaporador/Serpentina):</span>
                    <span className="text-sm font-bold text-slate-800">{selectedUnit.telemetry.observed.t2_c}°C</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">T3 (Condensador/Externa):</span>
                    <span className="text-sm font-bold text-slate-800">{selectedUnit.telemetry.observed.t3_c}°C</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">T4 (Ar Externo):</span>
                    <span className="text-sm font-bold text-slate-800">{selectedUnit.telemetry.observed.t4_c}°C</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Setpoint Aferido:</span>
                    <span className="text-sm font-bold text-blue-600">{selectedUnit.telemetry.observed.setpoint_c}°C</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-500">Compressor / Modo:</span>
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      {selectedUnit.telemetry.observed.compressor_state} ({selectedUnit.telemetry.observed.mode})
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 italic">
                Capturado via M-Smart V3 LAN (Midea Local 12.0.0).
              </div>
            </div>

            {/* PILLAR 2: DERIVED / CALCULADO */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    🔵 Calculado (Derived)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Motor V5 Determ.</span>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">ΔT (T1 - T2):</span>
                    <span className={cn(
                      "text-sm font-bold",
                      (selectedUnit.telemetry.derived.delta_t_c ?? 0) < 5 ? "text-amber-600" : "text-slate-800"
                    )}>
                      {selectedUnit.telemetry.derived.delta_t_c ?? '--'}°C
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Erro Setpoint (T1 - SP):</span>
                    <span className="text-sm font-bold text-slate-800">
                      {(selectedUnit.telemetry.derived.setpoint_error_c ?? 0) > 0 ? '+' : ''}
                      {selectedUnit.telemetry.derived.setpoint_error_c ?? '--'}°C
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Taxa de Resfriamento:</span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedUnit.telemetry.derived.cooling_rate_c_per_min !== null 
                        ? `${selectedUnit.telemetry.derived.cooling_rate_c_per_min} °C/min` 
                        : 'Estável'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Carga Elétrica / Placa:</span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedUnit.telemetry.derived.electrical_load_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-500">COP Estimado:</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {selectedUnit.telemetry.derived.estimated_cop ?? '--'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 italic">
                ΔT é indicador térmico; não é medição de BTU/h.
              </div>
            </div>

            {/* PILLAR 3: INFERRED / INFERIDO */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    🟣 Inferido (Inferred)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Heurísticas R8</span>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">SH Estimado:</span>
                    <span className="text-sm font-bold text-purple-700">
                      {selectedUnit.telemetry.inferred.superheat_est_c ?? '--'}°C
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">SC Estimado:</span>
                    <span className="text-sm font-bold text-purple-700">
                      {selectedUnit.telemetry.inferred.subcooling_est_c ?? '--'}°C
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Score Anomalia:</span>
                    <span className={cn(
                      "text-sm font-bold",
                      selectedUnit.telemetry.inferred.thermal_anomaly_score > 50 ? "text-red-600" : "text-emerald-600"
                    )}>
                      {selectedUnit.telemetry.inferred.thermal_anomaly_score} / 100
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-500">Status Térmico:</span>
                    <span className="text-xs font-bold uppercase text-slate-800">
                      {selectedUnit.telemetry.inferred.thermal_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strict physical disclaimer */}
              <div className="mt-4 p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[9px] text-amber-800 leading-tight">
                <strong>Rigor Físico:</strong> T1/T2/T3 não são suficientes para medir SH/SC físico real sem pressão de saturação medida por manômetro na sucção/descarga.
              </div>
            </div>

            {/* PILLAR 4: NAMEPLATE / DADOS DE PLACA */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    ⚪ Placa (Nameplate)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Referência Fixa</span>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Modelo Evap:</span>
                    <span className="text-xs font-bold text-slate-800">{selectedUnit.nameplate.model_indoor}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Modelo Cond:</span>
                    <span className="text-xs font-bold text-slate-800">{selectedUnit.nameplate.model_outdoor}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Capacidade Nom.:</span>
                    <span className="text-xs font-bold text-slate-800">5,28 kW (18.000 BTU)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Tensão / Fases:</span>
                    <span className="text-xs font-bold text-slate-800">{selectedUnit.nameplate.nominal_voltage_v}V / 1F / 60Hz</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Corrente Máx:</span>
                    <span className="text-xs font-bold text-slate-800">{selectedUnit.nameplate.max_current_a} A</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-500">Refrigerante:</span>
                    <span className="text-xs font-bold text-blue-600">{selectedUnit.nameplate.refrigerant}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 italic">
                Dados de placa nunca são confundidos com telemetria.
              </div>
            </div>
          </div>

          {/* REAL ELECTRICAL TELEMETRY VS REFERENCE */}
          <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold font-display uppercase tracking-wide">
                  Medição Elétrica Observada pelo Protocolo
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conforme as regras do AirVolution R8, grandezas de tensão e corrente são preservadas como <strong>MEDIDAS</strong> apenas se o protocolo Midea reportá-las. A capacidade de 5,28 kW é térmica, <em>sendo expressamente proibido derivar corrente elétrica como 5280/220</em>.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 font-mono text-center shrink-0">
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">Tensão Real</span>
                <span className="text-xl font-bold text-emerald-400">{selectedUnit.telemetry.observed.voltage_v ?? '--'} V</span>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">Corrente Real</span>
                <span className="text-xl font-bold text-amber-400">{selectedUnit.telemetry.observed.current_a ?? '--'} A</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Máx: 10,30 A</span>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">Potência Elétrica</span>
                <span className="text-xl font-bold text-blue-400">{selectedUnit.telemetry.observed.compressor_power_w ?? '--'} W</span>
              </div>
            </div>
          </div>

          {/* TELEMETRY CHART */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                  Evolução Térmica em Tempo Real (T1 vs T2 vs T3 vs Setpoint)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Série temporal de leituras registradas no banco local SQLite (airvolution.db)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> T1 Amb</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> T2 Evap</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> T3 Cond</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Setpoint</div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedUnit.recentHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="°C" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                  />
                  <Line type="monotone" dataKey="t1" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} name="T1 Ambiente (°C)" />
                  <Line type="monotone" dataKey="t2" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} name="T2 Evaporador (°C)" />
                  <Line type="monotone" dataKey="t3" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" name="T3 Condensador (°C)" />
                  <Line type="stepAfter" dataKey="setpoint" stroke="#94a3b8" strokeWidth={1.5} name="Setpoint (°C)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: FORECAST PROPHET (GATE V7) */}
      {activeSubTab === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex items-start gap-4">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <h4 className="font-bold text-sm mb-1 uppercase tracking-wide">
                Arquitetura V7 / Gate de Proveniência do Serviço Forecast (Prophet)
              </h4>
              <p>
                O microsserviço de projeção temporal consome estritamente séries validadas de <strong>OBSERVED</strong> e <strong>DERIVED</strong>. Qualquer valor de <strong>INFERRED</strong> ou <strong>NAMEPLATE</strong> é terminantemente rejeitado na fronteira da API para evitar alucinação de curvas e garantir modelos preditivos fisicamente consistentes.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                  Curva Térmica Preditiva (Próximas 2 Horas)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Projeção de aproximação ao Setpoint de {selectedUnit.telemetry.observed.setpoint_c}°C com banda de incerteza (±0.4°C)
                </p>
              </div>
              <div className="text-xs font-mono font-bold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
                Modelo: Prophet-HVAC V2
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedUnit.forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[18, 28]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="°C" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="confidence_upper" stroke="none" fill="#dbeafe" fillOpacity={0.6} name="Limite Superior" />
                  <Area type="monotone" dataKey="confidence_lower" stroke="none" fill="#ffffff" fillOpacity={1} name="Limite Inferior" />
                  <Line type="monotone" dataKey="t1_projected" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} name="T1 Projetada (°C)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: PROVENANCE CHAIN & EVIDENCE */}
      {activeSubTab === 'provenance' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-800 uppercase tracking-widest font-display">
                  Cadeia de Proveniência HVAC-R (schemas/provenance.json)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Rastreabilidade imutável entre Fonte Física, Evidência, Interpretação, Decisão e Verificação.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200">
                SHA-256 Validado
              </span>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200">
              {selectedUnit.provenanceChain.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-5 pl-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-md">
                    {idx + 1}
                  </div>
                  <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-2xl flex-1 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {step.stage}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{step.timestamp}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mb-2">Ator: {step.actor} • Método: {step.method}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono my-3">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Inputs</span>
                        {step.inputs.map((inp, i) => (
                          <div key={i} className="text-slate-600 truncate">• {inp}</div>
                        ))}
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Outputs</span>
                        {step.outputs.map((out, i) => (
                          <div key={i} className="text-emerald-700 truncate font-semibold">• {out}</div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 italic mt-2">{step.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: COMMAND AUDIT (RELEASE 8) */}
      {activeSubTab === 'command_audit' && (
        <div className="space-y-6">
          {/* Dispatch Control Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                Controle Seguro com Auditoria de Comandos
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Estados auditados: <code>REQUESTED → SENT → ACKNOWLEDGED → VERIFIED</code>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                <span className="text-slate-500">Novo Setpoint:</span>
                <input 
                  type="number"
                  min="17"
                  max="30"
                  step="0.5"
                  value={newSetpoint}
                  onChange={(e) => setNewSetpoint(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800 text-center"
                />
                <span>°C</span>
              </div>

              <button
                onClick={handleDispatchSetpoint}
                disabled={isDispatching}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-2",
                  isDispatching ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                )}
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Auditando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Comando Seguro
                  </>
                )}
              </button>
            </div>
          </div>

          {lastCommandStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {lastCommandStatus}
            </motion.div>
          )}

          {/* Audit Trail Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID Auditoria</th>
                  <th className="px-6 py-4">Comando</th>
                  <th className="px-6 py-4">Alvo</th>
                  <th className="px-6 py-4 text-center">Estado Auditoria</th>
                  <th className="px-6 py-4">Latência Ack</th>
                  <th className="px-6 py-4">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedUnit.commandAudits.map((cmd) => (
                  <tr key={cmd.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-blue-600">{cmd.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{cmd.command}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{cmd.target_value}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border",
                        cmd.state === 'VERIFIED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        cmd.state === 'ACKNOWLEDGED' ? "bg-blue-50 text-blue-700 border-blue-200" :
                        cmd.state === 'SENT' ? "bg-purple-50 text-purple-700 border-purple-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {cmd.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{cmd.verification_delay_ms ? `${cmd.verification_delay_ms} ms` : '--'}</td>
                    <td className="px-6 py-4 text-slate-600">{cmd.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: M-SMART GATEWAY LAN & RAW FRAMES */}
      {activeSubTab === 'gateway_lan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Endereço LAN</span>
              <p className="text-lg font-mono font-bold text-slate-800">{selectedUnit.ip_address}:{selectedUnit.port}</p>
              <p className="text-xs text-slate-400 mt-1">Isolado da internet (LAN Only)</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status Gateway</span>
              <p className="text-lg font-mono font-bold text-emerald-600 capitalize">{selectedUnit.gateway_status}</p>
              <p className="text-xs text-slate-400 mt-1">midea-local daemon v12.0.0</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Latência de Rede</span>
              <p className="text-lg font-mono font-bold text-blue-600">{selectedUnit.last_ping_ms} ms</p>
              <p className="text-xs text-slate-400 mt-1">Polling contínuo a cada 30s</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">
                  Captura de Frames Binários Midea (Raw Hex Dump)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Preservação de bytes brutos antes de decodificação conforme preconizado na Release 8.
                </p>
              </div>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {selectedUnit.rawFrames.map((frame) => (
                <div key={frame.id} className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                    <span className="text-blue-400 font-bold">{frame.id} • {frame.msg_type}</span>
                    <span>Direção: <span className={frame.direction === 'RX' ? "text-emerald-400" : "text-amber-400"}>{frame.direction}</span></span>
                    <span>Tamanho: {frame.length} bytes</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{frame.decoder_status}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 text-xs break-all select-all font-mono">
                    {frame.raw_hex}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

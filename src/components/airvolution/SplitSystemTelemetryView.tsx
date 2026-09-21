import React, { useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { 
  Wind, Zap, Thermometer, ShieldCheck, AlertTriangle, CheckCircle2, 
  Activity, ArrowDownRight, Gauge, Radio, Clock, Sparkles, RefreshCw,
  Waves, Cpu, Compass, Sliders, AlertCircle, Info, Flame
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AirVolutionUnit, DeltaTIntervalStats } from '../../types/airvolution';

interface SplitSystemTelemetryViewProps {
  unit: AirVolutionUnit;
  onOpenOS?: (unit: AirVolutionUnit, reason: string) => void;
}

export function SplitSystemTelemetryView({ unit, onOpenOS }: SplitSystemTelemetryViewProps) {
  const [selectedDtInterval, setSelectedDtInterval] = useState<'horario' | 'diario' | 'mensal' | 'anual' | '5_anos' | 'maximo'>('horario');

  const evap = unit.evaporator;
  const cond = unit.condenser;

  // Fallback calculations if not present
  const ambientT1 = evap?.ambient_return_t1_c ?? unit.telemetry.observed.t1_c ?? 22.0;
  const evapT2 = evap?.evaporator_coil_t2_c ?? unit.telemetry.observed.t2_c ?? 10.5;
  const evapV = evap?.voltage_v ?? unit.telemetry.observed.voltage_v ?? 220.0;
  const evapI = evap?.current_a ?? 0.65;
  const currentDeltaT = evap?.delta_t_c ?? Number((ambientT1 - evapT2).toFixed(1));

  // Condenser values
  const outdoorT4 = cond?.outdoor_ambient_t4_c ?? unit.telemetry.observed.t4_c ?? 29.0;
  const dischargeT3 = cond?.discharge_temp_t3_c ?? unit.telemetry.observed.t3_c ?? 72.0;
  const liquidLineT = cond?.liquid_line_temp_c ?? 38.5;
  const dtDischargeLiquid = cond?.delta_t_discharge_liquid_c ?? Number((dischargeT3 - liquidLineT).toFixed(1));
  const condV = cond?.voltage_v ?? unit.telemetry.observed.voltage_v ?? 220.0;
  const condI = cond?.current_a ?? unit.telemetry.observed.current_a ?? 6.82;

  // IAQ BME680
  const iaq = evap?.iaq_bme680 ?? {
    iaq_score: 28,
    rating: 'Excelente' as const,
    rating_color: 'emerald',
    eco2_ppm: 485,
    bvoc_ppm: 0.12,
    humidity_pct: 52.8,
    pressure_hpa: 1014.6,
    gas_resistance_kohm: 152.0,
    sensor_temp_c: 21.9,
    anvisa_compliance: true,
    anvisa_status: 'Conforme ANVISA RE 09/2003 (< 1000 ppm eCO2)',
    air_renewal_index: '32.0 m³/h por ocupante (NBR 16401-3)',
    last_calibration: '2026-08-15',
  };

  // Active DT interval stats & data
  const intervalStats: DeltaTIntervalStats | undefined = evap?.delta_t_intervals?.[selectedDtInterval];
  const chartData = intervalStats?.data ?? [
    { time: 'Agora', dt: currentDeltaT, t1: ambientT1, t2: evapT2 }
  ];

  const intervalsList: { key: typeof selectedDtInterval; label: string; badge: string }[] = [
    { key: 'horario', label: 'Horário', badge: '1h' },
    { key: 'diario', label: 'Diário', badge: '24h' },
    { key: 'mensal', label: 'Mensal', badge: '30d' },
    { key: 'anual', label: 'Anual', badge: '12m' },
    { key: '5_anos', label: '5 Anos', badge: '2021-26' },
    { key: 'maximo', label: 'Máximo', badge: 'Histórico' },
  ];

  return (
    <div id="split-systems-telemetry-container" className="space-y-10">
      {/* Top Banner: Split System Specification */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {unit.id} • Split System Midea 18KBTU
            </span>
            <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
              S/N: {unit.serialNumber}
            </span>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Gateway LAN {unit.ip_address}:{unit.port}
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-white">
            {unit.blockName}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Localização: <span className="text-slate-300 font-medium">{unit.location}</span> | Modelo Evaporadora: <span className="font-mono text-blue-300">{unit.nameplate.model_indoor}</span> | Condensadora: <span className="font-mono text-amber-300">{unit.nameplate.model_outdoor}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right font-mono text-xs hidden sm:block">
            <span className="text-slate-400 block text-[10px] uppercase">Refrigerante / Carga</span>
            <span className="text-white font-bold">{unit.nameplate.refrigerant} • 5,28 kW Nom.</span>
          </div>
          {onOpenOS && (
            <button
              onClick={() => onOpenOS(unit, `Inspeção Preventiva Split System Midea 18KBTU (${unit.blockName})`)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Abrir OS PMOC
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: EVAPORADORA (UNIDADE INTERNA)                                   */}
      {/* ========================================================================= */}
      <div id="section-evaporadora" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl border border-blue-200">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  1. Unidade Evaporadora (Indoor)
                </h3>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md uppercase">
                  Gabinete Interno
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitoramento de retorno, troca térmica na serpentina evaporadora, grandezas elétricas e qualidade do ar interior (IAQ).
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            ΔT Vigente: <strong className={cn("font-bold", currentDeltaT < 8 ? "text-amber-600" : "text-blue-600")}>{currentDeltaT}°C</strong>
          </div>
        </div>

        {/* 4 Cards Principais da Evaporadora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Temperatura Ambiente [Retorno] */}
          <div id="card-evap-t1-retorno" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Temperatura Ambiente</span>
              <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">[Retorno T1]</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{ambientT1}</span>
              <span className="text-base font-bold text-slate-400">°C</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Setpoint Aferido:</span>
              <span className="font-mono font-bold text-blue-600">{unit.telemetry.observed.setpoint_c ?? 21.0}°C</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Desvio: {((ambientT1 - (unit.telemetry.observed.setpoint_c ?? 21.0))).toFixed(1)}°C em relação à meta
            </div>
          </div>

          {/* Card 2: Evaporador (T2 Serpentina) */}
          <div id="card-evap-t2-serpentina" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Evaporador</span>
              <span className="bg-cyan-50 text-cyan-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-cyan-100">[Serpentina T2]</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{evapT2}</span>
              <span className="text-base font-bold text-slate-400">°C</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Estado de Expansão:</span>
              <span className="font-mono font-bold text-emerald-600">Evaporação Ativa</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Termistor de tubo na curva média do trocador interno
            </div>
          </div>

          {/* Card 3: Tensão Evaporadora */}
          <div id="card-evap-voltage" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Tensão Evaporadora</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{evapV}</span>
              <span className="text-base font-bold text-slate-400">V</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Alimentação Nominal:</span>
              <span className="font-mono font-bold text-slate-700">220V / 1F / 60Hz</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Variação de rede: {(((evapV - 220) / 220) * 100).toFixed(1)}% (Estável)
            </div>
          </div>

          {/* Card 4: Corrente Evaporadora */}
          <div id="card-evap-current" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Corrente Evaporadora</span>
              <Activity className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{evapI}</span>
              <span className="text-base font-bold text-slate-400">A</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Ventilador Interno:</span>
              <span className="font-mono font-bold text-slate-700">Motor DC Modulante</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Velocidade: {typeof unit.telemetry.observed.fan === 'string' ? unit.telemetry.observed.fan.toUpperCase() : 'AUTO'}
            </div>
          </div>
        </div>

        {/* MÓDULO DT DA EVAPORADORA COM INTERVALOS TEMPORAIS */}
        <div id="module-evap-delta-t" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                  DT Evaporador (T1 - T2)
                </span>
                <h4 className="text-base font-bold text-slate-900 font-display">
                  Evolução do Salto Térmico (ΔT) por Intervalo Temporal
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhamento analítico da diferença entre Temperatura Ambiente [Retorno] e Evaporador. Padrão ótimo: 8°C a 14°C.
              </p>
            </div>

            {/* Seletor de Intervalos Solicitados: Horário, Diário, Mensal, Anual, 5 Anos e Máximo */}
            <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
              {intervalsList.map((intv) => (
                <button
                  key={intv.key}
                  id={`btn-interval-${intv.key}`}
                  onClick={() => setSelectedDtInterval(intv.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    selectedDtInterval === intv.key
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200/80 font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  )}
                >
                  <span>{intv.label}</span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.2 rounded font-mono",
                    selectedDtInterval === intv.key ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                  )}>
                    {intv.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Métricas Resumidas do Intervalo Selecionado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 font-mono text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block mb-0.5">ΔT Vigente / Atual</span>
              <span className="text-xl font-black text-blue-700">{currentDeltaT}°C</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block mb-0.5">ΔT Médio ({intervalStats?.label})</span>
              <span className="text-xl font-bold text-slate-800">{intervalStats?.avg ?? currentDeltaT}°C</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Mínimo no Período</span>
              <span className="text-xl font-bold text-emerald-600">{intervalStats?.min ?? currentDeltaT}°C</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Máximo no Período</span>
              <span className="text-xl font-bold text-indigo-600">{intervalStats?.max ?? currentDeltaT}°C</span>
            </div>
          </div>

          {selectedDtInterval === 'maximo' && intervalStats?.peakDate && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span><strong>Recorde Histórico:</strong> Pico máximo de <strong>{intervalStats.max}°C</strong> registrado em {intervalStats.peakDate}</span>
              </div>
              <span className="text-[11px] text-indigo-700 font-mono">Mínimo Histórico: {intervalStats.min}°C ({intervalStats.minDate})</span>
            </div>
          )}

          {/* Gráfico do DT Intervalo Selecionado */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="dtColorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 'auto']} tickLine={false} unit="°C" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any, name: any) => [
                    `${val}°C`, 
                    name === 'dt' ? 'ΔT Evaporador (T1-T2)' : name === 't1' ? 'T1 Ambiente [Retorno]' : 'T2 Evaporador'
                  ]}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={(val) => val === 'dt' ? 'ΔT Salto Térmico (°C)' : val === 't1' ? 'T1 Retorno (°C)' : 'T2 Evaporador (°C)'}
                />
                {/* Linhas de referência de conformidade térmica */}
                <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Limiar Mínimo (8°C)', fill: '#d97706', fontSize: 10, position: 'insideBottomRight' }} />
                <ReferenceLine y={14} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Ideal Superior (14°C)', fill: '#059669', fontSize: 10, position: 'insideTopRight' }} />
                
                <Area type="monotone" dataKey="dt" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#dtColorGrad)" />
                <Line type="monotone" dataKey="t1" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="t2" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAINEL IAQ GPA INDEX RATING (DADOS SENSORES BME680) */}
        <div id="module-iaq-bme680" className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-emerald-900/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Gauge className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold font-display text-white">
                    IAQ GPA Index Rating
                  </h4>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Sensor Bosch BME680
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Qualidade do Ar Interior (IAQ) monitorada em tempo real na tomada de retorno da evaporadora.
                </p>
              </div>
            </div>

            {/* GPA IAQ Rating Badge */}
            <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-2.5 rounded-xl border border-slate-700/80 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 font-mono block">Classificação GPA</span>
                <span className={cn(
                  "text-sm font-black uppercase tracking-wider",
                  iaq.rating === 'Excelente' ? "text-emerald-400" :
                  iaq.rating === 'Bom' ? "text-blue-400" :
                  iaq.rating === 'Moderado' ? "text-amber-400" :
                  iaq.rating === 'Ruim' ? "text-orange-400" : "text-red-400"
                )}>
                  {iaq.rating}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-xl text-emerald-400">
                {iaq.iaq_score}
              </div>
            </div>
          </div>

          {/* Grid com os parâmetros dos Sensores BME680 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            {/* 1. eCO2 */}
            <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block uppercase mb-1">eCO2 (Dióxido Carb.)</span>
              <div className="flex items-baseline gap-1">
                <span className={cn("text-xl font-bold", iaq.eco2_ppm < 1000 ? "text-emerald-400" : "text-red-400")}>
                  {iaq.eco2_ppm}
                </span>
                <span className="text-[10px] text-slate-400">ppm</span>
              </div>
              <span className="text-[9px] text-emerald-400 block mt-1">Limite: &lt;1000 ppm</span>
            </div>

            {/* 2. b-VOC */}
            <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block uppercase mb-1">b-VOC (Voláteis)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-blue-400">{iaq.bvoc_ppm}</span>
                <span className="text-[10px] text-slate-400">ppm</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">Vapores Orgânicos</span>
            </div>

            {/* 3. Umidade Relativa */}
            <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block uppercase mb-1">Umidade Relativa</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-cyan-400">{iaq.humidity_pct}</span>
                <span className="text-[10px] text-slate-400">% UR</span>
              </div>
              <span className="text-[9px] text-cyan-300 block mt-1">Conforto: 40-65%</span>
            </div>

            {/* 4. Pressão Atmosférica */}
            <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block uppercase mb-1">Pressão Barométrica</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-200">{iaq.pressure_hpa}</span>
                <span className="text-[10px] text-slate-400">hPa</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">Altitude Local CD1</span>
            </div>

            {/* 5. Resistência do Gás MOX */}
            <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block uppercase mb-1">Resistência do Gás</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-purple-400">{iaq.gas_resistance_kohm}</span>
                <span className="text-[10px] text-slate-400">kΩ</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">Bosch BSEC Sensor</span>
            </div>

            {/* 6. Temperatura do Sensor BME */}
            <div className="bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block uppercase mb-1">Temp. Sonda BME</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-amber-400">{iaq.sensor_temp_c}</span>
                <span className="text-[10px] text-slate-400">°C</span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">Aferição de Bulbo</span>
            </div>
          </div>

          {/* Rodapé de Conformidade Regulatória ANVISA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Governança de IAQ:</strong> {iaq.anvisa_status}</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              Taxa de Renovação: <span className="text-emerald-300 font-bold">{iaq.air_renewal_index}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 2: CONDENSADOR (UNIDADE EXTERNA)                                   */}
      {/* ========================================================================= */}
      <div id="section-condensador" className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl border border-amber-200">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  2. Unidade Condensadora (Outdoor)
                </h3>
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md uppercase">
                  Área Externa / Cobertura
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitoramento termodinâmico do compressor inverter, ar externo (T4), descarga (T3), linha de líquido e balanço de condensação.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            DT Descarga/Líq: <strong className="font-bold text-amber-700">{dtDischargeLiquid}°C</strong>
          </div>
        </div>

        {/* 6 Cards da Condensadora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Temperatura Externa (T4) */}
          <div id="card-cond-t4-externa" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Temp. Externa</span>
              <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">[T4 Ar Externo]</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{outdoorT4}</span>
              <span className="text-base font-bold text-slate-400">°C</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              Tomada de ar do trocador aletado exterior
            </div>
          </div>

          {/* Card 2: Temperatura Descarga (T3) */}
          <div id="card-cond-t3-descarga" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Temp. Descarga</span>
              <span className="bg-red-50 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-200">[T3 Compressor]</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-black font-mono", dischargeT3 > 90 ? "text-red-600" : "text-slate-900")}>
                {dischargeT3}
              </span>
              <span className="text-base font-bold text-slate-400">°C</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              Linha de alta pressão saída do compressor
            </div>
          </div>

          {/* Card 3: Linha de Líquido */}
          <div id="card-cond-linha-liquido" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Linha de Líquido</span>
              <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200">[T Líq Cond.]</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{liquidLineT}</span>
              <span className="text-base font-bold text-slate-400">°C</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              Saída do condensador pré-expansão
            </div>
          </div>

          {/* Card 4: DT Descarga / Linha de Líquido */}
          <div id="card-cond-dt-descarga-liquido" className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition-all">
            <div className="flex items-center justify-between text-xs text-amber-800 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-amber-900 font-bold">DT Descarga/Líq</span>
              <span className="bg-amber-200/80 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded">T3 - T Líq</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-amber-900">{dtDischargeLiquid}</span>
              <span className="text-base font-bold text-amber-700">°C</span>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200/60 text-[10px] text-amber-800 font-medium">
              Amplitude de rejeição térmica do ciclo
            </div>
          </div>

          {/* Card 5: Tensão Condensador */}
          <div id="card-cond-voltage" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Tensão Condensador</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{condV}</span>
              <span className="text-base font-bold text-slate-400">V</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              Circuito de potência do motocompressor
            </div>
          </div>

          {/* Card 6: Corrente Condensador */}
          <div id="card-cond-current" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Corrente Condensador</span>
              <Activity className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-black font-mono", condI > 10.3 ? "text-red-600" : "text-slate-900")}>
                {condI}
              </span>
              <span className="text-base font-bold text-slate-400">A</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              Máx Placa: {unit.nameplate.max_current_a} A ({((condI / unit.nameplate.max_current_a) * 100).toFixed(0)}% carga)
            </div>
          </div>
        </div>

        {/* Diagnóstico Termodinâmico da Condensadora */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-display">
                Cascata Térmica de Condensação & Sub-resfriamento
              </h4>
              <p className="text-xs text-slate-500">
                Gradiente de temperatura entre a descarga superaquecida do compressor e a linha de condensado.
              </p>
            </div>
            <span className="bg-slate-100 text-slate-700 text-xs font-mono font-bold px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
              Status: {cond?.condenser_operational_status ?? 'Normal'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">Inverter Compressor</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">Frequência:</span>
                <span className="text-sm font-bold text-blue-700">{cond?.compressor_freq_hz ?? 54} Hz</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-600 font-bold">Ventilador Exterior:</span>
                <span className="text-sm font-bold text-slate-800">{cond?.fan_outdoor_rpm ?? 820} RPM</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">Salto Térmico de Condensação</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">ΔT (T3 - T Líquido):</span>
                <span className="text-sm font-bold text-amber-700">{dtDischargeLiquid}°C</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-600 font-bold">Diferencial Ar Ext (T3-T4):</span>
                <span className="text-sm font-bold text-slate-800">{(dischargeT3 - outdoorT4).toFixed(1)}°C</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">Eficiência Frigorífica</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">Sub-resfriamento Est.:</span>
                <span className="text-sm font-bold text-emerald-700">{cond?.subcooling_k ?? 4.2} K</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-600 font-bold">Gás Refrigerante:</span>
                <span className="text-sm font-bold text-blue-700">{unit.nameplate.refrigerant}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Building2, Users, ClipboardList, Settings, Bell, Search, 
  Menu, X, CheckCircle2, AlertCircle, Clock, Wrench,
  LayoutDashboard, FileText, Calendar, Box, Activity, Cpu, Zap, Radio, ArrowRight, ShieldCheck, Check,
  MapPin, Database, Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { AirVolutionMonitorView } from './components/airvolution/AirVolutionMonitorView';
import { GpaMapsView } from './components/GpaMapsView';
import { CalendarSyncView } from './components/CalendarSyncView';
import { testConnection } from './lib/firebase';
import { initialAirVolutionUnits } from './data/airvolutionDevices';
import { AirVolutionUnit } from './types/airvolution';

// --- Types ---
interface Staff {
  name: string;
  role: string;
  responsibilities: string[];
  avatarColor: string;
}

interface Routine {
  id: string;
  description: string;
  periodicity: 'M' | 'T' | 'S' | 'A';
  category: string;
}

interface Block {
  id: string;
  name: string;
  area: string;
  status: 'normal' | 'attention' | 'critical';
  maintenanceScore: number;
}

// --- Data ---
const pmocRoutines: Routine[] = [
  { id: '1', category: 'Condicionador', description: 'Verificar sujeira, danos e corrosão no gabinete/serpentina', periodicity: 'M' },
  { id: '2', category: 'Condicionador', description: 'Limpar serpentinas e bandejas', periodicity: 'T' },
  { id: '3', category: 'Filtros', description: 'Verificar filtros de ar (secos)', periodicity: 'M' },
  { id: '4', category: 'Filtros', description: 'Substituir elemento filtrante descartável', periodicity: 'T' },
  { id: '5', category: 'Ventiladores', description: 'Lubrificar os mancais', periodicity: 'S' },
  { id: '6', category: 'Ventiladores', description: 'Verificar tensão das correias', periodicity: 'M' },
  { id: '7', category: 'Drenagem', description: 'Limpar o sistema de drenagem', periodicity: 'M' },
  { id: '8', category: 'Elétrica', description: 'Medir e registrar tensão e corrente', periodicity: 'T' },
];

const staffMembers: Staff[] = [
  { 
    name: 'João', 
    role: 'Manutenção Preventiva', 
    responsibilities: ['Checklist Mensal', 'Limpeza Técnica', 'Testes de Operação'],
    avatarColor: 'bg-blue-500'
  },
  { 
    name: 'José Sobrinho', 
    role: 'P. Preventiva, Corretiva e Projetos', 
    responsibilities: ['Manutenção Preditiva', 'Gestão de Capex', 'Execução de Obras'],
    avatarColor: 'bg-emerald-600'
  },
  { 
    name: 'Silvio Martinelli', 
    role: 'P. Preventiva, Corretiva e Projeto', 
    responsibilities: ['Retrofit de Sistemas', 'Diagnósticos OS', 'Engenharia'],
    avatarColor: 'bg-indigo-600'
  },
  { 
    name: 'Igor', 
    role: 'Coordenação', 
    responsibilities: ['Supervisão de Campo', 'Reports Analíticos'],
    avatarColor: 'bg-orange-500'
  },
  { 
    name: 'Marcos', 
    role: 'Coordenação', 
    responsibilities: ['KPIs operacionais', 'Gestão de Insumos'],
    avatarColor: 'bg-orange-400'
  },
  { 
    name: 'Nataly', 
    role: 'Emissão de OS', 
    responsibilities: ['Controle de Fluxo OS', 'Atendimento GPA', 'Follow-up'],
    avatarColor: 'bg-pink-500'
  },
];

const blocksData: Block[] = [
  { id: '1965_SECA', name: 'Bloco 1965', area: 'Mercearia Seca : RH', status: 'normal', maintenanceScore: 98 },
  { id: '1965_ECOMMERCE', name: 'Bloco 1965', area: 'Ecommerce', status: 'normal', maintenanceScore: 95 },
  { id: 'B', name: 'Bloco B', area: 'Logística B', status: 'attention', maintenanceScore: 82 },
  { id: 'C', name: 'Bloco C', area: 'Logística C', status: 'normal', maintenanceScore: 91 },
  { id: 'APOIO', name: 'Apoio', area: 'Serviços/Geral', status: 'critical', maintenanceScore: 65 },
];

const chartData = [
  { name: 'Jan', realizada: 4000, prevista: 4200 },
  { name: 'Fev', realizada: 3000, prevista: 3100 },
  { name: 'Mar', realizada: 2000, prevista: 2000 },
  { name: 'Abr', realizada: 2780, prevista: 2900 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, iconColor, trend }: any) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4 transition-all hover:shadow-md"
  >
    <div className="flex items-center justify-between">
      <div className={cn("p-2.5 rounded-xl", color)}>
        <Icon className={cn("w-5 h-5", iconColor || "text-white")} />
      </div>
      {trend && (
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-tight", trend > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800 font-display tracking-tight">{value}</h3>
    </div>
  </motion.div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [airVolutionUnits, setAirVolutionUnits] = useState<AirVolutionUnit[]>(initialAirVolutionUnits);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [prefilledCalendarEvent, setPrefilledCalendarEvent] = useState<{ title: string; location: string } | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const [osList, setOsList] = useState([
    { id: 'OS-2026-001', block: 'Bloco 1965: Mercearia Seca : RH', requester: 'Marcos', status: 'Aberto', priority: 'Média', date: '25/04' },
    { id: 'OS-2026-002', block: 'Apoio', requester: 'Igor', status: 'Em Execução', priority: 'Alta', date: '26/04' },
    { id: 'OS-2026-003', block: 'Bloco C', requester: 'Admin', status: 'Concluído', priority: 'Baixa', date: '24/04' },
  ]);

  const handleOpenOSFromAirVolution = (unit: AirVolutionUnit, reason: string) => {
    const nextId = `OS-2026-00${osList.length + 1}`;
    const newOs = {
      id: nextId,
      block: unit.blockName.split(' (')[0],
      requester: 'AirVolution R8 (Diagnóstico Automático)',
      status: 'Aberto',
      priority: unit.telemetry.inferred.thermal_status === 'ATENCAO' ? 'Alta' : 'Média',
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    };
    setOsList(prev => [newOs, ...prev]);
    setActiveTab('os');
    setSyncToast(`Nova Ordem de Serviço ${nextId} gerada a partir da evidência AirVolution (${reason})!`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleSyncPMOC = (unit: AirVolutionUnit) => {
    setSyncToast(`Telemetria física de ${unit.blockName} sincronizada com sucesso no Plano PMOC (Rotinas #1 e #8 homologadas via M-Smart LAN)!`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sync Toast Notification */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-10 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-50 shadow-sm"
          >
            <div className="p-8 flex items-center gap-3 border-b border-slate-100">
              <div className="bg-slate-800 p-2 rounded-lg">
                <Box className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 font-display">GPA CD1</h1>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
              <div className="px-4 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operacional</p>
              </div>
              <SidebarItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                active={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')} 
              />
              <SidebarItem 
                icon={Activity} 
                label="AirVolution Monitor" 
                active={activeTab === 'airvolution'} 
                onClick={() => setActiveTab('airvolution')} 
                badge="R8"
              />
              <SidebarItem 
                icon={MapPin} 
                label="Mapa Operacional" 
                active={activeTab === 'maps'} 
                onClick={() => setActiveTab('maps')} 
                badge="Livre"
              />
              <SidebarItem 
                icon={Calendar} 
                label="Google Calendar" 
                active={activeTab === 'calendar'} 
                onClick={() => setActiveTab('calendar')} 
                badge="Sync"
              />
              <SidebarItem 
                icon={ClipboardList} 
                label="Plano PMOC" 
                active={activeTab === 'routines'} 
                onClick={() => setActiveTab('routines')} 
              />
              <SidebarItem 
                icon={Box} 
                label="Blocos e Áreas" 
                active={activeTab === 'blocks'} 
                onClick={() => setActiveTab('blocks')} 
              />
              
              <div className="px-4 mt-8 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Administrativo</p>
              </div>
              <SidebarItem 
                icon={Users} 
                label="Equipe" 
                active={activeTab === 'team'} 
                onClick={() => setActiveTab('team')} 
              />
              <SidebarItem 
                icon={FileText} 
                label="Ordens de Serviço" 
                active={activeTab === 'os'} 
                onClick={() => setActiveTab('os')} 
              />
            </nav>

            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shadow-inner">
                  JS
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">José Sobrinho</p>
                  <p className="text-[10px] text-slate-500 font-medium">Facilities Manager</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        sidebarOpen ? "ml-72" : "ml-0"
      )}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md h-20 border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
               <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">PMOC HVAC-R</h2>
               <p className="text-[10px] text-slate-400 font-semibold uppercase">GPA CD1 | Centro de Distribuição</p>
            </div>
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Firestore DB
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Database className="w-3 h-3 text-blue-500" />
                Cloud SQL us-east1
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <MapPin className="w-3 h-3 text-emerald-600" />
                Open Map (Free)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <Calendar className="w-3 h-3 text-blue-500" />
                Calendar
              </span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex gap-8 border-r border-slate-200 pr-8">
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Global</span>
                <span className="text-lg font-mono font-bold text-emerald-600">94.2%</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">OS Ativas</span>
                <span className="text-lg font-mono font-bold text-blue-600">18</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                <Search className="w-5 h-5" />
              </button>
              <button className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-10 space-y-10">
          {activeTab === 'overview' && (
            <div className="space-y-10">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Dashboard Operacional</h2>
                  <p className="text-slate-500 mt-1 uppercase text-[11px] font-bold tracking-[0.15em]">Visão Geral de Facilities & Compliance</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button 
                    onClick={() => setActiveTab('maps')}
                    className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>Abrir Mapa</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('calendar')}
                    className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google Calendar</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('os')}
                    className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Nova OS</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Total de Equipamentos" 
                  value="124" 
                  icon={Wrench} 
                  color="bg-slate-100 !text-slate-600" 
                  iconColor="text-slate-600"
                  trend={12}
                />
                <StatCard 
                  title="Conformidade PMOC" 
                  value="94.2%" 
                  icon={CheckCircle2} 
                  color="bg-emerald-50" 
                  iconColor="text-emerald-600"
                  trend={3}
                />
                <StatCard 
                  title="Preventivas Atrasadas" 
                  value="08" 
                  icon={Clock} 
                  color="bg-amber-50" 
                  iconColor="text-amber-600"
                  trend={-5}
                />
                <StatCard 
                  title="Corretivas Críticas" 
                  value="04" 
                  icon={AlertCircle} 
                  color="bg-red-50" 
                  iconColor="text-red-600"
                  trend={0}
                />
              </div>

              {/* AirVolution Monitor R8 Live Telemetry Bridge */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-700/60 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest font-mono">
                        AirVolution Monitor R8
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        M-Smart LAN 192.168.10.x:6444 (V3 Protocol)
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-display tracking-tight text-white">
                      Bloco 1965: Mercearia Seca : RH : Telemetria Física de Split System Midea 18KBTU
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Aquisição de sensores em tempo real com separação estrita de proveniência: grandezas medidas (T1, T2, T3, T4, Elétrica), cálculos determinísticos (ΔT, Carga, COP) e diagnósticos investigativos.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('airvolution')}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 shrink-0 self-start md:self-auto cursor-pointer"
                  >
                    <span>Abrir Monitor AirVolution R8</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 Live Equipment Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 relative z-10">
                  {airVolutionUnits.map((u) => (
                    <div 
                      key={u.id}
                      onClick={() => setActiveTab('airvolution')}
                      className="bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 p-4 rounded-2xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-blue-300 uppercase">{u.id} • {u.blockName.split(' (')[0]}</span>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                          u.telemetry.inferred.thermal_status === 'SEM_ANOMALIA_EVIDENTE' ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700" :
                          u.telemetry.inferred.thermal_status === 'OBSERVAR' ? "bg-amber-900/60 text-amber-300 border border-amber-700" :
                          "bg-red-900/60 text-red-300 border border-red-700"
                        )}>
                          {u.telemetry.inferred.thermal_status === 'SEM_ANOMALIA_EVIDENTE' ? 'Normal' : u.telemetry.inferred.thermal_status === 'OBSERVAR' ? 'Observar' : 'Atenção'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-200 truncate">{u.location}</p>
                      
                      <div className="space-y-2 mt-3 pt-3 border-t border-slate-700/60 font-mono">
                        {/* Evaporadora summary */}
                        <div className="grid grid-cols-4 gap-1 text-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/40">
                          <div>
                            <span className="text-[8px] text-blue-300 block uppercase">T1 Amb</span>
                            <span className="text-xs font-bold text-white">{u.telemetry.observed.t1_c}°C</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-blue-300 block uppercase">T2 Evap</span>
                            <span className="text-xs font-bold text-slate-300">{u.telemetry.observed.t2_c}°C</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-blue-300 block uppercase">ΔT Evap</span>
                            <span className={cn(
                              "text-xs font-bold",
                              (u.telemetry.derived.delta_t_c ?? 0) < 5 ? "text-amber-400" : "text-emerald-400"
                            )}>
                              {u.telemetry.derived.delta_t_c ?? '--'}°C
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-emerald-300 block uppercase">IAQ GPA</span>
                            <span className="text-xs font-bold text-emerald-400">{u.evaporator?.iaq_bme680.iaq_score ?? 28}</span>
                          </div>
                        </div>

                        {/* Condensadora summary */}
                        <div className="grid grid-cols-4 gap-1 text-center bg-amber-950/20 p-2 rounded-lg border border-amber-900/30">
                          <div>
                            <span className="text-[8px] text-amber-300 block uppercase">T4 Ext</span>
                            <span className="text-xs font-bold text-white">{u.condenser?.outdoor_ambient_t4_c ?? u.telemetry.observed.t4_c}°C</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-amber-300 block uppercase">T3 Desc</span>
                            <span className="text-xs font-bold text-slate-300">{u.condenser?.discharge_temp_t3_c ?? u.telemetry.observed.t3_c}°C</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-amber-300 block uppercase">ΔT D/Líq</span>
                            <span className="text-xs font-bold text-amber-400">
                              {u.condenser?.delta_t_discharge_liquid_c ?? 34.2}°C
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-amber-300 block uppercase">I Cond</span>
                            <span className="text-xs font-bold text-slate-300">{u.condenser?.current_a ?? u.telemetry.observed.current_a}A</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts and Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Fulfillment Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                     <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">Performance Operacional</h4>
                     <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-800"></span> Realizada</div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200"></span> Prevista</div>
                     </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                        />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="realizada" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={32} />
                        <Bar dataKey="prevista" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Team Distribution */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-8 font-display">Equipe Técnica</h4>
                  <div className="space-y-5 flex-1 overflow-y-auto max-h-80 pr-2 custom-scrollbar">
                    {staffMembers.map((staff, idx) => (
                      <div key={idx} className="flex items-center gap-4 group cursor-default">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm grayscale-[0.2] transition-all group-hover:grayscale-0", staff.avatarColor)}>
                          {staff.name[0]}
                        </div>
                        <div className="flex-1 min-w-0 border-b border-slate-50 pb-2 group-last:border-none">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-wide">{staff.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{staff.role}</p>
                        </div>
                        <div className="flex flex-col items-end border-b border-slate-50 pb-2 group-last:border-none">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setActiveTab('team')}
                    className="mt-8 w-full py-3 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Gerenciar Equipe
                  </button>
                </div>
              </div>

              {/* Blocks Grid */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">Status Local por Bloco</h4>
                  <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">
                    Ver Mapa Detalhado →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {blocksData.map((block) => (
                    <div key={block.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-6">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 group-hover:scale-110 transition-transform">
                          <Building2 className="w-4 h-4 text-slate-500" />
                        </div>
                        <StatusBadge status={block.status} />
                      </div>
                      <h5 className="font-bold text-sm text-slate-800 mb-0.5 tracking-tight">{block.name}</h5>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-6">{block.area}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                          <span>Health</span>
                          <span className="font-mono text-slate-600">{block.maintenanceScore}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${block.maintenanceScore}%` }}
                            className={cn(
                              "h-full rounded-full transition-all",
                              block.maintenanceScore > 90 ? "bg-emerald-500" : 
                              block.maintenanceScore > 75 ? "bg-amber-400" : "bg-red-500"
                            )}
                          ></motion.div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'airvolution' && (
            <AirVolutionMonitorView 
              units={airVolutionUnits}
              onOpenOS={handleOpenOSFromAirVolution}
              onSyncPMOC={handleSyncPMOC}
            />
          )}
          {activeTab === 'maps' && (
            <GpaMapsView 
              airVolutionUnits={airVolutionUnits}
              onOpenOS={(locId) => {
                const nextId = `OS-2026-00${osList.length + 1}`;
                setOsList(prev => [{
                  id: nextId,
                  block: locId.includes('1965_seca') ? 'Bloco 1965: Mercearia Seca : RH' : locId.includes('1965_ecommerce') ? 'Bloco 1965: Ecommerce' : locId.includes('bloco_b') ? 'Bloco B' : locId.includes('apoio') ? 'Apoio' : 'Bloco C',
                  requester: 'Inspeção por Geolocalização (Maps)',
                  status: 'Aberto',
                  priority: 'Média',
                  date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                }, ...prev]);
                setActiveTab('os');
                setSyncToast(`OS ${nextId} gerada com base no ponto geolocalizado!`);
                setTimeout(() => setSyncToast(null), 5000);
              }}
              onScheduleCalendar={(title, location) => {
                setPrefilledCalendarEvent({ title, location });
                setActiveTab('calendar');
                setSyncToast(`Carregado evento para agendamento no Google Calendar: ${title}`);
                setTimeout(() => setSyncToast(null), 4000);
              }}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarSyncView 
              prefilledEvent={prefilledCalendarEvent}
              onClearPrefilled={() => setPrefilledCalendarEvent(null)}
            />
          )}
          {activeTab === 'routines' && <RoutinesView />}
          {activeTab === 'team' && <TeamView />}
          {activeTab === 'blocks' && <BlocksView />}
          {activeTab === 'os' && <OSView osData={osList} />}

        </div>
      </main>
    </div>
  );
}

// --- Subviews ---

function OSView({ osData }: { osData: any[] }) {
  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Controle de OS</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 tracking-[0.2em]">Gerenciamento de chamados técnicos e evidências</p>
          </div>
          <button className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all">Nova Ordem de Serviço</button>
       </div>
       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocolo</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Localidade</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitante / Origem</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status Atuante</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Prioridade</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {osData.map((os) => (
                <tr key={os.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <p className="text-[11px] font-mono font-bold text-blue-600 tracking-tighter">{os.id}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{os.date}</p>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-700 uppercase tracking-wide">{os.block}</td>
                  <td className="px-8 py-5 text-xs font-medium text-slate-600">
                    <span className="font-semibold">{os.requester}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                     <span className={cn(
                       "text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest",
                       os.status === 'Aberto' ? "bg-slate-50 text-slate-500 border-slate-200" :
                       os.status === 'Em Execução' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                     )}>{os.status}</span>
                  </td>
                  <td className="px-8 py-5">
                     <span className={cn(
                       "text-[10px] font-black uppercase tracking-widest",
                       os.priority === 'Alta' ? "text-red-500 underline decoration-red-200" : "text-slate-500"
                     )}>{os.priority}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                     <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-900">
                        <Settings className="w-4 h-4" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
       </div>
    </div>
  );
}

function RoutinesView() {
  const categories = [...new Set(pmocRoutines.map(r => r.category))];

  return (
    <div className="space-y-10">
       <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Plano de Manutenção PMOC</h2>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Telemetria AirVolution R8 Conectada
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tracking-[0.2em]">Normatização PMOC Lei 13.589/2018 | GPA CD1</p>
       </div>
       
       <div className="grid grid-cols-1 gap-12">
          {categories.map(category => (
            <div key={category} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-5 w-1 bg-blue-600 rounded-full"></div>
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{category}</h3>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedimento Técnico</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-40">Ciclo</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-40">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pmocRoutines.filter(r => r.category === category).map((routine) => (
                      <tr key={routine.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <p className="text-[13px] font-medium text-slate-700 leading-relaxed max-w-2xl">{routine.description}</p>
                          {routine.id === '1' && (
                            <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-[10px] font-mono text-blue-700">
                              <Activity className="w-3.5 h-3.5 text-blue-600" />
                              <span>AirVolution R8 Telemetria: T2 Evaporador 10.2°C • ΔT 11.6°C (Troca térmica adequada)</span>
                            </div>
                          )}
                          {routine.id === '8' && (
                            <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-[10px] font-mono text-emerald-800">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              <span>AirVolution M-Smart LAN: 221.4 V • 6.82 A medidos (Dentro do limite de placa 10.30 A)</span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-xl text-[10px] font-black shadow-sm border",
                            routine.periodicity === 'M' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            routine.periodicity === 'T' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            routine.periodicity === 'S' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-red-50 text-red-600 border-red-100"
                          )}>
                            {routine.periodicity}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest">Aprovado</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
       </div>
    </div>
  );
}

function TeamView() {
  return (
    <div className="space-y-10">
       <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Equipe Especializada</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tracking-[0.2em]">Responsabilidades & Atribuições Técnicas</p>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {staffMembers.map((staff, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-5 mb-8">
                <div className={cn("w-16 h-16 rounded-2xl shadow-inner flex items-center justify-center text-white text-2xl font-black shrink-0", staff.avatarColor)}>
                  {staff.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-800 leading-tight uppercase tracking-tight">{staff.name}</h4>
                  <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider mt-1">{staff.role}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Responsibilities</p>
                {staff.responsibilities.map((resp, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    {resp}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
       </div>
    </div>
  );
}

function BlocksView() {
  return (
    <div className="space-y-10">
       <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight font-display">SLA por Unidade Operacional</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tracking-[0.2em]">Governança de Manutenção | Blocos CD1</p>
       </div>
       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Unidade / Bloco</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vigilância PMOC</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Checkpoint</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Health Index</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blocksData.map((block) => (
                <tr key={block.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 group-hover:text-blue-600 transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{block.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{block.area}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <StatusBadge status={block.status} />
                  </td>
                  <td className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase mt-0.5">
                    12/04/2026
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                       <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-slate-700">{block.maintenanceScore}%</span>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Compliant</span>
                       </div>
                       <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              block.maintenanceScore > 90 ? "bg-emerald-500" : 
                              block.maintenanceScore > 75 ? "bg-amber-400" : "bg-red-500"
                            )}
                            style={{ width: `${block.maintenanceScore}%` }}
                          ></div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-300 hover:text-slate-900">
                       <Settings className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
       </div>
    </div>
  );
}

// --- Helpers ---

function SidebarItem({ icon: Icon, label, active, onClick, badge }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
        active 
          ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10" 
          : "text-slate-500 hover:bg-slate-100"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 transition-transform group-hover:scale-110 shrink-0",
        active ? "text-white" : "text-slate-400"
      )} />
      <span className="font-bold text-[11px] uppercase tracking-wider truncate">{label}</span>
      {badge && (
        <span className={cn(
          "ml-auto text-[9px] font-black px-1.5 py-0.2 rounded font-mono uppercase tracking-wider",
          active ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
        )}>
          {badge}
        </span>
      )}
      {active && !badge && (
        <motion.div 
          layoutId="active-pill"
          className="ml-auto w-1 h-3 rounded-full bg-blue-500 shrink-0"
        />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: Block['status'] }) {
  const configs = {
    normal: { label: 'Conforme', class: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    attention: { label: 'Manutenção', class: 'bg-amber-50 text-amber-700 border-amber-100' },
    critical: { label: 'Crítico', class: 'bg-red-50 text-red-700 border-red-100' },
  };

  return (
    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest", configs[status].class)}>
      {configs[status].label}
    </span>
  );
}

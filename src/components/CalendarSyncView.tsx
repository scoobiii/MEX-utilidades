import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, CheckCircle2, AlertCircle, Plus, 
  ExternalLink, RefreshCw, UserCheck, ShieldCheck, LogOut 
} from 'lucide-react';
import { 
  auth, signInWithGoogle, logoutGoogle, getAccessToken, 
  fetchCalendarEvents, createCalendarEvent, CalendarEvent 
} from '../lib/firebase';
import { User } from 'firebase/auth';

interface CalendarSyncViewProps {
  prefilledEvent?: { title: string; location: string } | null;
  onClearPrefilled?: () => void;
}

export function CalendarSyncView({ prefilledEvent, onClearPrefilled }: CalendarSyncViewProps) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // New event form state
  const [summary, setSummary] = useState(prefilledEvent?.title || 'Inspeção Preventiva PMOC - Bloco A');
  const [location, setLocation] = useState(prefilledEvent?.location || 'GPA CD1 - Bloco A Pavimento Superior');
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [technician, setTechnician] = useState('João (Manutenção Preventiva)');
  const [description, setDescription] = useState('Verificação de pressão de sucção/descarga, corrente do compressor e limpeza de filtros.');

  // Confirmation modal state for destructive/mutating operations
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (prefilledEvent) {
      setSummary(prefilledEvent.title);
      setLocation(prefilledEvent.location);
    }
  }, [prefilledEvent]);

  useEffect(() => {
    const checkUser = async () => {
      if (auth.currentUser) {
        setUser(auth.currentUser);
        const tok = await getAccessToken();
        if (tok) {
          setToken(tok);
          loadEvents(tok);
        }
      }
    };
    checkUser();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await signInWithGoogle();
      if (res?.user && res.accessToken) {
        setUser(res.user);
        setToken(res.accessToken);
        await loadEvents(res.accessToken);
        setFeedback({ type: 'success', message: 'Conectado ao Google Calendar com sucesso!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao autenticar com o Google.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setEvents([]);
  };

  const loadEvents = async (authToken: string) => {
    setLoading(true);
    try {
      const list = await fetchCalendarEvents(authToken);
      setEvents(list);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Erro ao sincronizar eventos.' });
    } finally {
      setLoading(false);
    }
  };

  const requestCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFeedback({ type: 'error', message: 'Faça login com sua conta Google para sincronizar.' });
      return;
    }
    // Open explicit confirmation modal as mandated by workspace skill
    setShowConfirmModal(true);
  };

  const confirmCreateEvent = async () => {
    setShowConfirmModal(false);
    if (!token) return;
    setLoading(true);
    setFeedback(null);

    const startDateTime = `${date}T${startTime}:00-03:00`;
    const endDateTime = `${date}T${endTime}:00-03:00`;

    try {
      await createCalendarEvent(token, {
        summary: `[PMOC GPA CD1] ${summary}`,
        description: `Técnico Responsável: ${technician}\n\n${description}\n\nSistema: PMOC HVAC-R GPA CD1`,
        location,
        startDateTime,
        endDateTime
      });

      setFeedback({ type: 'success', message: 'Evento agendado com sucesso no Google Calendar!' });
      if (onClearPrefilled) onClearPrefilled();
      await loadEvents(token);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao criar evento na agenda.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight font-display">
              Google Calendar • Sincronização PMOC
            </h2>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              Google Workspace API
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 tracking-[0.2em]">
            Agendamento automático de manutenções preventivas e corretivas no GPA CD1
          </p>
        </div>

        {/* User Auth Status / Sign-in */}
        <div>
          {user ? (
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 pl-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.displayName?.[0] || 'U'}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-none">{user.displayName || user.email}</p>
                  <p className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5">Google Calendar Conectado</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                title="Desconectar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Conectar com Google Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Main Grid: New Event Form + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Agendar Manutenção Técnica
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cria o evento na agenda com alocação do técnico e localização no GPA CD1.
            </p>
          </div>

          <form onSubmit={requestCreateEvent} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Título do Agendamento
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Localidade no GPA CD1
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Técnico Responsável
                </label>
                <select
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="João (Manutenção Preventiva)">João (Preventiva)</option>
                  <option value="José Sobrinho (Preventiva, Corretiva, Projetos)">José Sobrinho (Corretiva/Projetos)</option>
                  <option value="Silvio Martinelli (Preventiva, Corretiva, Projetos)">Silvio Martinelli (Retrofit/Projetos)</option>
                  <option value="Igor / Marcos (Coordenação)">Igor / Marcos (Coordenação)</option>
                  <option value="Nataly (Emissão de OS)">Nataly (Emissão de OS)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Horário Início
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Horário Término
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Descrição e Escopo Técnico
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Calendar className="w-4 h-4" />
              <span>Sincronizar com Google Calendar</span>
            </button>
          </form>
        </div>

        {/* Calendar Events List (7 cols) */}
        <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Próximos Agendamentos na Agenda
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Eventos ativos do Google Calendar primário sincronizados em tempo real.
                </p>
              </div>
              {token && (
                <button
                  onClick={() => loadEvents(token)}
                  disabled={loading}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
                  title="Recarregar eventos"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {!token ? (
              <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-2xl">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">Google Calendar Desconectado</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Clique no botão acima para autenticar sua conta Google e visualizar seus eventos de manutenção.
                </p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">Nenhum evento futuro agendado</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Use o formulário ao lado para programar ordens de serviço ou rotinas PMOC.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
                {events.map((ev) => (
                  <div 
                    key={ev.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-900">{ev.summary}</h5>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          {ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleString('pt-BR') : ev.start.date}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {ev.htmlLink && (
                      <a 
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start md:self-auto shrink-0"
                      >
                        <span>Abrir no Calendar</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sincronização segura via OAuth 2.0 Token Bearer
            </span>
            <span>Escopo: calendar.events</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Mutating Action (Mandatory per workspace-integration skill) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 font-display">Confirmar Agendamento</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Google Calendar</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-2 text-slate-700 border border-slate-100">
              <p><strong className="font-semibold text-slate-900">Evento:</strong> [PMOC GPA CD1] {summary}</p>
              <p><strong className="font-semibold text-slate-900">Local:</strong> {location}</p>
              <p><strong className="font-semibold text-slate-900">Horário:</strong> {date} das {startTime} às {endTime}</p>
              <p><strong className="font-semibold text-slate-900">Técnico:</strong> {technician}</p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Você autoriza a inclusão deste compromisso na sua agenda do Google Calendar?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCreateEvent}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                Confirmar e Inserir na Agenda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

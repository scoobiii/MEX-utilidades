import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Building2, MapPin, Activity, ShieldCheck, Wrench, Navigation, 
  Layers, ExternalLink, Calendar, CheckCircle2, AlertTriangle, AlertOctagon,
  Eye, RefreshCw, ZoomIn, ZoomOut, Compass, Sparkles
} from 'lucide-react';
import { AirVolutionUnit } from '../types/airvolution';

interface GpaMapsViewProps {
  airVolutionUnits: AirVolutionUnit[];
  onOpenOS?: (unitId: string) => void;
  onScheduleCalendar?: (title: string, location: string) => void;
}

// GPA CD1 Anhanguera distribution hub center coordinates
const GPA_CD1_COORDS = { lat: -23.5135, lng: -46.7380 };

// Industrial perimeter bounding polygon of GPA CD1
const GPA_CD1_PERIMETER: [number, number][] = [
  [-23.5120, -46.7396],
  [-23.5122, -46.7368],
  [-23.5148, -46.7366],
  [-23.5152, -46.7392],
  [-23.5142, -46.7400],
];

interface MapLocation {
  id: string;
  name: string;
  block: string;
  type: 'block' | 'equipment' | 'chiller';
  lat: number;
  lng: number;
  description: string;
  technician: string;
  health: number;
  status: 'normal' | 'attention' | 'critical';
  details?: {
    model?: string;
    temperature?: string;
    load?: string;
    alerts?: string;
  };
}

const gpaLocations: MapLocation[] = [
  {
    id: 'loc_1965_seca',
    name: 'Bloco 1965: Mercearia Seca : RH',
    block: 'Bloco 1965',
    type: 'block',
    lat: -23.5132,
    lng: -46.7385,
    description: 'Split System Midea 18KBTU - Mercearia Seca e RH GPA CD1 (Pavimento Superior)',
    technician: 'João (Manutenção Preventiva)',
    health: 98,
    status: 'normal',
    details: {
      model: 'Split System Midea 18KBTU Inverter',
      temperature: '21.8°C Ambiente (T1)',
      load: '66% Carga Nominal',
      alerts: 'Sem alarmes ativos - PMOC em conformidade'
    }
  },
  {
    id: 'loc_1965_ecommerce',
    name: 'Bloco 1965: Ecommerce',
    block: 'Bloco 1965',
    type: 'block',
    lat: -23.5135,
    lng: -46.7388,
    description: 'Operação de Ecommerce GPA CD1 (Pavimento Inferior)',
    technician: 'João (Manutenção Preventiva)',
    health: 95,
    status: 'normal',
    details: {
      model: 'Split System Midea 18KBTU Inverter & Splits',
      temperature: '22.0°C Setpoint',
      load: '58% Carga Nominal',
      alerts: 'Sem alarmes ativos - Operação estável'
    }
  },
  {
    id: 'loc_bloco_b',
    name: 'Bloco B - Armazenamento & Câmaras',
    block: 'Bloco B',
    type: 'block',
    lat: -23.5140,
    lng: -46.7375,
    description: 'Área de estocagem refrigerada e climatizadores de grande porte galpão',
    technician: 'José Sobrinho (P. Preventiva, Corretiva e Projetos)',
    health: 82,
    status: 'attention',
    details: {
      model: 'Chillers Parafuso & Evaporadoras Blower',
      temperature: '4.8°C (Câmara Resfriados)',
      load: '84% Carga Térmica',
      alerts: 'Vibração leve detectada no Mancal 2'
    }
  },
  {
    id: 'loc_bloco_c',
    name: 'Bloco C - Cross-Docking & Expedição',
    block: 'Bloco C',
    type: 'block',
    lat: -23.5138,
    lng: -46.7392,
    description: 'Cortinas de ar e climatizadores de duto galpão logístico de saída',
    technician: 'Silvio Martinelli (P. Preventiva, Corretiva e Projeto)',
    health: 91,
    status: 'normal',
    details: {
      model: 'FanCoil Dutos 15TR Midea',
      temperature: '23.8°C Ambiente',
      load: '65% Carga Nominal',
      alerts: 'Filtro G4 substituído na última rotina'
    }
  },
  {
    id: 'loc_apoio',
    name: 'Prédio Apoio & Casa de Máquinas (CAG)',
    block: 'Apoio',
    type: 'chiller',
    lat: -23.5126,
    lng: -46.7378,
    description: 'Central de água gelada (Chillers) e subestação elétrica de média tensão',
    technician: 'José Sobrinho & Silvio Martinelli',
    health: 65,
    status: 'critical',
    details: {
      model: '2x Chillers Centrifugos 250TR + BAG',
      temperature: '7.2°C Saída Água Gelada',
      load: '92% Carga de Pico',
      alerts: 'Pressão diferencial de condensação elevada'
    }
  },
  {
    id: 'loc_av_01',
    name: 'AirVolution R8 - CLIM-01 (Split System Midea 18KBTU)',
    block: 'Bloco 1965 (Mercearia Seca : RH)',
    type: 'equipment',
    lat: -23.5131,
    lng: -46.7383,
    description: 'Split System Midea 18KBTU | Monitoramento M-Smart LAN V3 ativo em tempo real',
    technician: 'João / José Sobrinho',
    health: 96,
    status: 'normal',
    details: {
      model: 'Split System Midea 18KBTU',
      temperature: '21.0°C Insuflamento',
      load: '48% Frequência Inverter',
      alerts: 'Comunicação R8 estável (Ping 12ms)'
    }
  },
  {
    id: 'loc_av_02',
    name: 'AirVolution R8 - CLIM-02',
    block: 'Bloco B (Log)',
    type: 'equipment',
    lat: -23.5142,
    lng: -46.7377,
    description: 'Midea 18.000 BTU | Carga térmica 78% | COP 3.42',
    technician: 'José Sobrinho',
    health: 88,
    status: 'normal',
    details: {
      model: 'AirVolution R8 Inverter 18k',
      temperature: '23.2°C Insuflamento',
      load: '78% Carga Térmica',
      alerts: 'Consumo energético nominal 1.42 kW'
    }
  },
  {
    id: 'loc_av_03',
    name: 'AirVolution R8 - CLIM-03',
    block: 'Apoio Manutenção',
    type: 'equipment',
    lat: -23.5128,
    lng: -46.7379,
    description: 'Midea 18.000 BTU | ΔT Térmico 8.1°C (Subarrefecimento moderado)',
    technician: 'Silvio Martinelli',
    health: 74,
    status: 'attention',
    details: {
      model: 'AirVolution R8 Inverter 18k',
      temperature: '25.6°C Insuflamento',
      load: '88% Carga Alta',
      alerts: 'Aferir carga de fluido refrigerante R-410A'
    }
  },
];

// Free Open Box / OpenStreetMap Tile providers
type TileProviderKey = 'carto_light' | 'osm' | 'esri_sat' | 'carto_dark';

interface TileProvider {
  name: string;
  sub: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const TILE_PROVIDERS: Record<TileProviderKey, TileProvider> = {
  carto_light: {
    name: 'Open Positron (Clean)',
    sub: 'Interface clara de alta legibilidade',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20
  },
  osm: {
    name: 'OpenStreetMap (Livre)',
    sub: 'Mapa mundial comunitário 100% gratuito',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  esri_sat: {
    name: 'Satélite Aberto (Esri)',
    sub: 'Foto aérea real do Centro de Distribuição',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  },
  carto_dark: {
    name: 'Dark Matter (Contraste)',
    sub: 'Modo noturno e telemetria industrial',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20
  }
};

export function GpaMapsView({ airVolutionUnits, onOpenOS, onScheduleCalendar }: GpaMapsViewProps) {
  const [selectedLoc, setSelectedLoc] = useState<MapLocation | null>(gpaLocations[0]);
  const [filterType, setFilterType] = useState<'all' | 'block' | 'equipment' | 'chiller'>('all');
  const [activeTileKey, setActiveTileKey] = useState<TileProviderKey>('carto_light');
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const filteredLocations = filterType === 'all' 
    ? gpaLocations 
    : gpaLocations.filter(loc => loc.type === filterType);

  // Initialize Leaflet Map with Open Box / Free OpenStreetMap Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map already initialized on this container
    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [GPA_CD1_COORDS.lat, GPA_CD1_COORDS.lng],
        zoom: 17,
        zoomControl: false,
        attributionControl: true
      });

      // Add zoom control top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add Initial Tile Layer
      const initialProvider = TILE_PROVIDERS[activeTileKey];
      const tileLayer = L.tileLayer(initialProvider.url, {
        attribution: initialProvider.attribution,
        maxZoom: initialProvider.maxZoom,
        subdomains: 'abcd'
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Draw GPA CD1 Campus Boundary Polygon
      const campusPolygon = L.polygon(GPA_CD1_PERIMETER, {
        color: '#2563eb',
        weight: 2,
        dashArray: '5, 8',
        fillColor: '#3b82f6',
        fillOpacity: 0.08
      }).addTo(map);
      campusPolygon.bindTooltip('Campus Industrial GPA CD1 • 85.000 m²', {
        sticky: true,
        className: 'text-xs font-bold text-slate-800'
      });

      // Group for markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      leafletMapRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when user switches style
  useEffect(() => {
    if (!leafletMapRef.current) return;

    if (tileLayerRef.current) {
      leafletMapRef.current.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[activeTileKey];
    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: 'abcd'
    }).addTo(leafletMapRef.current);

    tileLayerRef.current = newTileLayer;
  }, [activeTileKey]);

  // Update Markers when filter or selectedLoc changes
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredLocations.forEach((loc) => {
      const isSelected = selectedLoc?.id === loc.id;
      
      const statusColor = 
        loc.status === 'normal' ? '#10b981' :
        loc.status === 'attention' ? '#f59e0b' : '#ef4444';

      const statusBg = 
        loc.status === 'normal' ? 'bg-emerald-500' :
        loc.status === 'attention' ? 'bg-amber-500' : 'bg-red-500';

      const statusRing = 
        loc.status === 'normal' ? 'ring-emerald-300' :
        loc.status === 'attention' ? 'ring-amber-300' : 'ring-red-300';

      // Custom HTML Marker using Leaflet DivIcon
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${isSelected ? `
            <span class="absolute -inset-2 rounded-full ${statusBg} opacity-30 animate-ping"></span>
          ` : ''}
          <div class="w-9 h-9 rounded-2xl ${isSelected ? 'scale-110 shadow-xl ring-4 ring-white' : 'shadow-md'} ${statusBg} flex items-center justify-center text-white font-bold text-xs transition-all duration-300 transform group-hover:scale-110">
            ${loc.type === 'equipment' ? 'R8' : loc.type === 'chiller' ? 'CAG' : loc.block.replace('Bloco ', '')}
          </div>
          <span class="absolute -bottom-1 w-2 h-2 rounded-full bg-white shadow"></span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedLoc(loc);
        leafletMapRef.current?.flyTo([loc.lat, loc.lng], 18, {
          duration: 0.8
        });
      });

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${loc.block}</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${loc.name}</div>
          <p style="font-size: 11px; color: #475569; margin: 4px 0 8px 0; line-height: 1.4;">${loc.description}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 11px;">
            <span style="font-weight: 700; color: ${statusColor};">Saúde: ${loc.health}%</span>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: #f1f5f9; color: #334155; text-transform: uppercase;">${loc.status}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false });

      if (isSelected) {
        marker.openPopup();
      }

      markersLayerRef.current?.addLayer(marker);
    });
  }, [filteredLocations, selectedLoc]);

  // Center map on selected location
  const handleFlyTo = (loc: MapLocation) => {
    setSelectedLoc(loc);
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([loc.lat, loc.lng], 18, {
        duration: 1.0
      });
    }
  };

  const handleResetView = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([GPA_CD1_COORDS.lat, GPA_CD1_COORDS.lng], 17, {
        duration: 1.0
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Open Box Free Engine Information */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-blue-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Open Box • 100% Free Engine
            </span>
            <span className="bg-white/10 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              OpenStreetMap + Leaflet
            </span>
            <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Sem Chave ou Fatura
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-white">
            Mapa Operacional de Instalações & HVAC GPA CD1
          </h2>
          <p className="text-xs text-blue-200/80 max-w-2xl leading-relaxed">
            Navegação geoespacial das centrais de climatização, galpões e nós do AirVolution Monitor R8 utilizando tecnologia aberta, livre de quotas de consumo e com camadas de satélite e vetores industriais.
          </p>
        </div>

        {/* Quick Engine Stats */}
        <div className="grid grid-cols-3 gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/10 shrink-0 w-full sm:w-auto">
          <div className="text-center px-3 border-r border-white/10">
            <span className="text-[10px] text-blue-200 uppercase font-bold block">Pontos</span>
            <span className="text-lg font-bold font-mono text-white">{gpaLocations.length}</span>
          </div>
          <div className="text-center px-3 border-r border-white/10">
            <span className="text-[10px] text-blue-200 uppercase font-bold block">Saúde Média</span>
            <span className="text-lg font-bold font-mono text-emerald-400">84.7%</span>
          </div>
          <div className="text-center px-3">
            <span className="text-[10px] text-blue-200 uppercase font-bold block">Status</span>
            <span className="text-lg font-bold font-mono text-blue-300">100% Livre</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Layer Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter chips */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm overflow-x-auto">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({gpaLocations.length})
          </button>
          <button 
            onClick={() => setFilterType('block')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'block' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Blocos GPA
          </button>
          <button 
            onClick={() => setFilterType('equipment')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'equipment' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Sensores AirVolution R8
          </button>
          <button 
            onClick={() => setFilterType('chiller')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'chiller' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Central CAG (Chillers)
          </button>
        </div>

        {/* Free Tile Layer Selection */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
          <div className="px-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Camada Grátis:</span>
          </div>
          {(Object.keys(TILE_PROVIDERS) as TileProviderKey[]).map((key) => {
            const provider = TILE_PROVIDERS[key];
            const isActive = activeTileKey === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTileKey(key)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={provider.sub}
              >
                {key === 'carto_light' ? 'Positron' : 
                 key === 'osm' ? 'OSM Standard' : 
                 key === 'esri_sat' ? 'Satélite' : 'Dark'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Open Box Free Map Canvas + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] relative">
          {/* Top Bar on Map */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-500 z-10">
            <span className="flex items-center gap-2 font-bold text-slate-700">
              <Navigation className="w-4 h-4 text-blue-600" />
              GPA CD1 Anhanguera • São Paulo, SP
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleResetView}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Centralizar no CD1"
              >
                <Compass className="w-3 h-3 text-blue-600" />
                <span>Resetar Vista</span>
              </button>
              <span className="text-[10px] uppercase font-mono text-slate-400">
                -23.5135°, -46.7380°
              </span>
            </div>
          </div>

          {/* Leaflet Map Div */}
          <div className="flex-1 w-full h-full relative">
            <div 
              ref={mapContainerRef} 
              id="openbox-gpa-map"
              className="w-full h-full z-0"
              style={{ minHeight: '520px' }}
            />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md border border-slate-200/80 p-3 rounded-2xl shadow-lg text-[11px] space-y-1.5 pointer-events-auto">
              <p className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Legenda de Status</p>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Normal (&gt;85% saúde)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Atenção (70-85%)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>Crítico (&lt;70% / Alarme)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Inspector Panel */}
        <div className="space-y-4">
          {selectedLoc ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                    {selectedLoc.block} • {selectedLoc.type.toUpperCase()}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 font-display leading-tight">
                    {selectedLoc.name}
                  </h3>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${
                  selectedLoc.status === 'normal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  selectedLoc.status === 'attention' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {selectedLoc.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedLoc.description}
              </p>

              {/* Technical Specifications */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Responsável Técnico</span>
                  <span className="font-bold text-slate-800">{selectedLoc.technician}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Índice Manutenibilidade</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          selectedLoc.health > 85 ? 'bg-emerald-500' :
                          selectedLoc.health > 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedLoc.health}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-900">{selectedLoc.health}%</span>
                  </div>
                </div>
                {selectedLoc.details && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Temperatura / Setpoint</span>
                      <span className="font-mono font-bold text-slate-800">{selectedLoc.details.temperature}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Carga Operacional</span>
                      <span className="font-mono text-slate-700 font-semibold">{selectedLoc.details.load}</span>
                    </div>
                    <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Diagnóstico Rápido:</span>
                      {selectedLoc.details.alerts}
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Coordenadas OpenBox</span>
                  <span className="font-mono text-[11px] text-blue-600">
                    {selectedLoc.lat.toFixed(4)}, {selectedLoc.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onScheduleCalendar && onScheduleCalendar(
                    `Inspeção PMOC - ${selectedLoc.name}`,
                    `GPA CD1 - ${selectedLoc.block}`
                  )}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Agendar no Google Calendar</span>
                </button>

                <button
                  onClick={() => onOpenOS && onOpenOS(selectedLoc.id)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wrench className="w-4 h-4 text-slate-600" />
                  <span>Emitir Ordem de Serviço</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 py-20">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold">Selecione um ponto no mapa para inspecionar</p>
            </div>
          )}

          {/* Location Quick List */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-3">
              Locais Monitorados ({filteredLocations.length})
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filteredLocations.map(loc => (
                <div
                  key={loc.id}
                  onClick={() => handleFlyTo(loc)}
                  className={`p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-between transition-all ${
                    selectedLoc?.id === loc.id 
                      ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="block truncate">{loc.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{loc.block}</span>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    loc.status === 'normal' ? 'bg-emerald-500' :
                    loc.status === 'attention' ? 'bg-amber-400' : 'bg-red-500'
                  }`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle } from 'lucide-react';

/**
 * Carga diferida de componentes de react-leaflet para evitar errores de SSR/hidratación.
 * Este componente es client-only y depende de APIs del navegador/DOM.
 */
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// Import local del CSS para garantizar estilos del mapa en cualquier ruta que use el componente.
import 'leaflet/dist/leaflet.css';

// Íconos de marcador inicializados únicamente en cliente.
let customIcon: L.Icon | null = null;
let draggingIcon: L.Icon | null = null;

/**
 * Ajuste del marcador default de Leaflet para que funcione correctamente en Next.js.
 * También define íconos custom para estado normal y durante drag.
 */
if (typeof window !== 'undefined') {
  import('leaflet').then(L => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: '',  // No shadow
    });
    
    // Create custom icon for normal state - NO SHADOW
    customIcon = new L.Icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: '',  // No shadow
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [0, 0],
    });
    
    // Create larger icon for dragging state - NO SHADOW
    draggingIcon = new L.Icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: '',  // No shadow
      iconSize: [30, 49],
      iconAnchor: [15, 49],
      popupAnchor: [1, -34],
      shadowSize: [0, 0],
    });
  });
}

type LocationPickerVariant = 'default' | 'flat' | 'borderless';
type LocationPickerRounded = 'none' | 'sm' | 'md' | 'lg' | 'full';
type CursorState = 'default' | 'targeting' | 'grabbing' | 'clicked';
type LocationPickerMode = 'viewer' | 'edit' | 'update';

/**
 * Props públicas de LocationPicker.
 *
 * Modos:
 * - viewer: solo visualización (sin interacción)
 * - edit: creación/selección de ubicación (intenta geolocalizar al usuario)
 * - update: edición de ubicación existente (prioriza externalPosition)
 */
interface LocationPickerProps {
  /** Callback principal que emite la coordenada seleccionada o null. */
  onChange?: (coordinates: { lat: number; lng: number } | null) => void;
  /** Latitud inicial cuando no existe posición previa. */
  initialLat?: number;
  /** Longitud inicial cuando no existe posición previa. */
  initialLng?: number;
  /** Estilo predefinido: default (borde + rounded), flat (sin borde), borderless (sin borde ni fondo) */
  variant?: LocationPickerVariant;
  /** Control del border-radius: none, sm, md, lg, full */
  rounded?: LocationPickerRounded;
  /** Clases CSS adicionales para el contenedor */
  className?: string;
  /** Permite arrastrar el marcador para reposicionarlo (default: true) */
  draggable?: boolean;
  /** Modo del componente: viewer (solo visualización), edit (definir ubicación), update (editar ubicación existente) */
  mode?: LocationPickerMode;
  /** Zoom inicial del mapa (default: 13) */
  zoom?: number;
  /** Altura del mapa en vh. Si no se especifica, usa altura fija de 200px */
  height?: number;
  /** Posición externa para modo update (se ignora en otros modos) */
  externalPosition?: { lat: number; lng: number };
}

const roundedClasses: Record<LocationPickerRounded, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-xl',
};

const variantClasses: Record<LocationPickerVariant, string> = {
  default: 'border border-gray-200',
  flat: '',
  borderless: '',
};

// Clases CSS para feedback visual del cursor según interacción con el mapa.
const cursorClasses: Record<CursorState, string> = {
  default: 'cursor-default',
  targeting: 'cursor-crosshair',   // Buscando dónde hacer click
  grabbing: 'cursor-grabbing',     // Arrastrando el mapa
  clicked: 'cursor-crosshair',     // Click realizado
};

/**
 * Marcador arrastrable encapsulado para:
 * - cambiar ícono durante drag
 * - normalizar el callback de posición final
 */
const DraggableMarker = ({ 
  position, 
  draggable, 
  onDragEnd,
}: { 
  position: { lat: number; lng: number }; 
  draggable: boolean;
  onDragEnd: (newPos: { lat: number; lng: number }) => void;
}) => {
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(() => ({
    dragstart: () => {
      const marker = markerRef.current;
      if (marker && draggingIcon) {
        marker.setIcon(draggingIcon);
      }
    },
    dragend: () => {
      const marker = markerRef.current;
      if (marker) {
        if (customIcon) {
          marker.setIcon(customIcon);
        }
        const latlng = marker.getLatLng();
        onDragEnd({ lat: latlng.lat, lng: latlng.lng });
      }
    },
  }), [onDragEnd]);

  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable={draggable}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  );
};

/**
 * Controlador de centrado inicial del mapa.
 * Evita recentrados repetidos usando una referencia mutable.
 */
const MapController = ({ 
  positionToCenter, 
  zoom,
  hasCenteredRef 
}: { 
  positionToCenter: { lat: number; lng: number } | null; 
  zoom: number;
  hasCenteredRef: React.MutableRefObject<boolean>;
}) => {
  const map = (require('react-leaflet') as any).useMap();

  useEffect(() => {
    if (positionToCenter && !hasCenteredRef.current && map) {
      map.setView([positionToCenter.lat, positionToCenter.lng], zoom);
      hasCenteredRef.current = true;
    }
  }, [positionToCenter, zoom, map, hasCenteredRef]);

  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onChange, 
  initialLat = 19.4326, 
  initialLng = -99.1332,
  variant = 'default',
  rounded = 'md',
  className = '',
  draggable = true,
  mode = 'viewer',
  zoom = 13,
  height,
  externalPosition,
}) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [showClickEffect, setShowClickEffect] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCenteredInitially = useRef(false);
  const [positionToCenter, setPositionToCenter] = useState<{ lat: number; lng: number } | null>(null);

  // El mapa solo es interactivo en edit/update.
  const isEditable = mode === 'edit' || mode === 'update';
  
  /**
   * Flujo de inicialización de posición:
   * 1) update + externalPosition -> usa posición externa.
   * 2) edit sin posición previa -> intenta geolocalización del navegador.
   * 3) initialLat/initialLng válidos -> usa coordenadas iniciales.
   * 4) fallback final -> Santiago, Chile.
   */
  useEffect(() => {
    // Permite recentrar una única vez cuando cambian datos fuente.
    hasCenteredInitially.current = false;
    
    if (mode === 'update' && externalPosition) {
      // update: siempre prioriza coordenadas externas.
      setPosition(externalPosition);
      // No requiere setPositionToCenter: MapContainer ya nace centrado ahí.
    } else if (mode === 'edit' && !position) {
      // edit: intenta ubicar al usuario para acelerar selección.
      if (typeof window === 'undefined') {
        return;
      }

      // Delay corto para asegurar mapa/DOM listos antes de geolocalizar.
      const timer = setTimeout(() => {
        getCurrentLocation();
      }, 100);

      return () => clearTimeout(timer);
    } else if (initialLat && initialLng && !position) {
      // Usa coordenadas iniciales provistas por props.
      const initialPos = { lat: initialLat, lng: initialLng };
      setPosition(initialPos);
      setPositionToCenter(initialPos);
    } else if (!position) {
      // Última alternativa para garantizar render consistente.
      const defaultPos = { lat: -33.4489, lng: -70.6693 }; // Santiago, Chile
      setPosition(defaultPos);
      setPositionToCenter(defaultPos);
      onChange?.(defaultPos);
    }
  }, [mode, externalPosition, initialLat, initialLng, position]);

  /**
   * Intenta obtener ubicación actual del usuario vía Geolocation API.
   * En error/permisos denegados aplica fallback seguro (Santiago).
   */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('La geolocalización no está soportada por este navegador');
      return;
    }

    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPosition(newPos);
        setPositionToCenter(newPos);
        onChange?.(newPos);
      },
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado';
            break;
        }
        setLocationError(errorMessage);

        // Fallback defensivo para no dejar el mapa sin referencia.
        const fallbackPos = { lat: -33.4489, lng: -70.6693 }; // Santiago, Chile
        setPosition(fallbackPos);
        setPositionToCenter(fallbackPos);
        onChange?.(fallbackPos);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutos
      }
    );
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (!isEditable) return; // viewer: ignora clicks para mantener modo solo lectura.
    
    const newPosition = { lat: e.latlng.lat, lng: e.latlng.lng };
    setPosition(newPosition);
    onChange?.(newPosition);
    
    // Ripple visual para confirmar interacción al usuario.
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setClickPosition({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
      });
      setShowClickEffect(true);
      setTimeout(() => setShowClickEffect(false), 800);
    }
  };

  /**
   * Bridge de eventos de Leaflet:
   * - click: define nueva posición
   * - drag/mouse: actualiza estado del cursor para feedback UX
   */
  const MapEvents = () => {
    const map = (require('react-leaflet') as any).useMapEvents({
      click: (e: L.LeafletMouseEvent) => {
        if (isEditable) handleMapClick(e);
      },
      mousedown: () => isEditable && setCursorState('grabbing'),
      mouseup: () => isEditable && setCursorState('targeting'),
      dragstart: () => isEditable && setCursorState('grabbing'),
      dragend: () => isEditable && setCursorState('targeting'),
      mouseover: () => isEditable && setCursorState('targeting'),
      mouseout: () => setCursorState('default'),
    });
    return null;
  };

  const containerClasses = [
    'location-container overflow-hidden relative',
    variantClasses[variant],
    roundedClasses[rounded],
    !isEditable ? 'pointer-events-none' : '', // Bloquea interacción en modo viewer.
    className,
  ].filter(Boolean).join(' ');

  // Altura configurable por vh o fija para uso en formularios compactos.
  // zIndex 0 evita superposición con overlays/footers externos.
  const containerStyle: React.CSSProperties = height 
    ? { zIndex: 0, height: `${height}vh`, width: '100%' }
    : { zIndex: 0, height: '200px', width: '100%' };

  return (
    <div 
      ref={containerRef}
      className={containerClasses} 
      style={containerStyle}
    >
      {/* Banner de error de geolocalización (no bloquea uso manual del mapa). */}
      {locationError && (
        <div className="absolute top-2 right-2 z-1000 max-w-xs">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-500" size={20} />
              <span className="text-red-700 text-sm font-medium">{locationError}</span>
            </div>
          </div>
        </div>
      )}

      {/* Ripple visual al seleccionar una coordenada por click. */}
      {isEditable && showClickEffect && clickPosition && (
        <div
          className="absolute pointer-events-none z-1000"
          style={{
            left: clickPosition.x - 20,
            top: clickPosition.y - 20,
          }}
        >
          <div className="w-10 h-10 rounded-full border-2 border-primary animate-ping opacity-75" />
          <div 
            className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-primary animate-pulse"
          />
        </div>
      )}
      
      <MapContainer
        // En update se centra en externalPosition; en otros modos usa inicial o fallback.
        center={
          mode === 'update' && externalPosition
            ? [externalPosition.lat, externalPosition.lng]
            : [initialLat || -33.4489, initialLng || -70.6693]
        }
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
        className={!isEditable ? 'cursor-default' : cursorClasses[cursorState]}
        dragging={isEditable}
        zoomControl={isEditable}
        scrollWheelZoom={isEditable}
        doubleClickZoom={isEditable}
        touchZoom={isEditable}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController 
          positionToCenter={positionToCenter} 
          zoom={zoom} 
          hasCenteredRef={hasCenteredInitially} 
        />
        {isEditable && <MapEvents />}
        {position && (
          <DraggableMarker 
            position={position}
            draggable={isEditable && draggable}
            onDragEnd={(newPos: { lat: number; lng: number }) => {
              if (isEditable) {
                setPosition(newPos);
                onChange?.(newPos);
              }
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationPicker;
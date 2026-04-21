# Tabs Component - Sistema Unificado

El componente `Tabs` es el sistema universal de navegación por tabs para toda la web-admin.

## Ubicación
- **Componente Base**: `/shared/components/ui/Tabs/Tabs.tsx`
- **Uso en features**: `{feature}/components/{Feature}Tabs.tsx` (wrapper simple)

## Uso

### 1. Crear Tabs para tu Feature

**Archivo**: `/app/admin/{feature}/components/{Feature}Tabs.tsx`

```typescript
"use client";

import Tabs, { TabItem } from '@/shared/components/ui/Tabs/Tabs';

const featureTabs: TabItem[] = [
  { label: 'Tab 1', url: '/admin/feature/tab1' },
  { label: 'Tab 2', url: '/admin/feature/tab2' },
  { label: 'Tab 3', url: '/admin/feature/tab3' },
];

export default function FeatureTabs() {
  return <Tabs items={featureTabs} />;
}
```

### 2. Usar en Layout

**Archivo**: `/app/admin/{feature}/layout.tsx`

```typescript
"use client";

import FeatureTabs from './components/FeatureTabs';

export default function FeatureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <FeatureTabs />
      </div>
      
      {/* Content */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
```

### 3. Index Page - Redirect

**Archivo**: `/app/admin/{feature}/page.tsx`

```typescript
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeatureIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to first tab
    router.replace('/admin/feature/tab1');
  }, [router]);

  return null;
}
```

## TabItem Interface

```typescript
export interface TabItem {
  url: string;    // Full URL to navigate to
  label: string;  // Display text
}
```

## Propiedades

| Prop | Tipo | Opcional | Descripción |
|------|------|----------|------------|
| `items` | `TabItem[]` | No | Array de tabs a renderizar |
| `activeTab` | `string` | Sí | URL explícita del tab activo (auto-detect si omite) |

## Estilos

- **Active Tab**: `border-primary text-primary`
- **Inactive Tab**: `text-neutral-600 hover:border-gray-300`
- **Border**: `border-b border-gray-200`
- **Padding**: `px-6 py-3`
- **Font**: `text-sm font-medium`

## Características

✅ Auto-detección de tab activo por URL  
✅ Navegación limpia sin query params  
✅ Design system compliant (primary colors)  
✅ Reutilizable en cualquier sección  
✅ Accessible (aria-current="page")  
✅ Responsive

## Ejemplos en Proyecto

- **Accounting**: `/app/admin/accounting/components/AccountingTabs.tsx`
- **Más features**: Seguir el mismo patrón

## Actualizar Sistema de Tabs

Si necesitas cambiar estilos o comportamiento global:

1. Editar `/shared/components/ui/Tabs/Tabs.tsx`
2. Correr `npm run build`
3. ¡Todos los tabs del proyecto se actualizan automáticamente!

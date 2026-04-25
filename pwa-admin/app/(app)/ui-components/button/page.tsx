'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button/Button';

export default function ButtonPage() {
  const [clickCount, setClickCount] = useState(0);

  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Button Component Showcase</h1>
        <p className="text-gray-600">Testing different button variants and states</p>
      </div>

      {/* Variants */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Variants</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary (relleno)</p>
            <Button variant="primary">Primary</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Outlined</p>
            <Button variant="outlined">Outlined</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Text</p>
            <Button variant="text">Text</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Disabled</p>
            <Button disabled>Disabled</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Loading</p>
            <Button loading>Loading</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Full Width</p>
            <Button className="w-full">Full Width</Button>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Colors</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="outlinedSecondary">Outlined secondary</Button>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      {/* Interactive Example */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Interactive Example</h2>
        <div className="space-y-4">
          <p className="text-lg">Click count: <span className="font-bold text-primary">{clickCount}</span></p>
          <Button 
            onClick={() => setClickCount(clickCount + 1)}
            variant="primary"
          >
            Click Me! ({clickCount})
          </Button>
          <Button 
            onClick={() => setClickCount(0)}
            variant="outlined"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

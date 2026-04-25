'use client';

import { useState } from 'react';
import Switch from '@/shared/components/Switch/Switch';

export default function SwitchPage() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);

  return (
    <div className="space-y-10 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Switch</h1>
        <p className="text-gray-600">Binary toggle; optional label on the left or right; disabled state.</p>
      </div>
      <div className="max-w-md space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Label on the left (default)</p>
          <Switch label="Enable notifications" checked={a} onChange={setA} />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Label on the right</p>
          <Switch label="Public profile" labelPosition="right" checked={b} onChange={setB} />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Disabled (off)</p>
          <Switch label="Locked feature" checked={c} onChange={setC} disabled />
        </div>
      </div>
    </div>
  );
}

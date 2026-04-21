'use client';

import IconButton from '@/shared/components/IconButton/IconButton';

export default function IconButtonPage() {
  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Icon Button Component Showcase</h1>
        <p className="text-gray-600">Testing IconButton with lucide-react icons</p>
      </div>

      {/* Variants */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Variants</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Contained Primary</p>
            <IconButton icon="Heart" variant="containedPrimary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Contained Secondary</p>
            <IconButton icon="Star" variant="containedSecondary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Text</p>
            <IconButton icon="Settings" variant="text" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Basic</p>
            <IconButton icon="Menu" variant="basic" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Outlined</p>
            <IconButton icon="Plus" variant="outlined" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Ghost</p>
            <IconButton icon="X" variant="ghost" />
          </div>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">XS</p>
            <IconButton icon="Edit" size="xs" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">SM</p>
            <IconButton icon="Edit" size="sm" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">MD</p>
            <IconButton icon="Edit" size="md" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">LG</p>
            <IconButton icon="Edit" size="lg" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">XL</p>
            <IconButton icon="Edit" size="xl" />
          </div>
        </div>
      </div>

      {/* Icons Collection */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Common Icons</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {['Home', 'Settings', 'User', 'Lock', 'Eye', 'EyeOff', 'Trash2', 'Download', 'Upload', 'Copy', 'Check', 'AlertCircle'].map((icon) => (
            <div key={icon} className="flex flex-col items-center gap-2">
              <IconButton icon={icon as any} variant="basic" />
              <p className="text-xs text-gray-600 text-center">{icon}</p>
            </div>
          ))}
        </div>
      </div>

      {/* States */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">States</h2>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Disabled</p>
            <IconButton icon="Save" disabled />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Loading</p>
            <IconButton icon="Loader" isLoading />
          </div>
        </div>
      </div>
    </div>
  );
}

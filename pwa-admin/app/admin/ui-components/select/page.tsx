'use client';

import { useState } from 'react';
import { Select } from '@/shared/components/Select/Select';

export default function SelectPage() {
  const [selectedValue1, setSelectedValue1] = useState('');
  const [selectedValue2, setSelectedValue2] = useState('');
  const [selectedValue3, setSelectedValue3] = useState('');

  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
    { value: 'option4', label: 'Option 4' },
    { value: 'option5', label: 'Option 5' },
  ];

  const roleOptions = [
    { value: 'admin', label: 'Administrator' },
    { value: 'operator', label: 'Operator' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'guest', label: 'Guest' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Select Component Showcase</h1>
        <p className="text-gray-600">Testing dropdown select functionality</p>
      </div>

      {/* Basic Select */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Basic Select</h2>
        <div className="max-w-md">
          <Select
            label="Choose an option"
            options={options}
            value={selectedValue1}
            onChange={setSelectedValue1}
          />
          {selectedValue1 && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: <span className="font-semibold">{selectedValue1}</span>
            </p>
          )}
        </div>
      </div>

      {/* Role Select */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Role Selection</h2>
        <div className="max-w-md">
          <Select
            label="Select a role"
            options={roleOptions}
            value={selectedValue2}
            onChange={setSelectedValue2}
          />
          {selectedValue2 && (
            <p className="mt-2 text-sm text-gray-600">
              Role: <span className="font-semibold capitalize">{selectedValue2}</span>
            </p>
          )}
        </div>
      </div>

      {/* Status Select */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Status Selection</h2>
        <div className="max-w-md">
          <Select
            label="Select status"
            options={statusOptions}
            value={selectedValue3}
            onChange={setSelectedValue3}
          />
          {selectedValue3 && (
            <p className="mt-2 text-sm text-gray-600">
              Status: <span className="font-semibold capitalize">{selectedValue3}</span>
            </p>
          )}
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Features</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Dropdown menu with multiple options</li>
          <li>Keyboard navigation (arrow keys)</li>
          <li>Mouse click selection</li>
          <li>Customizable label</li>
          <li>Selected value display</li>
          <li>Disabled state support</li>
        </ul>
      </div>

      {/* Form Group Example */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h2 className="text-2xl font-semibold mb-6">Form Group Example</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Select
            label="Role"
            options={roleOptions}
            value={selectedValue2}
            onChange={setSelectedValue2}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={selectedValue3}
            onChange={setSelectedValue3}
          />
        </div>
      </div>
    </div>
  );
}

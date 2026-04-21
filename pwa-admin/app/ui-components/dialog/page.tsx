'use client';

import { useState } from 'react';
import { Dialog } from '@/shared/components/Dialog/Dialog';
import { Button } from '@/shared/components/Button/Button';

export default function DialogPage() {
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [isOpen3, setIsOpen3] = useState(false);
  const [dialogResult, setDialogResult] = useState('');

  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dialog Component Showcase</h1>
        <p className="text-gray-600">Testing modal dialogs and confirmation dialogs</p>
      </div>

      {/* Basic Dialog */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Basic Dialog</h2>
        <Button onClick={() => setIsOpen1(true)}>Open Basic Dialog</Button>
        <Dialog
          isOpen={isOpen1}
          onClose={() => setIsOpen1(false)}
          title="Welcome"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              This is a basic dialog component. It displays content in a modal overlay with a title and close button.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outlined" onClick={() => setIsOpen1(false)}>
                Close
              </Button>
              <Button onClick={() => { setIsOpen1(false); setDialogResult('Confirmed basic'); }}>
                Confirm
              </Button>
            </div>
          </div>
        </Dialog>
      </div>

      {/* Confirmation Dialog */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Confirmation Dialog</h2>
        <Button onClick={() => setIsOpen2(true)}>Open Confirmation</Button>
        <Dialog
          isOpen={isOpen2}
          onClose={() => setIsOpen2(false)}
          title="Confirm Action"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to proceed with this action? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outlined" onClick={() => setIsOpen2(false)}>
                Cancel
              </Button>
              <Button color="danger" onClick={() => { setIsOpen2(false); setDialogResult('Action confirmed'); }}>
                Delete
              </Button>
            </div>
          </div>
        </Dialog>
      </div>

      {/* Info Dialog */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Info Dialog</h2>
        <Button onClick={() => setIsOpen3(true)}>Open Info</Button>
        <Dialog
          isOpen={isOpen3}
          onClose={() => setIsOpen3(false)}
          title="Information"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-blue-900 text-sm">
                <strong>Note:</strong> This is an informational dialog. It displays important information to the user.
              </p>
            </div>
            <p className="text-gray-700">
              Dialogs are useful for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>Confirming user actions</li>
              <li>Displaying important information</li>
              <li>Collecting user input</li>
              <li>Showing alerts or warnings</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setIsOpen3(false)}>
                OK
              </Button>
            </div>
          </div>
        </Dialog>
      </div>

      {/* Last Result */}
      {dialogResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-900">
            <strong>Last action:</strong> {dialogResult}
          </p>
        </div>
      )}

      {/* Features */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Features</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Modal overlay with backdrop</li>
          <li>Customizable title</li>
          <li>Close on backdrop click</li>
          <li>Keyboard support (ESC to close)</li>
          <li>Flexible content area</li>
          <li>Action button support</li>
          <li>Responsive design</li>
        </ul>
      </div>
    </div>
  );
}

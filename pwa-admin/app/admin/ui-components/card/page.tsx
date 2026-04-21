'use client';

import { Card } from '@/shared/components/Card/Card';

export default function CardPage() {
  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Card Component Showcase</h1>
        <p className="text-gray-600">Testing card layouts and styling</p>
      </div>

      {/* Basic Card */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Basic Card</h2>
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Card Title</h3>
            <p className="text-gray-600">
              This is a basic card component. It provides a container with subtle styling and shadow effects.
            </p>
          </div>
        </Card>
      </div>

      {/* Card with Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Cards with Header and Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <div className="p-6 space-y-4">
              <div className="bg-blue-100 h-24 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold">Analytics</h3>
              <p className="text-sm text-gray-600">
                Track and monitor key metrics and performance indicators.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <div className="bg-green-100 h-24 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold">Tasks</h3>
              <p className="text-sm text-gray-600">
                Manage and track your tasks with ease and efficiency.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <div className="bg-purple-100 h-24 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-lg font-semibold">Settings</h3>
              <p className="text-sm text-gray-600">
                Configure and customize your application preferences.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Statistics Cards */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Statistics Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-2">Total Users</p>
              <p className="text-3xl font-bold text-primary">1,234</p>
              <p className="text-xs text-gray-500 mt-2">+12% from last month</p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-2">Revenue</p>
              <p className="text-3xl font-bold text-green-600">$45,678</p>
              <p className="text-xs text-gray-500 mt-2">+8% from last month</p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-2">Orders</p>
              <p className="text-3xl font-bold text-blue-600">567</p>
              <p className="text-xs text-gray-500 mt-2">+5% from last month</p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-2">Conversion</p>
              <p className="text-3xl font-bold text-orange-600">3.45%</p>
              <p className="text-xs text-gray-500 mt-2">+0.2% from last month</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Card with Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Card with Actions</h2>
        <Card>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Featured Project</h3>
                <p className="text-sm text-gray-600">Latest updates and information</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">Active</span>
            </div>
            <p className="text-gray-700 mb-6">
              This is a featured project card with additional information and action buttons.
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm font-medium">
                View Details
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">
                Edit
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Card Component Features</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Subtle shadow and border styling</li>
          <li>Responsive padding and spacing</li>
          <li>Flexible content layout</li>
          <li>Works with any content type</li>
          <li>Hover effects for interactivity</li>
          <li>Clean, modern appearance</li>
          <li>Easily customizable via CSS classes</li>
        </ul>
      </div>
    </div>
  );
}

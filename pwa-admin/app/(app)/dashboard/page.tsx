'use client';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bienvenido al Dashboard</h1>
          <p className="text-gray-600 text-lg">Flow Store Admin Panel</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Productos</h3>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Inventario</h3>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Ventas</h3>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Clientes</h3>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { 
  Wind, 
  Thermometer, 
  Filter,
  Ruler,
  Droplets,
  ArrowLeftRight,
  Gauge,
  ThermometerSun,
  Zap
} from 'lucide-react';

// Import calculator components
import FilterCalculator from './components/FilterCalculator';
import DuctCalculator from './components/DuctCalculator';
import DehumidifierCalculator from './components/DehumidifierCalculator';
import PressureCalculator from './components/PressureCalculator';
import MoldRiskCalculator from './components/MoldRiskCalculator';
import PsychrometricCalculator from './components/PsychrometricCalculator';
import CapacitorCalculator from './components/CapacitorCalculator';
import AtticVentilationCalculator from './components/AtticVentilationCalculator';

// Calculator definitions
const CALCULATORS = [
  {
    id: 'filter',
    name: 'Filter Sizing',
    description: 'Calculate filter pressure drop and sizing based on system requirements',
    icon: Filter,
    component: FilterCalculator
  },
  {
    id: 'duct',
    name: 'Duct Sizing',
    description: 'Size various duct types including sheet metal, duct liner, and flex',
    icon: Ruler,
    component: DuctCalculator
  },
  {
    id: 'dehumidifier',
    name: 'Dehumidifier Sizing',
    description: 'Size dehumidifiers based on latent load and performance data',
    icon: Droplets,
    component: DehumidifierCalculator
  },
  {
    id: 'pressure',
    name: 'Room Pressure',
    description: 'Calculate grille and duct sizing for room pressure balancing',
    icon: ArrowLeftRight,
    component: PressureCalculator
  },
  {
    id: 'mold',
    name: 'Mold Risk',
    description: 'Assess mold risk based on indoor conditions',
    icon: Thermometer,
    component: MoldRiskCalculator
  },
  {
    id: 'psychrometric',
    name: 'Psychrometric',
    description: 'Complete psychrometric calculations and equipment capacity analysis',
    icon: ThermometerSun,
    component: PsychrometricCalculator
  },
  {
    id: 'capacitor',
    name: 'Capacitor',
    description: 'Calculate run capacitor values based on electrical measurements',
    icon: Zap,
    component: CapacitorCalculator
  },
  {
    id: 'attic',
    name: 'Attic Ventilation',
    description: 'Calculate attic ventilation requirements and assess current conditions',
    icon: Wind,
    component: AtticVentilationCalculator
  }
];

function App() {
  const [activeCalculator, setActiveCalculator] = useState('filter');

  const ActiveComponent = CALCULATORS.find(calc => calc.id === activeCalculator)?.component || FilterCalculator;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3">
            <Wind className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">HVAC Calculator Suite</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Professional calculators for HVAC system design and troubleshooting
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <nav className="space-y-2">
                {CALCULATORS.map(calc => (
                  <button
                    key={calc.id}
                    onClick={() => setActiveCalculator(calc.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeCalculator === calc.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <calc.icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">{calc.name}</div>
                      <div className="text-sm text-gray-500 hidden lg:block">
                        {calc.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Calculator Content */}
          <div className="lg:col-span-3">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
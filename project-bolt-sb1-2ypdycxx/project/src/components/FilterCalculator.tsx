import React, { useState } from 'react';
import { Wind, Thermometer, Filter } from 'lucide-react';

// Move existing constants here
const CLIMATE_ZONES = {
  'hot-humid': {
    zones: ['1A', '2A'],
    cfmPerTon: 350,
    label: 'Hot/Humid (1A, 2A)'
  },
  'moist': {
    zones: ['3A', '4A', '5A', '6A', '7A'],
    cfmPerTon: 400,
    label: 'Moist (3A, 4A, 5A, 6A, 7A)'
  },
  'dry': {
    zones: ['2B', '3B', '4B', '5B', '6B', '7B'],
    cfmPerTon: 450,
    label: 'Dry (2B, 3B, 4B, 5B, 6B, 7B)'
  },
  'marine': {
    zones: ['3C', '4C'],
    cfmPerTon: 400,
    label: 'Marine (3C, 4C)'
  }
};

const SYSTEM_SIZES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5];

const FILTER_TYPES = {
  'fiberglass': {
    label: 'Fiberglass (MERV 1-4)',
    initialPressureDrops: {
      300: 0.05,
      350: 0.08,
      400: 0.12
    }
  },
  'pleated-basic': {
    label: 'Basic Pleated (MERV 5-8)',
    initialPressureDrops: {
      300: 0.08,
      350: 0.12,
      400: 0.15
    }
  },
  'pleated-better': {
    label: 'Better Pleated (MERV 9-12)',
    initialPressureDrops: {
      300: 0.15,
      350: 0.18,
      400: 0.22
    }
  },
  'pleated-best': {
    label: 'Best Pleated (MERV 13-16)',
    initialPressureDrops: {
      300: 0.20,
      350: 0.25,
      400: 0.30
    }
  }
};

export default function FilterCalculator() {
  const [systemSize, setSystemSize] = useState<string>('');
  const [climateZone, setClimateZone] = useState<string>('');
  const [filterWidth, setFilterWidth] = useState<string>('');
  const [filterHeight, setFilterHeight] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [result, setResult] = useState<{
    cfm: number;
    filterArea: number;
    fpm: number;
    initialPressureDrop: number;
    maxPressureDrop: number;
  } | null>(null);

  const calculateFilterParameters = () => {
    if (!systemSize || !climateZone || !filterWidth || !filterHeight || !filterType) return;

    const tons = parseFloat(systemSize);
    const width = parseFloat(filterWidth);
    const height = parseFloat(filterHeight);
    
    const cfmPerTon = CLIMATE_ZONES[climateZone as keyof typeof CLIMATE_ZONES].cfmPerTon;
    const totalCFM = tons * cfmPerTon;
    const filterArea = (width * height) / 144;
    const fpm = totalCFM / filterArea;
    
    const selectedFilter = FILTER_TYPES[filterType as keyof typeof FILTER_TYPES];
    let initialPressureDrop = 0;
    
    if (fpm <= 300) {
      initialPressureDrop = selectedFilter.initialPressureDrops[300];
    } else if (fpm <= 350) {
      initialPressureDrop = selectedFilter.initialPressureDrops[350];
    } else {
      initialPressureDrop = selectedFilter.initialPressureDrops[400];
    }

    setResult({
      cfm: totalCFM,
      filterArea,
      fpm,
      initialPressureDrop,
      maxPressureDrop: 0.15
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Filter Pressure Drop Calculator</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            System Size (Tons)
          </label>
          <select
            value={systemSize}
            onChange={(e) => setSystemSize(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select system size</option>
            {SYSTEM_SIZES.map(size => (
              <option key={size} value={size}>{size} Ton</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Climate Zone
          </label>
          <select
            value={climateZone}
            onChange={(e) => setClimateZone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select climate zone</option>
            {Object.entries(CLIMATE_ZONES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select filter type</option>
            {Object.entries(FILTER_TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Width (inches)
            </label>
            <input
              type="number"
              value={filterWidth}
              onChange={(e) => setFilterWidth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter width"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Height (inches)
            </label>
            <input
              type="number"
              value={filterHeight}
              onChange={(e) => setFilterHeight(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter height"
            />
          </div>
        </div>

        <button
          onClick={calculateFilterParameters}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Filter Parameters
        </button>

        {result && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Results</h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                <span className="font-medium">Total Airflow:</span>{' '}
                {result.cfm.toFixed(0)} CFM
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Filter Face Area:</span>{' '}
                {result.filterArea.toFixed(2)} sq ft
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Face Velocity:</span>{' '}
                {result.fpm.toFixed(0)} FPM
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Initial Pressure Drop:</span>{' '}
                {result.initialPressureDrop.toFixed(3)} inches w.g.
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Maximum Allowable Pressure Drop:</span>{' '}
                {result.maxPressureDrop.toFixed(2)} inches w.g.
              </p>
              
              {result.fpm > 350 && (
                <div className="flex items-start gap-2 mt-4 p-4 bg-yellow-50 rounded-md">
                  <Thermometer className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Warning: Face velocity exceeds 350 FPM. Consider using a larger filter 
                    to reduce pressure drop and improve system efficiency.
                  </p>
                </div>
              )}

              {result.initialPressureDrop > (result.maxPressureDrop / 2) && (
                <div className="flex items-start gap-2 mt-4 p-4 bg-yellow-50 rounded-md">
                  <Filter className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Warning: Initial pressure drop is more than 50% of maximum allowable. 
                    Consider using a larger filter or a different filter type with lower 
                    initial pressure drop.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
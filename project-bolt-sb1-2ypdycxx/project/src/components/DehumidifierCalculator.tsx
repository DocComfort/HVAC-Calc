import React, { useState } from 'react';
import { Droplets } from 'lucide-react';

interface DehumidifierResult {
  requiredCapacity: number;
  pintsPerDay: number;
  recommendedSize: string;
  warnings: string[];
}

// Conversion factors
const BTU_TO_PINTS = 0.0833; // 1 BTU/hr ≈ 0.0833 pints/day of moisture removal
const SAFETY_FACTOR = 1.2; // 20% safety factor for peak conditions

// Common dehumidifier sizes (pints per day)
const STANDARD_SIZES = [20, 30, 35, 50, 70, 90, 120, 150, 180, 250];

export default function DehumidifierCalculator() {
  const [latentLoad, setLatentLoad] = useState<string>('');
  const [indoorTemp, setIndoorTemp] = useState<string>('');
  const [indoorRH, setIndoorRH] = useState<string>('');
  const [result, setResult] = useState<DehumidifierResult | null>(null);

  const calculateDehumidifierSize = () => {
    if (!latentLoad || !indoorTemp || !indoorRH) return;

    const latentBTU = parseFloat(latentLoad);
    const temp = parseFloat(indoorTemp);
    const rh = parseFloat(indoorRH);
    const warnings: string[] = [];

    // Calculate base capacity needed in pints per day
    let pintsPerDay = latentBTU * BTU_TO_PINTS * 24; // Convert BTU/hr to pints/day
    
    // Apply derating factors based on conditions
    let capacityFactor = 1.0;

    // Temperature derating
    if (temp < 65) {
      capacityFactor *= 0.7;
      warnings.push('Low temperature will reduce dehumidifier efficiency');
    } else if (temp < 70) {
      capacityFactor *= 0.85;
    }

    // Humidity derating
    if (rh < 60) {
      capacityFactor *= 0.8;
      warnings.push('Low relative humidity will reduce moisture removal rate');
    }

    // Apply safety factor and capacity factor
    const requiredCapacity = (pintsPerDay / capacityFactor) * SAFETY_FACTOR;

    // Find the next largest standard size
    const recommendedSize = STANDARD_SIZES.find(size => size >= requiredCapacity) || STANDARD_SIZES[STANDARD_SIZES.length - 1];

    if (recommendedSize < requiredCapacity) {
      warnings.push('Required capacity exceeds largest standard residential unit - consider multiple units or a commercial system');
    }

    // High humidity warning
    if (rh > 65) {
      warnings.push('High relative humidity may require additional run time or larger unit');
    }

    setResult({
      requiredCapacity,
      pintsPerDay,
      recommendedSize: `${recommendedSize} PPD`,
      warnings
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Dehumidifier Sizing Calculator</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Latent Heat Load (BTU/hr)
          </label>
          <input
            type="number"
            value={latentLoad}
            onChange={(e) => setLatentLoad(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter latent load from Manual J"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indoor Temperature (°F)
          </label>
          <input
            type="number"
            value={indoorTemp}
            onChange={(e) => setIndoorTemp(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter indoor temperature"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indoor Relative Humidity (%)
          </label>
          <input
            type="number"
            value={indoorRH}
            onChange={(e) => setIndoorRH(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter indoor relative humidity"
          />
        </div>

        <button
          onClick={calculateDehumidifierSize}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Dehumidifier Size
        </button>

        {result && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Results</h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                <span className="font-medium">Base Moisture Load:</span>{' '}
                {result.pintsPerDay.toFixed(1)} pints/day
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Required Capacity (with safety factor):</span>{' '}
                {result.requiredCapacity.toFixed(1)} pints/day
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Recommended Dehumidifier Size:</span>{' '}
                {result.recommendedSize}
              </p>
              
              {result.warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="p-4 bg-yellow-50 rounded-md">
                      <p className="text-sm text-yellow-800">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-100 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Note:</span> Actual performance may vary based on 
                  specific conditions and equipment selection. Consider Energy Star rated units 
                  for better efficiency. For whole-house applications, ensure proper air 
                  distribution and drainage.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
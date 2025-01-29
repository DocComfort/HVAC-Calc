import React, { useState } from 'react';
import { Zap } from 'lucide-react';

interface CapacitorResult {
  capacitance: number;
  tolerance: {
    min: number;
    max: number;
  };
  ratedComparison?: {
    value: number;
    withinRange: boolean;
    percentDeviation: number;
  };
}

export default function CapacitorCalculator() {
  const [startWinding, setStartWinding] = useState<string>('');
  const [voltage, setVoltage] = useState<string>('');
  const [ratedCapacitance, setRatedCapacitance] = useState<string>('');
  const [result, setResult] = useState<CapacitorResult | null>(null);

  const calculateCapacitance = () => {
    if (!startWinding || !voltage) return;

    const current = parseFloat(startWinding);
    const volts = parseFloat(voltage);
    
    // Formula: C = (2653 × I) ÷ V
    // where:
    // C = Capacitance in microfarads (μF)
    // I = Start winding current in amperes
    // V = Voltage across run-common
    const capacitance = (2653 * current) / volts;
    
    // Industry standard tolerance is ±6%
    const tolerance = {
      min: capacitance * 0.94,
      max: capacitance * 1.06
    };

    // Compare with rated value if provided
    const ratedComparison = ratedCapacitance ? {
      value: parseFloat(ratedCapacitance),
      withinRange: false,
      percentDeviation: 0
    } : undefined;

    if (ratedComparison) {
      const deviation = ((capacitance - ratedComparison.value) / ratedComparison.value) * 100;
      ratedComparison.percentDeviation = deviation;
      ratedComparison.withinRange = Math.abs(deviation) <= 6; // Standard ±6% tolerance
    }

    setResult({ capacitance, tolerance, ratedComparison });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Run Capacitor Calculator</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Winding Current (Amperes)
          </label>
          <input
            type="number"
            step="0.01"
            value={startWinding}
            onChange={(e) => setStartWinding(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter start winding current"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Run-Common Voltage (Volts)
          </label>
          <input
            type="number"
            step="0.1"
            value={voltage}
            onChange={(e) => setVoltage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter voltage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rated Capacitance (μF)
          </label>
          <input
            type="number"
            step="0.1"
            value={ratedCapacitance}
            onChange={(e) => setRatedCapacitance(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter rated capacitance (optional)"
          />
          <p className="mt-1 text-sm text-gray-500">
            Optional: Enter the rated value to compare test results
          </p>
        </div>

        <button
          onClick={calculateCapacitance}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Capacitance
        </button>

        {result && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Results</h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                <span className="font-medium">Measured Capacitance:</span>{' '}
                {result.capacitance.toFixed(1)} μF
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Acceptable Range (±6%):</span>{' '}
                {result.tolerance.min.toFixed(1)} - {result.tolerance.max.toFixed(1)} μF
              </p>
              
              {result.ratedComparison && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium text-gray-800">Comparison to Rated Value</h4>
                  <p className="text-gray-700">
                    <span className="font-medium">Rated Value:</span>{' '}
                    {result.ratedComparison.value.toFixed(1)} μF
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Deviation:</span>{' '}
                    {result.ratedComparison.percentDeviation > 0 ? '+' : ''}
                    {result.ratedComparison.percentDeviation.toFixed(1)}%
                  </p>
                  
                  <div className={`p-4 rounded-md ${
                    result.ratedComparison.withinRange 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {result.ratedComparison.withinRange 
                      ? 'Capacitor is within acceptable range (±6% of rated value)'
                      : 'Capacitor is outside acceptable range - replacement recommended'}
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-100 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Note:</span> Choose the closest standard capacitor value within this range. Common capacitor values are typically available in 5 μF increments.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
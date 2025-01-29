import React, { useState } from 'react';
import { Wind, ThermometerSun, ArrowUpDown } from 'lucide-react';

interface VentilationResult {
  pressureDifferential: number;
  temperatureDifferential: number;
  dewPointDifferential: number;
  stackEffect: number;
  requiredVentArea: {
    intake: number;
    exhaust: number;
  };
  recommendations: string[];
  warnings: string[];
  ventilationStatus: 'Adequate' | 'Inadequate' | 'Critical';
}

// Constants for calculations
const STACK_EFFECT_COEFFICIENT = 0.0188; // CFM/(ft² · °F^0.5)
const WIND_PRESSURE_COEFFICIENT = 0.0299; // CFM/(ft² · Pa^0.5)
const MIN_VENT_RATIO = 1/300; // Minimum ventilation ratio (1:300)
const RECOMMENDED_VENT_RATIO = 1/150; // Recommended ventilation ratio (1:150)
const INTAKE_TO_EXHAUST_RATIO = 1.5; // Recommended ratio of intake to exhaust area

export default function AtticVentilationCalculator() {
  // Pressure measurements
  const [pressureDifferential, setPressureDifferential] = useState<string>('');
  
  // Temperature and humidity measurements
  const [outdoorTemp, setOutdoorTemp] = useState<string>('');
  const [outdoorDewPoint, setOutdoorDewPoint] = useState<string>('');
  const [atticTemp, setAtticTemp] = useState<string>('');
  const [atticDewPoint, setAtticDewPoint] = useState<string>('');
  
  // Attic dimensions
  const [atticArea, setAtticArea] = useState<string>('');
  const [existingIntakeArea, setExistingIntakeArea] = useState<string>('');
  const [existingExhaustArea, setExistingExhaustArea] = useState<string>('');
  
  const [result, setResult] = useState<VentilationResult | null>(null);

  const calculateVentilation = () => {
    if (!pressureDifferential || !outdoorTemp || !outdoorDewPoint || 
        !atticTemp || !atticDewPoint || !atticArea) return;

    const pressure = parseFloat(pressureDifferential);
    const outTemp = parseFloat(outdoorTemp);
    const outDP = parseFloat(outdoorDewPoint);
    const attTemp = parseFloat(atticTemp);
    const attDP = parseFloat(atticDewPoint);
    const area = parseFloat(atticArea);
    const existingIntake = existingIntakeArea ? parseFloat(existingIntakeArea) : 0;
    const existingExhaust = existingExhaustArea ? parseFloat(existingExhaustArea) : 0;

    const tempDiff = attTemp - outTemp;
    const dewPointDiff = attDP - outDP;
    
    // Calculate stack effect (natural convection)
    const stackEffect = STACK_EFFECT_COEFFICIENT * area * Math.sqrt(Math.abs(tempDiff)) * 
                       Math.sign(tempDiff);
    
    // Calculate required ventilation areas
    const minVentArea = area * MIN_VENT_RATIO;
    const recommendedVentArea = area * RECOMMENDED_VENT_RATIO;
    
    // Calculate required intake and exhaust areas
    const totalRequiredVentArea = recommendedVentArea;
    const requiredIntake = (totalRequiredVentArea * INTAKE_TO_EXHAUST_RATIO) / 
                          (1 + INTAKE_TO_EXHAUST_RATIO);
    const requiredExhaust = totalRequiredVentArea - requiredIntake;

    // Generate recommendations and warnings
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Assess ventilation status
    let ventilationStatus: 'Adequate' | 'Inadequate' | 'Critical' = 'Adequate';

    // Check temperature differential
    if (tempDiff > 20) {
      warnings.push('High temperature differential indicates insufficient ventilation');
      ventilationStatus = 'Inadequate';
    }
    if (tempDiff > 30) {
      warnings.push('Critical temperature differential - immediate action recommended');
      ventilationStatus = 'Critical';
    }

    // Check pressure differential
    if (Math.abs(pressure) > 2) {
      warnings.push('High pressure differential may indicate blocked vents or insufficient ventilation');
      ventilationStatus = 'Inadequate';
    }

    // Check dew point spread
    if (dewPointDiff > 5) {
      warnings.push('High moisture levels in attic - increased ventilation recommended');
      ventilationStatus = 'Inadequate';
    }

    // Compare existing ventilation to requirements
    if (existingIntake && existingExhaust) {
      const totalExisting = existingIntake + existingExhaust;
      if (totalExisting < minVentArea) {
        warnings.push('Existing ventilation area below minimum code requirements');
        ventilationStatus = 'Critical';
      } else if (totalExisting < recommendedVentArea) {
        recommendations.push('Consider increasing ventilation area to meet recommended guidelines');
      }

      if (existingIntake < requiredIntake) {
        recommendations.push(`Add ${(requiredIntake - existingIntake).toFixed(1)} sq ft of intake ventilation`);
      }
      if (existingExhaust < requiredExhaust) {
        recommendations.push(`Add ${(requiredExhaust - existingExhaust).toFixed(1)} sq ft of exhaust ventilation`);
      }
    } else {
      recommendations.push(`Install ${requiredIntake.toFixed(1)} sq ft of intake ventilation`);
      recommendations.push(`Install ${requiredExhaust.toFixed(1)} sq ft of exhaust ventilation`);
    }

    // Additional recommendations based on conditions
    if (pressure > 0) {
      recommendations.push('Consider adding more exhaust ventilation to balance pressure');
    } else if (pressure < 0) {
      recommendations.push('Consider adding more intake ventilation to balance pressure');
    }

    setResult({
      pressureDifferential: pressure,
      temperatureDifferential: tempDiff,
      dewPointDifferential: dewPointDiff,
      stackEffect,
      requiredVentArea: {
        intake: requiredIntake,
        exhaust: requiredExhaust
      },
      recommendations,
      warnings,
      ventilationStatus
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Wind className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Attic Ventilation Calculator</h2>
      </div>

      <div className="space-y-6">
        {/* Pressure Measurements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pressure Differential (Pascals)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={pressureDifferential}
              onChange={(e) => setPressureDifferential(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter pressure differential"
            />
            <ArrowUpDown className="w-5 h-5 text-gray-400" />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Positive values indicate higher attic pressure
          </p>
        </div>

        {/* Temperature and Humidity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outdoor Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Outdoor Conditions</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (°F)
              </label>
              <input
                type="number"
                step="0.1"
                value={outdoorTemp}
                onChange={(e) => setOutdoorTemp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter outdoor temperature"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dew Point (°F)
              </label>
              <input
                type="number"
                step="0.1"
                value={outdoorDewPoint}
                onChange={(e) => setOutdoorDewPoint(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter outdoor dew point"
              />
            </div>
          </div>

          {/* Attic Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Attic Conditions</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (°F)
              </label>
              <input
                type="number"
                step="0.1"
                value={atticTemp}
                onChange={(e) => setAtticTemp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter attic temperature"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dew Point (°F)
              </label>
              <input
                type="number"
                step="0.1"
                value={atticDewPoint}
                onChange={(e) => setAtticDewPoint(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter attic dew point"
              />
            </div>
          </div>
        </div>

        {/* Attic Dimensions */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Attic Dimensions</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attic Floor Area (sq ft)
            </label>
            <input
              type="number"
              step="1"
              value={atticArea}
              onChange={(e) => setAtticArea(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter attic floor area"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Intake Vent Area (sq ft)
              </label>
              <input
                type="number"
                step="0.1"
                value={existingIntakeArea}
                onChange={(e) => setExistingIntakeArea(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Exhaust Vent Area (sq ft)
              </label>
              <input
                type="number"
                step="0.1"
                value={existingExhaustArea}
                onChange={(e) => setExistingExhaustArea(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <button
          onClick={calculateVentilation}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Ventilation Requirements
        </button>

        {result && (
          <div className="mt-6 space-y-6">
            {/* Status Card */}
            <div className={`p-6 rounded-xl ${
              result.ventilationStatus === 'Adequate' 
                ? 'bg-green-50 border border-green-200' 
                : result.ventilationStatus === 'Inadequate'
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <ThermometerSun className={`w-6 h-6 ${
                  result.ventilationStatus === 'Adequate'
                    ? 'text-green-600'
                    : result.ventilationStatus === 'Inadequate'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`} />
                <h3 className={`text-xl font-semibold ${
                  result.ventilationStatus === 'Adequate'
                    ? 'text-green-800'
                    : result.ventilationStatus === 'Inadequate'
                    ? 'text-yellow-800'
                    : 'text-red-800'
                }`}>
                  Ventilation Status: {result.ventilationStatus}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Temperature Differential</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {result.temperatureDifferential.toFixed(1)}°F
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Dew Point Differential</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {result.dewPointDifferential.toFixed(1)}°F
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Pressure Differential</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {result.pressureDifferential.toFixed(1)} Pa
                  </div>
                </div>
              </div>
            </div>

            {/* Required Ventilation */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Required Ventilation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Required Intake Area</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {result.requiredVentArea.intake.toFixed(1)} sq ft
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Required Exhaust Area</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {result.requiredVentArea.exhaust.toFixed(1)} sq ft
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations and Warnings */}
            <div className="space-y-4">
              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Warnings</h4>
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="p-4 bg-red-50 text-red-800 rounded-md">
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Recommendations</h4>
                  {result.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-4 bg-blue-50 text-blue-800 rounded-md">
                      {recommendation}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Note:</span> Calculations are based on standard ventilation guidelines and building codes. 
                Local codes may vary. Consider consulting with a qualified professional for specific recommendations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Thermometer, Droplets, AlertTriangle } from 'lucide-react';

interface MoldRiskResult {
  dewPoint: number;
  vaporPressure: number;
  absoluteHumidity: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  daysToMold: number | null;
  recommendations: string[];
}

// Constants for calculations
const WATER_VAPOR_CONSTANT = 17.625;
const WATER_VAPOR_TEMP_CONSTANT = 243.04;

export default function MoldRiskCalculator() {
  const [dryBulb, setDryBulb] = useState<string>('');
  const [relativeHumidity, setRelativeHumidity] = useState<string>('');
  const [result, setResult] = useState<MoldRiskResult | null>(null);

  const calculateDewPoint = (t: number, rh: number): number => {
    const alpha = Math.log(rh / 100) + (WATER_VAPOR_CONSTANT * t) / (WATER_VAPOR_TEMP_CONSTANT + t);
    return (WATER_VAPOR_TEMP_CONSTANT * alpha) / (WATER_VAPOR_CONSTANT - alpha);
  };

  const calculateVaporPressure = (t: number): number => {
    return 6.11 * Math.exp((WATER_VAPOR_CONSTANT * t) / (WATER_VAPOR_TEMP_CONSTANT + t));
  };

  const calculateAbsoluteHumidity = (t: number, rh: number): number => {
    const vp = calculateVaporPressure(t);
    return (2.16679 * rh * vp) / (273.15 + t);
  };

  const calculateRiskLevel = (t: number, rh: number): {
    level: 'Low' | 'Moderate' | 'High' | 'Severe';
    days: number | null;
  } => {
    // Risk levels based on temperature and RH combinations
    if (rh < 60) {
      return { level: 'Low', days: null };
    } else if (rh < 70) {
      return { level: 'Moderate', days: 30 };
    } else if (rh < 80) {
      return { level: 'High', days: 14 };
    } else {
      return { level: 'Severe', days: 7 };
    }
  };

  const getRecommendations = (
    t: number,
    rh: number,
    dewPoint: number,
    riskLevel: string
  ): string[] => {
    const recommendations: string[] = [];

    if (rh > 60) {
      recommendations.push('Reduce indoor relative humidity below 60% using dehumidification');
    }

    if (t - dewPoint < 4) {
      recommendations.push('Increase air temperature or improve insulation to prevent condensation');
    }

    if (riskLevel !== 'Low') {
      recommendations.push('Improve ventilation to reduce moisture accumulation');
      recommendations.push('Inspect for and repair any water leaks or intrusion');
    }

    if (rh > 70) {
      recommendations.push('Consider using continuous dehumidification');
    }

    return recommendations;
  };

  const calculateMoldRisk = () => {
    if (!dryBulb || !relativeHumidity) return;

    const temp = parseFloat(dryBulb);
    const rh = parseFloat(relativeHumidity);

    const dewPoint = calculateDewPoint(temp, rh);
    const vaporPressure = calculateVaporPressure(temp);
    const absoluteHumidity = calculateAbsoluteHumidity(temp, rh);
    const risk = calculateRiskLevel(temp, rh);
    const recommendations = getRecommendations(temp, rh, dewPoint, risk.level);

    setResult({
      dewPoint,
      vaporPressure,
      absoluteHumidity,
      riskLevel: risk.level,
      daysToMold: risk.days,
      recommendations
    });
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'Low':
        return 'text-green-600';
      case 'Moderate':
        return 'text-yellow-600';
      case 'High':
        return 'text-orange-600';
      case 'Severe':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Thermometer className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Mold Risk Calculator</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Indoor Temperature (°F)
          </label>
          <input
            type="number"
            step="0.1"
            value={dryBulb}
            onChange={(e) => setDryBulb(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter dry bulb temperature"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relative Humidity (%)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            value={relativeHumidity}
            onChange={(e) => setRelativeHumidity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter relative humidity"
          />
        </div>

        <button
          onClick={calculateMoldRisk}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Mold Risk
        </button>

        {result && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Results</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-6 h-6 ${getRiskColor(result.riskLevel)}`} />
                <p className={`text-lg font-semibold ${getRiskColor(result.riskLevel)}`}>
                  Risk Level: {result.riskLevel}
                </p>
              </div>

              {result.daysToMold && (
                <p className="text-gray-700">
                  <span className="font-medium">Estimated Days to Mold Growth:</span>{' '}
                  {result.daysToMold} days
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-gray-700">
                  <span className="font-medium">Dew Point:</span>{' '}
                  {result.dewPoint.toFixed(1)}°F
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Vapor Pressure:</span>{' '}
                  {result.vaporPressure.toFixed(2)} kPa
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Absolute Humidity:</span>{' '}
                  {result.absoluteHumidity.toFixed(2)} g/m³
                </p>
              </div>

              {result.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-blue-600 mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-100 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Note:</span> These calculations are based on 
                  typical indoor conditions and common mold species. Actual mold growth can 
                  vary based on surface materials, air movement, and other environmental 
                  factors. Always address moisture issues promptly and consult professionals 
                  for severe cases.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
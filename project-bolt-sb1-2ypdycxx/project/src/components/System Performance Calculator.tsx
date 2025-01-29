import React, { useState } from 'react';
import { ThermometerSun } from 'lucide-react';

interface PsychrometricResult {
  enteringWetBulb: number;
  enteringDewPoint: number;
  enteringRH: number;
  enteringEnthalpy: number;
  leavingWetBulb: number;
  leavingDewPoint: number;
  leavingRH: number;
  leavingEnthalpy: number;
  sensibleBtuh: number;
  latentBtuh: number;
  totalBtuh: number;
  shr: number;
  targetTemp: number;
  nominalCapacity: number;
}

// Constants for psychrometric calculations
const ATMOSPHERIC_PRESSURE = 14.696; // Standard atmospheric pressure (psia)
const WATER_VAPOR_CONSTANT = 17.625;
const WATER_VAPOR_TEMP_CONSTANT = 243.04;
const AIR_DENSITY = 0.075; // lb/ft³ at standard conditions
const SPECIFIC_HEAT = 0.24; // BTU/lb·°F
const LATENT_HEAT = 1061; // BTU/lb

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

// Psychrometric calculation functions
const calculateSaturationPressure = (t: number): number => {
  const celsius = (t - 32) * 5/9;
  return 6.11 * Math.exp((WATER_VAPOR_CONSTANT * celsius) / (WATER_VAPOR_TEMP_CONSTANT + celsius));
};

const calculateWetBulb = (db: number, rh: number): number => {
  let wb = db;
  const pws = calculateSaturationPressure(db);
  const pw = (rh/100) * pws;
  
  let error = 1;
  while (Math.abs(error) > 0.01) {
    const pwsWb = calculateSaturationPressure(wb);
    const w = (0.622 * pw) / (ATMOSPHERIC_PRESSURE - pw);
    const wSat = (0.622 * pwsWb) / (ATMOSPHERIC_PRESSURE - pwsWb);
    error = (db - wb) - ((wSat - w) * 1093);
    wb += error / 100;
  }
  return wb;
};

const calculateDewPoint = (db: number, rh: number): number => {
  const celsius = (db - 32) * 5/9;
  const alpha = Math.log(rh/100) + (WATER_VAPOR_CONSTANT * celsius) / (WATER_VAPOR_TEMP_CONSTANT + celsius);
  const dewPointC = (WATER_VAPOR_TEMP_CONSTANT * alpha) / (WATER_VAPOR_CONSTANT - alpha);
  return (dewPointC * 9/5) + 32;
};

const calculateHumidityRatio = (db: number, rh: number): number => {
  const pws = calculateSaturationPressure(db);
  const pw = (rh/100) * pws;
  return (0.622 * pw) / (ATMOSPHERIC_PRESSURE - pw);
};

const calculateEnthalpy = (db: number, w: number): number => {
  return SPECIFIC_HEAT * db + w * (LATENT_HEAT + 0.444 * db);
};

const calculateRHFromWetBulb = (db: number, wb: number): number => {
  const pwsDb = calculateSaturationPressure(db);
  const pwsWb = calculateSaturationPressure(wb);
  const w = ((1093 - 0.556 * wb) * pwsWb - 0.24 * (db - wb) * ATMOSPHERIC_PRESSURE) / 
           ((1093 + 0.444 * db - wb) * ATMOSPHERIC_PRESSURE);
  const pw = (w * ATMOSPHERIC_PRESSURE) / (0.622 + w);
  return (pw / pwsDb) * 100;
};

export default function PsychrometricCalculator() {
  // System parameters
  const [systemSize, setSystemSize] = useState<string>('');
  const [climateZone, setClimateZone] = useState<string>('');
  const [airflow, setAirflow] = useState<string>('');
  
  // Entering air conditions
  const [enteringDryBulb, setEnteringDryBulb] = useState<string>('');
  const [enteringHumidity, setEnteringHumidity] = useState<string>('');
  const [enteringHumidityType, setEnteringHumidityType] = useState<'rh' | 'wb' | 'dp'>('rh');
  
  // Leaving air conditions
  const [leavingDryBulb, setLeavingDryBulb] = useState<string>('');
  const [leavingHumidity, setLeavingHumidity] = useState<string>('');
  const [leavingHumidityType, setLeavingHumidityType] = useState<'rh' | 'wb' | 'dp'>('rh');
  
  const [result, setResult] = useState<PsychrometricResult | null>(null);

  const calculateTargetTemperature = (tons: number, cfm: number): number => {
    const nominalCapacity = tons * 12000; // BTU/h
    const shr = 0.8; // Standard sensible heat ratio
    const sensibleCapacity = nominalCapacity * shr;
    return enteringDryBulb ? parseFloat(enteringDryBulb) - (sensibleCapacity / (1.08 * cfm)) : 75;
  };

  const calculateProperties = () => {
    if (!enteringDryBulb || !enteringHumidity || !leavingDryBulb || !leavingHumidity || !airflow || !systemSize) return;

    const cfm = parseFloat(airflow);
    const tons = parseFloat(systemSize);
    const nominalBtuh = tons * 12000;
    const targetTemp = calculateTargetTemperature(tons, cfm);

    // Calculate entering conditions
    const enteringDB = parseFloat(enteringDryBulb);
    let enteringRH: number;

    if (enteringHumidityType === 'rh') {
      enteringRH = parseFloat(enteringHumidity);
    } else if (enteringHumidityType === 'wb') {
      const wb = parseFloat(enteringHumidity);
      enteringRH = calculateRHFromWetBulb(enteringDB, wb);
    } else {
      const dp = parseFloat(enteringHumidity);
      const pwsDp = calculateSaturationPressure(dp);
      const pwsDb = calculateSaturationPressure(enteringDB);
      enteringRH = (pwsDp / pwsDb) * 100;
    }

    const enteringWB = calculateWetBulb(enteringDB, enteringRH);
    const enteringW = calculateHumidityRatio(enteringDB, enteringRH);
    const enteringH = calculateEnthalpy(enteringDB, enteringW);
    const enteringDP = calculateDewPoint(enteringDB, enteringRH);

    // Calculate leaving conditions
    const leavingDB = parseFloat(leavingDryBulb);
    let leavingRH: number;

    if (leavingHumidityType === 'rh') {
      leavingRH = parseFloat(leavingHumidity);
    } else if (leavingHumidityType === 'wb') {
      const wb = parseFloat(leavingHumidity);
      leavingRH = calculateRHFromWetBulb(leavingDB, wb);
    } else {
      const dp = parseFloat(leavingHumidity);
      const pwsDp = calculateSaturationPressure(dp);
      const pwsDb = calculateSaturationPressure(leavingDB);
      leavingRH = (pwsDp / pwsDb) * 100;
    }

    const leavingWB = calculateWetBulb(leavingDB, leavingRH);
    const leavingW = calculateHumidityRatio(leavingDB, leavingRH);
    const leavingH = calculateEnthalpy(leavingDB, leavingW);
    const leavingDP = calculateDewPoint(leavingDB, leavingRH);

    // Calculate capacity
    const airMassFlow = cfm * 60 * AIR_DENSITY; // lb/hr
    const sensibleBtuh = airMassFlow * SPECIFIC_HEAT * (enteringDB - leavingDB);
    const totalBtuh = airMassFlow * (enteringH - leavingH);
    const latentBtuh = totalBtuh - sensibleBtuh;
    const shr = sensibleBtuh / totalBtuh;

    setResult({
      enteringWetBulb: enteringWB,
      enteringDewPoint: enteringDP,
      enteringRH,
      enteringEnthalpy: enteringH,
      leavingWetBulb: leavingWB,
      leavingDewPoint: leavingDP,
      leavingRH,
      leavingEnthalpy: leavingH,
      sensibleBtuh,
      latentBtuh,
      totalBtuh,
      shr,
      targetTemp,
      nominalCapacity: nominalBtuh
    });
  };

  const getRecommendedCFM = (): string => {
    if (!systemSize || !climateZone) return '';
    const tons = parseFloat(systemSize);
    const cfmPerTon = CLIMATE_ZONES[climateZone as keyof typeof CLIMATE_ZONES]?.cfmPerTon || 400;
    return `Recommended: ${(tons * cfmPerTon).toFixed(0)} CFM`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <ThermometerSun className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Psychrometric Calculator</h2>
      </div>

      <div className="space-y-6">
        {/* System Parameters - now only 3 columns without target temp */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Size (Tons)
            </label>
            <input
              type="number"
              step="0.1"
              value={systemSize}
              onChange={(e) => setSystemSize(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter system size"
            />
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
              Airflow (CFM)
            </label>
            <input
              type="number"
              value={airflow}
              onChange={(e) => setAirflow(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter airflow"
            />
            {getRecommendedCFM() && (
              <p className="mt-1 text-sm text-gray-500">{getRecommendedCFM()}</p>
            )}
          </div>
        </div>

        {/* Air Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entering Air */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Entering Air</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dry Bulb Temperature (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={enteringDryBulb}
                  onChange={(e) => setEnteringDryBulb(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter temperature"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {enteringHumidityType === 'rh' ? 'Relative Humidity (%)' :
                   enteringHumidityType === 'wb' ? 'Wet Bulb Temperature (°F)' :
                   'Dew Point Temperature (°F)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={enteringHumidity}
                    onChange={(e) => setEnteringHumidity(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter value"
                  />
                  <select
                    value={enteringHumidityType}
                    onChange={(e) => setEnteringHumidityType(e.target.value as 'rh' | 'wb' | 'dp')}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rh">RH</option>
                    <option value="wb">WB</option>
                    <option value="dp">DP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Leaving Air */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Leaving Air</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dry Bulb Temperature (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={leavingDryBulb}
                  onChange={(e) => setLeavingDryBulb(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter temperature"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {leavingHumidityType === 'rh' ? 'Relative Humidity (%)' :
                   leavingHumidityType === 'wb' ? 'Wet Bulb Temperature (°F)' :
                   'Dew Point Temperature (°F)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={leavingHumidity}
                    onChange={(e) => setLeavingHumidity(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter value"
                  />
                  <select
                    value={leavingHumidityType}
                    onChange={(e) => setLeavingHumidityType(e.target.value as 'rh' | 'wb' | 'dp')}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rh">RH</option>
                    <option value="wb">WB</option>
                    <option value="dp">DP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={calculateProperties}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Properties
        </button>

        {result && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Entering Air Properties</h4>
                <p className="text-gray-700">
                  <span className="font-medium">Wet Bulb:</span>{' '}
                  {result.enteringWetBulb.toFixed(1)}°F
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Dew Point:</span>{' '}
                  {result.enteringDewPoint.toFixed(1)}°F
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Relative Humidity:</span>{' '}
                  {result.enteringRH.toFixed(1)}%
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Enthalpy:</span>{' '}
                  {result.enteringEnthalpy.toFixed(1)} BTU/lb
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Leaving Air Properties</h4>
                <p className="text-gray-700">
                  <span className="font-medium">Wet Bulb:</span>{' '}
                  {result.leavingWetBulb.toFixed(1)}°F
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Dew Point:</span>{' '}
                  {result.leavingDewPoint.toFixed(1)}°F
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Relative Humidity:</span>{' '}
                  {result.leavingRH.toFixed(1)}%
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Enthalpy:</span>{' '}
                  {result.leavingEnthalpy.toFixed(1)} BTU/lb
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">System Parameters</h4>
                    <p className="text-gray-700">
                      <span className="font-medium">Target Temperature:</span>{' '}
                      {result.targetTemp.toFixed(1)}°F
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Nominal Capacity:</span>{' '}
                      {(result.nominalCapacity / 12000).toFixed(1)} Tons ({result.nominalCapacity.toFixed(0)} BTU/h)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Measured Performance</h4>
                    <p className="text-gray-700">
                      <span className="font-medium">Total Capacity:</span>{' '}
                      {(result.totalBtuh / 12000).toFixed(2)} Tons ({result.totalBtuh.toFixed(0)} BTU/h)
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Sensible Capacity:</span>{' '}
                      {(result.sensibleBtuh / 12000).toFixed(2)} Tons ({result.sensibleBtuh.toFixed(0)} BTU/h)
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Latent Capacity:</span>{' '}
                      {(result.latentBtuh / 12000).toFixed(2)} Tons ({result.latentBtuh.toFixed(0)} BTU/h)
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Sensible Heat Ratio:</span>{' '}
                      {(result.shr * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
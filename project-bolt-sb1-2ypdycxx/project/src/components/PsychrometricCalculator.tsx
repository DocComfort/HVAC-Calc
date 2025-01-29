import React, { useState } from 'react';
import { ThermometerSun } from 'lucide-react';

interface PsychrometricResult {
  enteringWetBulb: number;
  enteringDewPoint: number;
  enteringRH: number;
  enteringEnthalpy: number;
  enteringHumidityRatio: number;
  leavingWetBulb: number;
  leavingDewPoint: number;
  leavingRH: number;
  leavingEnthalpy: number;
  leavingHumidityRatio: number;
  sensibleBtuh: number;
  latentBtuh: number;
  totalBtuh: number;
  sensibleHeatRatio: number;
  standardCfmPerTon: number;
  massAirflow: number;
  condensationRate: number;
  targetTemp: number;
  measuredDeltaT: number;
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

const calculateSaturationPressure = (t: number): number => {
  // Convert °F to °C
  const celsius = (t - 32) * 5/9;
  // Calculate saturation pressure in kPa
  return 0.6108 * Math.exp((17.27 * celsius) / (celsius + 237.3));
};

const calculateHumidityRatio = (db: number, rh: number): number => {
  const pws = calculateSaturationPressure(db);
  const pw = (rh/100) * pws;
  // Result in lb/lb
  return 0.622 * pw / (101.325 - pw);
};

const calculateEnthalpy = (db: number, w: number): number => {
  // db in °F, w in lb/lb
  return 0.24 * db + w * (1061 + 0.444 * db);
};

const calculateWetBulb = (db: number, rh: number): number => {
  // Iterative solution for wet bulb
  let wb = db;
  const w = calculateHumidityRatio(db, rh);
  
  let error = 1;
  let iteration = 0;
  while (Math.abs(error) > 0.01 && iteration < 100) {
    const wsSat = calculateHumidityRatio(wb, 100);
    error = (db - wb) - ((wsSat - w) * 1093);
    wb += error / 100;
    iteration++;
  }
  return wb;
};

const calculateDewPoint = (db: number, rh: number): number => {
  const celsius = (db - 32) * 5/9;
  const alpha = Math.log(rh/100) + (WATER_VAPOR_CONSTANT * celsius) / (WATER_VAPOR_TEMP_CONSTANT + celsius);
  const dewPointC = (WATER_VAPOR_TEMP_CONSTANT * alpha) / (WATER_VAPOR_CONSTANT - alpha);
  return (dewPointC * 9/5) + 32;
};

const calculateRHFromWetBulb = (db: number, wb: number): number => {
  const pwsDb = calculateSaturationPressure(db);
  const pwsWb = calculateSaturationPressure(wb);
  const w = ((1093 - 0.556 * wb) * pwsWb - 0.24 * (db - wb) * ATMOSPHERIC_PRESSURE) / 
           ((1093 + 0.444 * db - wb) * ATMOSPHERIC_PRESSURE);
  const pw = (w * ATMOSPHERIC_PRESSURE) / (0.622 + w);
  return (pw / pwsDb) * 100;
};

const calculateTargetTemperature = (tons: number, enteringTemp: number, climateZone: string): number => {
  const nominalCapacity = tons * 12000; // BTU/h
  const targetSHR = 0.75; // Standard sensible heat ratio
  const cfmPerTon = CLIMATE_ZONES[climateZone as keyof typeof CLIMATE_ZONES]?.cfmPerTon || 400;
  const totalCFM = tons * cfmPerTon;
  
  const nominalSensibleCapacity = nominalCapacity * targetSHR;
  const targetDeltaT = nominalSensibleCapacity / (1.08 * totalCFM);
  
  return enteringTemp - targetDeltaT;
};

function PsychrometricCalculator() {
  // State declarations remain the same
  const [systemSize, setSystemSize] = useState<string>('');
  const [climateZone, setClimateZone] = useState<string>('');
  const [airflow, setAirflow] = useState<string>('');
  const [enteringDryBulb, setEnteringDryBulb] = useState<string>('');
  const [enteringHumidity, setEnteringHumidity] = useState<string>('');
  const [enteringHumidityType, setEnteringHumidityType] = useState<'rh' | 'wb' | 'dp'>('rh');
  const [leavingDryBulb, setLeavingDryBulb] = useState<string>('');
  const [leavingHumidity, setLeavingHumidity] = useState<string>('');
  const [leavingHumidityType, setLeavingHumidityType] = useState<'rh' | 'wb' | 'dp'>('rh');
  const [result, setResult] = useState<PsychrometricResult | null>(null);

  const getRecommendedCFM = (): string => {
    if (!systemSize || !climateZone) return '';
    const tons = parseFloat(systemSize);
    const cfmPerTon = CLIMATE_ZONES[climateZone as keyof typeof CLIMATE_ZONES]?.cfmPerTon || 400;
    return `Recommended: ${(tons * cfmPerTon).toFixed(0)} CFM`;
  };

  const calculateProperties = () => {
    if (!enteringDryBulb || !enteringHumidity || !leavingDryBulb || !leavingHumidity || !airflow || !systemSize || !climateZone) return;

    const cfm = parseFloat(airflow);
    const tons = parseFloat(systemSize);
    const enteringDB = parseFloat(enteringDryBulb);
    const leavingDB = parseFloat(leavingDryBulb);
    const measuredDeltaT = enteringDB - leavingDB;
    const targetTemp = calculateTargetTemperature(tons, enteringDB, climateZone);

    // Calculate entering conditions
    let enteringRH: number;

    if (enteringHumidityType === 'rh') {
      enteringRH = Math.min(parseFloat(enteringHumidity), 100);
    } else if (enteringHumidityType === 'wb') {
      const wb = parseFloat(enteringHumidity);
      enteringRH = calculateRHFromWetBulb(enteringDB, wb);
    } else {
      const dp = parseFloat(enteringHumidity);
      const pwsDp = calculateSaturationPressure(dp);
      const pwsDb = calculateSaturationPressure(enteringDB);
      enteringRH = Math.min((pwsDp / pwsDb) * 100, 100);
    }

    const enteringWB = calculateWetBulb(enteringDB, enteringRH);
    const enteringW = calculateHumidityRatio(enteringDB, enteringRH);
    const enteringH = calculateEnthalpy(enteringDB, enteringW);
    const enteringDP = calculateDewPoint(enteringDB, enteringRH);

    // Calculate leaving conditions
    let leavingRH: number;

    if (leavingHumidityType === 'rh') {
      leavingRH = Math.min(parseFloat(leavingHumidity), 100);
    } else if (leavingHumidityType === 'wb') {
      const wb = parseFloat(leavingHumidity);
      leavingRH = calculateRHFromWetBulb(leavingDB, wb);
    } else {
      const dp = parseFloat(leavingHumidity);
      const pwsDp = calculateSaturationPressure(dp);
      const pwsDb = calculateSaturationPressure(leavingDB);
      leavingRH = Math.min((pwsDp / pwsDb) * 100, 100);
    }

    const leavingWB = calculateWetBulb(leavingDB, leavingRH);
    const leavingW = calculateHumidityRatio(leavingDB, leavingRH);
    const leavingH = calculateEnthalpy(leavingDB, leavingW);
    const leavingDP = calculateDewPoint(leavingDB, leavingRH);

    // Calculate capacity
    const massAirflow = cfm * 60 * AIR_DENSITY; // lb/hr
    const sensibleBtuh = massAirflow * SPECIFIC_HEAT * (enteringDB - leavingDB);
    const totalBtuh = massAirflow * (enteringH - leavingH);
    const latentBtuh = totalBtuh - sensibleBtuh;
    const sensibleHeatRatio = sensibleBtuh / totalBtuh;
    const standardCfmPerTon = cfm / tons;
    const condensationRate = massAirflow * (enteringW - leavingW); // lb/hr

    setResult({
      enteringWetBulb: enteringWB,
      enteringDewPoint: enteringDP,
      enteringRH,
      enteringEnthalpy: enteringH,
      enteringHumidityRatio: enteringW,
      leavingWetBulb: leavingWB,
      leavingDewPoint: leavingDP,
      leavingRH,
      leavingEnthalpy: leavingH,
      leavingHumidityRatio: leavingW,
      sensibleBtuh,
      latentBtuh,
      totalBtuh,
      sensibleHeatRatio,
      standardCfmPerTon,
      massAirflow,
      condensationRate,
      targetTemp,
      measuredDeltaT
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <ThermometerSun className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Psychrometric Calculator</h2>
      </div>

      <div className="space-y-6">
        {/* System Parameters */}
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
          <div className="mt-6 space-y-6">
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Capacity Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">Total Capacity</h4>
                <div className="text-3xl font-bold text-blue-700">
                  {(result.totalBtuh/12000).toFixed(2)} <span className="text-xl">Tons</span>
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {result.totalBtuh.toFixed(0)} BTU/h
                </div>
                {Math.abs((result.totalBtuh/12000) - parseFloat(systemSize)) > 0.5 && (
                  <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    Capacity differs from nominal {systemSize} tons by {Math.abs((result.totalBtuh/12000) - parseFloat(systemSize)).toFixed(1)} tons
                  </div>
                )}
              </div>

              {/* Sensible Capacity Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm">
                <h4 className="text-lg font-semibold text-green-900 mb-2">Sensible Capacity</h4>
                <div className="text-3xl font-bold text-green-700">
                  {(result.sensibleBtuh/12000).toFixed(2)} <span className="text-xl">Tons</span>
                </div>
                <div className="text-sm text-green-600 mt-1">
                  {result.sensibleBtuh.toFixed(0)} BTU/h
                </div>
                <div className="mt-2 text-sm text-green-600">
                  SHR: {(result.sensibleHeatRatio * 100).toFixed(1)}%
                </div>
                {result.sensibleHeatRatio < 0.7 && (
                  <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    Low sensible heat ratio may indicate excessive dehumidification
                  </div>
                )}
              </div>

              {/* Latent Capacity Card */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm">
                <h4 className="text-lg font-semibold text-purple-900 mb-2">Latent Capacity</h4>
                <div className="text-3xl font-bold text-purple-700">
                  {(result.latentBtuh/12000).toFixed(2)} <span className="text-xl">Tons</span>
                </div>
                <div className="text-sm text-purple-600 mt-1">
                  {result.latentBtuh.toFixed(0)} BTU/h
                </div>
                <div className="mt-2 text-sm text-purple-600">
                  Condensation: {(result.condensationRate * 0.12).toFixed(2)} gal/hr
                </div>
              </div>
            </div>

            {/* Air Properties Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entering Air Properties */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Entering Air Properties</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Wet Bulb</span>
                    <span className="font-medium">{result.enteringWetBulb.toFixed(1)}°F</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Dew Point</span>
                    <span className="font-medium">{result.enteringDewPoint.toFixed(1)}°F</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Humidity Ratio</span>
                    <span className="font-medium">{(result.enteringHumidityRatio * 7000).toFixed(1)} gr/lb</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Enthalpy</span>
                    <span className="font-medium">{result.enteringEnthalpy.toFixed(1)} BTU/lb</span>
                  </div>
                </div>
              </div>

              {/* Leaving Air Properties */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Leaving Air Properties</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Wet Bulb</span>
                    <span className="font-medium">{result.leavingWetBulb.toFixed(1)}°F</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Dew Point</span>
                    <span className="font-medium">{result.leavingDewPoint.toFixed(1)}°F</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Humidity Ratio</span>
                    <span className="font-medium">{(result.leavingHumidityRatio * 7000).toFixed(1)} gr/lb</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Enthalpy</span>
                    <span className="font-medium">{result.leavingEnthalpy.toFixed(1)} BTU/lb</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Parameters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">System Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Airflow per Ton</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {result.standardCfmPerTon.toFixed(0)} <span className="text-base font-normal">CFM/ton</span>
                  </div>
                  {result.standardCfmPerTon < 350 && (
                    <div className="mt-2 text-sm text-amber-600">Low airflow may reduce efficiency</div>
                  )}
                  {result.standardCfmPerTon > 450 && (
                    <div className="mt-2 text-sm text-amber-600">High airflow may reduce dehumidification</div>
                  )}
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Temperature Performance</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-600">Target Supply Temp</div>
                      <div className="text-xl font-semibold text-gray-800">
                        {result.targetTemp.toFixed(1)} <span className="text-base font-normal">°F</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Measured ΔT</div>
                      <div className="text-xl font-semibold text-gray-800">
                        {result.measuredDeltaT.toFixed(1)} <span className="text-base font-normal">°F</span>
                      </div>
                    </div>
                  </div>
                  {Math.abs(result.measuredDeltaT - (parseFloat(enteringDryBulb) - result.targetTemp)) > 3 && (
                    <div className="mt-2 text-sm text-amber-600">
                      Temperature split deviates from design target
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Target Supply Temperature</div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {result.targetTemp.toFixed(1)} <span className="text-base font-normal">°F</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Based on 20°F design temperature split
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

export default PsychrometricCalculator;
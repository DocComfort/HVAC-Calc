import React, { useState } from 'react';
import { ArrowLeftRight, Gauge } from 'lucide-react';

interface PressureResult {
  grilleSize: {
    width: number;
    height: number;
    area: number;
  };
  ductSize: {
    diameter: number;
    velocity: number;
  };
  calculatedAirflow?: number;
  warnings: string[];
}

// Constants for calculations
const PASCAL_TO_IWC = 0.004014; // 1 Pascal = 0.004014 inches of water column
const TARGET_VELOCITY = 400; // Target velocity for return/transfer (FPM)
const MAX_VELOCITY = 600; // Maximum acceptable velocity (FPM)
const MIN_GRILLE_FREE_AREA = 0.7; // Minimum free area ratio for grilles

// Standard round duct sizes (inches)
const STANDARD_DUCT_SIZES = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];

// Standard grille heights (inches)
const STANDARD_GRILLE_HEIGHTS = [4, 6, 8, 10, 12, 14];

// Standard grille sizes (width x height)
const STANDARD_GRILLE_SIZES = [
  { width: 8, height: 4 },
  { width: 10, height: 4 },
  { width: 12, height: 4 },
  { width: 14, height: 4 },
  { width: 8, height: 6 },
  { width: 10, height: 6 },
  { width: 12, height: 6 },
  { width: 14, height: 6 },
  { width: 10, height: 8 },
  { width: 12, height: 8 },
  { width: 14, height: 8 },
  { width: 10, height: 10 },
  { width: 12, height: 12 },
  { width: 14, height: 14 }
];

// Function to get next largest standard duct size
const getStandardDuctSize = (calculatedSize: number): number => {
  return STANDARD_DUCT_SIZES.find(size => size >= calculatedSize) || STANDARD_DUCT_SIZES[STANDARD_DUCT_SIZES.length - 1];
};

// Function to get appropriate grille size based on required area
const getStandardGrilleSize = (requiredArea: number, selectedHeight: number): { width: number; height: number } => {
  // Filter sizes by selected height
  const availableSizes = STANDARD_GRILLE_SIZES.filter(size => size.height === selectedHeight);
  
  // Find the first size that meets or exceeds the required area
  const selectedSize = availableSizes.find(size => 
    (size.width * size.height * MIN_GRILLE_FREE_AREA) >= (requiredArea / MIN_GRILLE_FREE_AREA)
  );

  if (selectedSize) {
    return selectedSize;
  }

  // If no size is found with selected height, return the largest available size for that height
  const largestForHeight = availableSizes[availableSizes.length - 1];
  return largestForHeight || { width: 14, height: selectedHeight };
};

export default function PressureCalculator() {
  const [calculationMode, setCalculationMode] = useState<'airflow' | 'pressure'>('airflow');
  const [targetPressure, setTargetPressure] = useState<string>('');
  const [measuredPressure, setMeasuredPressure] = useState<string>('');
  const [doorWidth, setDoorWidth] = useState<string>('');
  const [doorHeight, setDoorHeight] = useState<string>('');
  const [doorUndercut, setDoorUndercut] = useState<string>('');
  const [airflow, setAirflow] = useState<string>('');
  const [selectedGrilleHeight, setSelectedGrilleHeight] = useState<number>(4);
  const [result, setResult] = useState<PressureResult | null>(null);

  const calculateFromPressure = () => {
    if (!measuredPressure || !doorWidth || !doorHeight || !doorUndercut) return;

    const pressure = parseFloat(measuredPressure);
    const width = parseFloat(doorWidth);
    const height = parseFloat(doorHeight);
    const undercut = parseFloat(doorUndercut);
    const warnings: string[] = [];

    // Calculate door leakage area (sq ft)
    const doorLeakageArea = (width * undercut) / 144;
    const doorPerimeterLeakage = ((2 * height + width) * 0.125) / 144;
    const totalLeakageArea = doorLeakageArea + doorPerimeterLeakage;

    // Calculate airflow using orifice equation
    const pressureIWC = pressure * PASCAL_TO_IWC;
    const calculatedAirflow = totalLeakageArea * 4005 * Math.sqrt(pressureIWC);

    // Calculate required net free area based on target velocity
    const requiredNFA = (calculatedAirflow / TARGET_VELOCITY) * 144; // Convert to sq inches
    
    // Get standard grille size
    const grilleDimensions = getStandardGrilleSize(requiredNFA, selectedGrilleHeight);

    // Calculate duct size based on target velocity
    const ductArea = calculatedAirflow / TARGET_VELOCITY;
    const ductDiameter = Math.sqrt((4 * ductArea) / Math.PI) * 12;
    const standardDuctSize = getStandardDuctSize(ductDiameter);
    const actualVelocity = calculatedAirflow / (Math.PI * Math.pow(standardDuctSize / 24, 2));

    if (pressure > 3) {
      warnings.push('Measured pressure exceeds 3 Pascals - consider reducing pressure differential');
    }

    if (actualVelocity > MAX_VELOCITY) {
      warnings.push('Return air velocity exceeds maximum recommended - consider next size up duct');
    }

    setResult({
      grilleSize: {
        width: grilleDimensions.width,
        height: grilleDimensions.height,
        area: requiredNFA / 144
      },
      ductSize: {
        diameter: standardDuctSize,
        velocity: actualVelocity
      },
      calculatedAirflow,
      warnings
    });
  };

  const calculateFromAirflow = () => {
    if (!targetPressure || !doorWidth || !doorHeight || !doorUndercut || !airflow) return;

    const pressure = parseFloat(targetPressure);
    const width = parseFloat(doorWidth);
    const height = parseFloat(doorHeight);
    const undercut = parseFloat(doorUndercut);
    const cfm = parseFloat(airflow);
    const warnings: string[] = [];

    // Calculate door leakage area
    const doorLeakageArea = (width * undercut) / 144;
    const doorPerimeterLeakage = ((2 * height + width) * 0.125) / 144;
    const totalLeakageArea = doorLeakageArea + doorPerimeterLeakage;

    // Calculate required net free area based on target velocity
    const requiredNFA = (cfm / TARGET_VELOCITY) * 144; // Convert to sq inches
    
    // Get standard grille size
    const grilleDimensions = getStandardGrilleSize(requiredNFA, selectedGrilleHeight);

    // Calculate duct size
    const ductArea = cfm / TARGET_VELOCITY;
    const ductDiameter = Math.sqrt((4 * ductArea) / Math.PI) * 12;
    const standardDuctSize = getStandardDuctSize(ductDiameter);
    const actualVelocity = cfm / (Math.PI * Math.pow(standardDuctSize / 24, 2));

    if (pressure > 3) {
      warnings.push('Target pressure exceeds 3 Pascals - consider reducing pressure differential');
    }

    if (totalLeakageArea > requiredNFA / 144 * 0.5) {
      warnings.push('Door leakage area is significant - consider reducing gaps or increasing grille size');
    }

    if (actualVelocity > MAX_VELOCITY) {
      warnings.push('Return air velocity exceeds maximum recommended - consider next size up duct');
    }

    setResult({
      grilleSize: {
        width: grilleDimensions.width,
        height: grilleDimensions.height,
        area: requiredNFA / 144
      },
      ductSize: {
        diameter: standardDuctSize,
        velocity: actualVelocity
      },
      warnings
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Room Pressure Calculator</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calculation Mode
          </label>
          <select
            value={calculationMode}
            onChange={(e) => setCalculationMode(e.target.value as 'airflow' | 'pressure')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="airflow">Known Airflow</option>
            <option value="pressure">Measured Pressure</option>
          </select>
        </div>

        {calculationMode === 'airflow' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Room Pressure (Pascals)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetPressure}
              onChange={(e) => setTargetPressure(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter target pressure (max 3 Pa)"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Measured Room Pressure (Pascals)
            </label>
            <input
              type="number"
              step="0.1"
              value={measuredPressure}
              onChange={(e) => setMeasuredPressure(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter measured pressure"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Door Width (inches)
            </label>
            <input
              type="number"
              step="0.125"
              value={doorWidth}
              onChange={(e) => setDoorWidth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter door width"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Door Height (inches)
            </label>
            <input
              type="number"
              step="0.125"
              value={doorHeight}
              onChange={(e) => setDoorHeight(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter door height"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Door Undercut (inches)
          </label>
          <input
            type="number"
            step="0.125"
            value={doorUndercut}
            onChange={(e) => setDoorUndercut(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter door undercut height"
          />
        </div>

        {calculationMode === 'airflow' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supply Airflow (CFM)
            </label>
            <input
              type="number"
              value={airflow}
              onChange={(e) => setAirflow(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter supply airflow"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Grille Height (inches)
          </label>
          <select
            value={selectedGrilleHeight}
            onChange={(e) => setSelectedGrilleHeight(parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {STANDARD_GRILLE_HEIGHTS.map(height => (
              <option key={height} value={height}>{height}"</option>
            ))}
          </select>
        </div>

        <button
          onClick={calculationMode === 'airflow' ? calculateFromAirflow : calculateFromPressure}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Return Path Size
        </button>

        {result && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Results</h3>
            <div className="space-y-3">
              {result.calculatedAirflow && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Calculated Airflow</h4>
                  <p className="text-gray-700">
                    Required Airflow: {result.calculatedAirflow.toFixed(0)} CFM
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-800 mb-2">Return/Transfer Grille</h4>
                <p className="text-gray-700">
                  Standard Size: {result.grilleSize.width}" × {result.grilleSize.height}"
                </p>
                <p className="text-gray-700">
                  Required Net Free Area: {(result.grilleSize.area * 144).toFixed(1)} sq inches
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Note: Select a grille with at least {(result.grilleSize.area * 144).toFixed(1)} sq inches of net free area
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 mb-2">Return/Transfer Duct</h4>
                <p className="text-gray-700">
                  Standard Size: {result.ductSize.diameter}" round
                </p>
                <p className="text-gray-700">
                  Air Velocity: {result.ductSize.velocity.toFixed(0)} FPM
                </p>
              </div>
              
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
                  <span className="font-medium">Note:</span> Calculations are based on a target 
                  velocity of {TARGET_VELOCITY} FPM for return/transfer air paths. The required net 
                  free area is the minimum needed - select a grille that meets or exceeds this value. 
                  Verify manufacturer specifications for actual net free area of selected grilles.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
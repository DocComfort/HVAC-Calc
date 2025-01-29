import React, { useState } from 'react';
import { Ruler, Wind } from 'lucide-react';

type DuctType = 'round-metal' | 'rect-metal' | 'rect-board' | 'round-flex';

interface FittingLoss {
  type: string;
  quantity: number;
  coefficient: number;
}

interface SystemComponent {
  name: string;
  pressureLoss: number;
}

interface DuctSizingResult {
  velocity: number;
  equivalentLength: number;
  staticPressure: number;
  availableStaticPressure: number;
  recommendedSize: string;
  warnings: string[];
  frictionRate: number;
}

const DUCT_TYPES = {
  'round-metal': 'Round Sheet Metal',
  'rect-metal': 'Rectangular Sheet Metal',
  'rect-board': 'Rectangular Duct Board',
  'round-flex': 'Round Flex Duct'
};

const FITTING_TYPES = {
  'elbow-90': { name: '90° Elbow', coefficient: 0.3 },
  'elbow-45': { name: '45° Elbow', coefficient: 0.2 },
  'tee': { name: 'Tee Branch', coefficient: 1.0 },
  'reducer': { name: 'Reducer/Enlarger', coefficient: 0.4 },
  'entry': { name: 'Entry Loss', coefficient: 0.5 },
  'exit': { name: 'Exit Loss', coefficient: 1.0 }
};

const DEFAULT_COMPONENTS: SystemComponent[] = [
  { name: 'Return Air Grille', pressureLoss: 0.03 },
  { name: 'Filter', pressureLoss: 0.10 },
  { name: 'Supply Air Grilles', pressureLoss: 0.30 },
  { name: 'Dampers', pressureLoss: 0.30 }
];

// ACCA velocity guidelines
const VELOCITY_LIMITS = {
  'supply-main': { min: 700, max: 900 },
  'supply-branch': { min: 600, max: 800 },
  'return-main': { min: 600, max: 700 },
  'return-branch': { min: 400, max: 600 }
};

export default function DuctCalculator() {
  const [ductType, setDuctType] = useState<DuctType | ''>('');
  const [airflow, setAirflow] = useState<string>('');
  const [designStaticPressure, setDesignStaticPressure] = useState<string>('0.5');
  const [straightLength, setStraightLength] = useState<string>('');
  const [fittings, setFittings] = useState<FittingLoss[]>([]);
  const [velocityAdjustment, setVelocityAdjustment] = useState<string>('supply-main');
  const [components, setComponents] = useState<SystemComponent[]>(DEFAULT_COMPONENTS);
  const [width, setWidth] = useState<string>('');
  const [result, setResult] = useState<DuctSizingResult | null>(null);

  const addFitting = () => {
    setFittings([...fittings, { type: 'elbow-90', quantity: 1, coefficient: 0.3 }]);
  };

  const updateFitting = (index: number, field: string, value: string | number) => {
    const newFittings = [...fittings];
    if (field === 'type') {
      const coef = FITTING_TYPES[value as keyof typeof FITTING_TYPES].coefficient;
      newFittings[index] = { ...newFittings[index], type: value as string, coefficient: coef };
    } else {
      newFittings[index] = { ...newFittings[index], [field]: value };
    }
    setFittings(newFittings);
  };

  const removeFitting = (index: number) => {
    setFittings(fittings.filter((_, i) => i !== index));
  };

  const updateComponentPressureLoss = (index: number, value: string) => {
    const newComponents = [...components];
    newComponents[index] = {
      ...newComponents[index],
      pressureLoss: parseFloat(value) || 0
    };
    setComponents(newComponents);
  };

  const calculateTotalComponentLosses = (): number => {
    return components.reduce((total, component) => total + component.pressureLoss, 0);
  };

  const calculateEquivalentLength = (): number => {
    const straight = parseFloat(straightLength) || 0;
    const fittingLengths = fittings.reduce((total, fitting) => {
      return total + (fitting.coefficient * fitting.quantity);
    }, 0);
    return straight + fittingLengths;
  };

  const roundToStandard = (size: number, isRound: boolean): number => {
    if (isRound) {
      return Math.ceil(size);
    } else {
      return Math.ceil(size * 2) / 2;
    }
  };

  const calculateRectangularHeight = (width: number, area: number): number => {
    return roundToStandard(area / width, false);
  };

  const calculateDuctSize = () => {
    if (!ductType || !airflow || !designStaticPressure) return;

    const cfm = parseFloat(airflow);
    const totalPressureLosses = calculateTotalComponentLosses();
    const availableStaticPressure = parseFloat(designStaticPressure) - totalPressureLosses;
    const eqLength = calculateEquivalentLength();
    const warnings: string[] = [];

    // Calculate friction rate based on available static pressure and equivalent length
    const frictionRate = (availableStaticPressure * 100) / eqLength;

    let velocity = 0;
    let staticPressure = 0;
    let recommendedSize = '';

    const velocityLimit = VELOCITY_LIMITS[velocityAdjustment as keyof typeof VELOCITY_LIMITS];
    
    if (ductType.includes('rect')) {
      if (!width) return;
      
      const w = parseFloat(width);
      let h: number;
      
      // Calculate required area based on velocity limits
      const targetVelocity = (velocityLimit.min + velocityLimit.max) / 2;
      const requiredArea = (cfm / targetVelocity) * 144; // Convert to sq inches
      
      h = calculateRectangularHeight(w, requiredArea);
      const actualArea = (w * h) / 144; // Convert to sq ft
      velocity = cfm / actualArea;
      
      recommendedSize = `${w}" × ${h}"`;
      
      if (velocity > velocityLimit.max) {
        warnings.push(`Velocity exceeds maximum limit of ${velocityLimit.max} FPM for ${velocityAdjustment}`);
      }
    } else {
      // Round duct calculations
      const targetVelocity = (velocityLimit.min + velocityLimit.max) / 2;
      const area = cfm / targetVelocity;
      const diameter = Math.sqrt((4 * area * 144) / Math.PI);
      const roundedDiameter = roundToStandard(diameter, true);
      const actualArea = Math.PI * Math.pow(roundedDiameter / 24, 2);
      velocity = cfm / actualArea;
      recommendedSize = `${roundedDiameter}" diameter`;
      
      if (ductType === 'round-flex' && velocity > 900) {
        warnings.push('Velocity exceeds recommended limit for flex duct (900 FPM)');
      }
    }

    // Calculate total pressure loss
    const velocityPressure = Math.pow(velocity / 4005, 2);
    const frictionLoss = (frictionRate * eqLength) / 100;
    const dynamicLosses = fittings.reduce((total, fitting) => {
      return total + (fitting.coefficient * fitting.quantity * velocityPressure);
    }, 0);
    
    staticPressure = frictionLoss + dynamicLosses;
    
    // Additional pressure loss for flex duct
    if (ductType === 'round-flex') {
      staticPressure *= 1.5;
      warnings.push('Flex duct pressure loss includes 50% safety factor');
    }

    if (availableStaticPressure < 0) {
      warnings.push('System component losses exceed design static pressure!');
    }

    if (staticPressure > availableStaticPressure) {
      warnings.push('Calculated duct losses exceed available static pressure!');
    }

    setResult({
      velocity,
      equivalentLength: eqLength,
      staticPressure,
      availableStaticPressure,
      recommendedSize,
      warnings,
      frictionRate
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Ruler className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Duct Sizing Calculator</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Design Total Static Pressure (in. w.g.)
          </label>
          <input
            type="number"
            step="0.1"
            value={designStaticPressure}
            onChange={(e) => setDesignStaticPressure(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter design static pressure"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">System Component Losses</h3>
          {components.map((component, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="w-40 text-sm text-gray-600">{component.name}</span>
              <input
                type="number"
                step="0.01"
                value={component.pressureLoss}
                onChange={(e) => updateComponentPressureLoss(index, e.target.value)}
                className="w-32 px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Pressure loss"
              />
              <span className="text-sm text-gray-500">in. w.g.</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              Total Component Losses: {calculateTotalComponentLosses().toFixed(3)} in. w.g.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duct Type
          </label>
          <select
            value={ductType}
            onChange={(e) => setDuctType(e.target.value as DuctType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select duct type</option>
            {Object.entries(DUCT_TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
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
            placeholder="Enter airflow in CFM"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Velocity Range
          </label>
          <select
            value={velocityAdjustment}
            onChange={(e) => setVelocityAdjustment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="supply-main">Supply Main (700-900 FPM)</option>
            <option value="supply-branch">Supply Branch (600-800 FPM)</option>
            <option value="return-main">Return Main (600-700 FPM)</option>
            <option value="return-branch">Return Branch (400-600 FPM)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Straight Length (ft)
          </label>
          <input
            type="number"
            value={straightLength}
            onChange={(e) => setStraightLength(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter straight duct length"
          />
        </div>

        {ductType.includes('rect') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duct Width (inches)
            </label>
            <input
              type="number"
              step="0.5"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter duct width"
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Fittings</h3>
            <button
              onClick={addFitting}
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
            >
              Add Fitting
            </button>
          </div>

          {fittings.map((fitting, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <select
                value={fitting.type}
                onChange={(e) => updateFitting(index, 'type', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              >
                {Object.entries(FITTING_TYPES).map(([key, value]) => (
                  <option key={key} value={key}>{value.name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={fitting.quantity}
                onChange={(e) => updateFitting(index, 'quantity', parseInt(e.target.value))}
                className="w-24 px-4 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => removeFitting(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={calculateDuctSize}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate Duct Parameters
        </button>

        {result && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Results</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-gray-700">
                  <span className="font-medium">Design Static Pressure:</span>{' '}
                  {designStaticPressure} in. w.g.
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Component Losses:</span>{' '}
                  {calculateTotalComponentLosses().toFixed(3)} in. w.g.
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Available Static Pressure:</span>{' '}
                  {result.availableStaticPressure.toFixed(3)} in. w.g.
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Friction Rate:</span>{' '}
                  {result.frictionRate.toFixed(3)} in. w.g./100 ft
                </p>
              </div>

              <div className="border-t border-blue-200 my-4 pt-4">
                <p className="text-gray-700">
                  <span className="font-medium">Recommended Size:</span>{' '}
                  {result.recommendedSize}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Air Velocity:</span>{' '}
                  {result.velocity.toFixed(0)} FPM
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Total Equivalent Length:</span>{' '}
                  {result.equivalentLength.toFixed(1)} ft
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Duct Static Pressure Loss:</span>{' '}
                  {result.staticPressure.toFixed(3)} in. w.g.
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
                  <span className="font-medium">Note:</span> Results are based on ACCA 
                  Manual D guidelines and standard industry practices. Always verify 
                  calculations against local codes and manufacturer specifications.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { describe, expect, it } from 'vitest';
import { calculateTemperatureDerate, celsius, estimatePanelTemperature } from '../index.ts';

describe('panel temperature and derating', () => {
  it('estimates cell temperature using ambient + (NOCT - 20) × POA / 800', () => {
    const estimate = estimatePanelTemperature({
      ambientTemperature: celsius(30),
      planeOfArrayIrradianceWm2: 800,
      noctDegC: 45,
    });
    expect(estimate.cellTemperature).toBe(55);
    expect(estimate).toMatchObject({
      model: 'noct-linear-v1',
      approximation: true,
      provenance: 'S',
    });
  });

  it('tracks ambient temperature and irradiance monotonically and returns ambient at zero sun', () => {
    const base = estimatePanelTemperature({
      ambientTemperature: celsius(20),
      planeOfArrayIrradianceWm2: 400,
      noctDegC: 45,
    }).cellTemperature;
    const hotterAmbient = estimatePanelTemperature({
      ambientTemperature: celsius(30),
      planeOfArrayIrradianceWm2: 400,
      noctDegC: 45,
    }).cellTemperature;
    const higherIrradiance = estimatePanelTemperature({
      ambientTemperature: celsius(20),
      planeOfArrayIrradianceWm2: 800,
      noctDegC: 45,
    }).cellTemperature;
    const noIrradiance = estimatePanelTemperature({
      ambientTemperature: celsius(20),
      planeOfArrayIrradianceWm2: 0,
      noctDegC: 45,
    }).cellTemperature;
    expect(hotterAmbient).toBeGreaterThan(base);
    expect(higherIrradiance).toBeGreaterThan(base);
    expect(noIrradiance).toBe(20);
  });

  it('reduces the temperature factor as the panel warms and applies system derate separately', () => {
    const atStc = calculateTemperatureDerate({
      cellTemperature: celsius(25),
      temperatureCoefficientPerDegC: -0.0035,
      systemDerate: 0.9,
    });
    const hot = calculateTemperatureDerate({
      cellTemperature: celsius(55),
      temperatureCoefficientPerDegC: -0.0035,
      systemDerate: 0.9,
    });
    expect(atStc.temperatureFactor).toBe(1);
    expect(atStc.combinedFactor).toBeCloseTo(0.9, 12);
    expect(hot.temperatureFactor).toBeCloseTo(0.895, 12);
    expect(hot.combinedFactor).toBeCloseTo(0.8055, 12);
    expect(hot.combinedFactor).toBeLessThan(atStc.combinedFactor);
    expect(hot).toMatchObject({
      model: 'linear-power-temperature-coefficient-v1',
      approximation: true,
      provenance: 'S',
    });
  });

  it('allows cold-temperature gain and prevents a negative temperature multiplier', () => {
    const cold = calculateTemperatureDerate({
      cellTemperature: celsius(-10),
      temperatureCoefficientPerDegC: -0.004,
      systemDerate: 1,
    });
    const extremeHot = calculateTemperatureDerate({
      cellTemperature: celsius(300),
      temperatureCoefficientPerDegC: -0.02,
      systemDerate: 1,
    });
    expect(cold.temperatureFactor).toBeCloseTo(1.14, 12);
    expect(extremeHot.temperatureFactor).toBe(0);
    expect(extremeHot.combinedFactor).toBe(0);
  });

  it('rejects invalid NOCT, irradiance, coefficient, temperature and system derate', () => {
    expect(() =>
      estimatePanelTemperature({
        ambientTemperature: celsius(20),
        planeOfArrayIrradianceWm2: -1,
        noctDegC: 45,
      }),
    ).toThrow(/planeOfArrayIrradianceWm2/);
    expect(() =>
      estimatePanelTemperature({
        ambientTemperature: celsius(20),
        planeOfArrayIrradianceWm2: Number.MAX_VALUE,
        noctDegC: 60,
      }),
    ).toThrow(/temperature must be a finite number/);
    expect(() =>
      estimatePanelTemperature({
        ambientTemperature: celsius(20),
        planeOfArrayIrradianceWm2: 800,
        noctDegC: 61,
      }),
    ).toThrow(/noctDegC/);
    expect(() =>
      calculateTemperatureDerate({
        cellTemperature: celsius(45),
        temperatureCoefficientPerDegC: 0.001,
        systemDerate: 1,
      }),
    ).toThrow(/temperatureCoefficient/);
    expect(() =>
      calculateTemperatureDerate({
        cellTemperature: celsius(45),
        temperatureCoefficientPerDegC: -0.0035,
        systemDerate: 1.1,
      }),
    ).toThrow(/systemDerate/);
  });
});

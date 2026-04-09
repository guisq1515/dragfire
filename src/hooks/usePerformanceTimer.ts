import { useState, useEffect, useRef, useCallback } from 'react';
import { RunConfig, RunResult, GPSPoint } from '../types';
import { calculateDistance } from '../lib/utils';

export function usePerformanceTimer() {
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [distance, setDistance] = useState(0); // meters
  const [isRunning, setIsRunning] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gForce, setGForce] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'active' | 'error'>('searching');
  const [lastPosition, setLastPosition] = useState<{ latitude: number, longitude: number } | null>(null);
  const [gpsSource, setGpsSource] = useState<'internal' | 'external'>('internal');

  const startTimeRef = useRef<number | null>(null);
  const lastPointRef = useRef<GPSPoint | null>(null);
  const lastStoppedTimestampRef = useRef<number | null>(null);
  const pointsRef = useRef<GPSPoint[]>([]);
  const configRef = useRef<RunConfig | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const maxGRef = useRef(0);
  const rolloutStartedRef = useRef(false);
  const accelerometerRef = useRef<{ x: number, y: number, z: number } | null>(null);
  const daRef = useRef<number | undefined>(undefined);

  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(false);
  const isWaitingRef = useRef(false);
  const isRunningRef = useRef(false);

  const distanceRef = useRef(0);

  const stopRun = useCallback((finalTime: number) => {
    if (!configRef.current) return;

    setIsRunning(false);
    isRunningRef.current = false;
    setIsReady(false);
    isReadyRef.current = false;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const speeds = pointsRef.current.map(p => p.speed * 3.6);
    const maxSpeed = Math.max(...speeds, 0);
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    
    const accuracies = pointsRef.current.map(p => p.accuracy).filter((a): a is number => a !== null);
    const avgAccuracy = accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : null;

    // Fetch DA if location is available
    const fetchDA = async (lat: number, lon: number) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure&forecast_days=1`);
        const data = await response.json();
        if (data.current) {
          const tempC = data.current.temperature_2m;
          const pressureHpa = data.current.surface_pressure;
          // Standard DA formula (simplified)
          // DA = PressureAlt + [120 * (OAT - ISA_Temp)]
          const pressureAlt = (145366 * (1 - Math.pow(pressureHpa / 1013.25, 0.190284)));
          const isaTemp = 15 - (1.98 * (pressureAlt / 1000));
          const da = pressureAlt + (118.8 * (tempC - isaTemp));
          daRef.current = Math.round(da);
        }
      } catch (e) {
        console.error("Error fetching DA:", e);
      }
    };

    if (pointsRef.current.length > 0) {
      fetchDA(pointsRef.current[0].latitude, pointsRef.current[0].longitude);
    }

    // Calculate slope
    let slope = 0;
    let isValidSlope = true;
    if (pointsRef.current.length >= 2) {
      const startPoint = pointsRef.current[0];
      const endPoint = pointsRef.current[pointsRef.current.length - 1];
      
      if (startPoint.altitude !== null && endPoint.altitude !== null && distanceRef.current > 0) {
        const elevationChange = endPoint.altitude - startPoint.altitude;
        slope = (elevationChange / distanceRef.current) * 100;
        // Invalidate if downhill (slope < -1% as a buffer for GPS noise)
        if (slope < -1) {
          isValidSlope = false;
        }
      }
    }

    const result: RunResult = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      config: { ...configRef.current },
      time: finalTime,
      maxSpeed,
      avgSpeed,
      distance: distanceRef.current,
      path: [...pointsRef.current],
      slope,
      isValidSlope,
      maxG: maxGRef.current,
      avgAccuracy: avgAccuracy ?? null,
      da: daRef.current ?? null,
      location: pointsRef.current.length > 0 ? {
        latitude: pointsRef.current[0].latitude,
        longitude: pointsRef.current[0].longitude
      } : null
    };

    setLastResult(result);
    configRef.current = null;
  }, []); // Remove distance dependency

  const manualStart = useCallback(() => {
    if (!configRef.current || configRef.current.mode !== 'free') return;
    
    setIsWaiting(false);
    isWaitingRef.current = false;
    setIsRunning(true);
    isRunningRef.current = true;
    startTimeRef.current = Date.now();
    pointsRef.current = [];
    distanceRef.current = 0;
    setDistance(0);
    
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime((Date.now() - startTimeRef.current) / 1000);
      }
    }, 50);
  }, []);

  const manualStop = useCallback(() => {
    if (!isRunningRef.current || !startTimeRef.current) return;
    const finalTime = (Date.now() - startTimeRef.current) / 1000;
    stopRun(finalTime);
  }, [stopRun]);

  const startRun = useCallback((config: RunConfig) => {
    configRef.current = config;
    setIsWaiting(true);
    isWaitingRef.current = true;
    setIsReady(false);
    isReadyRef.current = false;
    setIsRunning(false);
    isRunningRef.current = false;
    setDistance(0);
    distanceRef.current = 0;
    setElapsedTime(0);
    setLastResult(null);
    setGForce(0);
    maxGRef.current = 0;
    rolloutStartedRef.current = false;
    pointsRef.current = [];
    lastPointRef.current = null;
    lastStoppedTimestampRef.current = null;
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("GPS não suportado neste dispositivo.");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
        accelerometerRef.current = { x: x || 0, y: y || 0, z: z || 0 };
        
        // Launch detection logic
        if (isReadyRef.current && !isRunningRef.current && configRef.current) {
          const totalG = Math.sqrt((x || 0)**2 + (y || 0)**2 + (z || 0)**2) / 9.81;
          const isStandingStart = configRef.current.startSpeed === 0 || configRef.current.startSpeed === undefined;
          
          // If we detect a spike > 1.15G (launch), start immediately
          if (isStandingStart && totalG > 1.15) {
            console.log("ACCELEROMETER LAUNCH DETECTED! G:", totalG);
            setIsWaiting(false);
            isWaitingRef.current = false;
            setIsRunning(true);
            isRunningRef.current = true;
            
            const now = Date.now();
            if (configRef.current.useRollout) {
              rolloutStartedRef.current = true;
              startTimeRef.current = null;
            } else {
              startTimeRef.current = now;
            }
            
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = window.setInterval(() => {
              if (startTimeRef.current) {
                setElapsedTime((Date.now() - startTimeRef.current) / 1000);
              }
            }, 50);
          }
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);

    let watchId: number | null = null;

    if (gpsSource === 'internal') {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setGpsStatus('active');
          const { latitude, longitude, speed, accuracy, altitude } = position.coords;
          
          // Fallback speed calculation if speed is null
          let calculatedSpeed = speed;
          if (calculatedSpeed === null && lastPointRef.current) {
            const d = calculateDistance(lastPointRef.current, { latitude, longitude } as any);
            const t = (position.timestamp - lastPointRef.current.timestamp) / 1000;
            if (t > 0) calculatedSpeed = d / t;
          }

          const currentPoint: GPSPoint = {
            latitude,
            longitude,
            altitude: altitude,
            speed: calculatedSpeed || 0,
            accuracy: accuracy,
            timestamp: position.timestamp,
          };

          setAccuracy(accuracy);
          setLastPosition({ latitude, longitude });
          const speedKmh = (calculatedSpeed || 0) * 3.6;
          setCurrentSpeed(speedKmh);

          // ALWAYS update lastPointRef to ensure fallback calculation works on next tick
          const prevPoint = lastPointRef.current;
          lastPointRef.current = currentPoint;

          const config = configRef.current;
          if (!config) return;

          // Skip automatic triggers for 'free' mode
          if (config.mode === 'free') {
            if (isRunningRef.current) {
              pointsRef.current.push(currentPoint);
              
              if (lastPointRef.current) {
                const timeDelta = (currentPoint.timestamp - lastPointRef.current.timestamp) / 1000;
                if (timeDelta > 0) {
                  const speedDelta = currentPoint.speed - lastPointRef.current.speed;
                  const g = speedDelta / (timeDelta * 9.81);
                  setGForce(g);
                  if (g > maxGRef.current) maxGRef.current = g;
                }
                const dPos = calculateDistance(lastPointRef.current, currentPoint);
                const avgSpeedMs = (currentPoint.speed + lastPointRef.current.speed) / 2;
                const dSpeed = avgSpeedMs * timeDelta;
                const d = (accuracy && accuracy < 10) ? (dSpeed * 0.7 + dPos * 0.3) : dPos;
                const newDist = distanceRef.current + d;
                distanceRef.current = newDist;
                setDistance(newDist);
              }
            }
            return;
          }

          // Standing start logic: must stop first
          if (isWaitingRef.current && !isRunningRef.current) {
            const isStandingStart = config.startSpeed === 0 || config.startSpeed === undefined;
            
            if (isStandingStart) {
              // If speed is very low, we are ready
              // Threshold lowered to 1.2 km/h for better sensitivity
              if (speedKmh < 1.2) {
                lastStoppedTimestampRef.current = position.timestamp;
                if (!isReadyRef.current) {
                  console.log("Vehicle stopped, ready to start.");
                  setIsReady(true);
                  isReadyRef.current = true;
                }
              }
              
              // Start if we were ready and now moving
              // Threshold lowered to 1.8 km/h for faster trigger
              if (isReadyRef.current && speedKmh >= 1.8) {
                console.log("Movement detected! Starting timer at speed:", speedKmh);
                setIsWaiting(false);
                isWaitingRef.current = false;
                setIsRunning(true);
                isRunningRef.current = true;
                
                // PRECISION FIX: Instead of starting NOW, we start from the last known stopped moment
                // This recovers the time lost between 0 and 1.8 km/h
                const now = position.timestamp;
                const lastStopped = lastStoppedTimestampRef.current || (now - 500); // Fallback to 500ms ago
                
                // 1-Foot Rollout logic
                if (config.useRollout) {
                  rolloutStartedRef.current = true;
                  startTimeRef.current = null; // Don't start timer yet
                } else {
                  startTimeRef.current = lastStopped;
                }

                pointsRef.current = [currentPoint];
                lastPointRef.current = currentPoint;
                distanceRef.current = 0;
                setDistance(0);
                
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = window.setInterval(() => {
                  if (startTimeRef.current) {
                    setElapsedTime((Date.now() - startTimeRef.current) / 1000);
                  }
                }, 50);
              }
            } else {
              // Rolling start logic
              if (speedKmh >= config.startSpeed) {
                setIsWaiting(false);
                isWaitingRef.current = false;
                setIsRunning(true);
                isRunningRef.current = true;
                
                // For rolling starts, we interpolate the exact moment the threshold was crossed
                const now = position.timestamp;
                let exactStartTime = now;
                
                if (lastPointRef.current && speedKmh > (lastPointRef.current.speed * 3.6)) {
                  const prevSpeed = lastPointRef.current.speed * 3.6;
                  const prevTime = lastPointRef.current.timestamp;
                  const speedDiff = speedKmh - prevSpeed;
                  const timeDiff = now - prevTime;
                  const targetDiff = config.startSpeed - prevSpeed;
                  
                  if (speedDiff > 0) {
                    const timeOffset = (targetDiff / speedDiff) * timeDiff;
                    exactStartTime = prevTime + timeOffset;
                  }
                }

                startTimeRef.current = exactStartTime;
                pointsRef.current = [currentPoint];
                lastPointRef.current = currentPoint;
                distanceRef.current = 0;
                setDistance(0);
                
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = window.setInterval(() => {
                  if (startTimeRef.current) {
                    setElapsedTime((Date.now() - startTimeRef.current) / 1000);
                  }
                }, 50);
              }
            }
          }

          if (isRunningRef.current) {
            pointsRef.current.push(currentPoint);
            
            if (lastPointRef.current) {
              // Calculate G-Force
              const timeDelta = (currentPoint.timestamp - lastPointRef.current.timestamp) / 1000;
              if (timeDelta > 0) {
                const speedDelta = currentPoint.speed - lastPointRef.current.speed;
                const g = speedDelta / (timeDelta * 9.81);
                setGForce(g);
                if (g > maxGRef.current) maxGRef.current = g;
              }

              // Hybrid distance calculation:
              // 1. Position-based (Haversine)
              const dPos = calculateDistance(lastPointRef.current, currentPoint);
              
              // 2. Speed-based (Average speed * time delta)
              // GPS Speed is often more accurate for short-term changes than position
              const avgSpeedMs = (currentPoint.speed + lastPointRef.current.speed) / 2;
              const dSpeed = avgSpeedMs * timeDelta;

              // Use a weighted average or speed-based if accuracy is good
              // Speed-based is usually better for drag racing distance increments
              const d = (accuracy && accuracy < 10) ? (dSpeed * 0.7 + dPos * 0.3) : dPos;

              const newDist = distanceRef.current + d;
              distanceRef.current = newDist;
              setDistance(newDist);

              // Handle 1-foot rollout trigger
              if (rolloutStartedRef.current && !startTimeRef.current && newDist >= 0.3048) {
                startTimeRef.current = currentPoint.timestamp;
                rolloutStartedRef.current = false;
                console.log("1-foot rollout reached! Timer started.");
              }
              
              // Check distance-based completion
              if (config.mode === 'distance' && newDist >= config.target) {
                  let exactEndTime = currentPoint.timestamp;
                  
                  // Interpolate exact time for distance target
                  if (lastPointRef.current && newDist > distanceRef.current) {
                    const dDiff = newDist - distanceRef.current;
                    const tDiff = currentPoint.timestamp - lastPointRef.current.timestamp;
                    const targetDDiff = config.target - distanceRef.current;
                    
                    if (dDiff > 0) {
                      const timeOffset = (targetDDiff / dDiff) * tDiff;
                      exactEndTime = lastPointRef.current.timestamp + timeOffset;
                    }
                  }

                  const finalTime = (exactEndTime - (startTimeRef.current || 0)) / 1000;
                  stopRun(finalTime);
                  return; // Stop processing this update
              }
            }

            // Check speed-based completion
            if (config.mode === 'speed' && speedKmh >= config.target) {
              let exactEndTime = currentPoint.timestamp;
              
              // Interpolate exact time for speed target
              if (lastPointRef.current && speedKmh > (lastPointRef.current.speed * 3.6)) {
                const sDiff = speedKmh - (lastPointRef.current.speed * 3.6);
                const tDiff = currentPoint.timestamp - lastPointRef.current.timestamp;
                const targetSDiff = config.target - (lastPointRef.current.speed * 3.6);
                
                if (sDiff > 0) {
                  const timeOffset = (targetSDiff / sDiff) * tDiff;
                  exactEndTime = lastPointRef.current.timestamp + timeOffset;
                }
              }

              const finalTime = (exactEndTime - (startTimeRef.current || 0)) / 1000;
              stopRun(finalTime);
              return;
            }
          }
        },
        (err) => {
          setGpsStatus('error');
          // Ignore timeout errors as watchPosition will continue to try
          if (err.code === err.TIMEOUT) {
            console.warn("GPS Timeout: Tentando obter sinal...");
            return;
          }

          let msg = err.message;
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Permissão de localização negada. Verifique as configurações do navegador e do sistema.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "Sinal de GPS indisponível. Verifique se o GPS está ligado e se você está em local aberto.";
          }
          
          setError(msg);
        },
        options
      );
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [stopRun, gpsSource]); // Stable dependencies

  const reset = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setIsWaiting(false);
    isWaitingRef.current = false;
    setIsReady(false);
    isReadyRef.current = false;
    lastStoppedTimestampRef.current = null;
    setDistance(0);
    distanceRef.current = 0;
    setElapsedTime(0);
    setLastResult(null);
    setGForce(0);
    maxGRef.current = 0;
    rolloutStartedRef.current = false;
    configRef.current = null;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const setMockResult = (result: RunResult) => {
    setLastResult(result);
  };

  const requestPermission = useCallback(() => {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted, watchPosition will handle the rest
      },
      (err) => {
        if (err.code === err.TIMEOUT) return;
        
        let msg = err.message;
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Permissão de localização negada pelo usuário.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Sinal de GPS indisponível no momento.";
        }
        setError(msg);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  return {
    currentSpeed,
    distance,
    isRunning,
    isWaiting,
    isReady,
    elapsedTime,
    gForce,
    lastResult,
    error,
    accuracy,
    gpsStatus,
    lastPosition,
    startRun,
    manualStart,
    manualStop,
    reset,
    setMockResult,
    requestPermission,
    gpsSource,
    setGpsSource
  };
}

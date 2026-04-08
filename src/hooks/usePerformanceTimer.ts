import { useState, useEffect, useRef, useCallback } from 'react';
import { RunConfig, RunResult, GPSPoint } from '../types';
import { calculateDistance } from '../lib/utils';
import { Geolocation } from '@capacitor/geolocation';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

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

  const startTimeRef = useRef<number | null>(null);
  const lastPointRef = useRef<GPSPoint | null>(null);
  const lastStoppedTimestampRef = useRef<number | null>(null);
  const pointsRef = useRef<GPSPoint[]>([]);
  const configRef = useRef<RunConfig | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const maxGRef = useRef(0);
  const rolloutStartedRef = useRef(false);

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
      location: pointsRef.current.length > 0 ? {
        latitude: pointsRef.current[0].latitude,
        longitude: pointsRef.current[0].longitude
      } : undefined
    };

    setLastResult(result);
    configRef.current = null;
    
    // Native: Stop Foreground Service when run finishes
    ForegroundService.stopForegroundService().catch(console.error);
  }, []); // Remove distance dependency

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

    // Native: Start Foreground Service when run starts
    ForegroundService.startForegroundService({
      id: 12345,
      title: 'DragFire Ativo',
      body: 'Rastreando seu desempenho em tempo real...',
      smallIcon: 'ic_launcher',
    }).catch(console.error);
  }, []);

  useEffect(() => {
    let watchId: string | null = null;

    const startWatching = async () => {
      try {
        const hasPermission = await Geolocation.checkPermissions();
        if (hasPermission.location !== 'granted') {
          await Geolocation.requestPermissions();
        }

        watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 15000,
          },
          (position, err) => {
            if (err) {
              setGpsStatus('error');
              if (err.message && err.message.toLowerCase().includes('timeout')) {
                console.warn("GPS Timeout: Tentando obter sinal...");
                return;
              }
              setError(err.message || "Erro desconhecido no GPS");
              return;
            }

            if (!position) return;

            setGpsStatus('active');
            const { latitude, longitude, speed, accuracy, altitude } = position.coords;
            
            // User's improvement: Fallback speed calculation
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
              timestamp: position.timestamp,
            };

            setAccuracy(accuracy);
            setLastPosition({ latitude, longitude });
            const speedKmh = (calculatedSpeed || 0) * 3.6;
            setCurrentSpeed(speedKmh);

            const config = configRef.current;
            if (!config) return;

            // Standing start logic
            if (isWaitingRef.current && !isRunningRef.current) {
              const isStandingStart = config.startSpeed === 0 || config.startSpeed === undefined;
              
              if (isStandingStart) {
                if (speedKmh < 1.2) {
                  lastStoppedTimestampRef.current = position.timestamp;
                  if (!isReadyRef.current) {
                    setIsReady(true);
                    isReadyRef.current = true;
                  }
                }
                
                if (isReadyRef.current && speedKmh >= 1.8) {
                  setIsWaiting(false);
                  isWaitingRef.current = false;
                  setIsRunning(true);
                  isRunningRef.current = true;
                  
                  const now = position.timestamp;
                  const lastStopped = lastStoppedTimestampRef.current || (now - 500);
                  
                  // User's improvement: 1-Foot Rollout logic
                  if (config.useRollout) {
                    rolloutStartedRef.current = true;
                    startTimeRef.current = null;
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
                if (speedKmh >= config.startSpeed) {
                  setIsWaiting(false);
                  isWaitingRef.current = false;
                  setIsRunning(true);
                  isRunningRef.current = true;
                  
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
                // User's improvement: Calculate G-Force
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

                // User's improvement: Handle 1-foot rollout trigger
                if (rolloutStartedRef.current && !startTimeRef.current && newDist >= 0.3048) {
                  startTimeRef.current = currentPoint.timestamp;
                  rolloutStartedRef.current = false;
                  console.log("1-foot rollout reached! Timer started.");
                }
                
                if (config.mode === 'distance' && newDist >= config.target) {
                    const finalTime = (Date.now() - (startTimeRef.current || 0)) / 1000;
                    stopRun(finalTime);
                    return;
                }
              }

              if (config.mode === 'speed' && speedKmh >= config.target) {
                const finalTime = (Date.now() - (startTimeRef.current || 0)) / 1000;
                stopRun(finalTime);
                return;
              }

              lastPointRef.current = currentPoint;
            }
          }
        );
      } catch (e) {
        console.error("Erro ao iniciar GPS:", e);
        setError("Não foi possível acessar o GPS.");
      }
    };

    startWatching();

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId }).catch(console.error);
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      ForegroundService.stopForegroundService().catch(console.error);
    };
  }, [stopRun]); 

  const reset = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setIsWaiting(false);
    isWaitingRef.current = false;
    setIsReady(false);
    isReadyRef.current = false;
    setDistance(0);
    distanceRef.current = 0;
    setElapsedTime(0);
    setLastResult(null);
    configRef.current = null;
    lastStoppedTimestampRef.current = null;
    setGForce(0);
    maxGRef.current = 0;
    rolloutStartedRef.current = false;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    // Native: Stop Foreground Service when reset
    ForegroundService.stopForegroundService().catch(console.error);
  };

  const setMockResult = (result: RunResult) => {
    setLastResult(result);
  };

  const requestPermission = useCallback(async () => {
    setError(null);
    try {
      const result = await Geolocation.requestPermissions();
      if (result.location !== 'granted') {
        setError("Permissão de localização negada.");
      }
    } catch (e) {
      setError("Erro ao solicitar permissão.");
    }
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
    reset,
    setMockResult,
    requestPermission
  };
}

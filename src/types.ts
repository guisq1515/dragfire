export type RunMode = 'speed' | 'distance';

export interface RunConfig {
  mode: RunMode;
  target: number; // km/h for speed mode, meters for distance mode
  startSpeed?: number; // Optional start speed for rolling starts (km/h)
  useRollout?: boolean; // 1-foot rollout (approx 30cm)
}

export interface RunResult {
  id: string;
  timestamp: number;
  config: RunConfig;
  time: number; // seconds
  maxSpeed: number; // km/h
  avgSpeed: number; // km/h
  distance: number; // meters
  path: GPSPoint[]; // full path coordinates
  slope?: number; // percentage (positive = uphill, negative = downhill)
  isValidSlope?: boolean;
  maxG?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface RankingEntry {
  id: string;
  uid: string;
  userName: string;
  userPhoto?: string;
  vehicleName: string;
  vehicleType: 'car' | 'motorcycle';
  time: number;
  maxSpeed: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  slope: number;
}

export interface Challenge {
  id: string;
  creatorId: string;
  creatorName: string;
  result: RunResult;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  acceptedAt?: number;
  opponentResult?: RunResult;
}

export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number; // m/s
  timestamp: number;
}

export interface Vehicle {
  id?: string;
  uid?: string;
  type: 'car' | 'motorcycle';
  brand: string;
  model: string;
  year: string;
  nickname: string;
  photoURL?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

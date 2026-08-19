/**
 * Geolocation & Site GPS Verification Helper Utilities
 * Enables capturing real-time GPS coordinates for Field Portal submissions,
 * daily progress tracking, worker attendance verification, and site geo-fencing.
 */

import { GpsLocation } from '../types';

export interface GpsCaptureResult {
  success: boolean;
  location?: GpsLocation;
  error?: string;
  errorMessage?: string;
  errorCode?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED' | 'UNKNOWN';
}

/**
 * Captures current GPS coordinates from the device's browser / mobile Geolocation API.
 * Uses high-accuracy GPS sensors with reasonable fallback timeouts.
 */
export async function getCurrentGpsCoordinates(
  customOptions?: PositionOptions
): Promise<GpsCaptureResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      errorCode: 'NOT_SUPPORTED',
      error: 'Geolocation is not supported by this browser or device.'
    };
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 15000,
    ...customOptions
  };

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude } = position.coords;
        const capturedAt = new Date().toISOString();

        const location: GpsLocation = {
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: accuracy ? Math.round(accuracy) : undefined,
          altitude: altitude ? Math.round(altitude) : null,
          timestamp: position.timestamp || Date.now(),
          capturedAt,
          address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          isVerified: true
        };

        resolve({
          success: true,
          location
        });
      },
      (error) => {
        let errorCode: GpsCaptureResult['errorCode'] = 'UNKNOWN';
        let errorMsg = 'Failed to capture GPS coordinates.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorCode = 'PERMISSION_DENIED';
            errorMsg = 'GPS location permission was denied. Please allow location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorCode = 'POSITION_UNAVAILABLE';
            errorMsg = 'GPS location information is unavailable or device satellite signal is weak.';
            break;
          case error.TIMEOUT:
            errorCode = 'TIMEOUT';
            errorMsg = 'GPS location request timed out. Please retry in an open area.';
            break;
          default:
            errorCode = 'UNKNOWN';
            errorMsg = error.message || 'Unknown GPS error occurred.';
            break;
        }

        resolve({
          success: false,
          errorCode,
          error: errorMsg,
          errorMessage: errorMsg
        });
      },
      defaultOptions
    );
  });
}

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const rad = (deg: number) => (deg * Math.PI) / 180;
  
  const phi1 = rad(lat1);
  const phi2 = rad(lat2);
  const deltaPhi = rad(lat2 - lat1);
  const deltaLambda = rad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats GPS coordinates for display in Arabic / English.
 */
export function formatGpsCoordinates(
  gps?: GpsLocation | null,
  isRtl: boolean = false
): string {
  if (!gps || gps.latitude === undefined || gps.longitude === undefined) {
    return isRtl ? 'غير متوفر' : 'N/A';
  }

  const lat = Math.abs(gps.latitude).toFixed(5);
  const latDir = gps.latitude >= 0 ? (isRtl ? 'شمالاً' : 'N') : (isRtl ? 'جنوباً' : 'S');
  const lng = Math.abs(gps.longitude).toFixed(5);
  const lngDir = gps.longitude >= 0 ? (isRtl ? 'شرقاً' : 'E') : (isRtl ? 'غرباً' : 'W');
  const acc = gps.accuracy ? ` (±${gps.accuracy}${isRtl ? 'م' : 'm'})` : '';

  return `${lat}° ${latDir}, ${lng}° ${lngDir}${acc}`;
}

/**
 * Returns a direct Google Maps navigation URL for a given GPS location or lat/lng.
 */
export function getGoogleMapsUrl(
  gpsOrLat?: GpsLocation | number | null,
  lon?: number
): string {
  if (gpsOrLat === undefined || gpsOrLat === null) return '';
  if (typeof gpsOrLat === 'number') {
    if (lon === undefined) return '';
    return `https://www.google.com/maps?q=${gpsOrLat},${lon}`;
  }
  if (gpsOrLat.latitude === undefined || gpsOrLat.longitude === undefined) return '';
  return `https://www.google.com/maps?q=${gpsOrLat.latitude},${gpsOrLat.longitude}`;
}

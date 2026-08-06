import * as Location from 'expo-location';

export type Coordinates = {
  lat: number;
  lng: number;
};

// Throws a friendly Error on permission denial or failure, matching the
// convention used elsewhere in lib/ (auth.ts, cloudinary.ts). Callers should
// catch it, show the message, and fall back to location: null — location
// capture is best-effort and must never block report submission.
export async function getCurrentLocation(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      'Location access was denied. You can still submit your report without a location.'
    );
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch (error) {
    console.error('Failed to get current location:', error);
    throw new Error('Could not determine your location. Please try again.');
  }
}

// Best-effort: never throws, returns null if a readable address can't be
// resolved so it never blocks the location capture flow.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const place = results[0];
    if (!place) return null;

    const parts = [place.street ?? place.name, place.city, place.country].filter(
      (part): part is string => Boolean(part && part.trim())
    );

    return parts.length > 0 ? parts.join(', ') : null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

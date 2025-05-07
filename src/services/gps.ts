/**
 * Represents a geographical location with latitude and longitude coordinates.
 */
export interface Coordinates {
  /**
   * The latitude of the location.
   */
  latitude: number;
  /**
   * The longitude of the location.
   */
  longitude: number;
}

/**
 * Asynchronously retrieves coordinates for a given ride id.
 *
 * @param rideId The id of the ride.
 * @returns A promise that resolves to Coordinates object.
 */
export async function getCoordinates(rideId: string): Promise<Coordinates> {
  // TODO: Implement this by calling an GPS API.

  return {
    latitude: 37.7749,
    longitude: -122.4194,
  };
}

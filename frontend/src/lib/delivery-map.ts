export const DELIVERY_SHOWROOM = {
  name: "Vị trí giao hàng",
  address: "Trung tâm vận hành MNM, Quận 1, TP. Hồ Chí Minh",
  lat: 10.7769,
  lng: 106.7009,
} as const;

export type DeliveryRoutePoint = {
  lat: number;
  lng: number;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

function buildFallbackRoute(destinationLat: number, destinationLng: number): DeliveryRoutePoint[] {
  return [
    { lat: DELIVERY_SHOWROOM.lat, lng: DELIVERY_SHOWROOM.lng },
    { lat: destinationLat, lng: destinationLng },
  ];
}

export async function fetchShowroomRoute(
  destinationLat: number,
  destinationLng: number,
  signal?: AbortSignal,
) {
  const fallbackRoute = buildFallbackRoute(destinationLat, destinationLng);
  const routeUrl = new URL(
    `https://router.project-osrm.org/route/v1/driving/${DELIVERY_SHOWROOM.lng},${DELIVERY_SHOWROOM.lat};${destinationLng},${destinationLat}`,
  );

  routeUrl.searchParams.set("overview", "full");
  routeUrl.searchParams.set("geometries", "geojson");
  routeUrl.searchParams.set("alternatives", "false");
  routeUrl.searchParams.set("steps", "false");

  try {
    const response = await fetch(routeUrl.toString(), {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { points: fallbackRoute, isFallback: true };
    }

    const payload = (await response.json()) as OsrmRouteResponse;
    const routeCoordinates = payload.routes?.[0]?.geometry?.coordinates ?? [];
    const routePoints = routeCoordinates
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map(([lng, lat]) => ({ lat, lng }));

    if (payload.code !== "Ok" || routePoints.length < 2) {
      return { points: fallbackRoute, isFallback: true };
    }

    return { points: routePoints, isFallback: false };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    return { points: fallbackRoute, isFallback: true };
  }
}

import { useEffect, useRef } from "react";
import { Loader2, LocateFixed, MapPinned } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { DELIVERY_SHOWROOM, fetchShowroomRoute } from "@/lib/delivery-map";
import { Button } from "@/components/ui/button";

const DEFAULT_CENTER: L.LatLngTuple = [DELIVERY_SHOWROOM.lat, DELIVERY_SHOWROOM.lng];
const DEFAULT_ZOOM = 13;
const FOCUS_ZOOM = 16;
const ROUTE_PADDING: L.PointExpression = [34, 34];

const deliveryMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

type DeliveryLocationMapProps = {
  lat: number | null;
  lng: number | null;
  isAddressSyncing: boolean;
  isQuoteLoading: boolean;
  isLocating: boolean;
  onPickCoordinates: (lat: number, lng: number) => void;
  onLocateMe: () => void;
};

const DeliveryLocationMap = ({
  lat,
  lng,
  isAddressSyncing,
  isQuoteLoading,
  isLocating,
  onPickCoordinates,
  onLocateMe,
}: DeliveryLocationMapProps) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const showroomMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const routeRequestIdRef = useRef(0);
  const pickLocationRef = useRef(onPickCoordinates);
  const quoteLoadingRef = useRef(isQuoteLoading);

  useEffect(() => {
    pickLocationRef.current = onPickCoordinates;
  }, [onPickCoordinates]);

  useEffect(() => {
    quoteLoadingRef.current = isQuoteLoading;
  }, [isQuoteLoading]);

  function clearRouteLine() {
    routeAbortRef.current?.abort();
    routeAbortRef.current = null;
    routeRequestIdRef.current += 1;
    routeLineRef.current?.remove();
    routeLineRef.current = null;
  }

  function syncRouteLine(routePoints: L.LatLngTuple[], isFallback: boolean) {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!routeLineRef.current) {
      routeLineRef.current = L.polyline(routePoints, {
        color: "#8b5e3c",
        weight: 5,
        opacity: 0.88,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    } else {
      routeLineRef.current.setLatLngs(routePoints);
    }

    routeLineRef.current.setStyle({
      dashArray: isFallback ? "10 10" : undefined,
      opacity: isFallback ? 0.72 : 0.88,
    });
    routeLineRef.current.bringToBack();
  }

  useEffect(() => {
    const mapElement = mapElementRef.current;
    if (!mapElement || mapRef.current) {
      return;
    }

    const map = L.map(mapElement, {
      scrollWheelZoom: true,
      zoomControl: false,
      attributionControl: false,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    mapRef.current = map;

    L.control.zoom({ position: "topleft" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    showroomMarkerRef.current = L.circleMarker(DEFAULT_CENTER, {
      radius: 8,
      color: "#7a4d34",
      weight: 3,
      fillColor: "#fff8f1",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(
        `<strong>${DELIVERY_SHOWROOM.name}</strong><br/>${DELIVERY_SHOWROOM.address}`,
      )
      .bindTooltip("Vị trí giao hàng", {
        permanent: true,
        direction: "top",
        offset: [0, -10],
      });

    const syncPickedCoordinates = (nextLat: number, nextLng: number) => {
      if (quoteLoadingRef.current) {
        return;
      }
      pickLocationRef.current(roundCoordinate(nextLat), roundCoordinate(nextLng));
    };

    map.on("click", (event: L.LeafletMouseEvent) => {
      syncPickedCoordinates(event.latlng.lat, event.latlng.lng);
    });

    const resizeMap = () => map.invalidateSize();
    const resizeTimer = window.setTimeout(resizeMap, 200);
    window.addEventListener("resize", resizeMap);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resizeMap);
      clearRouteLine();
      showroomMarkerRef.current?.remove();
      showroomMarkerRef.current = null;
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const syncPickedCoordinates = (nextLat: number, nextLng: number) => {
      if (quoteLoadingRef.current) {
        return;
      }
      pickLocationRef.current(roundCoordinate(nextLat), roundCoordinate(nextLng));
    };

    if (lat === null || lng === null) {
      clearRouteLine();
      markerRef.current?.remove();
      markerRef.current = null;
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        draggable: true,
        icon: deliveryMarkerIcon,
      }).addTo(map);

      markerRef.current.on("dragend", () => {
        const point = markerRef.current?.getLatLng();
        if (!point) {
          return;
        }
        syncPickedCoordinates(point.lat, point.lng);
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    const requestId = routeRequestIdRef.current + 1;
    routeRequestIdRef.current = requestId;
    routeAbortRef.current?.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;

    void fetchShowroomRoute(lat, lng, controller.signal)
      .then(({ points, isFallback }) => {
        if (requestId !== routeRequestIdRef.current) {
          return;
        }

        const routePoints = points.map((point): L.LatLngTuple => [point.lat, point.lng]);
        syncRouteLine(routePoints, isFallback);
        map.fitBounds(L.latLngBounds(routePoints), {
          padding: ROUTE_PADDING,
          maxZoom: FOCUS_ZOOM,
        });
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        const fallbackPoints: L.LatLngTuple[] = [DEFAULT_CENTER, [lat, lng]];
        syncRouteLine(fallbackPoints, true);
        map.fitBounds(L.latLngBounds(fallbackPoints), {
          padding: ROUTE_PADDING,
          maxZoom: FOCUS_ZOOM,
        });
      });

    return () => {
      controller.abort();
      if (routeAbortRef.current === controller) {
        routeAbortRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div className="relative z-0 isolate self-start overflow-hidden rounded-[1.6rem] border border-border/70 bg-background shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-primary px-4 py-4 text-primary-foreground">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5" />
            <h2 className="text-[1.2rem] font-semibold">Bản đồ giao hàng</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-primary-foreground/90">
            Nhấp lên bản đồ hoặc kéo ghim để chốt vị trí giao hàng chính xác.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="rounded-full bg-white text-primary hover:bg-white/90"
          onClick={onLocateMe}
          disabled={isLocating || isQuoteLoading}
        >
          {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          Vị trí của tôi
        </Button>
      </div>

      <div className="relative z-0">
        <div ref={mapElementRef} className="relative z-0 h-[300px] w-full md:h-[360px]" />

        {(isQuoteLoading || isLocating || isAddressSyncing) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55 backdrop-blur-[1.5px]">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isLocating
                ? "Đang lấy vị trí hiện tại..."
                : isAddressSyncing
                  ? "Đang tìm vị trí từ địa chỉ..."
                  : "Đang đồng bộ địa chỉ và phí giao hàng..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryLocationMap;

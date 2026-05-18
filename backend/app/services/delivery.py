from __future__ import annotations

import math
import re
from functools import lru_cache
from typing import Any

import httpx

from app.core.config import get_settings


settings = get_settings()

NOMINATIM_SEARCH_URL = f"{settings.geocoding_base_url.rstrip('/')}/search"
NOMINATIM_REVERSE_URL = f"{settings.geocoding_base_url.rstrip('/')}/reverse"
ADDRESS_SEARCH_MIN_LENGTH = 4

LARGE_ITEM_KEYWORDS = (
    "sofa",
    "giuong",
    "giường",
    "tu ",
    "tủ ",
    "ban an",
    "bàn ăn",
    "ban lam viec",
    "bàn làm việc",
    "ke tv",
    "kệ tivi",
    "tu quan ao",
    "tủ quần áo",
    "tab dau giuong",
    "bàn trang điểm",
)


def _build_nominatim_headers() -> dict[str, str]:
    return {
        "User-Agent": settings.geocoding_user_agent,
        "Accept-Language": "vi,en",
    }


def _build_nominatim_params(base: dict[str, Any]) -> dict[str, Any]:
    params = dict(base)
    if settings.geocoding_contact_email.strip():
        params["email"] = settings.geocoding_contact_email.strip()
    return params


def _normalize_search_result(item: dict[str, Any]) -> dict[str, Any] | None:
    lat = item.get("lat")
    lng = item.get("lon")
    if lat is None or lng is None:
        return None

    try:
        lat_value = round(float(lat), 6)
        lng_value = round(float(lng), 6)
    except (TypeError, ValueError):
        return None

    display_name = str(item.get("display_name") or "").strip()
    short_label = display_name.split(",", 1)[0].strip() if display_name else "Địa chỉ gợi ý"
    return {
        "display_name": display_name or short_label,
        "short_label": short_label or display_name or "Địa chỉ gợi ý",
        "lat": lat_value,
        "lng": lng_value,
    }


@lru_cache(maxsize=256)
def _cached_address_search(query_text: str, limit: int, country_codes: str) -> tuple[tuple[Any, ...], ...]:
    with httpx.Client(timeout=10.0, headers=_build_nominatim_headers()) as client:
        response = client.get(
            NOMINATIM_SEARCH_URL,
            params=_build_nominatim_params(
                {
                    "q": query_text,
                    "format": "jsonv2",
                    "limit": max(1, min(limit, 8)),
                    "countrycodes": country_codes,
                    "addressdetails": 1,
                    "dedupe": 1,
                }
            ),
        )
        response.raise_for_status()

    normalized_results: list[tuple[Any, ...]] = []
    for raw_item in response.json():
        normalized = _normalize_search_result(raw_item)
        if not normalized:
            continue
        normalized_results.append(
            (
                normalized["display_name"],
                normalized["short_label"],
                normalized["lat"],
                normalized["lng"],
            )
        )
    return tuple(normalized_results)


def search_address_candidates(query: str, *, limit: int = 5, country_codes: str = "vn") -> list[dict[str, Any]]:
    query_text = (query or "").strip()
    if len(query_text) < ADDRESS_SEARCH_MIN_LENGTH:
        return []

    cached = _cached_address_search(query_text, limit, country_codes)
    return [
        {
            "display_name": item[0],
            "short_label": item[1],
            "lat": item[2],
            "lng": item[3],
        }
        for item in cached
    ]


@lru_cache(maxsize=256)
def reverse_geocode_coordinates(lat: float, lng: float) -> dict[str, Any]:
    with httpx.Client(timeout=10.0, headers=_build_nominatim_headers()) as client:
        response = client.get(
            NOMINATIM_REVERSE_URL,
            params=_build_nominatim_params(
                {
                    "lat": round(float(lat), 6),
                    "lon": round(float(lng), 6),
                    "format": "jsonv2",
                    "zoom": 18,
                    "addressdetails": 1,
                }
            ),
        )
        response.raise_for_status()

    data = response.json()
    return {
        "display_name": str(data.get("display_name") or "").strip(),
        "lat": round(float(data.get("lat", lat)), 6),
        "lng": round(float(data.get("lon", lng)), 6),
    }


def resolve_delivery_point(
    delivery_line: str,
    *,
    delivery_lat: float | None = None,
    delivery_lng: float | None = None,
) -> dict[str, Any]:
    normalized_line = delivery_line.strip()
    if delivery_lat is not None and delivery_lng is not None:
        try:
            lat_value = round(float(delivery_lat), 6)
            lng_value = round(float(delivery_lng), 6)
        except (TypeError, ValueError) as exc:
            raise ValueError("Tọa độ giao hàng không hợp lệ.") from exc

        reverse_result = reverse_geocode_coordinates(lat_value, lng_value)
        return {
            "resolved_address": reverse_result["display_name"] or normalized_line,
            "delivery_lat": lat_value,
            "delivery_lng": lng_value,
            "note": None if reverse_result["display_name"] else "Hệ thống giữ nguyên địa chỉ bạn vừa nhập.",
        }

    candidate_queries = [normalized_line]
    trimmed_numeric_prefix = re.sub(r"^\d+\s*", "", normalized_line).strip()
    if trimmed_numeric_prefix and trimmed_numeric_prefix not in candidate_queries:
        candidate_queries.append(trimmed_numeric_prefix)

    comma_parts = [part.strip() for part in normalized_line.split(",") if part.strip()]
    for size in range(min(3, len(comma_parts)), 0, -1):
        candidate = ", ".join(comma_parts[-size:])
        if candidate and candidate not in candidate_queries:
            candidate_queries.append(candidate)

    matches: list[dict[str, Any]] = []
    for candidate_query in candidate_queries:
        matches = search_address_candidates(candidate_query, limit=1)
        if matches:
            break

    if not matches:
        raise ValueError("Không tìm thấy địa chỉ phù hợp. Vui lòng bổ sung rõ hơn quận/huyện, thành phố.")

    match = matches[0]
    note = None
    if normalized_line.casefold() not in match["display_name"].casefold():
        note = "Hệ thống đã chuẩn hóa địa chỉ giao hàng theo kết quả gợi ý gần nhất."

    return {
        "resolved_address": match["display_name"],
        "delivery_lat": match["lat"],
        "delivery_lng": match["lng"],
        "note": note,
    }


def calculate_air_distance_km(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> float:
    earth_radius_km = 6371.0
    delta_lat = math.radians(end_lat - start_lat)
    delta_lng = math.radians(end_lng - start_lng)
    start_lat_rad = math.radians(start_lat)
    end_lat_rad = math.radians(end_lat)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(start_lat_rad) * math.cos(end_lat_rad) * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


def estimate_road_distance_km(air_distance_km: float) -> float:
    if air_distance_km <= 4:
        road_factor = 1.35
    elif air_distance_km <= 12:
        road_factor = 1.28
    else:
        road_factor = 1.22
    return round(air_distance_km * road_factor, 2)


def _extract_dimension_numbers(raw_text: str) -> list[float]:
    return [float(match.replace(",", ".")) for match in re.findall(r"\d+(?:[.,]\d+)?", raw_text)]


def _estimate_bulky_points(title: str, dimension_note: str, quantity: int) -> int:
    raw_text = f"{title} {dimension_note}".strip().casefold()
    numbers = _extract_dimension_numbers(raw_text)
    longest_side = max(numbers, default=0.0)

    base_points = 0
    if longest_side >= 200:
        base_points = 3
    elif longest_side >= 160:
        base_points = 2
    elif longest_side >= 100:
        base_points = 1
    elif any(keyword in raw_text for keyword in LARGE_ITEM_KEYWORDS):
        base_points = 2

    return base_points * max(quantity, 1)


def _estimate_bulky_surcharge(bulky_points: int) -> int:
    if bulky_points <= 1:
        return 0
    if bulky_points <= 3:
        return 30000
    if bulky_points <= 6:
        return 60000
    return 90000


def estimate_delivery_days(distance_km: float, bulky_points: int) -> int:
    if distance_km <= 8 and bulky_points <= 2:
        return 1
    if distance_km <= 20 and bulky_points <= 6:
        return 2
    return 3


def round_fee(value: int) -> int:
    return int(round(value / 5000.0) * 5000)


def calculate_furniture_delivery_quote(
    *,
    resolved_address: str,
    delivery_lat: float,
    delivery_lng: float,
    item_snapshots: list[dict[str, Any]],
    subtotal_amount: int,
    note: str | None = None,
) -> dict[str, Any]:
    air_distance_km = calculate_air_distance_km(
        settings.delivery_origin_lat,
        settings.delivery_origin_lng,
        delivery_lat,
        delivery_lng,
    )
    distance_km = estimate_road_distance_km(air_distance_km)
    extra_distance_km = max(distance_km - float(settings.furniture_delivery_base_km), 0)
    distance_surcharge = math.ceil(extra_distance_km) * int(settings.furniture_delivery_fee_per_km)

    bulky_points = sum(
        _estimate_bulky_points(
            str(item_snapshot.get("title") or ""),
            str(item_snapshot.get("dimension_note") or ""),
            int(item_snapshot.get("quantity") or 1),
        )
        for item_snapshot in item_snapshots
    )
    bulky_surcharge = _estimate_bulky_surcharge(bulky_points)
    handling_fee = int(settings.furniture_delivery_base_fee)
    shipping_fee = round_fee(handling_fee + distance_surcharge + bulky_surcharge)
    estimated_delivery_days = estimate_delivery_days(distance_km, bulky_points)

    if not note and distance_km > 20:
        note = "Đơn giao xa sẽ được liên hệ xác nhận thêm lịch giao và nhân sự lắp đặt."

    return {
        "resolved_address": resolved_address,
        "delivery_lat": round(delivery_lat, 6),
        "delivery_lng": round(delivery_lng, 6),
        "branch_name": settings.delivery_origin_name,
        "branch_address": settings.delivery_origin_address,
        "subtotal_amount": int(subtotal_amount),
        "shipping_fee": int(shipping_fee),
        "distance_km": float(distance_km),
        "grand_total": int(subtotal_amount + shipping_fee),
        "handling_fee": int(handling_fee),
        "distance_surcharge": int(distance_surcharge),
        "bulky_surcharge": int(bulky_surcharge),
        "bulky_points": int(bulky_points),
        "estimated_delivery_days": int(estimated_delivery_days),
        "note": note,
    }

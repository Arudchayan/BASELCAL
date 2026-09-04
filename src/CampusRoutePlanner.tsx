import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Home, Library, MapPin, MapPinned, Navigation, Route } from 'lucide-react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collectDaySessions } from './conflicts';
import {
  UNIVERSITY_LIBRARIES,
  HARDCODED_HOME,
  campusPlaceForRoom,
  openStreetMapDirectionsUrl,
  type CampusPlace,
} from './campusLocations';
import type { Course } from './types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WALKING_KMH = 4.8;
const STREET_FACTOR = 1.25;
const HOME_STORAGE_KEY = 'baselcal-home-v1';

type LocatedSession = ReturnType<typeof collectDaySessions>[number] & { place: CampusPlace };

type BreakSuggestion = {
  afterIndex: number;
  gapMinutes: number;
  library: CampusPlace;
  walkToMinutes: number;
  walkBackMinutes: number;
  studyMinutes: number;
};

type SavedHome = { lat: number; lng: number };

function loadHome(): SavedHome | null {
  try {
    const value = JSON.parse(localStorage.getItem(HOME_STORAGE_KEY) ?? 'null') as SavedHome | null;
    if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) {
      return { lat: HARDCODED_HOME.lat, lng: HARDCODED_HOME.lng };
    }
    return value;
  } catch {
    return { lat: HARDCODED_HOME.lat, lng: HARDCODED_HOME.lng };
  }
}

function distanceKm(a: CampusPlace, b: CampusPlace): number {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function walkingMinutes(a: CampusPlace, b: CampusPlace): number {
  if (a.id === b.id) return 0;
  return Math.max(2, Math.ceil(((distanceKm(a, b) * STREET_FACTOR) / WALKING_KMH) * 60));
}

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function FitRoute({ points }: { points: CampusPlace[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
      return;
    }
    map.fitBounds(points.map((point) => [point.lat, point.lng]), { padding: [28, 28] });
  }, [map, points]);
  return null;
}

function HomePinSetter({ active, onPick }: { active: boolean; onPick: (home: SavedHome) => void }) {
  useMapEvents({
    click(event) {
      if (active) onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function suggestLibrary(current: LocatedSession, next: LocatedSession, gapMinutes: number): Omit<BreakSuggestion, 'afterIndex' | 'gapMinutes'> | null {
  const options = UNIVERSITY_LIBRARIES.map((library) => {
    const walkToMinutes = walkingMinutes(current.place, library);
    const walkBackMinutes = walkingMinutes(library, next.place);
    const studyMinutes = gapMinutes - walkToMinutes - walkBackMinutes - 10;
    return { library, walkToMinutes, walkBackMinutes, studyMinutes };
  })
    .filter((option) => option.studyMinutes >= 25)
    .sort((a, b) => b.studyMinutes - a.studyMinutes || a.walkToMinutes - b.walkToMinutes);
  return options[0] ?? null;
}

export function CampusRoutePlanner({ courses }: { courses: Course[] }) {
  const [home, setHome] = useState<SavedHome | null>(loadHome);
  const [isSettingHome, setIsSettingHome] = useState(false);
  const dailySessions = useMemo(
    () => Object.fromEntries(DAYS.map((day) => [day, collectDaySessions(courses, day)
      .map((session) => ({ ...session, place: campusPlaceForRoom(session.room) }))
      .filter((session): session is LocatedSession => !!session.place)])),
    [courses],
  ) as Record<string, LocatedSession[]>;

  const availableDays = DAYS.filter((day) => dailySessions[day].length > 0);
  const [selectedDay, setSelectedDay] = useState(availableDays[0] ?? 'Monday');
  const activeDay = availableDays.includes(selectedDay) ? selectedDay : (availableDays[0] ?? 'Monday');
  const sessions = dailySessions[activeDay] ?? [];

  const suggestions = sessions.flatMap((session, index) => {
    const next = sessions[index + 1];
    if (!next) return [];
    const gapMinutes = Math.round((next.start - session.end) * 60);
    if (gapMinutes < 45) return [];
    const suggestion = suggestLibrary(session, next, gapMinutes);
    return suggestion ? [{ ...suggestion, afterIndex: index, gapMinutes }] : [];
  });

  const suggestionByIndex = new Map(suggestions.map((suggestion) => [suggestion.afterIndex, suggestion]));
  const isDefaultHome = !!home && home.lat === HARDCODED_HOME.lat && home.lng === HARDCODED_HOME.lng;
  const homePlace: CampusPlace | null = home ? {
    id: 'home',
    name: 'Home',
    address: isDefaultHome
      ? HARDCODED_HOME.address
      : 'Custom location stored only in this browser',
    lat: home.lat,
    lng: home.lng,
    kind: 'home',
  } : null;
  const campusRoutePoints = sessions.flatMap((session, index) => {
    const suggestion = suggestionByIndex.get(index);
    return suggestion ? [session.place, suggestion.library] : [session.place];
  });
  const routePoints = homePlace && campusRoutePoints.length
    ? [homePlace, ...campusRoutePoints, homePlace]
    : campusRoutePoints;
  const mapPoints = [...routePoints, ...suggestions.map((suggestion) => suggestion.library)];
  const movementMinutes = routePoints.slice(0, -1).reduce(
    (sum, point, index) => sum + walkingMinutes(point, routePoints[index + 1]),
    0,
  );

  const saveHome = (value: SavedHome) => {
    localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(value));
    setHome(value);
    setIsSettingHome(false);
  };

  if (!availableDays.length) return null;

  return (
    <section className="campus-route" aria-labelledby="campus-route-title">
      <div className="campus-route__header">
        <div>
          <span className="eyebrow"><MapPinned size={14} /> Campus route</span>
          <h3 id="campus-route-title">Classes, walks &amp; study breaks</h3>
          <p>Daily stop order with nearby University of Basel libraries during usable gaps.</p>
        </div>
        <div className="campus-route__actions">
          <div className="campus-route__summary">
            <Navigation size={16} /> ≈ {movementMinutes} min walking
          </div>
          <button
            type="button"
            className={isSettingHome ? 'home-pin-button is-active' : 'home-pin-button'}
            onClick={() => setIsSettingHome((current) => !current)}
          >
            <MapPin size={14} /> Move home pin
          </button>
        </div>
      </div>

      <div className={isSettingHome ? 'home-privacy is-active' : 'home-privacy'}>
        <Home size={14} />
        {isSettingHome
          ? 'Click your home location on the map. The pin stays only in this browser.'
          : isDefaultHome
            ? 'A home pin is included at the start and end of every route. Moving it creates a browser-only override.'
            : 'A custom browser-only home override is included at the start and end of every route.'}
      </div>

      <div className="campus-route__days" role="tablist" aria-label="Route day">
        {availableDays.map((day) => (
          <button
            key={day}
            role="tab"
            aria-selected={activeDay === day}
            className={activeDay === day ? 'is-active' : undefined}
            onClick={() => setSelectedDay(day)}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="campus-route__layout">
        <div className="campus-route__map" aria-label={`OpenStreetMap route for ${activeDay}`}>
          <MapContainer center={[47.5598, 7.5848]} zoom={15} scrollWheelZoom={false}>
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <HomePinSetter active={isSettingHome} onPick={saveHome} />
            <FitRoute points={mapPoints} />
            {routePoints.length > 1 && (
              <Polyline positions={routePoints.map((point) => [point.lat, point.lng])} pathOptions={{ color: '#3559e0', weight: 4, opacity: 0.75 }} />
            )}
            {sessions.map((session, index) => (
              <CircleMarker
                key={`${session.course.id}-${session.time}`}
                center={[session.place.lat, session.place.lng]}
                radius={8}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#3559e0', fillOpacity: 1 }}
              >
                <Popup><strong>{index + 1}. {session.course.title}</strong><br />{session.time}<br />{session.place.name}</Popup>
              </CircleMarker>
            ))}
            {homePlace && (
              <CircleMarker
                center={[homePlace.lat, homePlace.lng]}
                radius={9}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#d04b75', fillOpacity: 1 }}
              >
                <Popup><strong>Home</strong><br />{homePlace.address}</Popup>
              </CircleMarker>
            )}
            {suggestions.map((suggestion) => (
              <CircleMarker
                key={`${suggestion.afterIndex}-${suggestion.library.id}`}
                center={[suggestion.library.lat, suggestion.library.lng]}
                radius={7}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0b8f72', fillOpacity: 1 }}
              >
                <Popup><strong>{suggestion.library.name}</strong><br />Suggested study stop<br />≈ {minutesLabel(suggestion.studyMinutes)} available</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="campus-route__timeline">
          {homePlace && sessions.length > 0 && (
            <div className="home-route-leg">
              <Home size={15} />
              <span>Start at home · ≈ {walkingMinutes(homePlace, sessions[0].place)} min to {sessions[0].place.name}</span>
              <a href={openStreetMapDirectionsUrl(homePlace, sessions[0].place)} target="_blank" rel="noreferrer">Directions</a>
            </div>
          )}
          {sessions.map((session, index) => {
            const next = sessions[index + 1];
            const suggestion = suggestionByIndex.get(index);
            return (
              <div key={`${session.course.id}-${session.time}`} className="route-stop">
                <div className="route-stop__marker">{index + 1}</div>
                <div className="route-stop__body">
                  <strong>{session.course.title}</strong>
                  <span>{session.time} · {session.place.name}</span>
                  <small>{session.place.address}</small>
                  {suggestion && (
                    <div className="library-break">
                      <Library size={16} />
                      <div>
                        <strong>{minutesLabel(suggestion.gapMinutes)} break: {suggestion.library.name}</strong>
                        <span>
                          Walk ≈ {suggestion.walkToMinutes} min there + {suggestion.walkBackMinutes} min onward · ≈ {minutesLabel(suggestion.studyMinutes)} study time
                        </span>
                        <a href={suggestion.library.url} target="_blank" rel="noreferrer">
                          Library details <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                  {next && (
                    <a
                      className="route-leg"
                      href={openStreetMapDirectionsUrl(suggestion?.library ?? session.place, next.place)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Route size={13} /> Open next walk in OpenStreetMap
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {homePlace && sessions.length > 0 && (
            <div className="home-route-leg">
              <Home size={15} />
              <span>Return home · ≈ {walkingMinutes(sessions[sessions.length - 1].place, homePlace)} min</span>
              <a href={openStreetMapDirectionsUrl(sessions[sessions.length - 1].place, homePlace)} target="_blank" rel="noreferrer">Directions</a>
            </div>
          )}
        </div>
      </div>
      <p className="campus-route__footnote">Walking times are estimates. OpenStreetMap provides the basemap and detailed directions.</p>
    </section>
  );
}

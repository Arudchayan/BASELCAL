export type CampusPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: 'class' | 'library' | 'home';
  url?: string;
  matches?: string[];
};

export const CLASS_LOCATIONS: CampusPlace[] = [
  {
    id: 'alte-universitaet',
    name: 'Alte Universität',
    address: 'Rheinsprung 9, 4051 Basel',
    lat: 47.558988,
    lng: 7.5891303,
    kind: 'class',
    matches: ['Alte Universität'],
  },
  {
    id: 'biozentrum',
    name: 'Biozentrum',
    address: 'Spitalstrasse 41, 4056 Basel',
    lat: 47.564311,
    lng: 7.5810397,
    kind: 'class',
    matches: ['Biozentrum'],
  },
  {
    id: 'kollegienhaus',
    name: 'Kollegienhaus',
    address: 'Petersplatz 1, 4051 Basel',
    lat: 47.5582389,
    lng: 7.582859,
    kind: 'class',
    matches: ['Kollegienhaus'],
  },
  {
    id: 'spiegelgasse-1',
    name: 'Spiegelgasse 1',
    address: 'Spiegelgasse 1, 4051 Basel',
    lat: 47.5601777,
    lng: 7.5871128,
    kind: 'class',
    matches: ['Spiegelgasse 1'],
  },
  {
    id: 'spiegelgasse-5',
    name: 'Spiegelgasse 5',
    address: 'Spiegelgasse 5, 4051 Basel',
    lat: 47.5600415,
    lng: 7.5870682,
    kind: 'class',
    matches: ['Spiegelgasse 5'],
  },
  {
    id: 'departement-physik',
    name: 'Department of Physics',
    address: 'Klingelbergstrasse 82, 4056 Basel',
    lat: 47.5646723,
    lng: 7.5786084,
    kind: 'class',
    matches: ['Physik'],
  },
];

export const UNIVERSITY_LIBRARIES: CampusPlace[] = [
  {
    id: 'ub-main',
    name: 'University Main Library',
    address: 'Schönbeinstrasse 18-20, 4056 Basel',
    lat: 47.5597233,
    lng: 7.580911,
    kind: 'library',
    url: 'https://ub.unibas.ch/en/locations/university-main-library/',
  },
  {
    id: 'ub-medical',
    name: 'University Medical Library',
    address: 'Spiegelgasse 5, 4051 Basel',
    lat: 47.5600415,
    lng: 7.5870682,
    kind: 'library',
    url: 'https://ub.unibas.ch/en/locations/university-medical-library/',
  },
  {
    id: 'ub-religion',
    name: 'University Religion Library',
    address: 'Nadelberg 10, 4051 Basel',
    lat: 47.5581404,
    lng: 7.5849088,
    kind: 'library',
    url: 'https://ub.unibas.ch/en/locations/university-religion-library/',
  },
  {
    id: 'ub-rosental',
    name: 'University Library Rosental',
    address: 'Mattenstrasse 42, 4058 Basel',
    lat: 47.5670606,
    lng: 7.6017588,
    kind: 'library',
    url: 'https://ub.unibas.ch/en/locations/university-library-rosental/',
  },
];

export function campusPlaceForRoom(room: string): CampusPlace | undefined {
  return CLASS_LOCATIONS.find((place) => place.matches?.some((match) => room.includes(match)));
}

export function openStreetMapDirectionsUrl(from: CampusPlace, to: CampusPlace): string {
  const route = `${from.lat},${from.lng};${to.lat},${to.lng}`;
  return `https://www.openstreetmap.org/directions?route=${encodeURIComponent(route)}`;
}

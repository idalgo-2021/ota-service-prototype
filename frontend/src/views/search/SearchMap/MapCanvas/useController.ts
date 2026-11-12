import { useEffect, useRef, useState } from 'react';
import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
import Feature from 'ol/Feature.js';
import CircleGeom from 'ol/geom/Circle.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorSource from 'ol/source/Vector.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { boundingExtent } from 'ol/extent.js';
import type MapBrowserEvent from 'ol/MapBrowserEvent.js';
import type { MapPoint, MapPosition } from '../types';
import { PETROGRADKA_POIS, POI_CATEGORIES } from '../pois';
import { getAreaOutline } from '../area';
import {
  DEFAULT_ZOOM,
  FIT_BOUNDS_OPTIONS,
  FOCUS_ZOOM,
  MAX_ZOOM,
  SAINT_PETERSBURG_CENTER,
} from '../constants';
import { applyBasemapStyle } from './basemap';
import type { MapCanvasProps } from './MapCanvas';
import styles from './MapCanvas.module.css';
import {
  areaStyle,
  getDistrictStyle,
  nearbyRadiusLabelStyle,
  nearbyRadiusStyle,
} from './MapCanvas.styles';
import {
  createEventMarker,
  createHeritageMarker,
  createNightPlaceMarker,
  createNearbyPlaceMarker,
  createPointMarker,
  createSearchMarker,
  createPoiMarker,
} from './icons';

import { createHotelMarkers } from './hotelMarkers';
import { createHotelPreview } from './hotelPreview';

const ZOOM_DURATION = 250;

const toCoordinate = ([lat, lon]: MapPosition) => fromLonLat([lon, lat]);
const toPosition = (coordinate: number[]): MapPosition => {
  const [lon, lat] = toLonLat(coordinate);
  return [lat, lon];
};

const getDataExtent = (
  data: MapCanvasProps['data'],
  hotelsOnly = false
) => {
  const hotelPositions = data.hotels.map((hotel) => hotel.position);
  const positions =
    hotelsOnly && hotelPositions.length
      ? hotelPositions
      : [
          ...hotelPositions,
          ...data.points.map((point) => point.position),
          ...(data.events ?? []).map((event) => event.position),
          ...(data.parkings ?? []).map((parking) => parking.position),
          ...(data.nightPlaces ?? []).map((place) => place.position),
          ...(data.nearbyPlaces ?? []).map((place) => place.position),
          ...data.districts.flatMap((district) => district.positions.flat()),
        ];
  return positions.length ? boundingExtent(positions.map(toCoordinate)) : undefined;
};

const createPopup = (
  name: string,
  detail?: string,
  action?: { label: string; onClick: () => void } | { label: string; href: string }
) => {
  const popup = document.createElement('div');
  popup.className = styles.popup;
  const title = document.createElement('strong');
  title.textContent = name;
  popup.append(title);
  if (detail) {
    const description = document.createElement('span');
    description.textContent = detail;
    popup.append(description);
  }
  if (action) {
    if ('href' in action) {
      const link = document.createElement('a');
      link.className = styles.popupButton;
      link.href = action.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = action.label;
      popup.append(link);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = styles.popupButton;
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      popup.append(button);
    }
  }
  return popup;
};

/** Each layer owns its overlays; the map shares one active popup. */
const createOverlayGroup = (map: OlMap, popupRef: { current: Overlay | null }) => {
  const overlays: Overlay[] = [];
  let ownedPopup: Overlay | undefined;
  const closePopup = () => {
    if (!ownedPopup) {
      return;
    }
    map.removeOverlay(ownedPopup);
    if (popupRef.current === ownedPopup) {
      popupRef.current = null;
    }
    ownedPopup = undefined;
  };
  return {
    add(element: HTMLElement, position: MapPosition, zIndex: number) {
      const overlay = new Overlay({
        element,
        position: toCoordinate(position),
        positioning: 'bottom-center',
        stopEvent: true,
      });
      map.addOverlay(overlay);
      element.parentElement?.style.setProperty('z-index', String(zIndex));
      overlays.push(overlay);
    },
    showPopup(
      position: MapPosition,
      element: HTMLElement,
      placement: { positioning: 'bottom-left' | 'top-center'; offset: [number, number] } = {
        positioning: 'bottom-left',
        offset: [12, -55],
      }
    ) {
      closePopup();
      if (popupRef.current) {
        map.removeOverlay(popupRef.current);
      }
      ownedPopup = new Overlay({
        element,
        position: toCoordinate(position),
        positioning: placement.positioning,
        offset: placement.offset,
        stopEvent: true,
        autoPan: { margin: 16, animation: { duration: 200 } },
      });
      map.addOverlay(ownedPopup);
      element.parentElement?.style.setProperty('z-index', '4');
      popupRef.current = ownedPopup;
    },
    closePopup,
    dispose() {
      closePopup();
      for (const overlay of overlays) {
        map.removeOverlay(overlay);
      }
    },
  };
};

export const useController = ({
  data,
  poiCategories,
  points,
  showAllHotels,
  heritageBuildings,
  nearbyPlaces,
  nightPlaces,
  districts,
  districtIds,
  selectedHotelId,
  focusSelectedHotel,
  initialZoom,
  fitToData = true,
  nearbyStyle,
  addingPoint,
  focusPosition,
  focusBounds,
  searchResult,
  area,
  onAddPoint,
  onAddSearchResult,
  onRemovePoint,
  onToggleDistrict,
  onHotelSelect,
}: MapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap>(null);
  const districtSourceRef = useRef<VectorSource>(null);
  const areaSourceRef = useRef<VectorSource>(null);
  const nearbyRadiusSourceRef = useRef<VectorSource>(null);
  // Пока ищут по области, выдача меняется от действий на карте, и подгонять под неё вид не нужно.
  const areaActiveRef = useRef(Boolean(area));
  const hotelMarkersRef = useRef<ReturnType<typeof createHotelMarkers>>(null);
  const hotelPreviewRef = useRef<ReturnType<typeof createHotelPreview>>(null);
  const popupRef = useRef<Overlay>(null);
  const callbacksRef = useRef({
    addingPoint,
    onAddPoint,
    onToggleDistrict,
    onHotelSelect,
    onRemovePoint,
    onAddSearchResult,
  });
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    callbacksRef.current = {
      addingPoint,
      onAddPoint,
      onToggleDistrict,
      onHotelSelect,
      onRemovePoint,
      onAddSearchResult,
    };
  }, [addingPoint, onAddPoint, onToggleDistrict, onHotelSelect, onRemovePoint, onAddSearchResult]);

  useEffect(() => {
    areaActiveRef.current = Boolean(area);
  }, [area]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    // Надписи подложки рисует сам OpenLayers; declutter прячет те, что наезжают друг на друга.
    const basemapLayer = new VectorTileLayer({ declutter: true });
    const districtSource = new VectorSource();
    const districtLayer = new VectorLayer({ source: districtSource });
    const areaSource = new VectorSource();
    const areaLayer = new VectorLayer({ source: areaSource, style: areaStyle });
    const nearbyRadiusSource = new VectorSource();
    const nearbyRadiusLayer = new VectorLayer({
      source: nearbyRadiusSource,
      style: (feature) => (feature.get('radiusLabel') ? nearbyRadiusLabelStyle : nearbyRadiusStyle),
    });
    const map = new OlMap({
      target: containerRef.current,
      layers: [basemapLayer, districtLayer, areaLayer, nearbyRadiusLayer],
      view: new View({
        center: toCoordinate(data.center),
        zoom: DEFAULT_ZOOM,
        maxZoom: MAX_ZOOM,
        enableRotation: false,
        constrainResolution: false,
      }),
      // Стандартные Zoom и Rotate выключены: зум — свои кнопки в MapControls,
      // поворот запрещён во View.
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attributionOptions: { collapsible: false, tipLabel: 'Источники данных карты' },
      }).extend([new ScaleLine({ units: 'metric' })]),
    });
    mapRef.current = map;
    const hotelPreview = createHotelPreview(containerRef.current);
    hotelPreviewRef.current = hotelPreview;
    const hotelMarkers = createHotelMarkers(
      map,
      (id) => callbacksRef.current.onHotelSelect(id),
      hotelPreview.open,
      hotelPreview.scheduleClose,
      showAllHotels,
      nearbyStyle
    );
    hotelMarkersRef.current = hotelMarkers;
    districtSourceRef.current = districtSource;
    areaSourceRef.current = areaSource;
    nearbyRadiusSourceRef.current = nearbyRadiusSource;
    const tileStats = { loaded: 0, failed: 0 };

    const handleLoadStart = () => {
      tileStats.loaded = 0;
      tileStats.failed = 0;
    };
    const handleTileLoad = () => {
      tileStats.loaded += 1;
    };
    const handleTileError = () => {
      tileStats.failed += 1;
    };
    const handleLoadEnd = () => {
      setTileError(tileStats.loaded === 0 && tileStats.failed > 0);
    };
    const handleMapClick = (event: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>) => {
      const callbacks = callbacksRef.current;
      if (callbacks.addingPoint) {
        callbacks.onAddPoint(toPosition(event.coordinate));
        return;
      }
      const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate, {
        layerFilter: (layer) => layer === districtLayer,
      });
      const districtId = feature?.get('districtId') as string | undefined;
      if (districtId) {
        callbacks.onToggleDistrict(districtId);
      }
    };
    map.on('loadstart', handleLoadStart);
    map.on('loadend', handleLoadEnd);
    map.on('singleclick', handleMapClick);
    map.on('movestart', hotelPreview.close);

    const basemapAbort = new AbortController();
    applyBasemapStyle(basemapLayer, basemapAbort.signal)
      .then(() => {
        const source = basemapLayer.getSource();
        source?.on('tileloadend', handleTileLoad);
        source?.on('tileloaderror', handleTileError);
      })
      .catch((error: unknown) => {
        if (basemapAbort.signal.aborted) {
          return;
        }
        console.error(error);
        setTileError(true);
      });

    const handleResize = () => map.updateSize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      basemapAbort.abort();
      observer.disconnect();
      hotelMarkers.dispose();
      hotelPreview.dispose();
      map.un('movestart', hotelPreview.close);
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
      districtSourceRef.current = null;
      areaSourceRef.current = null;
      nearbyRadiusSourceRef.current = null;
      hotelMarkersRef.current = null;
      hotelPreviewRef.current = null;
      popupRef.current = null;
    };
  }, [data.center, nearbyStyle, showAllHotels]);

  useEffect(() => {
    const source = nearbyRadiusSourceRef.current;
    if (!source) {
      return;
    }
    source.clear();
    if (!nearbyStyle) {
      return;
    }
    const hotel = selectedHotelId
      ? data.hotels.find((candidate) => candidate.id === selectedHotelId)
      : data.hotels[0];
    const center = toCoordinate(hotel?.position ?? data.center);
    source.addFeature(new Feature({ geometry: new CircleGeom(center, 1000) }));
    source.addFeature(
      new Feature({
        geometry: new Point([center[0], center[1] + 1000]),
        radiusLabel: true,
      })
    );
  }, [data.center, data.hotels, nearbyStyle, selectedHotelId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || areaActiveRef.current) {
      return;
    }
    const extent = getDataExtent(data, showAllHotels);
    if (fitToData && extent) {
      map.getView().fit(extent, FIT_BOUNDS_OPTIONS);
    } else {
      map.getView().setCenter(toCoordinate(SAINT_PETERSBURG_CENTER));
    }
    if (initialZoom !== undefined) {
      map.getView().setZoom(initialZoom);
    }
  }, [data, fitToData, initialZoom, showAllHotels]);

  useEffect(() => {
    if (!focusSelectedHotel || !selectedHotelId) {
      return;
    }
    const selectedHotel = data.hotels.find((hotel) => hotel.id === selectedHotelId);
    const map = mapRef.current;
    if (!map || !selectedHotel) {
      return;
    }
    map.getView().animate({
      center: toCoordinate(selectedHotel.position),
      zoom: FOCUS_ZOOM,
      duration: 450,
    });
  }, [data.hotels, focusSelectedHotel, selectedHotelId]);

  useEffect(() => {
    const source = areaSourceRef.current;
    if (!source) {
      return;
    }
    source.clear();
    const outline = area ? getAreaOutline(area).map(toCoordinate) : [];
    // Без расширения две точки дают отрезок, а одна — пустую область, которую не рисуем.
    if (outline.length >= 3) {
      source.addFeature(new Feature({ geometry: new Polygon([[...outline, outline[0]]]) }));
    } else if (outline.length === 2) {
      source.addFeature(new Feature({ geometry: new LineString(outline) }));
    }
  }, [area, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    const source = districtSourceRef.current;
    if (!map || !source) {
      return;
    }
    source.clear();
    for (const district of districts) {
      const rings = district.positions.map((ring) => {
        const coordinates = ring.map(toCoordinate);
        if (coordinates.length) {
          coordinates.push([...coordinates[0]]);
        }
        return coordinates;
      });
      const feature = new Feature({ geometry: new Polygon(rings), districtId: district.id });
      feature.setStyle(getDistrictStyle(districtIds.includes(district.id), district.name));
      source.addFeature(feature);
    }
  }, [districts, districtIds, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && focusPosition) {
      map
        .getView()
        .animate({ center: toCoordinate(focusPosition), zoom: FOCUS_ZOOM, duration: 500 });
    }
  }, [focusPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && focusBounds?.length) {
      map.getView().fit(boundingExtent(focusBounds.map(toCoordinate)), {
        ...FIT_BOUNDS_OPTIONS,
        duration: 500,
      });
    }
  }, [focusBounds]);

  useEffect(() => {
    hotelMarkersRef.current?.setHotels(data.hotels);
    hotelPreviewRef.current?.sync(data.hotels);
  }, [data.hotels, data.center]);

  useEffect(() => {
    hotelMarkersRef.current?.select(selectedHotelId);
    if (
      hotelPreviewRef.current?.getActiveId() &&
      selectedHotelId !== hotelPreviewRef.current.getActiveId()
    ) {
      hotelPreviewRef.current.close();
    }
  }, [selectedHotelId, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    for (const poi of PETROGRADKA_POIS) {
      if (!poiCategories.includes(poi.category)) {
        continue;
      }
      const category = POI_CATEGORIES[poi.category];
      const marker = createPoiMarker(poi.name, category.symbol, category.color);
      marker.addEventListener('click', () =>
        group.showPopup(
          poi.position,
          createPopup(
            poi.name,
            `${category.name} · Петроградская сторона · Демонстрационный объект`
          )
        )
      );
      group.add(marker, poi.position, 0);
    }
    return group.dispose;
  }, [poiCategories, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    for (const point of points) {
      const marker = createPointMarker(point);
      marker.addEventListener('click', () =>
        group.showPopup(
          point.position,
          createPopup(point.name, undefined, {
            label: 'Удалить точку',
            onClick: () => {
              callbacksRef.current.onRemovePoint(point.id);
              group.closePopup();
            },
          })
        )
      );
      group.add(marker, point.position, 2);
    }
    return group.dispose;
  }, [points, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    for (const event of data.events ?? []) {
      const marker = createEventMarker(event.name);
      marker.addEventListener('click', () =>
        group.showPopup(
          event.position,
          createPopup(
            event.name,
            [event.venue, event.dateLabel, event.priceLabel].filter(Boolean).join(' · '),
            { label: 'Открыть событие', href: event.href }
          )
        )
      );
      group.add(marker, event.position, 1);
    }
    return group.dispose;
  }, [data.events, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    for (const place of nightPlaces) {
      const marker = createNightPlaceMarker(place.category);
      marker.addEventListener('click', () =>
        group.showPopup(
          place.position,
          createPopup(
            place.name || 'Круглосуточное место',
            [place.address, place.openingHours || '24/7', 'Источник: OSM']
              .filter(Boolean)
              .join(' · '),
            { label: 'Открыть в OSM', href: place.sourceUrl }
          )
        )
      );
      group.add(marker, place.position, 2);
    }
    return group.dispose;
  }, [nightPlaces, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    for (const building of heritageBuildings) {
      const marker = createHeritageMarker(building.name);
      marker.addEventListener('click', () =>
        group.showPopup(
          building.position,
          createPopup(
            building.name,
            `${building.address} · построено в ${building.constructionYear}. ${building.historicalDescription} · Источник: ${building.source}`
          )
        )
      );
      group.add(marker, building.position, 1);
    }
    return group.dispose;
  }, [heritageBuildings, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    for (const place of nearbyPlaces) {
      const marker = createNearbyPlaceMarker(place);
      marker.addEventListener('click', () =>
        group.showPopup(
          place.position,
          createPopup(
            place.name,
            place.detail,
            place.href ? { label: 'Открыть', href: place.href } : undefined
          )
        )
      );
      group.add(marker, place.position, 2);
    }
    return group.dispose;
  }, [nearbyPlaces, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !searchResult) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    const marker = createSearchMarker(searchResult.name);
    const show = () =>
      group.showPopup(
        searchResult.position,
        createPopup(searchResult.name, searchResult.address, {
          label: 'Добавить в мои места',
          onClick: () => callbacksRef.current.onAddSearchResult(),
        })
      );
    marker.addEventListener('click', show);
    group.add(marker, searchResult.position, 3);
    show();
    return group.dispose;
  }, [searchResult, data.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const group = createOverlayGroup(map, popupRef);
    for (const parking of data.parkings ?? []) {
      const marker = createPoiMarker(parking.name, 'P', '#2d6a4f');
      marker.addEventListener('click', () =>
        group.showPopup(parking.position, createPopup(parking.name, parking.detail))
      );
      group.add(marker, parking.position, 2);
    }
    return group.dispose;
  }, [data.parkings, data.center]);

  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView();
    const zoom = view?.getZoom();
    if (!view || zoom === undefined) {
      return;
    }
    view.cancelAnimations();
    view.animate({ zoom: view.getConstrainedZoom(zoom + delta), duration: ZOOM_DURATION });
  };

  const handleZoomIn = () => {
    zoomBy(1);
  };

  const handleZoomOut = () => {
    zoomBy(-1);
  };

  const handleRecenter = () => {
    mapRef.current?.getView().animate({
      center: toCoordinate(SAINT_PETERSBURG_CENTER),
      zoom: DEFAULT_ZOOM,
      duration: 500,
    });
  };

  return { containerRef, tileError, handleZoomIn, handleZoomOut, handleRecenter };
};

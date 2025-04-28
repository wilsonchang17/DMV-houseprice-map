// src/MapView.js
import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  Pane,
  useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import { supabase } from './supabaseClient';
import StationPopupChart from './StationPopupChart';
import ZipcodePopup from './ZipcodePopup';
import './styles/style.css';
import { createRoot } from 'react-dom/client';
import { lineColors, lineCodeLabels } from './lineMeta';
import Header from './Header';
import L from 'leaflet';
import ChatWidget from './components/ChatWidget/ChatWidget';

const urls = {
  dc: 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/refs/heads/master/dc_district_of_columbia_zip_codes_geo.min.json',
  virginia: 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/refs/heads/master/va_virginia_zip_codes_geo.min.json',
  maryland: 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/refs/heads/master/md_maryland_zip_codes_geo.min.json',
};

function filterGeoJSONwithValidGeometry(data) {
  if (!data || !data.features) return data;
  const filteredFeatures = data.features.filter(
    (f) => f.geometry && f.geometry.type && f.geometry.coordinates
  );
  return { ...data, features: filteredFeatures };
}

const filterGeoByStations = (geoDataList, stations, radiusInMiles = 0.5) =>
  geoDataList.map((geoData) => {
    const filteredFeatures = geoData.features.filter((feature) => {
      if (!feature.geometry) return false;
      const centroid = turf.centroid(feature).geometry.coordinates;
      return stations.some((station) => {
        if (!station.lat || !station.lon) return false;
        const stationCoords = [parseFloat(station.lon), parseFloat(station.lat)];
        const distance = turf.distance(
          turf.point(centroid),
          turf.point(stationCoords),
          { units: 'miles' }
        );
        return distance <= radiusInMiles;
      });
    });
    return { ...geoData, features: filteredFeatures };
  });

function Legend({ thresholds, colorGen }) {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'bottomleft' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');

      const formatK = (v) => `$${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;

      const grades = [
        { label: `< ${formatK(400000)}`, value: 399999 },
        { label: `${formatK(400000)} – ${formatK(500000)}`, value: 450000 },
        { label: `${formatK(500000)} – ${formatK(600000)}`, value: 550000 },
        { label: `> ${formatK(600000)}`, value: 600001 },
      ];

      grades.forEach((g) => {
        div.innerHTML += `<i style="background:${colorGen(g.value)}"></i> ${g.label}<br/>`;
      });

      return div;
    };

    legend.addTo(map);
    return () => legend.remove();
  }, [map, thresholds, colorGen]);

  return null;
}

function getStaticFillColorGenerator() {
  return (price) => {
    if (price == null) return '#cccccc';
    if (price < 400000) return '#7bccc4';
    if (price < 500000) return '#2b8cbe';
    if (price < 600000) return '#0868ac';
    return '#084081'; // 600k+
  };
}

// 新增：站點彈窗的 Chart + 預測表格
function StationPopupContent({ zip }) {
  const [predictions, setPredictions] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);

  useEffect(() => {
    const z = parseInt(zip, 10);

    // 取最新預測
    supabase
      .from('Predictions')
      .select('month_ahead, quarter_ahead, year_ahead')
      .eq('region_name', z)
      .order('base_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPredictions(data))
      .catch(console.error);

    // 取最新實際價格
    supabase
      .from('Locations_Prices')
      .select('value')
      .eq('region_name', z)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data && setCurrentPrice(Number(data.value)))
      .catch(console.error);
  }, [zip]);

  const calcPred = (key) => {
    if (currentPrice != null && predictions?.[key] != null) {
      const rate = Number(predictions[key]) / 100;
      return currentPrice * (1 + rate);
    }
    return null;
  };
  const fmt = (v) =>
    v != null
      ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : '—';

  return (
    <>
      <StationPopupChart zip={zip} />
      <div className="zipcode-popup-section-label">Predictions</div>
      <div className="prediction-table">
        <div className="pred-row">
          <span className="pred-label">1-Month</span>
          <span className="pred-value">{fmt(calcPred('month_ahead'))}</span>
        </div>
        <div className="pred-row">
          <span className="pred-label">1-Quarter</span>
          <span className="pred-value">{fmt(calcPred('quarter_ahead'))}</span>
        </div>
        <div className="pred-row">
          <span className="pred-label">1-Year</span>
          <span className="pred-value">{fmt(calcPred('year_ahead'))}</span>
        </div>
      </div>
    </>
  );
}

function StationMarkers({ stations, geoData, zipCenters, openPopupId, setOpenPopupId }) {
  return stations.flatMap((station) => {
    const { id, station_name, line_code1, line_code2, line_code3, line_code4, lat, lon } = station;
    if (!lat || !lon) return null;
    const latF = parseFloat(lat), lonF = parseFloat(lon);
    const lines = [line_code1, line_code2, line_code3, line_code4].filter(Boolean);
    const stationPoint = turf.point([lonF, latF]);
    let nearestZip = null, fallbackZips = [];

    if (geoData.length) {
      const allPolys = geoData.flatMap((g) => g.features);
      const containing = allPolys.filter((f) => {
        try {
          const coords = f.geometry.coordinates;
          const poly =
            f.geometry.type === 'Polygon'
              ? turf.polygon(coords)
              : turf.multiPolygon(coords);
          return turf.booleanPointInPolygon(stationPoint, poly);
        } catch {
          return false;
        }
      });
      if (containing.length) {
        nearestZip = containing[0].properties.ZCTA5CE10;
      } else {
        const sorted = zipCenters
          .map((z) => ({ zip: z.zip, dist: turf.distance(stationPoint, z.point) }))
          .sort((a, b) => a.dist - b.dist);
        nearestZip = sorted[0]?.zip;
        fallbackZips = sorted.slice(1, 4).map((z) => z.zip);
      }
    }

    const layers = [];

    lines.reverse().forEach((line, i) => {
      layers.push(
        <CircleMarker
          key={`${id}-${line}`}
          center={[latF, lonF]}
          radius={6 + (i + 1) * 3}
          color={lineColors[line] || '#000'}
          fillOpacity={0}
          weight={3}
          pane="stationsPane"
        />
      );
    });

    layers.push(
      <CircleMarker
        key={`${id}-core`}
        center={[latF, lonF]}
        radius={6}
        color="#fff"
        fillColor="#fff"
        fillOpacity={1}
        weight={2}
        pane="stationsPane"
        eventHandlers={{ click: () => setOpenPopupId(id) }}
      >
        {openPopupId === id && nearestZip && (
          <Popup pane="topPopupPane" maxWidth={360} closeButton={false}>
            <div className="station-popup-card">
              <div className="popup-header">
                <span className="popup-title">{station_name}</span>
                <span className="popup-zip">#{nearestZip}</span>
                <span className="popup-close" onClick={() => setOpenPopupId(null)}>×</span>
              </div>
              <div className="popup-body">
                <div className="popup-section-label">Price</div>
                <StationPopupContent zip={nearestZip} />

                <div className="popup-section-label">Metro Info</div>
                {lines.map((lc) => (
                  <div key={lc} className="popup-metro-line">
                    <span
                      className="metro-dot"
                      style={{ backgroundColor: lineColors[lc] || '#999' }}
                    />
                    {lineCodeLabels[lc] || lc}
                  </div>
                ))}
              </div>
            </div>
          </Popup>
        )}
      </CircleMarker>
    );

    return layers;
  });
}

export default function MapView() {
  const [geoData, setGeoData] = useState([]);
  const [stations, setStations] = useState([]);
  const [zipPriceMap, setZipPriceMap] = useState({});
  const [fillColorFunc, setFillColorFunc] = useState(() => () => '#ccc');
  const [openPopupId, setOpenPopupId] = useState(null);
  const [thresholds, setThresholds] = useState([0, 0, 0]);

  useEffect(() => {
    async function fetchData() {
      const { data: stationData, error: stationError } = await supabase
        .from('Station')
        .select(
          'station_name, line_code1, line_code2, line_code3, line_code4, lat, lon'
        );
      if (stationError || !stationData) return;
      setStations(stationData);

      async function fetchGeo(url) {
        try {
          const res = await fetch(url);
          const json = await res.json();
          return filterGeoJSONwithValidGeometry(json);
        } catch {
          return null;
        }
      }

      const results = await Promise.all([
        fetchGeo(urls.dc),
        fetchGeo(urls.virginia),
        fetchGeo(urls.maryland)
      ]);
      const valid = results.filter(Boolean);
      const filtered = filterGeoByStations(valid, stationData, 3);
      setGeoData(filtered);

      const geoZipInfo = new Map();
      filtered.forEach((g) =>
        g.features.forEach((f) => {
          const z = f.properties?.ZCTA5CE10;
          if (z) geoZipInfo.set(String(z), true);
        })
      );
      const collectedGeoZips = Array.from(geoZipInfo.keys()).map((z) =>
        z.padStart(5, '0')
      );

      const { data: latestPrices, error: priceError } = await supabase
        .from('Locations_Prices')
        .select('region_name, value', { distinct: ['region_name'] })
        .in('region_name', collectedGeoZips)
        .order('date', { ascending: false });

      if (priceError) {
        console.error('Failed to get the newest price:', priceError);
      } else {
        const priceMap = {};
        latestPrices.forEach(({ region_name, value }) => {
          const zip = String(region_name).padStart(5, '0');
          priceMap[zip] = Number(value);
        });
        setZipPriceMap(priceMap);

        const values = Object.values(priceMap);
        setThresholds([400000, 500000, 600000]);
        setFillColorFunc(() => getStaticFillColorGenerator());
      }
    }

    fetchData();
  }, []);

  const zipCenters = geoData
    .flatMap((g) => g.features)
    .map((f) => ({
      zip: f.properties.ZCTA5CE10,
      point: turf.point(turf.centroid(f).geometry.coordinates)
    }));

  const onEachFeature = (feature, layer) => {
    const zip = feature.properties?.ZCTA5CE10;
    if (!zip) return;
    layer.bindTooltip(`ZIP Code: ${zip}`, {
      direction: 'center',
      className: 'zip-tooltip'
    });
    layer.on({
      mouseover: (e) =>
        e.target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.7 }),
      mouseout: (e) =>
        e.target.setStyle({ weight: 0, color: 'transparent', fillOpacity: 0.6 }),
      click: (e) => {
        const coords = turf.centroid(feature).geometry.coordinates;
        const zipPoint = turf.point(coords);
        const nearest = stations
          .map((s) => {
            const lat = parseFloat(s.lat),
              lon = parseFloat(s.lon);
            if (!lat || !lon) return null;
            return {
              ...s,
              distance: turf.distance(zipPoint, turf.point([lon, lat]))
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3);

        const container = document.createElement('div');
        createRoot(container).render(
          <ZipcodePopup zipCode={zip} stations={nearest} map={layer._map} />
        );
        layer
          .bindPopup(container, { maxWidth: 360, closeButton: false })
          .openPopup();
      }
    });
  };

  return (
    <div className="map-view">
      <Header title="DMV Area Metro-Centric Price Map" />
      <MapContainer
        center={[38.95, -77.15]}
        zoom={11}
        style={{ height: 'calc(100vh - 80px)', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Pane name="zipPane" style={{ zIndex: 300 }}>
          {geoData.map((g, i) => (
            <GeoJSON
              key={i}
              data={g}
              onEachFeature={onEachFeature}
              style={(feature) => {
                const raw = feature.properties?.ZCTA5CE10;
                const zip = String(raw).padStart(5, '0');
                const price = zipPriceMap[zip];
                return {
                  fillColor: price != null ? fillColorFunc(price) : '#cccccc',
                  color: 'transparent',
                  weight: 0,
                  fillOpacity: 0.6
                };
              }}
              pane="zipPane"
            />
          ))}
        </Pane>
        <Pane name="stationsPane" style={{ zIndex: 400 }}>
          <StationMarkers
            stations={stations}
            geoData={geoData}
            zipCenters={zipCenters}
            openPopupId={openPopupId}
            setOpenPopupId={setOpenPopupId}
          />
        </Pane>
        <Pane name="topPopupPane" style={{ zIndex: 999 }} />
        <Legend thresholds={thresholds} colorGen={fillColorFunc} />
        <ChatWidget />
      </MapContainer>
    </div>
  );
}
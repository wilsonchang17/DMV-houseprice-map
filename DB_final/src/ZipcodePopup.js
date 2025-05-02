// src/ZipcodePopup.js
import React, { useState, useEffect } from 'react';
import ZipcodePopupChart from './ZipcodePopupChart';
import { supabase } from './supabaseClient';
import { lineColors } from './lineMeta';

export default function ZipcodePopup({ zipCode, stations, map }) {
  const [predictions, setPredictions] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);

  useEffect(() => {
    const zipNum = parseInt(zipCode, 10);

  
    const fetchPrediction = async () => {
      const { data, error } = await supabase
        .from('Predictions')
        .select('month_ahead, quarter_ahead, year_ahead')
        .eq('region_name', zipNum)
        .order('base_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Fetch prediction error:', error);
      } else {
        setPredictions(data);
      }
    };


    const fetchCurrentPrice = async () => {
      const { data, error } = await supabase
        .from('Locations_Prices')
        .select('value')
        .eq('region_name', zipNum)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Fetch current price error:', error);
      } else if (data) {
        setCurrentPrice(Number(data.value));
      }
    };

    fetchPrediction();
    fetchCurrentPrice();
  }, [zipCode]);

 
  const calcPredPrice = (key) => {
    if (currentPrice != null && predictions?.[key] != null) {
      const rate = Number(predictions[key]) / 100; 
      return currentPrice * (1 + rate);
    }
    return null;
  };

  
  const fmtPrice = (v) =>
    v != null ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';

  return (
    <div className="zipcode-popup-card">
      <div className="zipcode-popup-header">
        <span>#{zipCode}</span>
        <span className="zipcode-popup-close" onClick={() => map?.closePopup()}>
          ×
        </span>
      </div>

      <div className="zipcode-popup-body">
        <div className="zipcode-popup-section-label">Price</div>
        <ZipcodePopupChart zip={zipCode} />

      
        <div className="zipcode-popup-section-label">Predictions</div>
        <div className="prediction-table">
          <div className="pred-row">
            <span className="pred-label">1-Month</span>
            <span className="pred-value">{fmtPrice(calcPredPrice('month_ahead'))}</span>
          </div>
          <div className="pred-row">
            <span className="pred-label">1-Quarter</span>
            <span className="pred-value">{fmtPrice(calcPredPrice('quarter_ahead'))}</span>
          </div>
          <div className="pred-row">
            <span className="pred-label">1-Year</span>
            <span className="pred-value">{fmtPrice(calcPredPrice('year_ahead'))}</span>
          </div>
        </div>

        <div className="zipcode-popup-section-label">Nearby Stations</div>
        {stations.map((s, i) => (
          <div key={i} className="nearby-station">
            <div className="station-info">
              <strong>{s.station_name}</strong>
              {[s.line_code1, s.line_code2, s.line_code3, s.line_code4]
                .filter(Boolean)
                .map((lc) => (
                  <span
                    key={lc}
                    className="mini-metro-dot"
                    style={{ backgroundColor: lineColors[lc] || '#999' }}
                  />
                ))}
            </div>
            <div className="station-dist">Distance: {s.distance.toFixed(2)} mi</div>
            <hr className="station-hr"/>
          </div>
        ))}
      </div>
    </div>
  );
}
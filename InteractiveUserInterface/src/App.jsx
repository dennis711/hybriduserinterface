import React, { useState } from 'react';
import TouchArea from './components/TouchArea';
import Elements from './components/Elements';
import './styles/App.css';

function App() {
  const [filterValues, setFilterValues] = useState({
    hue: 0,
    alpha: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100
  });

  return (
    <div className="app-container">
      {/* Overlay for filter effect - dynamic */}
      <div
        className="color-overlay"
        style={{
          backgroundColor: `hsla(${filterValues.hue}, 100%, 50%, ${filterValues.alpha})`,
          filter: `
      brightness(${filterValues.brightness}%)
      contrast(${filterValues.contrast}%)
      saturate(${filterValues.saturation}%)
    `
        }}
      />
      <div className='filter-values'>
        {JSON.stringify(filterValues)}
      </div>

      {/* JSX-Components */}
      <TouchArea onFilterChange={setFilterValues} />
      <Elements />
    </div>
  );
}

export default App;
import React, { useState, useRef, useEffect } from 'react';
import './Elements.css';

function Elements() {
  const [mode, setMode] = useState('digital');
  const touchItemRef = useRef(null);
  const [placedElements, setPlacedElements] = useState([]);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [touchCount, setTouchCount] = useState(0);
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const activeTouches = useRef({});

  const toggleMode = () => {
    setMode(prev => (prev === 'digital' ? 'physical' : 'digital'));
  };

  useEffect(() => {
    const handleDrop = (e) => {
      const { id, type } = e.detail;
      if (placedElements.some(el => el.id === id)) return;
      if (placedElements.length >= 10) {
        setShowLimitMessage(true);
        setTimeout(() => setShowLimitMessage(false), 3000);
        return;
      }
      setPlacedElements(prev => [...prev, { id, type, assignedFunction: 'none' }]);
    };

    const handleDelete = (e) => {
      const { id } = e.detail;
      setPlacedElements(prev => prev.filter(el => el.id !== id));
    };

    window.addEventListener('customDrop', handleDrop);
    window.addEventListener('deleteElement', handleDelete);

    return () => {
      window.removeEventListener('customDrop', handleDrop);
      window.removeEventListener('deleteElement', handleDelete);
    };
  }, [placedElements]);

  useEffect(() => {
    const handlePhysicalTouch = (e) => {
      setTouchCount(e.touches.length);

      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const distanceCm = (distance / 37.8).toFixed(2);
        setDistanceInfo(`${distanceCm} cm`);
      } else {
        setDistanceInfo(null);
      }
    };

    document.addEventListener('touchstart', handlePhysicalTouch);
    document.addEventListener('touchmove', handlePhysicalTouch);
    document.addEventListener('touchend', handlePhysicalTouch);

    return () => {
      document.removeEventListener('touchstart', handlePhysicalTouch);
      document.removeEventListener('touchmove', handlePhysicalTouch);
      document.removeEventListener('touchend', handlePhysicalTouch);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'physical') return;

    const handleTouchStart = (e) => {
      for (let touch of e.touches) {
        const id = touch.identifier;
        const startX = touch.clientX;
        const startY = touch.clientY;
        let moved = false;

        const interval = setInterval(() => {
          const elapsed = Date.now() - activeTouches.current[id]?.startTime;
          const remaining = Math.max(0, 5000 - elapsed);

          setCountdowns(prev => ({
            ...prev,
            [id]: {
              x: startX,
              y: startY,
              seconds: Math.ceil(remaining / 1000)
            }
          }));

          if (moved || elapsed >= 5000) {
            clearInterval(interval);
            setCountdowns(prev => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });

            if (!moved && elapsed >= 5000) {
              window.dispatchEvent(new CustomEvent('customDrop', {
                detail: {
                  id: Date.now(),
                  type: 'button',
                  x: startX,
                  y: startY
                }
              }));
            }

            delete activeTouches.current[id];
          }
        }, 100);

        activeTouches.current[id] = {
          startX,
          startY,
          startTime: Date.now(),
          moved: false,
          interval
        };
      }
    };

    const handleTouchMove = (e) => {
      for (let touch of e.touches) {
        const id = touch.identifier;
        const start = activeTouches.current[id];
        if (!start) continue;
        const dx = touch.clientX - start.startX;
        const dy = touch.clientY - start.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 10) {
          activeTouches.current[id].moved = true;
        }
      }
    };

    const handleTouchEnd = (e) => {
      for (let touch of e.changedTouches) {
        const id = touch.identifier;
        const entry = activeTouches.current[id];
        if (entry) {
          clearInterval(entry.interval);
          delete activeTouches.current[id];
        }
        setCountdowns(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [mode]);

  const handleDeleteClick = (id) => {
    setPlacedElements(prev => prev.filter(el => el.id !== id));
    window.dispatchEvent(new CustomEvent('deleteElement', { detail: { id } }));
  };

  const handleFunctionChange = (id, value) => {
    setPlacedElements(prev =>
      prev.map(el => (el.id === id ? { ...el, assignedFunction: value } : el))
    );
  };

  const handleTouchStart = (e, type) => {
    if (mode !== 'digital') return;

    const touch = e.touches[0];
    const newId = Date.now();

    const item = document.createElement('div');
    item.style.position = 'fixed';
    item.style.left = `${touch.clientX}px`;
    item.style.top = `${touch.clientY}px`;
    item.style.zIndex = 1000;
    item.style.pointerEvents = 'none';

    if (type === 'button') {
      const img = document.createElement('img');
      img.src = 'src/assets/volknob.png';
      img.style.width = '80px';
      item.appendChild(img);
    } else {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.disabled = true;
      slider.style.width = '100px';
      item.appendChild(slider);
    }

    document.body.appendChild(item);
    touchItemRef.current = { element: item, type, id: newId };

    const handleTouchMove = (moveEvent) => {
      const moveTouch = moveEvent.touches[0];
      item.style.left = `${moveTouch.clientX}px`;
      item.style.top = `${moveTouch.clientY}px`;
    };

    const handleTouchEnd = (endEvent) => {
      const endTouch = endEvent.changedTouches[0];
      const dropX = endTouch.clientX;
      const dropY = endTouch.clientY;

      const dropTarget = document.elementFromPoint(dropX, dropY);
      const isInTouchArea = dropTarget && dropTarget.classList.contains('touch-area');

      if (isInTouchArea) {
        const touchAreaRect = dropTarget.getBoundingClientRect();
        const width = type === 'button' ? 350 : 250;
        const height = type === 'button' ? 350 : 40;

        if (
          dropX - width / 2 >= touchAreaRect.left &&
          dropX + width / 2 <= touchAreaRect.right &&
          dropY - height / 2 >= touchAreaRect.top &&
          dropY + height / 2 <= touchAreaRect.bottom
        ) {
          window.dispatchEvent(new CustomEvent('customDrop', {
            detail: {
              x: dropX,
              y: dropY,
              type,
              id: newId
            }
          }));
        }
      }

      document.body.removeChild(item);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
  };

  return (
    <div className="side-panel">
      <button className="toggle-mode" onClick={toggleMode}>
        ⇆ {mode === 'digital' ? 'Zu physisch' : 'Zu digital'}
      </button>

      {mode === 'digital' ? (
        <div className='digital-elements'>
          <div className='title'>
            <p>Digitale Elemente</p>
          </div>

          <div
            className="draggable-item"
            onTouchStart={(e) => handleTouchStart(e, 'button')}
          >
            <img src="src/assets/volknob2.png" alt="Knob" style={{ width: '60px' }} />
          </div>
          <div
            className="draggable-item"
            onTouchStart={(e) => handleTouchStart(e, 'slider')}
          >
            <input type="range" disabled style={{ width: '100px' }} />
          </div>
        </div>
      ) : (
        <div className='title'><p>Physische Elemente</p></div>
      )}

      <div className='divider'><hr /></div>

      <div className="element-list">
        <div className="element-header">
          <h4>Platzierte Elemente</h4>
        </div>
        {placedElements.map((el, index) => (
          <div key={el.id} className="element-entry">
            <div className='element-name'>
              {el.type === 'button' ? `DR ${index + 1}` : `SR ${index + 1}`}
            </div>
            <select
              className="function-dropdown"
              value={el.assignedFunction}
              onChange={(e) => handleFunctionChange(el.id, e.target.value)}
            >
              <option value="none" disabled hidden>Funktion wählen</option>
              <option value="color">Farbstich</option>
              <option value="brightness">Helligkeit</option>
              <option value="volume">Sättigung</option>
              <option value="contrast">Kontrast</option>
            </select>
            <button
              className="delete-button"
              onClick={() => handleDeleteClick(el.id)}
            >
              X
            </button>
          </div>
        ))}
      </div>

      <div className='divider'><hr /></div>

      <div className="element-info">
        <div className="fingers">
          Fingeranzahl: {touchCount}
        </div>
        {distanceInfo && (
          <div className="distance-info">Abstand: {distanceInfo}</div>
        )}
      </div>

      {Object.entries(countdowns).map(([id, data]) => (
        <div
          key={id}
          className="countdown-overlay"
          style={{ position: 'fixed', left: `${data.x}px`, top: `${data.y + 80}px` }}
        >
          Verankern in {data.seconds}...
        </div>
      ))}

      {showLimitMessage && (
        <div className="limit-message">
          Maximale Anzahl von Elementen wurde bereits platziert!
        </div>
      )}
    </div>
  );
}

export default Elements;
import React, { useState, useRef, useEffect } from 'react';
import './Elements.css';

function Elements() {
    const touchItemRef = useRef(null);
    const [placedElements, setPlacedElements] = useState([]);
    const [distanceInfo, setDistanceInfo] = useState(null);
    const [touchCount, setTouchCount] = useState(0);
    const [showLimitMessage, setShowLimitMessage] = useState(false);
    const [countdowns, setCountdowns] = useState({});
    const [mode, setMode] = useState('digital');
    const [showDigital, setShowDigital] = useState(true);
    const [placementEnabled, setPlacementEnabled] = useState(false);

    const activeTouches = useRef({});

    const toggleMode = () => {
        if (mode === 'digital') {
            setShowDigital(false);
            setTimeout(() => setMode('physical'), 300);
        } else {
            setMode('digital');
            setShowDigital(true);
        }
    };

    const togglePlacement = () => {
        setPlacementEnabled(prev => !prev);
    };

    useEffect(() => {
        const handleDrop = (e) => {
            const { id, type, assignedFunction } = e.detail;
            if (placedElements.some(el => el.id === id)) return;
            if (placedElements.length >= 10) {
                setShowLimitMessage(true);
                setTimeout(() => setShowLimitMessage(false), 3000);
                return;
            }
            setPlacedElements(prev => [...prev, { id, type, assignedFunction: assignedFunction || 'none' }]);
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
        const handleTouchStart = (e) => {
            if (mode !== 'physical' || !placementEnabled) return;
            if (e.touches.length > 2) return;

            if (e.touches.length === 1) {
                for (let touch of e.touches) {
                    const id = touch.identifier;
                    const startX = touch.clientX;
                    const startY = touch.clientY;

                    const newId = Date.now();
                    const assignedFunction = placedElements.find(el => el.id === newId)?.assignedFunction || null;

                    activeTouches.current[id] = {
                        startX,
                        startY,
                        startTime: null,
                        moved: false,
                        interval: null,
                        timeout: null
                    };

                    const timeout = setTimeout(() => {
                        if (Object.keys(activeTouches.current).length !== 1) {
                            delete activeTouches.current[id];
                            return;
                        }

                        const interval = setInterval(() => {
                            const elapsed = Date.now() - activeTouches.current[id]?.startTime;
                            const remaining = Math.max(0, 5000 - elapsed);

                            setCountdowns(prev => ({
                                ...prev,
                                [id]: {
                                    x: startX,
                                    y: startY,
                                    seconds: Math.ceil(remaining / 1000),
                                }
                            }));

                            const moved = activeTouches.current[id]?.moved;
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
                                            id: newId,
                                            type: 'button',
                                            x: startX,
                                            y: startY,
                                            assignedFunction
                                        }
                                    }));
                                }

                                delete activeTouches.current[id];
                            }
                        }, 100);

                        activeTouches.current[id].startTime = Date.now();
                        activeTouches.current[id].interval = interval;
                    }, 1000);

                    activeTouches.current[id].timeout = timeout;
                }
            }

            if (e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];

                const dx = t2.clientX - t1.clientX;
                const dy = t2.clientY - t1.clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const distanceCm = distance / 37.8;

                if (distanceCm >= 18.5 && distanceCm <= 19.5) {
                    const newId = Date.now();
                    const assignedFunction = placedElements.find(el => el.id === newId)?.assignedFunction || null;
                    const centerX = (t1.clientX + t2.clientX) / 2;
                    const centerY = (t1.clientY + t2.clientY) / 2;

                    activeTouches.current[newId] = {
                        centerX,
                        centerY,
                        finger1Start: { x: t1.clientX, y: t1.clientY },
                        finger2Start: { x: t2.clientX, y: t2.clientY },
                        startTime: null,
                        moved: false,
                        interval: null,
                        timeout: null
                    };

                    const timeout = setTimeout(() => {
                        if (e.touches.length !== 2) {
                            delete activeTouches.current[newId];
                            return;
                        }

                        const interval = setInterval(() => {
                            const elapsed = Date.now() - activeTouches.current[newId]?.startTime;
                            const remaining = Math.max(0, 5000 - elapsed);

                            setCountdowns(prev => ({
                                ...prev,
                                [newId]: {
                                    x: centerX,
                                    y: centerY,
                                    seconds: Math.ceil(remaining / 1000),
                                }
                            }));

                            const moved = activeTouches.current[newId]?.moved;
                            if (moved || elapsed >= 5000) {
                                clearInterval(interval);
                                setCountdowns(prev => {
                                    const updated = { ...prev };
                                    delete updated[newId];
                                    return updated;
                                });

                                if (!moved && elapsed >= 5000) {
                                    window.dispatchEvent(new CustomEvent('customDrop', {
                                        detail: {
                                            id: newId,
                                            type: 'slider',
                                            x: centerX,
                                            y: centerY,
                                            assignedFunction
                                        }
                                    }));
                                }

                                delete activeTouches.current[newId];
                            }
                        }, 100);

                        activeTouches.current[newId].startTime = Date.now();
                        activeTouches.current[newId].interval = interval;
                    }, 1000);

                    activeTouches.current[newId].timeout = timeout;
                }
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

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [mode, placementEnabled, placedElements]);

    const handleDeleteClick = (id) => {
        setPlacedElements(prev => prev.filter(el => el.id !== id));
        window.dispatchEvent(new CustomEvent('deleteElement', { detail: { id } }));
    };

    const handleFunctionChange = (id, value) => {
        setPlacedElements(prev => {
            const updated = prev.map(el =>
                el.id === id ? { ...el, assignedFunction: value } : el
            );

            window.dispatchEvent(new CustomEvent('updateFunction', {
                detail: { id, assignedFunction: value }
            }));

            return updated;
        });
    };

    const handleTouchStart = (e, type) => {
        const touch = e.touches[0];
        const newId = Date.now();

        const assignedFunction = 'none';

        const item = document.createElement('div');
        item.style.position = 'fixed';
        item.style.left = `${touch.clientX}px`;
        item.style.top = `${touch.clientY}px`;
        item.style.zIndex = 1000;
        item.style.pointerEvents = 'none';

        if (type === 'button') {
            const img = document.createElement('img');
            img.src = 'src/assets/volknob.png';
            img.style.width = '150px';
            item.appendChild(img);
        }
        if (type === 'slider') {
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.disabled = true;
            slider.style.width = '200px';
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
                            id: newId,
                            assignedFunction
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
                {mode === 'digital' ? '❯❯ Wechsel zu Physisch' : '❮❮ Wechsel zu Digital'}
            </button>

            {(mode === 'digital' || showDigital) && (
                <div className={`digital-elements ${mode === 'digital' ? 'slide-in' : 'slide-out'}`}>
                    <div className='title'><p>Digitale Elemente</p></div>
                    <div className="draggable-item" onTouchStart={(e) => handleTouchStart(e, 'button')}>
                        <img src="src/assets/volknob2.png" alt="Knob" style={{ width: '60px' }} />
                    </div>
                    <div className="draggable-item" onTouchStart={(e) => handleTouchStart(e, 'slider')}>
                        <input type="range" disabled style={{ width: '200px' }} />
                    </div>
                </div>
            )}

            {mode === 'physical' && (
                <div className="physical-elements">
                    <div className='title'><p>Physische Elemente</p></div>
                    <button
                        className={`placement-toggle ${placementEnabled ? 'active' : 'inactive'}`}
                        onClick={togglePlacement}
                        style={{ backgroundColor: placementEnabled ? 'green' : 'red' }}
                    >
                        Platzierung {placementEnabled ? 'aktiviert' : 'deaktiviert'}
                    </button>
                </div>
            )}

            <div className='divider'><hr /></div>

            <div className="element-list">
                <div className="element-header"><h4>Platzierte Elemente</h4></div>
                {placedElements.map((el, index) => (
                    <div key={el.id} className="element-entry">
                        <div className='element-name'>{el.type === 'button' ? `DR ${index + 1}` : `SR ${index + 1}`}</div>
                        <select
                            className="function-dropdown"
                            value={el.assignedFunction}
                            onChange={(e) => handleFunctionChange(el.id, e.target.value)}
                        >
                            <option value="none" disabled hidden>Funktion wählen</option>
                            <option value="brightness">Helligkeit</option>
                            <option value="saturation">Sättigung</option>
                            <option value="contrast">Kontrast</option>
                            <option value="alpha">Transparenz</option>
                            <option value="hue">Farbton</option>
                        </select>
                        <button className="delete-button" onClick={() => handleDeleteClick(el.id)}>X</button>
                    </div>
                ))}
            </div>

            <div className='divider'><hr /></div>

            <div className="element-info">
                <div className="fingers">Fingeranzahl: {touchCount}</div>
                {distanceInfo && (<div className="distance-info">Abstand: {distanceInfo}</div>)}
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
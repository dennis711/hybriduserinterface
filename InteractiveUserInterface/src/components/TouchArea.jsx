import React, { useEffect, useRef, useState } from 'react';
import './TouchArea.css';

function TouchArea({ onFilterChange }) {
    const areaRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const touchPointsRef = useRef([]);
    const indicatorRefs = useRef([]);
    const [touchCount, setTouchCount] = useState(0);
    const [placedElements, setPlacedElements] = useState([]);
    const elementRefs = useRef({});
    const touchStartAngles = useRef({});
    const [dragPreview, setDragPreview] = useState(null);

    useEffect(() => {
        const handleFunctionUpdate = (e) => {
            const { id, assignedFunction } = e.detail;
            setPlacedElements(prev =>
                prev.map(el =>
                    el.id === id ? { ...el, assignedFunction } : el
                )
            );
        };

        window.addEventListener('updateFunction', handleFunctionUpdate);
        return () => {
            window.removeEventListener('updateFunction', handleFunctionUpdate);
        };
    }, []);

    useEffect(() => {
        const area = areaRef.current;

        const updateTouchPoints = (e) => {
            const rect = area.getBoundingClientRect();
            const points = Array.from(e.touches).map(touch => ({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            }));
            touchPointsRef.current = points;
            setTouchCount(points.length);
            requestAnimationFrame(updateIndicators);
        };

        const updateIndicators = () => {
            indicatorRefs.current.forEach((el, index) => {
                if (el && touchPointsRef.current[index]) {
                    const point = touchPointsRef.current[index];
                    el.style.left = point.x + 'px';
                    el.style.top = point.y + 'px';
                    el.style.display = 'block';
                } else if (el) {
                    el.style.display = 'none';
                }
            });
        };

        const handleTouchStart = (e) => {
            updateTouchPoints(e);

            if (!isFullscreen && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen()
                    .then(() => setIsFullscreen(true))
                    .catch((err) => console.warn("Vollbildmodus fehlgeschlagen:", err));
            }

            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const target = e.target;
                const knobElement = Object.entries(elementRefs.current).find(([_, ref]) => ref && ref.contains(target));
                if (knobElement) {
                    const [id, knob] = knobElement;
                    const rect = knob.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
                    touchStartAngles.current[id] = angle;

                    const handleMove = (moveEvent) => {
                        const moveTouch = moveEvent.touches[0];
                        const moveAngle = Math.atan2(moveTouch.clientY - centerY, moveTouch.clientX - centerX);
                        let delta = moveAngle - touchStartAngles.current[id];
                        if (delta < -Math.PI) delta += 2 * Math.PI;
                        if (delta > Math.PI) delta -= 2 * Math.PI;

                        setPlacedElements(prev => {
                            return prev.map(el => {
                                if (el.id === parseInt(id) && el.type === 'button') {
                                    let newRotation = (el.rotation ?? 0) + delta * (180 / Math.PI);
                                    newRotation = Math.max(0, Math.min(359, newRotation));
                                    const knobValue = Math.round((newRotation / 359) * 100);

                                    if (el.assignedFunction && onFilterChange) {
                                        const mapped = mapToFilterValue(el.assignedFunction, knobValue);
                                        onFilterChange(prev => ({
                                            ...prev,
                                            [el.assignedFunction]: mapped
                                        }));
                                    }

                                    return { ...el, rotation: newRotation };
                                }
                                return el;
                            });
                        });

                        touchStartAngles.current[id] = moveAngle;
                    };

                    const handleEnd = () => {
                        document.removeEventListener('touchmove', handleMove);
                        document.removeEventListener('touchend', handleEnd);
                    };

                    document.addEventListener('touchmove', handleMove, { passive: false });
                    document.addEventListener('touchend', handleEnd);
                }
            }
        };

        const handleTouchMove = (e) => updateTouchPoints(e);
        const handleTouchEnd = (e) => updateTouchPoints(e);

        const handleCustomDrop = (e) => {
            const rect = area.getBoundingClientRect();
            const { x, y, type, id, assignedFunction } = e.detail;

            const isKnob = type === 'button';
            const width = isKnob ? 350 : 250;
            const height = isKnob ? 350 : 40;

            const relativeX = x - rect.left - width / 2;
            const relativeY = y - rect.top - height / 2;

            setPlacedElements(prev => {
                if (prev.find(el => el.id === id)) return prev;
                if (prev.length >= 10) return prev;
                return [
                    ...prev,
                    {
                        id,
                        type,
                        x: relativeX,
                        y: relativeY,
                        rotation: isKnob ? 0 : undefined,
                        value: 50,
                        assignedFunction: assignedFunction || null
                    }
                ];
            });
        };

        const handleDeleteElement = (e) => {
            const { id } = e.detail;
            setPlacedElements(prev => prev.filter(el => el.id !== id));
        };

        const handleDragPreview = (e) => {
            const { type } = e.detail;
            if (type === 'button') {
                setDragPreview(<img src="src/assets/volknob.png" alt="preview" className="drag-preview" />);
            } else if (type === 'slider') {
                setDragPreview(<input type="range" disabled className="drag-preview" style={{ width: '450px', height: '20px' }} />);
            }
        };

        const clearDragPreview = () => setDragPreview(null);

        window.addEventListener('customDrop', handleCustomDrop);
        window.addEventListener('deleteElement', handleDeleteElement);
        window.addEventListener('dragPreview', handleDragPreview);
        window.addEventListener('dragPreviewEnd', clearDragPreview);

        if (area) {
            area.addEventListener('touchstart', handleTouchStart, { passive: false });
            area.addEventListener('touchmove', handleTouchMove, { passive: false });
            area.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            window.removeEventListener('customDrop', handleCustomDrop);
            window.removeEventListener('deleteElement', handleDeleteElement);
            window.removeEventListener('dragPreview', handleDragPreview);
            window.removeEventListener('dragPreviewEnd', clearDragPreview);
            if (area) {
                area.removeEventListener('touchstart', handleTouchStart);
                area.removeEventListener('touchmove', handleTouchMove);
                area.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [isFullscreen, onFilterChange]);

    const handleSliderChange = (id, value) => {
        setPlacedElements(prev => {
            const updated = prev.map(el =>
                el.id === id ? { ...el, value: parseInt(value) } : el
            );

            const changedEl = updated.find(el => el.id === id);
            if (changedEl?.assignedFunction && onFilterChange) {
                const mapped = mapToFilterValue(changedEl.assignedFunction, parseInt(value));
                onFilterChange(prev => ({
                    ...prev,
                    [changedEl.assignedFunction]: mapped
                }));
            }

            return updated;
        });
    };

    const mapToFilterValue = (func, value) => {
        switch (func) {
            case 'hue':
            case 'color':
                return Math.round((value / 100) * 360);
            case 'brightness':
            case 'contrast':
            case 'saturation':
            case 'volume':
                return Math.round((value / 100) * 200);
            case 'alpha':
                return value / 100;
            default:
                return value;
        }
    };

    const getKnobValue = (rotation) => Math.round((rotation / 359) * 100);

    return (
        <div ref={areaRef} className="touch-area">
            <div className="Placeholder-Name">
                {placedElements.length === 0 && <h2 className="touch-placeholder">Platziere dein Bedienelement hier</h2>}
                {dragPreview && <div className="drag-preview-container">{dragPreview}</div>}
            </div>

            {Array.from({ length: 10 }).map((_, index) => (
                <div
                    key={index}
                    ref={el => (indicatorRefs.current[index] = el)}
                    className="touch-indicator"
                    style={{ display: 'none' }}
                />
            ))}

            {placedElements.map((el, index) => {
                const knobValue = el.type === 'button' && el.rotation !== undefined ? getKnobValue(el.rotation) : null;
                return (
                    <React.Fragment key={el.id}>
                        <div
                            ref={ref => (elementRefs.current[el.id] = ref)}
                            className="placed-element"
                            style={{
                                position: 'absolute',
                                left: el.x,
                                top: el.y,
                                transform: el.type === 'button' && el.rotation !== undefined
                                    ? `rotate(${el.rotation}deg)`
                                    : 'none'
                            }}
                        >
                            {el.type === 'button' ? (
                                <img
                                    src="src/assets/volknob.png"
                                    alt={`Knob ${index + 1}`}
                                    className="rotary-image"
                                    draggable={false}
                                    style={{ width: '350px', height: '350px' }}
                                />
                            ) : (
                                <input
                                    type="range"
                                    style={{ width: '450px', height: '30px' }}
                                    min="0"
                                    max="100"
                                    value={el.value}
                                    onChange={(e) => handleSliderChange(el.id, e.target.value)}
                                />
                            )}
                        </div>
                        <div
                            className="value-display"
                            style={{
                                position: 'absolute',
                                left: el.x + (el.type === 'button' ? 175 : 125),
                                top: el.y + (el.type === 'button' ? 280 : 50),
                                transform: 'translateX(-50%)'
                            }}
                        >
                            {el.type === 'button'
                                ? `Drehregler ${index + 1}: ${knobValue}%`
                                : `Schieberegler ${index + 1}: ${el.value}%`}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default TouchArea;
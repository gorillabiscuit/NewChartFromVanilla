import { EventManager } from './event/EventManager.js';
import { state, setShowImages } from './state.js';

/**
 * Setup the image toggle button's event listener
 * 
 * @param {HTMLElement} imageToggle - The image toggle button
 * @param {Function} onToggle - Optional callback when toggle is clicked
 */
function setupImageToggle(imageToggle) {
    // Initialize button state from global state
    imageToggle.textContent = state.showImages ? 'Hide Images' : 'Show Images';
    imageToggle.classList.toggle('active', state.showImages);

    // Subscribe to state changes
    const unsubscribe = state.subscribe((newState, changedKeys) => {
        if (changedKeys.includes('showImages')) {
            imageToggle.textContent = newState.showImages ? 'Hide Images' : 'Show Images';
            imageToggle.classList.toggle('active', newState.showImages);
        }
    });

    // Setup click handler
    const eventManager = new EventManager(imageToggle);
    eventManager.on('click', () => {
        const newState = !state.showImages;
        setShowImages(newState);
    });

    // Return cleanup function
    return () => {
        unsubscribe();
        eventManager.off('click');
    };
}

/**
 * Setup the canvas resizing functionality
 * 
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 */
function setupResponsiveCanvas(canvas, ctx) {
    const eventManager = new EventManager(window);
    
    const resizeCanvas = () => {
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = Math.round(containerWidth * dpr);
        canvas.height = Math.round(containerHeight * dpr);
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        // Update state with new dimensions
        state.update({
            width: containerWidth,
            height: containerHeight,
            chartHeight: Math.round(containerHeight * 0.88),
            chartPaddingTop: Math.round(containerHeight * 0.03),
            chartPaddingBottom: Math.round(containerHeight * 0.09)
        });
    };
    
    // Initial sizing
    resizeCanvas();
    
    // Handle window resizing
    eventManager.on('resize', resizeCanvas);
    
    // Return cleanup function
    return () => {
        eventManager.off('resize');
    };
}

export { setupImageToggle, setupResponsiveCanvas }; 
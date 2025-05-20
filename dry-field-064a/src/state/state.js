/**
 * @fileoverview Centralized state management for the charting application.
 * 
 * Module Boundaries:
 * - This module is the single source of truth for application state
 * - Other modules MUST NOT maintain their own state
 * - State updates MUST go through this module's actions
 * - Direct state mutations are forbidden
 * 
 * Allowed Dependencies:
 * - /events/* - For state change notifications
 * - /utils/* - For pure utility functions
 * 
 * Forbidden:
 * - Direct DOM manipulation
 * - Window assignments
 * - Global variables
 * - Direct state mutations outside of actions
 */

/**
 * Centralized state management for the application.
 * DO NOT introduce global/window state. All state must go through this store.
 *
 * @typedef {Object} AppState
 * @property {Array} allBubbles
 * @property {Array} clusters
 * @property {Array} singleBubbles
 * @property {number} mouseX
 * @property {number} mouseY
 * @property {{x: number, y: number}} mousePosition
 * @property {Date|null} paddedMinDate
 * @property {Date|null} paddedMaxDate
 * @property {boolean} showImages
 * @property {number} width
 * @property {number} height
 * @property {number} chartHeight
 * @property {number} chartPaddingX
 * @property {number} chartPaddingTop
 * @property {number} chartPaddingBottom
 * @property {string} currentWallet
 * @property {boolean} loading
 * @property {string} status
 * @property {string|null} error
 * @property {number} imageLoadGeneration
 * @property {number} lastUpdateTime
 * @property {Set<string>} pendingVisualUpdates
 * @property {boolean} isUpdating
 * @property {boolean} useCustomRanges
 * @property {Date|null} customDateRange
 * @property {Date|null} customAprRange
 */

const initialState = {
    allBubbles: [],
    clusters: [],
    singleBubbles: [],
    mouseX: 0,
    mouseY: 0,
    mousePosition: { x: 0, y: 0 },
    paddedMinDate: null,
    paddedMaxDate: null,
    showImages: false,
    width: 0,
    height: 0,
    chartHeight: 0,
    chartPaddingX: 24,
    chartPaddingTop: 0,
    chartPaddingBottom: 0,
    currentWallet: '',
    loading: false,
    status: 'idle',
    error: null,
    imageLoadGeneration: 0,
    lastUpdateTime: 0,
    pendingVisualUpdates: new Set(),
    isUpdating: false,
    useCustomRanges: false,
    customDateRange: null,
    customAprRange: null,
};

/** @type {AppState} */
let state = { ...initialState };
const listeners = new Set();
let updateTimeout = null;
const UPDATE_THROTTLE = 16; // ~60fps

/**
 * Subscribe to state changes.
 * @param {Function} listener
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
}

/**
 * Schedule a visual update with throttling
 * @param {string} updateType - Type of visual update
 * @param {Function} updateFn - Function to perform the update
 */
function scheduleVisualUpdate(updateType, updateFn) {
    state.pendingVisualUpdates.add(updateType);
    
    if (updateTimeout) {
        return;
    }
    
    updateTimeout = setTimeout(() => {
        const now = performance.now();
        if (now - state.lastUpdateTime < UPDATE_THROTTLE) {
            return;
        }
        
        state.lastUpdateTime = now;
        state.isUpdating = true;
        
        try {
            // Apply all pending visual updates
            state.pendingVisualUpdates.forEach(type => {
                const update = visualUpdates.get(type);
                if (update) update();
            });
            
            // Notify listeners of visual changes
            const newState = { ...state };
            for (const listener of listeners) {
                listener(newState);
            }
        } finally {
            state.isUpdating = false;
            state.pendingVisualUpdates.clear();
            updateTimeout = null;
        }
    }, UPDATE_THROTTLE);
}

// Map of visual update types to their handlers
const visualUpdates = new Map([
    ['mouseMove', () => {
        // Only update mouse position for tooltip, don't trigger chart re-render
        state.mousePosition = { x: state.mouseX, y: state.mouseY };
    }],
    ['clusterUpdate', () => {
        // Handle cluster-specific updates
    }],
    ['bubbleUpdate', () => {
        // Handle bubble-specific updates
    }],
    ['initialRender', () => {
        // Handle initial render when data is ready
        if (state.status === 'ready') {
            // Force a re-render of the chart
            const newState = { ...state };
            for (const listener of listeners) {
                listener(newState);
            }
        }
    }]
]);

/**
 * Apply a state update
 * @param {{type: string, payload: any}} action
 */
function applyUpdate(action) {
    switch (action.type) {
        case 'SET_MOUSE_POSITION':
            state.mouseX = action.payload.x;
            state.mouseY = action.payload.y;
            // Only update mouse position, don't trigger full re-render
            scheduleVisualUpdate('mouseMove');
            break;
        case 'SET_CANVAS_DIMENSIONS':
            Object.assign(state, action.payload);
            scheduleVisualUpdate('initialRender');
            break;
        case 'SET_DATE_RANGE':
            state.paddedMinDate = action.payload.min;
            state.paddedMaxDate = action.payload.max;
            scheduleVisualUpdate('initialRender');
            break;
        case 'TOGGLE_IMAGES':
            state.showImages = action.payload;
            scheduleVisualUpdate('initialRender');
            break;
        case 'CLEAR_BUBBLES':
            state.allBubbles = [];
            state.clusters = [];
            state.singleBubbles = [];
            scheduleVisualUpdate('initialRender');
            break;
        case 'UPDATE_CLUSTERS':
            state.clusters = action.payload;
            scheduleVisualUpdate('clusterUpdate');
            break;
        case 'UPDATE_CLUSTER_STATE':
            const cluster = state.clusters.find(c => c.id === action.payload.clusterId);
            if (cluster) {
                cluster.state = action.payload.state;
                scheduleVisualUpdate('clusterUpdate');
            }
            break;
        case 'SET_BUBBLES':
            state.allBubbles = action.payload.allBubbles;
            state.clusters = action.payload.clusters;
            state.singleBubbles = action.payload.singleBubbles;
            scheduleVisualUpdate('bubbleUpdate');
            break;
        case 'SET_CURRENT_WALLET':
            state.currentWallet = action.payload;
            break;
        case 'SET_LOADING':
            state.loading = action.payload;
            break;
        case 'SET_STATUS':
            state.status = action.payload;
            if (action.payload === 'ready') {
                scheduleVisualUpdate('initialRender');
            }
            break;
        case 'SET_ERROR':
            state.error = action.payload;
            break;
        case 'INCREMENT_IMAGE_LOAD_GENERATION':
            state.imageLoadGeneration += 1;
            scheduleVisualUpdate('initialRender');
            break;
        case 'SET_CUSTOM_RANGES':
            return {
                ...state,
                useCustomRanges: true,
                customDateRange: action.payload.dateRange,
                customAprRange: action.payload.aprRange
            };
        case 'CLEAR_CUSTOM_RANGES':
            return {
                ...state,
                useCustomRanges: false,
                customDateRange: null,
                customAprRange: null
            };
        default:
            console.warn(`Unknown action type: ${action.type}`);
            break;
    }
}

/**
 * Dispatch an action to update state.
 * @param {{type: string, payload: any}} action
 */
export function dispatch(action) {
    if (state.isUpdating) {
        // Queue the update if we're currently updating
        setTimeout(() => dispatch(action), 0);
        return;
    }
    
    applyUpdate(action);
}

/**
 * Get the current state.
 * @returns {AppState}
 */
export function getState() {
    return state;
}

/**
 * Reset state to initial values.
 */
export function resetState() {
    state = { ...initialState };
    for (const listener of listeners) {
        listener(state);
    }
}

// Initialize state with default values
export function initializeState(canvas) {
    state.width = canvas.width;
    state.height = canvas.height;
    state.chartHeight = Math.round(state.height * 0.88);
    state.chartPaddingTop = Math.round(state.height * 0.03);
    state.chartPaddingBottom = Math.round(state.height * 0.09);
}

// Chart state and utility functions
function clearChart(ctx, WIDTH, HEIGHT, drawAxes, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, noDataMessage) {
    dispatch({ type: 'CLEAR_BUBBLES' });
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawAxes(ctx, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, state.allBubbles, state.paddedMinDate, state.paddedMaxDate);
    if (noDataMessage) noDataMessage.style.display = 'block';
}

export { state, clearChart };

export default state; 
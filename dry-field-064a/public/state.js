// Global state container
const state = {
    // Bubble collections
    allBubbles: [],
    clusters: [],
    singleBubbles: [],

    // Mouse state
    mouseX: 0,
    mouseY: 0,

    // Date ranges
    paddedMinDate: null,
    paddedMaxDate: null,

    // UI state
    showImages: false,

    // Canvas dimensions
    width: 0,
    height: 0,
    chartHeight: 0,
    chartPaddingX: 24,
    chartPaddingTop: 0,
    chartPaddingBottom: 0,
};

// State update functions
export function updateMousePosition(x, y) {
    state.mouseX = x;
    state.mouseY = y;
}

export function updateCanvasDimensions(dimensions) {
    Object.assign(state, dimensions);
}

export function updateDateRange(min, max) {
    state.paddedMinDate = min;
    state.paddedMaxDate = max;
}

export function toggleImages(show) {
    state.showImages = show;
}

export function clearBubbles() {
    state.allBubbles.length = 0;
    state.clusters.length = 0;
    state.singleBubbles.length = 0;
}

export function getState() {
    return state;
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
    state.allBubbles.length = 0;
    state.clusters.length = 0;
    state.singleBubbles.length = 0;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawAxes(ctx, WIDTH, HEIGHT, CHART_HEIGHT, CHART_PADDING_X, CHART_PADDING_TOP, state.allBubbles, state.paddedMinDate, state.paddedMaxDate);
    if (noDataMessage) noDataMessage.style.display = 'block';
}

export { state, clearChart };

export default state; 
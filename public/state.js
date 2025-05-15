// Enhanced state management with performance optimization and debugging
const createState = () => {
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
        imageLoadingStatus: new Map(),

        // Canvas dimensions
        width: 0,
        height: 0,
        chartHeight: 0,
        chartPaddingX: 24,
        chartPaddingTop: 0,
        chartPaddingBottom: 0,

        // Internal state management
        _updateScheduled: false,
        _pendingUpdates: new Set(),
        _subscribers: new Set(),
        _debug: {
            enabled: false,
            log: console.log,
            stateTransitions: []
        },

        // Update methods
        update(changes) {
            const timestamp = Date.now();
            Object.entries(changes).forEach(([key, value]) => {
                if (this._debug.enabled) {
                    this._debug.stateTransitions.push({
                        timestamp,
                        key,
                        oldValue: this[key],
                        newValue: value
                    });
                }
                this._pendingUpdates.add(key);
                this[key] = value;
            });

            if (!this._updateScheduled) {
                this._updateScheduled = true;
                requestAnimationFrame(this._processPendingUpdates.bind(this));
            }
        },

        // Process pending updates
        _processPendingUpdates() {
            this._updateScheduled = false;
            if (this._pendingUpdates.size > 0) {
                const updates = Array.from(this._pendingUpdates);
                this._pendingUpdates.clear();
                
                if (this._debug.enabled) {
                    this._debug.log('Processing state updates:', updates);
                }
                
                this._notify(updates);
            }
        },

        // Subscription management
        subscribe(callback) {
            this._subscribers.add(callback);
            return () => this._subscribers.delete(callback);
        },

        // Notify subscribers
        _notify(changedKeys) {
            const stateSnapshot = this._getPublicState();
            this._subscribers.forEach(callback => {
                try {
                    callback(stateSnapshot, changedKeys);
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            });
        },

        // Get public state (excluding internal properties)
        _getPublicState() {
            const { _updateScheduled, _pendingUpdates, _subscribers, _debug, ...publicState } = this;
            return { ...publicState };
        },

        // Debug methods
        DEBUG: {
            enable() {
                state._debug.enabled = true;
            },
            disable() {
                state._debug.enabled = false;
            },
            getTransitions() {
                return [...state._debug.stateTransitions];
            },
            clearTransitions() {
                state._debug.stateTransitions = [];
            },
            getState() {
                return state._getPublicState();
            }
        }
    };

    return state;
};

// Create the state instance
const state = createState();

// Expose state globally for debugging
if (typeof window !== 'undefined') {
    window.state = state;
}

// Export state and update functions
export { state };

// Export common state update functions
export function updateMousePosition(x, y) {
    state.update({ mouseX: x, mouseY: y });
}

export function setShowImages(show) {
    state.update({ showImages: show });
}

export function updateImageLoadingStatus(bubbleId, status) {
    const newStatus = new Map(state.imageLoadingStatus);
    newStatus.set(bubbleId, status);
    state.update({ imageLoadingStatus: newStatus });
}

export function clearChart() {
    state.update({
        allBubbles: [],
        clusters: [],
        singleBubbles: [],
        imageLoadingStatus: new Map()
    });
} 
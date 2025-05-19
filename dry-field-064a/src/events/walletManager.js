import { fetchLoanData } from '../data/dataService.js';
import { useLoanDataForBubbles } from '../data/clusterUtils.js';
import { findClusters, createLoanBubbleFromAPI } from '../data/clusterUtils.js';
import { loadBubbleImages } from '../data/dataService.js';
import { draw } from '../utils/renderUtils.js';
import { state, clearChart, dispatch, getState, subscribe } from '../state/state.js';
import EventManager from '../event/EventManager.js';
import { ChartController } from '../controllers/ChartController.js';

/**
 * Purpose: Handles wallet selection events and related state updates.
 * Boundaries: Only manages wallet events and state. No direct data fetching or DOM manipulation outside event handling.
 * @param {HTMLSelectElement} walletSelect - The wallet select dropdown element
 * @param {Array} allBubbles - Array to store all bubbles
 * @param {Array} clusters - Array to store bubble clusters
 * @param {Array} singleBubbles - Array to store single bubbles
 * @param {Object} config - Configuration object containing chart parameters
 * @param {HTMLElement} noDataMessage - Element to show/hide when no data is available
 * @returns {EventManager} The event manager instance
 */
export function setupWalletChangeHandler(
    walletSelect,
    allBubbles,
    clusters,
    singleBubbles,
    config,
    noDataMessage
) {
    const walletEventManager = new EventManager(walletSelect);
    const chartController = new ChartController(config.ctx, config.canvas, config.tooltip, {
        ...config,
        findClusters,
        createLoanBubbleFromAPI,
        packClusterBubbles: config.packClusterBubbles,
        animateClusterToPacked: config.animateClusterToPacked,
        revertClusterSmoothly: config.revertClusterSmoothly,
        MAX_FRAMES: config.MAX_FRAMES
    });
    
    walletEventManager.on('change', async (e) => {
        const selectedWallet = e.target.value;
        if (selectedWallet) {
            await chartController.loadLoans(selectedWallet, 30);
        }
    });

    return walletEventManager;
}

/**
 * Loads initial data for the first wallet
 * @param {string} initialWallet - The initial wallet address to load
 * @param {Array} allBubbles - Array to store all bubbles
 * @param {Array} clusters - Array to store bubble clusters
 * @param {Array} singleBubbles - Array to store single bubbles
 * @param {Object} config - Configuration object containing chart parameters
 * @param {HTMLElement} noDataMessage - Element to show/hide when no data is available
 */
export function loadInitialData(initialWallet, allBubbles, clusters, singleBubbles, config, noDataMessage) {
    const chartController = new ChartController(config.ctx, config.canvas, config.tooltip, {
        ...config,
        findClusters,
        createLoanBubbleFromAPI,
        packClusterBubbles: config.packClusterBubbles,
        animateClusterToPacked: config.animateClusterToPacked,
        revertClusterSmoothly: config.revertClusterSmoothly,
        MAX_FRAMES: config.MAX_FRAMES
    });
    
    chartController.loadLoans(initialWallet, 30);
}

// Helper to log image loading triggers
function logImageLoadTrigger(context) {
    const s = getState();
    console.log(`[IMAGE LOAD TRIGGER] ${context} | wallet: ${s.currentWallet}, generation: ${s.imageLoadGeneration}, showImages: ${s.showImages}, status: ${s.status}`);
}

function maybeLoadImagesForCurrentState() {
    const currentState = getState();
    if (!currentState.showImages || currentState.status !== 'ready') return;
    const bubbles = currentState.allBubbles;
    const generation = currentState.imageLoadGeneration;
    console.trace('[IMAGE LOAD TRIGGER] maybeLoadImagesForCurrentState', {
        wallet: currentState.currentWallet,
        generation,
        showImages: currentState.showImages,
        status: currentState.status
    });
    loadBubbleImages(bubbles,
        (loaded, total) => {
            // Only update if generation matches
            if (getState().imageLoadGeneration !== generation) return;
            // Optionally, update progress in state/UI here
        },
        (totalLoaded) => {
            if (getState().imageLoadGeneration !== generation) return;
            // Optionally, update state/UI to indicate images are loaded
            // No-op for now
        }
    );
}

// Subscribe to showImages and status changes to trigger image loading only on correct transition
let prevShowImages = getState().showImages;
subscribe((newState) => {
    if (!prevShowImages && newState.showImages && newState.status === 'ready') {
        console.trace('[IMAGE LOAD TRIGGER] showImages toggled ON', {
            wallet: newState.currentWallet,
            generation: newState.imageLoadGeneration,
            showImages: newState.showImages,
            status: newState.status
        });
        maybeLoadImagesForCurrentState();
    }
    // Log when chart is hidden
    if (newState.status !== 'ready') {
        console.trace('[UI] Chart hidden due to status', newState.status, newState);
    }
    prevShowImages = newState.showImages;
}); 
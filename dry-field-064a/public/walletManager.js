import { fetchLoanData } from './dataService.js';
import { useLoanDataForBubbles } from './clusterUtils.js';
import { findClusters, createLoanBubbleFromAPI } from './clusterUtils.js';
import { loadBubbleImages } from './dataService.js';
import { draw } from './renderUtils.js';
import { state, clearChart } from './state.js';
import EventManager from './event/EventManager.js';

/**
 * Sets up wallet change event handling
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
    
    walletEventManager.on('change', async (e) => {
        const selectedWallet = e.target.value;
        if (selectedWallet) {
            window.lastWalletSelected = selectedWallet;
            const data = await fetchLoanData(selectedWallet);
            
            if (data && data.data && data.data.length > 0) {
                // Clear existing data
                allBubbles.length = 0;
                clusters.length = 0;
                singleBubbles.length = 0;
                
                // Update with new data
                useLoanDataForBubbles(
                    data.data,
                    allBubbles,
                    clusters,
                    singleBubbles,
                    clearChart,
                    (bubbles) => findClusters(bubbles, clusters, singleBubbles, config.bubblesOverlap, config.VELOCITY_POWER, config.BASE_VELOCITY),
                    (loan, ...bubbleArgs) => createLoanBubbleFromAPI(loan, ...bubbleArgs),
                    (min, max) => { 
                        config.PADDED_MIN_DATE = min; 
                        config.PADDED_MAX_DATE = max;
                        state.paddedMinDate = min;
                        state.paddedMaxDate = max;
                    },
                    config.MIN_PADDING_PERCENT,
                    config.MAX_PADDING_PERCENT,
                    config.CHART_PADDING_X,
                    config.WIDTH,
                    config.CHART_PADDING_TOP,
                    config.CHART_HEIGHT,
                    config.BUBBLE_PADDING_FACTOR
                );
                
                // Load images for the new bubbles
                loadBubbleImages(allBubbles, 
                    (loaded, total) => {
                        console.log(`${loaded}/${total} images loaded (${Math.round(loaded/total*100)}%)`);
                    },
                    (totalLoaded) => {
                        console.log(`All ${totalLoaded} images loaded, redrawing chart`);
                        if (state.showImages) {
                            draw(
                                config.ctx,
                                config.WIDTH,
                                config.HEIGHT,
                                config.CHART_HEIGHT,
                                config.CHART_PADDING_X,
                                config.CHART_PADDING_TOP,
                                singleBubbles,
                                clusters,
                                state.showImages,
                                config.PROTOCOL_COLORS,
                                config.DEFAULT_PROTOCOL_COLOR,
                                allBubbles,
                                config.PADDED_MIN_DATE,
                                config.PADDED_MAX_DATE
                            );
                        }
                    }
                );
                noDataMessage.style.display = 'none';
            } else {
                clearChart();
                console.warn('API response: no loans', data);
            }
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
    fetchLoanData(initialWallet).then(data => {
        if (data && data.data && data.data.length > 0) {
            useLoanDataForBubbles(
                data.data,
                allBubbles,
                clusters,
                singleBubbles,
                clearChart,
                (bubbles) => findClusters(bubbles, clusters, singleBubbles, config.bubblesOverlap, config.VELOCITY_POWER, config.BASE_VELOCITY),
                (loan, ...bubbleArgs) => createLoanBubbleFromAPI(loan, ...bubbleArgs),
                (min, max) => { 
                    config.PADDED_MIN_DATE = min; 
                    config.PADDED_MAX_DATE = max;
                    state.paddedMinDate = min;
                    state.paddedMaxDate = max;
                },
                config.MIN_PADDING_PERCENT,
                config.MAX_PADDING_PERCENT,
                config.CHART_PADDING_X,
                config.WIDTH,
                config.CHART_PADDING_TOP,
                config.CHART_HEIGHT,
                config.BUBBLE_PADDING_FACTOR
            );
            
            // Load bubble images with progress tracking
            loadBubbleImages(allBubbles, 
                (loaded, total) => {
                    console.log(`${loaded}/${total} images loaded (${Math.round(loaded/total*100)}%)`);
                },
                (totalLoaded) => {
                    console.log(`All ${totalLoaded} images loaded, redrawing chart`);
                    if (state.showImages) {
                        draw(
                            config.ctx,
                            config.WIDTH,
                            config.HEIGHT,
                            config.CHART_HEIGHT,
                            config.CHART_PADDING_X,
                            config.CHART_PADDING_TOP,
                            singleBubbles,
                            clusters,
                            state.showImages,
                            config.PROTOCOL_COLORS,
                            config.DEFAULT_PROTOCOL_COLOR,
                            allBubbles,
                            config.PADDED_MIN_DATE,
                            config.PADDED_MAX_DATE
                        );
                    }
                }
            );
            
            noDataMessage.style.display = 'none';
        }
    });
} 
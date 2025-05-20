/**
 * @fileoverview Data fetching and transformation service for blockchain data.
 * 
 * Module Boundaries:
 * - This module is responsible for all data fetching and transformation
 * - All blockchain data access MUST go through this module
 * - Data transformations should be pure functions
 * - No direct state mutations or UI updates
 * 
 * Allowed Dependencies:
 * - /state/* - For dispatching state updates
 * - /events/* - For data-related events
 * - /utils/* - For pure utility functions
 * 
 * Forbidden:
 * - Direct DOM manipulation
 * - Window assignments
 * - Global variables
 * - Direct state mutations
 * - UI updates
 */

import { dispatch } from '../state/state.js';

/**
 * Data Service Module - Handles API calls and data fetching
 */

/**
 * Fetch loan data for a specific wallet address or all loans
 * @param {string} walletAddress - The wallet address to fetch loans for, or '__ALL__' for all loans
 * @param {number} period - The period in days for the filter
 * @returns {Promise<Object>} - The API response data
 */
async function fetchLoanData(walletAddress, period = 30) {
    try {
        let url;
        if (walletAddress === '__ALL__') {
            url = `https://sdk-api.nftfi.com/data/v0/pipes/loans_due_endpoint.json?page_size=1000000&page=0&daysFromNow=${period}&sort_by=secondsUntilDue&sort_order=ASC`;
        } else {
            url = `https://sdk-api.nftfi.com/data/v0/pipes/loans_due_endpoint.json?wallets=${walletAddress}&page_size=1000000&page=0&daysFromNow=${period}&sort_by=secondsUntilDue&sort_order=ASC`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching loan data:', error);
        return null;
    }
}

/**
 * Load images for all bubbles with proper error handling
 * @param {Array} bubbles - Array of bubble objects with image URLs
 * @param {Function} onProgress - Callback function to update load progress
 * @param {Function} onComplete - Callback function when loading is complete
 */
function loadBubbleImages(bubbles, onProgress, onComplete) {
    if (!bubbles || bubbles.length === 0) {
        if (onComplete) onComplete(0);
        return;
    }

    const totalBubbles = bubbles.length;
    let loadedImages = 0;
    
    // Sort bubbles by due time
    const sortedBubbles = [...bubbles].sort((a, b) => {
        const dateA = new Date(a.dueTime).getTime();
        const dateB = new Date(b.dueTime).getTime();
        return dateA - dateB;
    });

    // Load images sequentially
    async function loadNextImage(index) {
        if (index >= sortedBubbles.length) {
            if (onComplete) onComplete(loadedImages);
            return;
        }

        const bubble = sortedBubbles[index];
        if (!bubble.img && bubble.imageUrl) {
            bubble.img = new Image();
            bubble.img.crossOrigin = "Anonymous";
            
            bubble.img.onload = () => {
                loadedImages++;
                if (onProgress) onProgress(loadedImages, totalBubbles);
                // Force a redraw to show the newly loaded image
                dispatch({ type: 'SET_STATUS', payload: 'ready' });
                // Load next image after a short delay
                setTimeout(() => loadNextImage(index + 1), 50);
            };
            
            bubble.img.onerror = (e) => {
                if (bubble.imageUrl.includes('reservoir.tools') && bubble.nftAddress && bubble.nftId) {
                    const fallbackUrl = `https://nfts.reservoir.tools/token/ethereum/${bubble.nftAddress}:${bubble.nftId}/image/v1`;
                    bubble.img.src = fallbackUrl;
                } else {
                    loadedImages++;
                    if (onProgress) onProgress(loadedImages, totalBubbles);
                    // Force a redraw even for failed images
                    dispatch({ type: 'SET_STATUS', payload: 'ready' });
                    // Load next image after a short delay
                    setTimeout(() => loadNextImage(index + 1), 50);
                }
            };
            
            bubble.img.src = bubble.imageUrl;
        } else {
            loadedImages++;
            if (onProgress) onProgress(loadedImages, totalBubbles);
            // Force a redraw for already loaded images
            dispatch({ type: 'SET_STATUS', payload: 'ready' });
            // Load next image after a short delay
            setTimeout(() => loadNextImage(index + 1), 50);
        }
    }

    // Start loading from the first bubble
    loadNextImage(0);
}

export { fetchLoanData, loadBubbleImages };

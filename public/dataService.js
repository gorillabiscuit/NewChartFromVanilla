import { updateImageLoadingStatus } from './state.js';

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
    
    bubbles.forEach(bubble => {
        // Ensure bubble has an ID
        if (!bubble.id) {
            bubble.id = `bubble_${bubble.loanId || Math.random().toString(36).substr(2, 9)}`;
        }

        if (!bubble.img && bubble.imageUrl) {
            updateImageLoadingStatus(bubble.id, 'loading');
            
            bubble.img = new Image();
            bubble.img.crossOrigin = "Anonymous"; // Avoid CORS issues
            
            // Add load and error handlers
            bubble.img.onload = () => {
                loadedImages++;
                updateImageLoadingStatus(bubble.id, 'loaded');
                if (onProgress) onProgress(loadedImages, totalBubbles);
                if (loadedImages >= totalBubbles && onComplete) {
                    onComplete(loadedImages);
                }
            };
            
            bubble.img.onerror = (e) => {
                console.error(`Failed to load image for ${bubble.name}: ${bubble.imageUrl}`, e);
                // Try a fallback method if the main one fails
                if (bubble.imageUrl.includes('reservoir.tools') && bubble.nftAddress && bubble.nftId) {
                    console.log('Attempting direct NFT image loading for', bubble.name);
                    const fallbackUrl = `https://nfts.reservoir.tools/token/ethereum/${bubble.nftAddress}:${bubble.nftId}/image/v1`;
                    updateImageLoadingStatus(bubble.id, 'retrying');
                    bubble.img.src = fallbackUrl;
                } else {
                    // Still count as "loaded" even if it failed
                    loadedImages++;
                    updateImageLoadingStatus(bubble.id, 'error');
                    if (onProgress) onProgress(loadedImages, totalBubbles);
                    if (loadedImages >= totalBubbles && onComplete) {
                        onComplete(loadedImages);
                    }
                }
            };
            
            // Set the source AFTER setting up event handlers
            bubble.img.src = bubble.imageUrl;
        } else if (bubble.img) {
            // For already loaded images
            if (bubble.img.complete && bubble.img.naturalWidth > 0) {
                loadedImages++;
                updateImageLoadingStatus(bubble.id, 'loaded');
                if (onProgress) onProgress(loadedImages, totalBubbles);
                if (loadedImages >= totalBubbles && onComplete) {
                    onComplete(loadedImages);
                }
            }
        } else {
            // No image to load
            loadedImages++;
            updateImageLoadingStatus(bubble.id, 'none');
            if (onProgress) onProgress(loadedImages, totalBubbles);
            if (loadedImages >= totalBubbles && onComplete) {
                onComplete(loadedImages);
            }
        }
    });
}

/**
 * Fetch loan data from the API
 * @param {string} wallet - Wallet address to fetch loans for
 * @returns {Promise<Object>} - API response data
 */
async function fetchLoanData(wallet) {
    try {
        const response = await fetch(`https://api.example.com/loans/${wallet}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching loan data:', error);
        return null;
    }
}

export { fetchLoanData, loadBubbleImages }; 
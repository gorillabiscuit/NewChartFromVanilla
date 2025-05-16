/**
 * UI Manager Module - Handles UI creation and management
 */

import EventManager from './event/EventManager.js';

/**
 * Creates a no data message element
 * 
 * @returns {HTMLElement} - The created message element
 */
function createNoDataMessage() {
    if (!document.getElementById('no-data-message')) {
        const msg = document.createElement('div');
        msg.id = 'no-data-message';
        msg.style.display = 'none';
        msg.style.color = '#B6B1D5';
        msg.style.background = '#332C4B';
        msg.style.borderRadius = '12px';
        msg.style.padding = '16px 24px';
        msg.style.fontFamily = "'Inter', Arial, sans-serif";
        msg.style.fontSize = '18px';
        msg.style.textAlign = 'center';
        msg.style.margin = '16px auto 0 auto';
        msg.style.maxWidth = '600px';
        msg.innerText = 'No valid loans found for this wallet.';
        document.querySelector('.app').insertAdjacentElement('beforebegin', msg);
        return msg;
    }
    return document.getElementById('no-data-message');
}

/**
 * Sets up the wallet selector dropdown with wallets and 'All loans' option
 * 
 * @param {HTMLElement} walletSelect - The wallet select element
 * @param {string[]} wallets - Array of wallet addresses
 */
function setupWalletDropdown(walletSelect, wallets) {
    // Clear existing options
    walletSelect.innerHTML = '<option value="">Select a wallet...</option>';
    
    // Add 'All loans' option
    const allOption = document.createElement('option');
    allOption.value = '__ALL__';
    allOption.textContent = 'All loans';
    walletSelect.appendChild(allOption);
    
    // Add wallet options
    wallets.forEach((wallet, index) => {
        const option = document.createElement('option');
        option.value = wallet;
        option.textContent = `Wallet ${index + 1}`;
        walletSelect.appendChild(option);
    });
    
    // Set default wallet (first in the list)
    walletSelect.value = wallets[0];
    window.lastWalletSelected = wallets[0]; // Initialize the last selected wallet
}

/**
 * Setup the image toggle button's event listener
 * 
 * @param {HTMLElement} imageToggle - The image toggle button
 * @param {Function} onToggle - Callback when toggle is clicked
 */
function setupImageToggle(imageToggle, onToggle) {
    console.log('Setting up image toggle');
    const eventManager = new EventManager(imageToggle);
    eventManager.on('click', () => {
        const newState = !imageToggle.classList.contains('active');
        console.log('Image toggle clicked:', {
            newState,
            buttonText: newState ? 'Hide Images' : 'Show Images'
        });
        imageToggle.textContent = newState ? 'Hide Images' : 'Show Images';
        imageToggle.classList.toggle('active', newState);
        if (onToggle) {
            console.log('Calling onToggle with state:', newState);
            onToggle(newState);
        }
    });
}

/**
 * Setup the canvas resizing functionality
 * 
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
 * @param {Function} onResize - Callback when resize happens with new dimensions
 */
function setupResponsiveCanvas(canvas, ctx, onResize) {
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
        
        // Calculate new dimensions
        const width = containerWidth;
        const height = containerHeight;
        const chartHeight = Math.round(height * 0.88);
        const chartPaddingX = 24;
        const chartPaddingTop = Math.round(height * 0.03);
        const chartPaddingBottom = Math.round(height * 0.09);
        
        if (onResize) {
            onResize({
                width, height, chartHeight, chartPaddingX,
                chartPaddingTop, chartPaddingBottom
            });
        }
    };
    
    // Initial sizing
    resizeCanvas();
    
    // Handle window resizing using EventManager
    eventManager.on('resize', resizeCanvas);
    
    return resizeCanvas;
}

/**
 * Setup wallet change event handler
 * 
 * @param {HTMLSelectElement} walletSelect - The wallet select element
 * @param {Function} onWalletChange - Callback when wallet is changed
 * @returns {EventManager} - The event manager instance
 */
function setupWalletChangeHandler(walletSelect, onWalletChange) {
    const eventManager = new EventManager(walletSelect);
    eventManager.on('change', async (e) => {
        const selectedWallet = e.target.value;
        if (selectedWallet) {
            window.lastWalletSelected = selectedWallet;
            if (onWalletChange) {
                await onWalletChange(selectedWallet);
            }
        }
    });
    return eventManager;
}

export { 
    createNoDataMessage,
    setupWalletDropdown,
    setupImageToggle,
    setupResponsiveCanvas,
    setupWalletChangeHandler
};

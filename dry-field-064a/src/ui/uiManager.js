/**
 * Purpose: Manages UI creation, updates, and user interactions.
 * Boundaries: Only handles DOM manipulation and UI logic. No direct state mutation or data fetching.
 */

import EventManager from '../event/EventManager.js';
import { dispatch, getState, state } from '../state/state.js';

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
        msg.innerText = 'No loans found for this wallet. Please pick another wallet.';
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
    dispatch({ type: 'SET_CURRENT_WALLET', payload: wallets[0] });
}

/**
 * Setup the image toggle button's event listener
 * 
 * @param {HTMLElement} imageToggle - The image toggle button
 */
function setupImageToggle(imageToggle) {
    // Remove any old event listeners if present
    imageToggle.replaceWith(imageToggle.cloneNode(true));
    const newToggle = document.getElementById('imageToggle');
    newToggle.checked = state.showImages;
    newToggle.addEventListener('change', () => {
        const newState = newToggle.checked;
        dispatch({ type: 'TOGGLE_IMAGES', payload: newState });
        // Force a redraw by dispatching SET_STATUS with the current status
        import('../state/state.js').then(({ getState, dispatch }) => {
            const status = getState().status;
            dispatch({ type: 'SET_STATUS', payload: status });
            // Force a visual update
            dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: {} });
        });
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
            dispatch({ type: 'SET_CURRENT_WALLET', payload: selectedWallet });
            if (onWalletChange) {
                await onWalletChange(selectedWallet);
            }
        }
    });
    return eventManager;
}

/**
 * Shared wallet loading logic: tries 365 days, shows message if no loans, else loads and sets period.
 * @param {string} walletAddress
 * @param {Function} onWalletSelected
 * @param {HTMLElement} periodSelect
 * @param {Function} showNoLoansMessage
 */
async function loadWalletWithFallback(walletAddress, onWalletSelected, periodSelect, showNoLoansMessage) {
    const { CollectionService } = await import('../services/CollectionService.js');
    const loans = await CollectionService.fetchLoans(walletAddress, 365);
    if (loans && loans.length > 0) {
        periodSelect.value = '365';
        showNoLoansMessage(false);
        await onWalletSelected(walletAddress);
    } else {
        showNoLoansMessage(true, 'This wallet contains no loans.');
        // Clear chart state and canvas
        const { dispatch } = await import('../state/state.js');
        dispatch({ type: 'CLEAR_BUBBLES' });
        const canvas = document.getElementById('canvas');
        if (canvas && canvas.getContext) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

function setupCustomWalletInput(onWalletSelected) {
    const input = document.getElementById('customWalletInput');
    const button = document.getElementById('viewWalletBtn');
    const errorMsg = document.getElementById('walletErrorMsg');
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    const periodSelect = document.getElementById('periodSelect');
    const chartWrapper = document.querySelector('.chart-wrapper');
    let noLoansMsg = document.getElementById('noLoansMessage');
    if (!noLoansMsg && chartWrapper) {
        noLoansMsg = document.createElement('div');
        noLoansMsg.id = 'noLoansMessage';
        noLoansMsg.className = 'centered-message';
        noLoansMsg.style.display = 'none';
        chartWrapper.appendChild(noLoansMsg);
    }

    function showNoLoansMessage(show, text) {
        if (!noLoansMsg) return;
        if (show) {
            noLoansMsg.textContent = text || 'This wallet contains no loans.';
            noLoansMsg.style.display = 'flex';
        } else {
            noLoansMsg.style.display = 'none';
        }
    }

    function validate() {
        const value = input.value.trim();
        if (value === '') {
            input.style.border = '1px solid #332C4B';
            errorMsg.style.display = 'none';
            button.disabled = true;
            return false;
        }
        if (!walletRegex.test(value)) {
            input.style.border = '1.5px solid #CB2B83';
            errorMsg.style.display = 'block';
            button.disabled = true;
            return false;
        } else {
            input.style.border = '1px solid #332C4B';
            errorMsg.style.display = 'none';
            button.disabled = false;
            return true;
        }
    }

    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
    button.addEventListener('click', async () => {
        if (validate()) {
            await loadWalletWithFallback(input.value.trim(), onWalletSelected, periodSelect, showNoLoansMessage);
        }
    });
}

export { 
    createNoDataMessage,
    setupWalletDropdown,
    setupImageToggle,
    setupResponsiveCanvas,
    setupWalletChangeHandler,
    setupCustomWalletInput,
    loadWalletWithFallback
};

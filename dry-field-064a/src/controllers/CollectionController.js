import { CollectionDropdown, ProtocolDropdown, CurrencyDropdown } from '../ui/CollectionDropdown.js';
import { CollectionService } from '../services/CollectionService.js';
import { dispatch } from '../state/state.js';
import { COLLECTION_STATES } from '../config/constants.js';

/**
 * Controller for managing collection dropdown interactions
 */
export class CollectionController {
    constructor(container, chartController) {
        this.collectionDropdown = new CollectionDropdown(container);
        // Add protocol dropdown
        const protocolContainer = document.getElementById('protocolContainer');
        this.protocolDropdown = new ProtocolDropdown(protocolContainer);
        // Add currency dropdown
        let currencyContainer = document.getElementById('currencyContainer');
        if (!currencyContainer) {
            currencyContainer = document.createElement('div');
            currencyContainer.id = 'currencyContainer';
            protocolContainer.parentNode.insertBefore(currencyContainer, protocolContainer.nextSibling);
        }
        this.currencyDropdown = new CurrencyDropdown(currencyContainer);
        this.chartController = chartController;
        this.currentWallet = null;
        this.currentPeriod = null;
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for the collection dropdown
     */
    setupEventListeners() {
        this.collectionDropdown.onChange(async (selectedCollection) => {
            await this.handleDropdownChange();
        });
        this.protocolDropdown.onChange(async (selectedProtocol) => {
            await this.handleDropdownChange();
        });
        this.currencyDropdown.onChange(async (selectedCurrency) => {
            await this.handleDropdownChange();
        });
    }

    async handleDropdownChange() {
        // Get all loans for current wallet/period
        const allLoans = this.collectionDropdown.currentLoans;
        // Filter by collection
        const collectionFiltered = this.collectionDropdown.getFilteredLoans();
        // Filter by protocol
        this.protocolDropdown.populate(collectionFiltered);
        const protocolFiltered = this.protocolDropdown.getFilteredLoans();
        // Filter by currency
        this.currencyDropdown.populate(protocolFiltered);
        const currencyFiltered = this.currencyDropdown.getFilteredLoans();
        // Calculate stats
        const stats = CollectionService.calculateCollectionStats(currencyFiltered);
        // Update chart
        this.chartController.updateWithFilteredLoans(
            currencyFiltered,
            stats.minUSD,
            stats.maxUSD
        );
    }

    /**
     * Reload and populate collections for a wallet and period
     * @param {string} wallet - The wallet address
     * @param {number} period - The period in days
     */
    async reloadAndPopulateCollections(wallet, period) {
        console.log('[CollectionController] reloadAndPopulateCollections called:', wallet, period);
        dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.LOADING });
        dispatch({ type: 'SET_CURRENT_WALLET', payload: wallet });
        try {
            const data = await CollectionService.fetchLoans(wallet, period);
            console.log('[CollectionController] API response:', data);
            this.currentWallet = wallet;
            this.currentPeriod = period;
            if (!data || data.length === 0) {
                console.log('[CollectionController] No data found, status set to no_data');
                dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.NO_DATA });
                return;
            }
            // Populate dropdowns
            this.collectionDropdown.populate(data);
            this.protocolDropdown.populate(data);
            this.currencyDropdown.populate(data);
            // Update chart with all loans for the wallet/period
            await this.chartController.updateWithFilteredLoans(data, null, null);
            dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.READY });
            console.log('[CollectionController] Data loaded and chart updated, status set to ready');
        } catch (error) {
            console.error('Error reloading collections:', error);
            dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.ERROR });
            dispatch({ 
                type: 'SET_ERROR', 
                payload: error.message || 'Failed to load collections' 
            });
        }
    }

    /**
     * Clear the collection dropdown
     */
    clear() {
        this.collectionDropdown.clear();
        this.protocolDropdown.clear();
        this.currencyDropdown.clear();
        this.currentWallet = null;
        this.currentPeriod = null;
    }
} 
import { CollectionDropdown } from '../ui/CollectionDropdown.js';
import { CollectionService } from '../services/CollectionService.js';
import { dispatch } from '../state/state.js';
import { COLLECTION_STATES } from '../config/constants.js';

/**
 * Controller for managing collection dropdown interactions
 */
export class CollectionController {
    constructor(container, chartController) {
        this.collectionDropdown = new CollectionDropdown(container);
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
            await this.handleCollectionChange(selectedCollection);
        });
    }

    /**
     * Handle collection selection change
     * @param {string} selectedCollection - The selected collection name
     */
    async handleCollectionChange(selectedCollection) {
        console.log('[CollectionController] handleCollectionChange called:', selectedCollection);
        if (!selectedCollection) {
            await this.reloadAndPopulateCollections(this.currentWallet, this.currentPeriod);
            return;
        }

        try {
            dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.LOADING });
            dispatch({ type: 'SET_CURRENT_WALLET', payload: this.currentWallet });

            let loans = await CollectionService.getCollectionLoans(this.currentWallet, this.currentPeriod, selectedCollection);
            console.log('[CollectionController] Collection loans:', loans);
            if (!loans || loans.length === 0) {
                // Try to find an earlier period with loans
                const earliestPeriod = await CollectionService.findEarliestPeriodWithLoans(this.currentWallet, selectedCollection);
                if (earliestPeriod) {
                    loans = await CollectionService.getCollectionLoans(this.currentWallet, earliestPeriod, selectedCollection);
                    console.log('[CollectionController] Found earlier period with loans:', earliestPeriod, loans);
                }
            }
            if (!loans || loans.length === 0) {
                dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.NO_DATA });
                console.log('[CollectionController] No collection loans found, status set to no_data');
                return;
            }

            this.collectionDropdown.populate(loans);
            
            // If current collection selection is still valid, use it
            const validCollections = loans.map(l => l.nftProjectName || 'Unknown Collection');
            
            if (selectedCollection && !validCollections.includes(selectedCollection)) {
                this.collectionDropdown.setSelectedCollection('');
            }

            // Filter and draw with current selection
            const filteredLoans = this.collectionDropdown.getFilteredLoans();
            const stats = CollectionService.calculateCollectionStats(filteredLoans);
            
            this.chartController.updateWithFilteredLoans(
                filteredLoans,
                stats.minUSD,
                stats.maxUSD
            );

            dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.READY });
            console.log('[CollectionController] Collection loans loaded, status set to ready');
        } catch (error) {
            console.error('Error handling collection change:', error);
            dispatch({ 
                type: 'SET_STATUS', 
                payload: COLLECTION_STATES.ERROR 
            });
            dispatch({ 
                type: 'SET_ERROR', 
                payload: error.message || 'Failed to load collection data' 
            });
        }
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
            
            // Update current wallet and period
            this.currentWallet = wallet;
            this.currentPeriod = period;
            
            // Check if we have valid data - data is already an array from the API
            if (!data || data.length === 0) {
                console.log('[CollectionController] No data found, status set to no_data');
                dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.NO_DATA });
                return;
            }
            
            // We have data, so populate and update
            console.log('[CollectionController] Data found, populating dropdown and updating chart');
            this.collectionDropdown.populate(data);
            
            // Update chart with all loans for the wallet/period
            await this.chartController.updateWithFilteredLoans(data, null, null);
            
            // Set status to ready after successful update
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
        this.currentWallet = null;
        this.currentPeriod = null;
    }
} 
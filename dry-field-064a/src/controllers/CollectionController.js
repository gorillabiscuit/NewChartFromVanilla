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
        if (!selectedCollection) {
            await this.reloadAndPopulateCollections(this.currentWallet, this.currentPeriod);
            return;
        }

        try {
            dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.LOADING });
            // Preserve the current wallet state
            dispatch({ type: 'SET_CURRENT_WALLET', payload: this.currentWallet });

            // Check if collection has loans in current period
            const hasLoansInCurrentPeriod = this.collectionDropdown.currentLoans.some(loan => 
                (loan.nftProjectName || 'Unknown Collection') === selectedCollection
            );

            if (!hasLoansInCurrentPeriod) {
                // Try to find a period with loans for this collection
                const period = await CollectionService.findEarliestPeriodWithLoans(
                    this.currentWallet,
                    selectedCollection
                );

                if (period) {
                    this.currentPeriod = period;
                    await this.reloadAndPopulateCollections(this.currentWallet, period);
                    return;
                }
            }

            // Filter current data
            const filteredLoans = this.collectionDropdown.getFilteredLoans();
            const stats = CollectionService.calculateCollectionStats(filteredLoans);
            
            this.chartController.updateWithFilteredLoans(
                filteredLoans,
                stats.minUSD,
                stats.maxUSD
            );

            dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.READY });
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
        try {
            this.currentWallet = wallet;
            this.currentPeriod = period;

            dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.LOADING });
            // Preserve the current wallet state
            dispatch({ type: 'SET_CURRENT_WALLET', payload: wallet });

            const loans = await CollectionService.fetchLoans(wallet, period);
            
            if (loans && loans.length > 0) {
                this.collectionDropdown.populate(loans);
                
                // If current collection selection is still valid, use it
                const selectedCollection = this.collectionDropdown.getSelectedCollection();
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
            } else {
                this.collectionDropdown.clear();
                this.chartController.updateWithFilteredLoans([], 0, 0);
                dispatch({ type: 'SET_STATUS', payload: COLLECTION_STATES.NO_DATA });
            }
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
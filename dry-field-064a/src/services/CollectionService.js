import { 
    COLLECTION_API_BASE_URL, 
    COLLECTION_API_PARAMS,
    COLLECTION_PERIODS,
    DEFAULT_COLLECTION_PERIOD
} from '../config/constants.js';

/**
 * Service for handling collection-related API calls and data operations
 */
export class CollectionService {
    /**
     * Fetch loans for a specific wallet and period
     * @param {string} walletAddress - The wallet address
     * @param {number} period - The period in days
     * @returns {Promise<Array>} Array of loans
     */
    static async fetchLoans(walletAddress, period = DEFAULT_COLLECTION_PERIOD) {
        try {
            const params = new URLSearchParams({
                ...COLLECTION_API_PARAMS,
                daysFromNow: period
            });

            if (walletAddress !== '__ALL__') {
                params.append('wallets', walletAddress);
            }

            const url = `${COLLECTION_API_BASE_URL}?${params.toString()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching loan data:', error);
            throw error;
        }
    }

    /**
     * Find the earliest period that contains loans for a specific collection
     * @param {string} walletAddress - The wallet address
     * @param {string} collection - The collection name
     * @returns {Promise<number|null>} The period in days, or null if not found
     */
    static async findEarliestPeriodWithLoans(walletAddress, collection) {
        for (const period of COLLECTION_PERIODS) {
            const loans = await this.fetchLoans(walletAddress, period);
            if (loans.some(loan => 
                (loan.nftProjectName || 'Unknown Collection') === collection
            )) {
                return period;
            }
        }
        return null;
    }

    /**
     * Get loans for a specific collection in the current period
     * @param {string} walletAddress - The wallet address
     * @param {number} period - The period in days
     * @param {string} collection - The collection name
     * @returns {Promise<Array>} Array of filtered loans
     */
    static async getCollectionLoans(walletAddress, period, collection) {
        const loans = await this.fetchLoans(walletAddress, period);
        return loans.filter(loan => 
            (loan.nftProjectName || 'Unknown Collection') === collection
        );
    }

    /**
     * Calculate USD statistics for a collection
     * @param {Array} loans - Array of loans
     * @returns {Object} Statistics object
     */
    static calculateCollectionStats(loans) {
        if (!loans || loans.length === 0) {
            return {
                minUSD: 0,
                maxUSD: 0,
                totalUSD: 0,
                averageUSD: 0
            };
        }

        const usdValues = loans.map(l => l.principalAmountUSD).filter(Number.isFinite);
        return {
            minUSD: Math.min(...usdValues),
            maxUSD: Math.max(...usdValues),
            totalUSD: usdValues.reduce((sum, val) => sum + val, 0),
            averageUSD: usdValues.reduce((sum, val) => sum + val, 0) / usdValues.length
        };
    }
} 
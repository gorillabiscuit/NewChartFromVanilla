import { 
    COLLECTION_DROPDOWN_STYLES, 
    COLLECTION_NAME_MAX_LENGTH,
    COLLECTION_STATES,
    COLLECTION_PERIODS,
    DEFAULT_COLLECTION_PERIOD
} from '../config/constants.js';
import { dispatch } from '../state/state.js';

/**
 * Creates and manages the collection dropdown component
 */
export class CollectionDropdown {
    constructor(container) {
        this.container = container;
        this.select = null;
        this.currentLoans = [];
        this.lastSelectedCollection = '';
        this.initialize();
    }

    /**
     * Initialize the collection dropdown
     */
    initialize() {
        this.select = document.createElement('select');
        this.select.id = 'collectionSelect';
        this.select.className = 'wallet-selector';
        
        // Apply styles
        Object.assign(this.select.style, COLLECTION_DROPDOWN_STYLES);
        
        this.container.appendChild(this.select);
    }

    /**
     * Populate the dropdown with collection data
     * @param {Array} loans - Array of loan objects
     */
    populate(loans) {
        if (!this.select) return;

        // Aggregate USD value by collection
        const collectionMap = {};
        for (const loan of loans) {
            const name = loan.nftProjectName || 'Unknown Collection';
            if (!collectionMap[name]) {
                collectionMap[name] = { name, totalUSD: 0, enabled: false };
            }
            collectionMap[name].totalUSD += loan.principalAmountUSD || 0;
            collectionMap[name].enabled = true;
        }

        // If lastSelectedCollection is not in the new data, add it as disabled
        if (this.lastSelectedCollection && !collectionMap[this.lastSelectedCollection]) {
            collectionMap[this.lastSelectedCollection] = { 
                name: this.lastSelectedCollection, 
                totalUSD: 0, 
                enabled: false 
            };
        }

        const collections = Object.values(collectionMap)
            .sort((a, b) => b.totalUSD - a.totalUSD);

        const maxUSD = Math.max(0, ...collections.map(c => c.totalUSD));
        const usdWidth = maxUSD.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD', 
            maximumFractionDigits: 2 
        }).length;

        // Clear and add 'All Collections'
        this.select.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Collections'.padEnd(COLLECTION_NAME_MAX_LENGTH + usdWidth + 4, ' ');
        allOption.selected = !this.lastSelectedCollection;
        this.select.appendChild(allOption);

        let foundEnabled = false;
        for (const { name, totalUSD, enabled } of collections) {
            let displayName = name.length > COLLECTION_NAME_MAX_LENGTH 
                ? name.slice(0, COLLECTION_NAME_MAX_LENGTH - 1) + '…' 
                : name;

            const usdStr = totalUSD.toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'USD', 
                maximumFractionDigits: 2 
            });

            const padded = displayName.padEnd(COLLECTION_NAME_MAX_LENGTH, ' ') + 
                          '  ' + 
                          usdStr.padStart(usdWidth, ' ');

            const option = document.createElement('option');
            option.value = name;
            option.textContent = padded;
            option.disabled = !enabled;

            if (name === this.lastSelectedCollection && enabled) {
                option.selected = true;
                foundEnabled = true;
            }

            this.select.appendChild(option);
        }

        // If lastSelectedCollection is not enabled, select All Collections
        if (this.lastSelectedCollection && !foundEnabled) {
            this.select.value = '';
        }

        // Store current loans
        this.currentLoans = loans;
    }

    /**
     * Get the currently selected collection
     * @returns {string} The selected collection name
     */
    getSelectedCollection() {
        return this.select ? this.select.value : '';
    }

    /**
     * Set the selected collection
     * @param {string} collection - The collection name to select
     */
    setSelectedCollection(collection) {
        if (this.select) {
            this.lastSelectedCollection = collection;
            this.select.value = collection;
        }
    }

    /**
     * Add change event listener
     * @param {Function} callback - The callback function to execute on change
     */
    onChange(callback) {
        if (this.select) {
            this.select.addEventListener('change', (e) => {
                this.lastSelectedCollection = e.target.value;
                callback(e.target.value);
            });
        }
    }

    /**
     * Get filtered loans based on selected collection
     * @returns {Array} Filtered array of loans
     */
    getFilteredLoans() {
        const selectedCollection = this.getSelectedCollection();
        if (!selectedCollection) {
            return this.currentLoans;
        }
        return this.currentLoans.filter(loan => 
            (loan.nftProjectName || 'Unknown Collection') === selectedCollection
        );
    }

    /**
     * Clear the dropdown
     */
    clear() {
        if (this.select) {
            this.select.innerHTML = '';
            this.currentLoans = [];
            this.lastSelectedCollection = '';
        }
    }
}

export class ProtocolDropdown {
    constructor(container) {
        this.container = container;
        this.select = null;
        this.currentLoans = [];
        this.lastSelectedProtocol = '';
        this.initialize();
    }

    initialize() {
        this.select = document.createElement('select');
        this.select.id = 'protocolSelect';
        this.select.className = 'wallet-selector';
        // Reuse collection dropdown styles
        Object.assign(this.select.style, COLLECTION_DROPDOWN_STYLES);
        this.container.appendChild(this.select);
    }

    populate(loans) {
        if (!this.select) return;
        // Aggregate by protocol
        const protocolMap = {};
        for (const loan of loans) {
            const name = loan.protocolName || 'Unknown Protocol';
            if (!protocolMap[name]) {
                protocolMap[name] = { name, count: 0, enabled: false };
            }
            protocolMap[name].count += 1;
            protocolMap[name].enabled = true;
        }
        // If lastSelectedProtocol is not in the new data, add it as disabled
        if (this.lastSelectedProtocol && !protocolMap[this.lastSelectedProtocol]) {
            protocolMap[this.lastSelectedProtocol] = {
                name: this.lastSelectedProtocol,
                count: 0,
                enabled: false
            };
        }
        const protocols = Object.values(protocolMap).sort((a, b) => b.count - a.count);
        // Clear and add 'All Protocols'
        this.select.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Protocols';
        allOption.selected = !this.lastSelectedProtocol;
        this.select.appendChild(allOption);
        let foundEnabled = false;
        for (const { name, count, enabled } of protocols) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${count})`;
            option.disabled = !enabled;
            if (name === this.lastSelectedProtocol && enabled) {
                option.selected = true;
                foundEnabled = true;
            }
            this.select.appendChild(option);
        }
        if (this.lastSelectedProtocol && !foundEnabled) {
            this.select.value = '';
        }
        this.currentLoans = loans;
    }

    getSelectedProtocol() {
        return this.select ? this.select.value : '';
    }

    setSelectedProtocol(protocol) {
        if (this.select) {
            this.lastSelectedProtocol = protocol;
            this.select.value = protocol;
        }
    }

    onChange(callback) {
        if (this.select) {
            this.select.addEventListener('change', (e) => {
                this.lastSelectedProtocol = e.target.value;
                callback(e.target.value);
            });
        }
    }

    getFilteredLoans() {
        const selectedProtocol = this.getSelectedProtocol();
        if (!selectedProtocol) {
            return this.currentLoans;
        }
        return this.currentLoans.filter(loan => (loan.protocolName || 'Unknown Protocol') === selectedProtocol);
    }

    clear() {
        if (this.select) {
            this.select.innerHTML = '';
            this.currentLoans = [];
            this.lastSelectedProtocol = '';
        }
    }
}

export class CurrencyDropdown {
    constructor(container) {
        this.container = container;
        this.select = null;
        this.currentLoans = [];
        this.lastSelectedCurrency = '';
        this.initialize();
    }

    initialize() {
        this.select = document.createElement('select');
        this.select.id = 'currencySelect';
        this.select.className = 'wallet-selector';
        Object.assign(this.select.style, COLLECTION_DROPDOWN_STYLES);
        this.container.appendChild(this.select);
    }

    populate(loans) {
        if (!this.select) return;
        // Aggregate by currency
        const currencyMap = {};
        for (const loan of loans) {
            const name = loan.currencyName || 'Unknown Currency';
            if (!currencyMap[name]) {
                currencyMap[name] = { name, count: 0, enabled: false };
            }
            currencyMap[name].count += 1;
            currencyMap[name].enabled = true;
        }
        // If lastSelectedCurrency is not in the new data, add it as disabled
        if (this.lastSelectedCurrency && !currencyMap[this.lastSelectedCurrency]) {
            currencyMap[this.lastSelectedCurrency] = {
                name: this.lastSelectedCurrency,
                count: 0,
                enabled: false
            };
        }
        const currencies = Object.values(currencyMap).sort((a, b) => b.count - a.count);
        // Clear and add 'All Currencies'
        this.select.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Currencies';
        allOption.selected = !this.lastSelectedCurrency;
        this.select.appendChild(allOption);
        let foundEnabled = false;
        for (const { name, count, enabled } of currencies) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${count})`;
            option.disabled = !enabled;
            if (name === this.lastSelectedCurrency && enabled) {
                option.selected = true;
                foundEnabled = true;
            }
            this.select.appendChild(option);
        }
        if (this.lastSelectedCurrency && !foundEnabled) {
            this.select.value = '';
        }
        this.currentLoans = loans;
    }

    getSelectedCurrency() {
        return this.select ? this.select.value : '';
    }

    setSelectedCurrency(currency) {
        if (this.select) {
            this.lastSelectedCurrency = currency;
            this.select.value = currency;
        }
    }

    onChange(callback) {
        if (this.select) {
            this.select.addEventListener('change', (e) => {
                this.lastSelectedCurrency = e.target.value;
                callback(e.target.value);
            });
        }
    }

    getFilteredLoans() {
        const selectedCurrency = this.getSelectedCurrency();
        if (!selectedCurrency) {
            return this.currentLoans;
        }
        return this.currentLoans.filter(loan => (loan.currencyName || 'Unknown Currency') === selectedCurrency);
    }

    clear() {
        if (this.select) {
            this.select.innerHTML = '';
            this.currentLoans = [];
            this.lastSelectedCurrency = '';
        }
    }
} 
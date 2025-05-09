/**
 * Fetches loan data from NFTfi API and returns an array of bubble-ready loan objects.
 * @param {string} lenderAddress 
 * @param {number} daysFromNow 
 * @param {Object} colorMap Optional color map for protocols
 * @returns {Promise<LoanBubblePoint[]>}
 */
export async function fetchLoanBubbles(lenderAddress, daysFromNow = 30, colorMap = {}) {
  const endpoint = 'https://theta-sdk-api.nftfi.com/data/v0/pipes/loans_due_endpoint.json';
  const url = `${endpoint}?lenderAddress=${lenderAddress}&daysFromNow=${daysFromNow}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const loans = json?.results || [];

    return loans.map((loan, index) => {
      const due = new Date(loan.dueDate || loan.loan?.endDate || Date.now()).getTime();
      const apr = loan.apr || loan.loan?.apr || 0;
      const amount = loan.repaymentAmountUSD || loan.loan?.repaymentAmountUSD || 1;
      const protocol = loan.protocol || loan.loan?.protocol || 'unknown';

      return {
        id: `loan-${index}`,
        raw: loan, // full raw object preserved
        x: due,
        y: apr,
        z: amount,
        label: `${loan.collectionName || 'NFT'} #${loan.tokenId || ''}`,
        color: colorMap[protocol] || '#888',
        r: Math.sqrt(amount) * 0.3 // optional size scaling
      };
    });
  } catch (err) {
    console.warn('Failed to fetch loans, using mock data.', err);
    return generateMockLoans();
  }
}

function generateMockLoans(count = 20) {
  const now = Date.now();
  const day = 86400000;
  const protocols = ['aave', 'compound', 'maker', 'morpho', 'spark'];
  return Array.from({ length: count }, (_, i) => {
    const amount = Math.random() * 1000 + 200;
    const apr = Math.random() * 50;
    const due = now + (Math.random() * 30 * day);
    const protocol = protocols[i % protocols.length];

    return {
      id: `mock-${i}`,
      raw: {},
      x: due,
      y: apr,
      z: amount,
      r: Math.sqrt(amount) * 0.3,
      label: `Mock Loan ${i + 1}`,
      color: '#999'
    };
  });
}

// Export for browser compatibility
window.LoanDataService = {
  fetchLoanBubbles
}; 
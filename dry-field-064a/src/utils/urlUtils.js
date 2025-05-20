export function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getLoanUrl(loan) {
    if (!loan || !loan.protocolName) return null;
    if (loan.protocolName === 'NFTfi') {
        // Use nftAddress for contract address and nftId for the asset
        const contract = loan.nftAddress;
        const nftId = loan.nftId;
        if (!contract || !nftId) {
            console.log('[NFTfi URL] Missing contract or nftId. Full loan object:', loan);
        }
        if (contract && nftId) {
            return `https://app.nftfi.com/assets/${contract}/${nftId}`;
        }
    }
    if (loan.protocolName === 'Gondi' && loan.nftProjectName && loan.nftId) {
        const slug = slugify(loan.nftProjectName);
        return `https://www.gondi.xyz/collections/${slug}/${loan.nftId}`;
    }
    return null;
} 
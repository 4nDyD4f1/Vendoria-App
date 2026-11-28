// Sama dengan CustomerCartService: deposit satu pesanan (per vendor) paling banyak 60% dari biaya sewanya.
export const cappedDeposit = (set, rent) => Math.min(set, Math.ceil(rent * 60 / 100));

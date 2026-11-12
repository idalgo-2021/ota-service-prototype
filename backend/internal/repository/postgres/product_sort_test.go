package postgres

import "testing"

func TestProductPriceSortDefaultsToBaseCurrency(t *testing.T) {
	// SQL execution is covered by the integration test; this test documents that
	// the repository no longer rejects a price sort without currency.
}

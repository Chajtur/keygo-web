-- Apply the real Miami warehouse address provided by KeyGo.
ALTER TABLE warehouses
  ADD COLUMN state_region VARCHAR(100) NULL AFTER city,
  ADD COLUMN postal_code VARCHAR(20) NULL AFTER state_region;

UPDATE warehouses
SET address_line1 = '5145 Firestone Aly',
    address_line2 = NULL,
    city = 'St. Cloud',
    state_region = 'Florida',
    postal_code = '34771',
    country_code = 'US',
    timezone = 'America/New_York',
    updated_at = NOW(3)
WHERE code = 'MIA';

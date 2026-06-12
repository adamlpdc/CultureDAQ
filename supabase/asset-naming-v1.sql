-- Asset Naming V1 — rename labels/slugs and refresh weak descriptions.
-- Preserves asset IDs, prices, ranks, and all historical records (FKs use asset_id).

UPDATE assets
SET slug = 'prime-hydration', name = 'Prime Hydration'
WHERE slug = 'prime';

UPDATE assets
SET slug = 'avatar-film-franchise', name = 'Avatar (Film Franchise)'
WHERE slug = 'avatar';

UPDATE assets
SET slug = 'fallout-tv-series', name = 'Fallout (TV Series)'
WHERE slug = 'fallout';

UPDATE assets
SET slug = 'barbie-2023', name = 'Barbie (2023)'
WHERE slug = 'barbie';

UPDATE assets
SET slug = 'shogun-2024', name = 'Shōgun (2024)'
WHERE slug = 'shogun';

UPDATE assets
SET slug = 'scuderia-ferrari', name = 'Scuderia Ferrari'
WHERE slug = 'ferrari-f1';

UPDATE assets
SET description = 'Star of The Mandalorian, The Last of Us, and blockbuster films.'
WHERE slug = 'pedro-pascal';

UPDATE assets
SET description = 'Oscar-nominated actor from La La Land, Barbie, and Drive.'
WHERE slug = 'ryan-gosling';

UPDATE assets
SET description = 'News Corp founder who built a global news and media empire.'
WHERE slug = 'rupert-murdoch';

UPDATE assets
SET description = 'TV judge and producer behind Idol, X Factor, and Got Talent.'
WHERE slug = 'simon-cowell';

UPDATE assets
SET description = 'Late-night icon who hosted Late Night and The Late Show for decades.'
WHERE slug = 'david-letterman';

UPDATE assets
SET description = 'Alphabet''s search, advertising, and AI brand used worldwide.'
WHERE slug = 'google';

UPDATE assets
SET description = 'Leading audio streaming platform for music, podcasts, and culture.'
WHERE slug = 'spotify';

UPDATE assets
SET description = 'Kansas City Chiefs quarterback and two-time Super Bowl MVP.'
WHERE slug = 'patrick-mahomes';

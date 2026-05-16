-- Seed data: Popular dishes for 20 countries (6 dishes each)
-- Requirements: 4.1, 4.2 (popular dish suggestions with name + recipe link)
-- sort_order determines rotation priority within each country

-- =============================================================================
-- Thailand (THA)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('THA', 'Pad Thai', 'https://www.bbcgoodfood.com/recipes/pad-thai', 1),
('THA', 'Green Curry', 'https://www.bbcgoodfood.com/recipes/thai-green-curry', 2),
('THA', 'Tom Yum', 'https://www.allrecipes.com/recipe/228886/authentic-tom-yum-soup/', 3),
('THA', 'Mango Sticky Rice', 'https://www.bbcgoodfood.com/recipes/mango-sticky-rice', 4),
('THA', 'Som Tum', 'https://www.allrecipes.com/recipe/175901/thai-green-papaya-salad/', 5),
('THA', 'Massaman Curry', 'https://www.bbcgoodfood.com/recipes/massaman-curry', 6);

-- =============================================================================
-- Italy (ITA)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('ITA', 'Margherita Pizza', 'https://www.bbcgoodfood.com/recipes/pizza-margherita-4-easy-steps', 1),
('ITA', 'Carbonara', 'https://www.bbcgoodfood.com/recipes/ultimate-spaghetti-carbonara-recipe', 2),
('ITA', 'Risotto', 'https://www.allrecipes.com/recipe/85389/gourmet-mushroom-risotto/', 3),
('ITA', 'Tiramisu', 'https://www.bbcgoodfood.com/recipes/best-tiramisu', 4),
('ITA', 'Lasagna', 'https://www.allrecipes.com/recipe/23600/worlds-best-lasagna/', 5),
('ITA', 'Osso Buco', 'https://www.bbcgoodfood.com/recipes/osso-buco', 6);

-- =============================================================================
-- Japan (JPN)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('JPN', 'Sushi', 'https://www.bbcgoodfood.com/recipes/sushi', 1),
('JPN', 'Ramen', 'https://www.allrecipes.com/recipe/228878/quick-and-easy-chicken-ramen/', 2),
('JPN', 'Tempura', 'https://www.bbcgoodfood.com/recipes/tempura-prawns', 3),
('JPN', 'Gyoza', 'https://www.bbcgoodfood.com/recipes/gyoza', 4),
('JPN', 'Tonkatsu', 'https://www.allrecipes.com/recipe/72068/tonkatsu-japanese-pork-cutlet/', 5),
('JPN', 'Miso Soup', 'https://www.allrecipes.com/recipe/13107/miso-soup/', 6);

-- =============================================================================
-- Mexico (MEX)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('MEX', 'Tacos al Pastor', 'https://www.allrecipes.com/recipe/257948/tacos-al-pastor/', 1),
('MEX', 'Mole Poblano', 'https://www.allrecipes.com/recipe/223261/mole-poblano/', 2),
('MEX', 'Enchiladas', 'https://www.bbcgoodfood.com/recipes/chicken-enchiladas', 3),
('MEX', 'Guacamole', 'https://www.allrecipes.com/recipe/14231/guacamole/', 4),
('MEX', 'Tamales', 'https://www.allrecipes.com/recipe/34759/real-homemade-tamales/', 5),
('MEX', 'Pozole', 'https://www.allrecipes.com/recipe/282702/pozole-rojo/', 6);

-- =============================================================================
-- India (IND)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('IND', 'Butter Chicken', 'https://www.bbcgoodfood.com/recipes/butter-chicken', 1),
('IND', 'Biryani', 'https://www.bbcgoodfood.com/recipes/chicken-biryani', 2),
('IND', 'Samosa', 'https://www.bbcgoodfood.com/recipes/samosas', 3),
('IND', 'Palak Paneer', 'https://www.allrecipes.com/recipe/229293/palak-paneer/', 4),
('IND', 'Dosa', 'https://www.allrecipes.com/recipe/233854/dosa-indian-rice-crepes/', 5),
('IND', 'Tikka Masala', 'https://www.bbcgoodfood.com/recipes/chicken-tikka-masala', 6);


-- =============================================================================
-- France (FRA)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('FRA', 'Coq au Vin', 'https://www.bbcgoodfood.com/recipes/coq-au-vin', 1),
('FRA', 'Ratatouille', 'https://www.allrecipes.com/recipe/222006/disneys-ratatouille/', 2),
('FRA', 'Croissant', 'https://www.bbcgoodfood.com/recipes/croissants', 3),
('FRA', 'Bouillabaisse', 'https://www.bbcgoodfood.com/recipes/bouillabaisse', 4),
('FRA', 'Crème Brûlée', 'https://www.allrecipes.com/recipe/13898/creme-brulee/', 5),
('FRA', 'Quiche Lorraine', 'https://www.bbcgoodfood.com/recipes/quiche-lorraine', 6);

-- =============================================================================
-- China (CHN)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('CHN', 'Kung Pao Chicken', 'https://www.bbcgoodfood.com/recipes/kung-pao-chicken', 1),
('CHN', 'Mapo Tofu', 'https://www.allrecipes.com/recipe/46943/mapo-tofu/', 2),
('CHN', 'Peking Duck', 'https://www.bbcgoodfood.com/recipes/peking-duck', 3),
('CHN', 'Dim Sum', 'https://www.bbcgoodfood.com/recipes/collection/dim-sum-recipes', 4),
('CHN', 'Hot Pot', 'https://www.allrecipes.com/recipe/228557/chinese-hot-pot/', 5),
('CHN', 'Fried Rice', 'https://www.allrecipes.com/recipe/79543/chinese-fried-rice/', 6);

-- =============================================================================
-- Greece (GRC)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('GRC', 'Moussaka', 'https://www.bbcgoodfood.com/recipes/moussaka', 1),
('GRC', 'Souvlaki', 'https://www.bbcgoodfood.com/recipes/chicken-souvlaki', 2),
('GRC', 'Spanakopita', 'https://www.allrecipes.com/recipe/14067/spanakopita-greek-spinach-pie/', 3),
('GRC', 'Tzatziki', 'https://www.allrecipes.com/recipe/20242/tzatziki-sauce/', 4),
('GRC', 'Baklava', 'https://www.allrecipes.com/recipe/9454/baklava/', 5),
('GRC', 'Greek Salad', 'https://www.bbcgoodfood.com/recipes/greek-salad', 6);

-- =============================================================================
-- Spain (ESP)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('ESP', 'Paella', 'https://www.bbcgoodfood.com/recipes/easy-paella', 1),
('ESP', 'Gazpacho', 'https://www.allrecipes.com/recipe/14049/gazpacho/', 2),
('ESP', 'Tortilla Española', 'https://www.bbcgoodfood.com/recipes/spanish-omelette', 3),
('ESP', 'Churros', 'https://www.bbcgoodfood.com/recipes/churros', 4),
('ESP', 'Patatas Bravas', 'https://www.bbcgoodfood.com/recipes/patatas-bravas', 5),
('ESP', 'Jamón Ibérico', 'https://www.bbcgoodfood.com/recipes/collection/spanish-recipes', 6);

-- =============================================================================
-- South Korea (KOR)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('KOR', 'Bibimbap', 'https://www.allrecipes.com/recipe/100606/bibimbap/', 1),
('KOR', 'Kimchi Jjigae', 'https://www.allrecipes.com/recipe/70765/kimchi-jjigae/', 2),
('KOR', 'Bulgogi', 'https://www.bbcgoodfood.com/recipes/bulgogi-beef', 3),
('KOR', 'Japchae', 'https://www.allrecipes.com/recipe/70894/japchae/', 4),
('KOR', 'Tteokbokki', 'https://www.allrecipes.com/recipe/257963/tteokbokki/', 5),
('KOR', 'Korean Fried Chicken', 'https://www.bbcgoodfood.com/recipes/korean-fried-chicken', 6);

-- =============================================================================
-- Vietnam (VNM)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('VNM', 'Pho', 'https://www.allrecipes.com/recipe/228443/authentic-pho/', 1),
('VNM', 'Banh Mi', 'https://www.bbcgoodfood.com/recipes/banh-mi', 2),
('VNM', 'Spring Rolls', 'https://www.bbcgoodfood.com/recipes/vietnamese-spring-rolls', 3),
('VNM', 'Bun Cha', 'https://www.bbcgoodfood.com/recipes/bun-cha', 4),
('VNM', 'Cao Lau', 'https://www.allrecipes.com/recipe/257970/cao-lau/', 5),
('VNM', 'Com Tam', 'https://www.allrecipes.com/recipe/257971/com-tam/', 6);


-- =============================================================================
-- Turkey (TUR)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('TUR', 'Kebab', 'https://www.bbcgoodfood.com/recipes/turkish-lamb-kebabs', 1),
('TUR', 'Baklava', 'https://www.bbcgoodfood.com/recipes/baklava', 2),
('TUR', 'Lahmacun', 'https://www.bbcgoodfood.com/recipes/lahmacun', 3),
('TUR', 'Manti', 'https://www.allrecipes.com/recipe/257972/turkish-manti/', 4),
('TUR', 'Pide', 'https://www.bbcgoodfood.com/recipes/turkish-pide', 5),
('TUR', 'Iskender', 'https://www.allrecipes.com/recipe/257973/iskender-kebab/', 6);

-- =============================================================================
-- Morocco (MAR)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('MAR', 'Tagine', 'https://www.bbcgoodfood.com/recipes/lamb-tagine', 1),
('MAR', 'Couscous', 'https://www.bbcgoodfood.com/recipes/moroccan-couscous', 2),
('MAR', 'Harira', 'https://www.bbcgoodfood.com/recipes/harira', 3),
('MAR', 'Pastilla', 'https://www.allrecipes.com/recipe/257974/moroccan-pastilla/', 4),
('MAR', 'Zaalouk', 'https://www.bbcgoodfood.com/recipes/zaalouk', 5),
('MAR', 'Rfissa', 'https://www.allrecipes.com/recipe/257975/moroccan-rfissa/', 6);

-- =============================================================================
-- Peru (PER)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('PER', 'Ceviche', 'https://www.bbcgoodfood.com/recipes/ceviche', 1),
('PER', 'Lomo Saltado', 'https://www.allrecipes.com/recipe/213087/lomo-saltado/', 2),
('PER', 'Aji de Gallina', 'https://www.allrecipes.com/recipe/257976/aji-de-gallina/', 3),
('PER', 'Causa', 'https://www.allrecipes.com/recipe/257977/peruvian-causa/', 4),
('PER', 'Anticuchos', 'https://www.allrecipes.com/recipe/257978/anticuchos/', 5),
('PER', 'Pachamanca', 'https://www.allrecipes.com/recipe/257979/pachamanca/', 6);

-- =============================================================================
-- Lebanon (LBN)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('LBN', 'Hummus', 'https://www.bbcgoodfood.com/recipes/hummus', 1),
('LBN', 'Falafel', 'https://www.bbcgoodfood.com/recipes/falafel-burgers', 2),
('LBN', 'Tabbouleh', 'https://www.bbcgoodfood.com/recipes/tabbouleh', 3),
('LBN', 'Kibbeh', 'https://www.allrecipes.com/recipe/257980/lebanese-kibbeh/', 4),
('LBN', 'Fattoush', 'https://www.bbcgoodfood.com/recipes/fattoush', 5),
('LBN', 'Shawarma', 'https://www.bbcgoodfood.com/recipes/chicken-shawarma', 6);

-- =============================================================================
-- Ethiopia (ETH)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('ETH', 'Injera', 'https://www.allrecipes.com/recipe/142545/ethiopian-injera/', 1),
('ETH', 'Doro Wat', 'https://www.allrecipes.com/recipe/235569/doro-wat/', 2),
('ETH', 'Kitfo', 'https://www.allrecipes.com/recipe/257981/ethiopian-kitfo/', 3),
('ETH', 'Shiro', 'https://www.allrecipes.com/recipe/257982/ethiopian-shiro/', 4),
('ETH', 'Tibs', 'https://www.allrecipes.com/recipe/257983/ethiopian-tibs/', 5),
('ETH', 'Misir Wat', 'https://www.allrecipes.com/recipe/257984/misir-wat/', 6);

-- =============================================================================
-- Brazil (BRA)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('BRA', 'Feijoada', 'https://www.allrecipes.com/recipe/70069/feijoada/', 1),
('BRA', 'Pão de Queijo', 'https://www.allrecipes.com/recipe/98554/brazilian-cheese-bread/', 2),
('BRA', 'Coxinha', 'https://www.allrecipes.com/recipe/257985/brazilian-coxinha/', 3),
('BRA', 'Moqueca', 'https://www.bbcgoodfood.com/recipes/moqueca', 4),
('BRA', 'Brigadeiro', 'https://www.allrecipes.com/recipe/24028/brigadeiro/', 5),
('BRA', 'Açaí Bowl', 'https://www.allrecipes.com/recipe/257986/acai-bowl/', 6);

-- =============================================================================
-- United Kingdom (GBR)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('GBR', 'Fish and Chips', 'https://www.bbcgoodfood.com/recipes/fish-chips', 1),
('GBR', 'Shepherd''s Pie', 'https://www.bbcgoodfood.com/recipes/shepherds-pie', 2),
('GBR', 'Full English', 'https://www.bbcgoodfood.com/recipes/full-english-breakfast', 3),
('GBR', 'Bangers and Mash', 'https://www.bbcgoodfood.com/recipes/bangers-mash', 4),
('GBR', 'Cornish Pasty', 'https://www.bbcgoodfood.com/recipes/cornish-pasties', 5),
('GBR', 'Sticky Toffee Pudding', 'https://www.bbcgoodfood.com/recipes/sticky-toffee-pudding', 6);

-- =============================================================================
-- United States (USA)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('USA', 'Burger', 'https://www.allrecipes.com/recipe/25473/the-perfect-basic-burger/', 1),
('USA', 'BBQ Ribs', 'https://www.allrecipes.com/recipe/56208/slow-cooker-baby-back-ribs/', 2),
('USA', 'Mac and Cheese', 'https://www.allrecipes.com/recipe/11679/homemade-mac-and-cheese/', 3),
('USA', 'Clam Chowder', 'https://www.allrecipes.com/recipe/13978/new-england-clam-chowder/', 4),
('USA', 'Apple Pie', 'https://www.allrecipes.com/recipe/12682/apple-pie-by-grandma-ople/', 5),
('USA', 'Fried Chicken', 'https://www.allrecipes.com/recipe/8805/crispy-fried-chicken/', 6);

-- =============================================================================
-- Australia (AUS)
-- =============================================================================
INSERT INTO popular_dishes (country_code, name, recipe_link, sort_order) VALUES
('AUS', 'Meat Pie', 'https://www.bbcgoodfood.com/recipes/australian-meat-pie', 1),
('AUS', 'Lamingtons', 'https://www.bbcgoodfood.com/recipes/lamingtons', 2),
('AUS', 'Vegemite Toast', 'https://www.allrecipes.com/recipe/257987/vegemite-toast/', 3),
('AUS', 'Barramundi', 'https://www.allrecipes.com/recipe/257988/grilled-barramundi/', 4),
('AUS', 'Pavlova', 'https://www.bbcgoodfood.com/recipes/pavlova', 5),
('AUS', 'Tim Tam Slam', 'https://www.allrecipes.com/recipe/257989/tim-tam-slam/', 6);

-- Initial approved catalogs. Change them through subsequent migrations.
insert into public.bracket_categories(id, name) values
  ('food-drink', 'Food & Drink'),
  ('movies-tv', 'Movies & TV'),
  ('sports', 'Sports'),
  ('video-games', 'Video Games'),
  ('tabletop-party', 'Tabletop & Party Games'),
  ('music', 'Music'),
  ('books-stories', 'Books & Stories'),
  ('pop-culture', 'Pop Culture'),
  ('nature-animals', 'Nature & Animals'),
  ('everything-else', 'Everything Else');

insert into public.trophy_catalog(id, name, category, asset_path) values
  ('crown', 'Crown of the aether', 'Fantasy', '/trophies/achievements/crown.png'),
  ('dragon', 'Dragonheart', 'Fantasy', '/trophies/achievements/dragon.png'),
  ('crystal', 'Heart of the rift', 'Fantasy', '/trophies/achievements/crystal.png'),
  ('spellbook', 'The astral codex', 'Fantasy', '/trophies/achievements/spellbook.png'),
  ('sword', 'Eclipse edge', 'Fantasy', '/trophies/achievements/sword.png'),
  ('reel', 'Silver-screen legend', 'Movies', '/trophies/achievements/reel.png'),
  ('clapper', 'Scene stealer', 'Movies', '/trophies/achievements/clapper.png'),
  ('popcorn', 'Premiere night', 'Movies', '/trophies/achievements/popcorn.png'),
  ('director', 'Blockbuster', 'Movies', '/trophies/achievements/director.png'),
  ('star', 'Beyond the frame', 'Movies', '/trophies/achievements/star.png'),
  ('donut', 'Glazed glory', 'Food', '/trophies/achievements/donut.png'),
  ('pizza', 'Slice supremacy', 'Food', '/trophies/achievements/pizza-no-leaves.png'),
  ('burger', 'Burger royalty', 'Food', '/trophies/achievements/burger.png'),
  ('cupcake', 'Sweet victory', 'Food', '/trophies/achievements/cupcake.png'),
  ('taco', 'Taco triumph', 'Food', '/trophies/achievements/taco.png'),
  ('lion', 'Savanna sovereign', 'Animals', '/trophies/achievements/lion.png'),
  ('fox', 'Woodland wanderer', 'Animals', '/trophies/achievements/fox.png'),
  ('owl', 'Forest oracle', 'Animals', '/trophies/achievements/owl.png'),
  ('wolf', 'Moonlit guardian', 'Animals', '/trophies/achievements/wolf.png'),
  ('shark', 'Ocean apex', 'Animals', '/trophies/achievements/shark.png');

-- Curated NextUp MVP catalog seed.
-- Re-runnable: media rows are keyed by external_source/external_id and streaming rows are rebuilt.

WITH seed_media AS (
  SELECT *
  FROM (VALUES
    ('tmdb','movie-155','The Dark Knight','movie','https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg','Batman faces the Joker, a criminal force pushing Gotham and its heroes into moral chaos.',2008,ARRAY['Action','Crime','Drama'],ARRAY['Superhero','Neo-noir'],ARRAY['Christian Bale','Heath Ledger','Aaron Eckhart'],ARRAY['Christopher Nolan'],9.0,4,4,'dark','tense',ARRAY['justice','chaos','sacrifice','corruption'],2,4,4,1,1,4,1,3,4,ARRAY['violence','threat']),
    ('tmdb','movie-27205','Inception','movie','https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg','A thief who steals secrets through dreams takes on a dangerous job planting an idea.',2010,ARRAY['Sci-Fi','Action','Thriller'],ARRAY['Mind-bending','Heist'],ARRAY['Leonardo DiCaprio','Joseph Gordon-Levitt','Elliot Page'],ARRAY['Christopher Nolan'],8.8,5,5,'cerebral','propulsive',ARRAY['dreams','memory','identity','grief'],4,5,4,1,1,4,1,4,3,ARRAY['violence']),
    ('tmdb','tv-1399','Game of Thrones','tv','https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg','Noble families fight for power while an ancient threat rises beyond the Wall.',2011,ARRAY['Fantasy','Drama','Adventure'],ARRAY['Epic','Political'],ARRAY['Emilia Clarke','Kit Harington','Peter Dinklage'],ARRAY['David Benioff','D. B. Weiss'],8.4,5,4,'grim','slow-burn',ARRAY['power','betrayal','family','war'],5,4,4,4,4,5,4,5,5,ARRAY['graphic violence','gore','sexual violence']),
    ('tmdb','tv-1396','Breaking Bad','tv','https://image.tmdb.org/t/p/w500/3xnWaLQjelJDDF7LT1WBo6f4BRe.jpg','A chemistry teacher turns to making meth and discovers how far ambition can corrode him.',2008,ARRAY['Crime','Drama','Thriller'],ARRAY['Antihero','Moral descent'],ARRAY['Bryan Cranston','Aaron Paul','Anna Gunn'],ARRAY['Vince Gilligan'],9.5,5,5,'dark','slow-burn',ARRAY['ambition','consequence','family','identity'],1,4,5,2,2,5,1,5,4,ARRAY['violence','drug use']),
    ('tmdb','tv-66732','Stranger Things','tv','https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg','Kids in a small town uncover supernatural danger, secret experiments, and another dimension.',2016,ARRAY['Sci-Fi','Horror','Drama'],ARRAY['Coming-of-age','Creature feature'],ARRAY['Millie Bobby Brown','Finn Wolfhard','David Harbour'],ARRAY['The Duffer Brothers'],8.6,3,3,'nostalgic','propulsive',ARRAY['friendship','mystery','monsters','family'],4,4,3,2,2,4,3,3,3,ARRAY['creature horror','threat']),
    ('tmdb','movie-603','The Matrix','movie','https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg','A hacker discovers reality is a simulation and joins a rebellion against its controllers.',1999,ARRAY['Sci-Fi','Action'],ARRAY['Cyberpunk','Philosophical'],ARRAY['Keanu Reeves','Laurence Fishburne','Carrie-Anne Moss'],ARRAY['Lana Wachowski','Lilly Wachowski'],8.7,4,5,'cool','propulsive',ARRAY['identity','control','awakening','rebellion'],5,4,3,1,1,3,1,3,3,ARRAY['violence']),
    ('tmdb','movie-157336','Interstellar','movie','https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg','A pilot travels through a wormhole to find humanity a future among the stars.',2014,ARRAY['Sci-Fi','Drama','Adventure'],ARRAY['Space epic','Emotional'],ARRAY['Matthew McConaughey','Anne Hathaway','Jessica Chastain'],ARRAY['Christopher Nolan'],8.7,5,5,'awe-filled','slow-burn',ARRAY['parenthood','time','survival','sacrifice'],5,4,5,1,1,4,1,2,2,ARRAY['peril']),
    ('tmdb','movie-550','Fight Club','movie','https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg','An alienated office worker and a charismatic stranger form an underground fight club.',1999,ARRAY['Drama','Thriller'],ARRAY['Psychological','Satirical'],ARRAY['Edward Norton','Brad Pitt','Helena Bonham Carter'],ARRAY['David Fincher'],8.8,5,5,'abrasive','tense',ARRAY['identity','consumerism','masculinity','chaos'],1,5,3,2,2,4,1,5,4,ARRAY['violence','self-harm themes']),
    ('tmdb','movie-680','Pulp Fiction','movie','https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg','Intersecting crime stories unfold with dark humour, violence, and unforgettable dialogue.',1994,ARRAY['Crime','Drama'],ARRAY['Nonlinear','Cult'],ARRAY['John Travolta','Uma Thurman','Samuel L. Jackson'],ARRAY['Quentin Tarantino'],8.9,4,4,'stylish','talky',ARRAY['crime','fate','loyalty','redemption'],1,2,3,3,2,4,1,3,4,ARRAY['violence','drug use']),
    ('tmdb','movie-238','The Godfather','movie','https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg','The aging patriarch of a crime dynasty transfers control to his reluctant son.',1972,ARRAY['Crime','Drama'],ARRAY['Mafia','Family saga'],ARRAY['Marlon Brando','Al Pacino','James Caan'],ARRAY['Francis Ford Coppola'],9.2,4,5,'measured','slow-burn',ARRAY['family','power','loyalty','corruption'],1,2,5,1,1,4,1,2,4,ARRAY['violence']),
    ('tmdb','movie-13','Forrest Gump','movie','https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg','A kind man finds himself woven through decades of American history.',1994,ARRAY['Drama','Romance'],ARRAY['Heartwarming','Historical'],ARRAY['Tom Hanks','Robin Wright','Gary Sinise'],ARRAY['Robert Zemeckis'],8.8,2,3,'warm','easy',ARRAY['love','resilience','history','friendship'],1,1,5,1,1,2,1,1,2,ARRAY['war scenes']),
    ('tmdb','movie-496243','Parasite','movie','https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg','A poor family infiltrates a wealthy household, triggering a sharp and shocking class thriller.',2019,ARRAY['Thriller','Drama','Comedy'],ARRAY['Social satire','Class thriller'],ARRAY['Song Kang-ho','Cho Yeo-jeong','Choi Woo-shik'],ARRAY['Bong Joon Ho'],8.5,5,5,'uneasy','tense',ARRAY['class','deception','family','inequality'],1,4,4,2,2,5,1,5,4,ARRAY['violence','blood']),
    ('tmdb','tv-42009','Black Mirror','tv','https://image.tmdb.org/t/p/w500/7PRddO7z7mcPi21nZTCMGShAyy1.jpg','Anthology stories explore the dark edges of technology, society, and human appetite.',2011,ARRAY['Sci-Fi','Drama','Thriller'],ARRAY['Anthology','Dystopian'],ARRAY['Daniel Lapaine','Hannah John-Kamen','Michaela Coel'],ARRAY['Charlie Brooker'],8.3,5,5,'bleak','varied',ARRAY['technology','identity','control','morality'],3,4,3,2,2,5,3,5,3,ARRAY['disturbing themes']),
    ('tmdb','tv-2316','The Office','tv','https://image.tmdb.org/t/p/w500/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg','A mockumentary following the awkward daily lives of employees at a paper company.',2005,ARRAY['Comedy'],ARRAY['Workplace','Mockumentary'],ARRAY['Steve Carell','Rainn Wilson','Jenna Fischer'],ARRAY['Greg Daniels'],9.0,1,2,'comforting','easy',ARRAY['workplace','friendship','awkwardness','romance'],1,1,2,1,1,1,1,1,1,ARRAY[]::text[]),
    ('tmdb','tv-60625','Rick and Morty','tv','https://image.tmdb.org/t/p/w500/cvhNj9eoRBe5SxjCbQTkh05UP5K.jpg','A cynical scientist drags his grandson through chaotic, reality-bending adventures.',2013,ARRAY['Animation','Sci-Fi','Comedy'],ARRAY['Adult animation','Multiverse'],ARRAY['Justin Roiland','Chris Parnell','Spencer Grammer'],ARRAY['Dan Harmon','Justin Roiland'],9.1,4,4,'irreverent','fast',ARRAY['nihilism','family','multiverse','absurdity'],5,4,2,2,2,3,2,4,3,ARRAY['crude humour','animated violence']),
    ('tmdb','movie-24428','The Avengers','movie','https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg','Earth’s mightiest heroes assemble to stop an alien invasion.',2012,ARRAY['Action','Sci-Fi','Adventure'],ARRAY['Superhero','Team-up'],ARRAY['Robert Downey Jr.','Chris Evans','Scarlett Johansson'],ARRAY['Joss Whedon'],8.0,2,3,'fun','propulsive',ARRAY['teamwork','heroism','found family','spectacle'],3,2,2,1,1,3,1,1,3,ARRAY['fantasy violence']),
    ('tmdb','movie-497','The Green Mile','movie','https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg','A death row guard encounters a gentle prisoner with a miraculous gift.',1999,ARRAY['Drama','Fantasy','Crime'],ARRAY['Prison drama','Spiritual'],ARRAY['Tom Hanks','Michael Clarke Duncan','David Morse'],ARRAY['Frank Darabont'],8.6,3,4,'emotional','measured',ARRAY['compassion','justice','faith','suffering'],1,2,5,2,2,3,1,1,3,ARRAY['execution','violence']),
    ('tmdb','tv-76479','The Boys','tv','https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg','A group of vigilantes fights corrupt celebrity superheroes backed by corporate power.',2019,ARRAY['Action','Drama','Sci-Fi'],ARRAY['Dark superhero','Satire'],ARRAY['Karl Urban','Jack Quaid','Antony Starr'],ARRAY['Eric Kripke'],8.7,4,4,'cynical','propulsive',ARRAY['corruption','power','revenge','celebrity'],2,3,3,5,5,5,3,4,5,ARRAY['graphic violence','gore','sexual content']),
    ('tmdb','movie-120','The Lord of the Rings: The Fellowship of the Ring','movie','https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg','A hobbit begins a perilous journey to destroy a ring that could doom Middle-earth.',2001,ARRAY['Fantasy','Adventure','Drama'],ARRAY['Epic','Quest'],ARRAY['Elijah Wood','Ian McKellen','Viggo Mortensen'],ARRAY['Peter Jackson'],8.9,4,4,'mythic','measured',ARRAY['friendship','sacrifice','good versus evil','journey'],5,4,4,1,1,3,2,2,3,ARRAY['battle violence']),
    ('tmdb','movie-637','Life Is Beautiful','movie','https://image.tmdb.org/t/p/w500/74hLDKjD5aGYOotO6esUVaeISa2.jpg','A father uses imagination and humour to shield his son from the horror of a concentration camp.',1997,ARRAY['Drama','Comedy','War'],ARRAY['Bittersweet','Historical'],ARRAY['Roberto Benigni','Nicoletta Braschi','Giorgio Cantarini'],ARRAY['Roberto Benigni'],8.6,3,4,'bittersweet','measured',ARRAY['parenthood','hope','war','resilience'],1,2,5,1,1,3,1,1,2,ARRAY['holocaust themes','war'])
  ) AS v(external_source, external_id, title, type, poster_url, description, release_year, genres, sub_genres, cast_members, directors, rating, complexity_level, smart_level, tone, pacing, themes, world_building_level, mystery_level, emotional_depth_level, gore_level, gruesome_visuals_level, suspense_level, horror_level, twisted_plot_level, violence_level, content_warnings)
),
upserted AS (
  INSERT INTO public.media_titles (
    external_source, external_id, title, type, poster_url, description, release_year,
    genres, sub_genres, cast_members, directors, rating, complexity_level, smart_level,
    tone, pacing, themes, world_building_level, mystery_level, emotional_depth_level,
    gore_level, gruesome_visuals_level, suspense_level, horror_level, twisted_plot_level,
    violence_level, content_warnings
  )
  SELECT * FROM seed_media
  ON CONFLICT (external_source, external_id) DO UPDATE SET
    title = excluded.title,
    type = excluded.type,
    poster_url = excluded.poster_url,
    description = excluded.description,
    release_year = excluded.release_year,
    genres = excluded.genres,
    sub_genres = excluded.sub_genres,
    cast_members = excluded.cast_members,
    directors = excluded.directors,
    rating = excluded.rating,
    complexity_level = excluded.complexity_level,
    smart_level = excluded.smart_level,
    tone = excluded.tone,
    pacing = excluded.pacing,
    themes = excluded.themes,
    world_building_level = excluded.world_building_level,
    mystery_level = excluded.mystery_level,
    emotional_depth_level = excluded.emotional_depth_level,
    gore_level = excluded.gore_level,
    gruesome_visuals_level = excluded.gruesome_visuals_level,
    suspense_level = excluded.suspense_level,
    horror_level = excluded.horror_level,
    twisted_plot_level = excluded.twisted_plot_level,
    violence_level = excluded.violence_level,
    content_warnings = excluded.content_warnings,
    updated_at = now()
  RETURNING id, external_id
),
providers AS (
  SELECT u.id, p.provider_name, p.availability_type, p.watch_url
  FROM upserted u
  CROSS JOIN LATERAL (
    VALUES
      ('Netflix','subscription','https://www.netflix.com/search?q=' || replace(u.external_id, 'movie-', '')),
      ('Prime Video','rent','https://www.primevideo.com/search/ref=atv_nb_sr?phrase=' || u.external_id),
      ('Apple TV','buy','https://tv.apple.com/gb/search?term=' || u.external_id)
  ) AS p(provider_name, availability_type, watch_url)
)
DELETE FROM public.streaming_availability
WHERE media_title_id IN (SELECT id FROM upserted)
  AND region = 'GB';

WITH seeded AS (
  SELECT id, title
  FROM public.media_titles
  WHERE external_source = 'tmdb'
    AND external_id IN (
      'movie-155','movie-27205','tv-1399','tv-1396','tv-66732','movie-603','movie-157336',
      'movie-550','movie-680','movie-238','movie-13','movie-496243','tv-42009','tv-2316',
      'tv-60625','movie-24428','movie-497','tv-76479','movie-120','movie-637'
    )
)
INSERT INTO public.streaming_availability (media_title_id, provider_name, availability_type, region, watch_url)
SELECT id, provider_name, availability_type, 'GB', watch_url
FROM seeded
CROSS JOIN LATERAL (
  VALUES
    ('Netflix','subscription','https://www.netflix.com/search?q=' || replace(title, ' ', '%20')),
    ('Prime Video','rent','https://www.primevideo.com/search/ref=atv_nb_sr?phrase=' || replace(title, ' ', '+')),
    ('Apple TV','buy','https://tv.apple.com/gb/search?term=' || replace(title, ' ', '%20'))
) AS p(provider_name, availability_type, watch_url);

-- Lets admin mark a mandapam as "featured" (e.g. a milestone anniversary
-- year) — gets a glowing/pulsing highlight on the map pin and a badge on
-- its card. milestone_text is the badge's own text (e.g. "114th Year"),
-- kept separate from the boolean so admin can turn the highlight off
-- without losing what was typed.
alter table pandals add column featured boolean not null default false;
alter table pandals add column milestone_text text;

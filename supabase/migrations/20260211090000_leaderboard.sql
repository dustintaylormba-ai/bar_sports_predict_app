-- Leaderboard RPCs

create or replace function public.get_game_night_leaderboard(p_game_night_id uuid)
returns table(
  patron_id uuid,
  nickname text,
  total_points bigint
)
language sql
stable
as $$
  select
    p.id as patron_id,
    p.nickname,
    coalesce(sum(ps.points), 0)::bigint as total_points
  from public.patrons p
  left join public.prompt_scores ps
    on ps.patron_id = p.id
   and ps.game_night_id = p_game_night_id
  where p.game_night_id = p_game_night_id
  group by p.id, p.nickname
  order by total_points desc, lower(p.nickname) asc;
$$;

revoke all on function public.get_game_night_leaderboard(uuid) from public;
grant execute on function public.get_game_night_leaderboard(uuid) to anon, authenticated;

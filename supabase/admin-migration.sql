-- Admin: get all user stats for admin panel
-- Returns user subscription info + article counts
CREATE OR REPLACE FUNCTION get_all_user_stats()
RETURNS TABLE (
  user_id uuid,
  email text,
  total_articles bigint,
  articles_this_period bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    s.user_id,
    COALESCE(u.email, s.user_id::text) as email,
    COALESCE(a_total.cnt, 0) as total_articles,
    COALESCE(a_period.cnt, 0) as articles_this_period
  FROM subscriptions s
  LEFT JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint as cnt
    FROM articles
    WHERE articles.user_id = s.user_id
  ) a_total ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint as cnt
    FROM articles
    WHERE articles.user_id = s.user_id
      AND articles.created_at >= s.current_period_start
      AND articles.created_at < s.current_period_end
  ) a_period ON true
  ORDER BY s.created_at DESC;
$$;

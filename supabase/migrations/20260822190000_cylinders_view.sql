-- Function to resolve the active life rule for a cylinder
create or replace function fn_cylinder_life_limit(p_cylinder_id uuid)
returns bigint language plpgsql stable as $$
declare
  v_cyl cylinders%rowtype;
  v_limit bigint;
begin
  select * into v_cyl from cylinders where id = p_cylinder_id;
  
  if v_cyl.life_limit_override is not null then
    return v_cyl.life_limit_override;
  end if;

  -- 1. Try customer specific rule
  select limit_meters into v_limit
  from cylinder_life_rules
  where customer_id = v_cyl.owned_by_customer_id
    and (screen_lpi_min is null or v_cyl.screen_lpi >= screen_lpi_min)
    and (screen_lpi_max is null or v_cyl.screen_lpi <= screen_lpi_max)
  order by priority asc limit 1;

  if v_limit is not null then
    return v_limit;
  end if;

  -- 2. Try generic rule
  select limit_meters into v_limit
  from cylinder_life_rules
  where customer_id is null
    and (screen_lpi_min is null or v_cyl.screen_lpi >= screen_lpi_min)
    and (screen_lpi_max is null or v_cyl.screen_lpi <= screen_lpi_max)
  order by priority asc limit 1;

  if v_limit is not null then
    return v_limit;
  end if;

  -- Fallback if no rules match
  return 1000000;
end;
$$;

-- View to compute current wear. In Phase 4, this will be updated to include run meters.
create or replace view v_cylinder_ledger as
select 
  c.*,
  fn_cylinder_life_limit(c.id) as life_limit,
  (c.opening_meters) as current_meters, -- Will add run meters in Phase 4
  case 
    when fn_cylinder_life_limit(c.id) = 0 then 0
    else (c.opening_meters::numeric / fn_cylinder_life_limit(c.id)) * 100 
  end as wear_percentage
from cylinders c;

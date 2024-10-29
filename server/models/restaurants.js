const pool = require("../pool");

exports.add_restaurants = async (ids) => {
  try {
    const response = await pool.query(
      `insert into restaurants (place_id) 
      select place_id from unnest($1::text[]) as place_id on conflict do nothing returning *`,
      [ids]
    );
    console.log(response.rows);
    return response.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_restaurants_by_place_ids = async (place_ids) => {
  try {
    let rows = [];
    let count = 15;
    while (rows.length != place_ids.length && count > 0) {
      console.log("try fetching ids: ", count);
      const result = await pool.query(
        `select * from restaurants where place_id = any ($1::text[])`,
        [place_ids]
      );
      rows = result.rows;
      count -= 1;
    }
    return rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurants_exist = async (meal_id) => {
  try {
    let result = await pool.query(
      `select 1 from meal_restaurants where meal_id = $1 limit 1`,
      [meal_id]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.all_member_restaurants_exist = async (meal_id) => {
  try {
    let result = await pool.query(
      `
      select 
      count(distinct mem_r.mem_res_id) = count(distinct me_r.meal_res_id) * mem.member_count
      as valid
      from (select meal_res_id from meal_restaurants where meal_id = $1) as me_r
join member_restaurants as mem_r on mem_r.meal_res_id = me_r.meal_res_id 
cross join(select count(member_id) as member_count from meal_members where meal_id = $1) as mem
group by member_count;`,
      [meal_id]
    );

    return result.rows[0].valid;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.upsert_meal_restaurants = async (json_data) => {
  try {
    let result = await pool.query(
      `insert into meal_restaurants (meal_id, res_id, is_open, in_budget)
      select * from json_populate_recordset(null::mealResData, $1)
        on conflict(meal_id, res_id)
        do update set
        in_budget = excluded.in_budget,
        is_open = excluded.is_open`,
      [JSON.stringify(json_data)]
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.delete_meal_restaurants = async (meal_id, res_ids) => {
  try {
    let result = await pool.query(
      `delete from meal_restaurants where meal_id = $1 and res_id = any ($2::int[])`,
      [meal_id, res_ids]
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
exports.pare_old_meal_restaurants = async (meal_id, res_ids) => {
  try {
    let result = await pool.query(
      `delete from meal_restaurants where meal_id = $1 and not (res_id = any ($2::int[]))`,
      [meal_id, res_ids]
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_restaurant_create = async (data) => {
  let { meal_id, place_id, user_id, approved } = data;
  try {
    const result = await pool.query(
      `insert into member_restaurants
    (place_id, meal_id, user_id, approved)
    values($1,$2,$3,$4) returning place_id`,
      [place_id, meal_id, user_id, approved]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

/*
 * params: member_id: int,
 * google_data_string: stringified array of objects:
 * [{res_id: int, rating: numeric, tags: string[]}]
 *
 */
exports.create_member_restaurants = async (
  member_id,
  google_data_string,
  meal_id
) => {
  try {
    const result = await pool.query(
      `insert into member_restaurants (member_id, meal_res_id, score, hidden_from_user) select data.member_id,
      data.meal_res_id,
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
      (data.all_bad_tags or data.bad_rating) as hidden_from_user from(select
          pref.member_id,
          r.res_id,
          count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count,
          (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags,
          r.rating < avg(pref.min_rating) as bad_rating,
          in_budget,
          is_open,
          meal_restaurants.meal_res_id,
          pref.min_rating,
          pref.bad_tags
          from (
 select member_id, 
              min_rating, 
              t.tag,
              bad_tags from meal_members
left join lateral unnest(bad_tags) as t(tag) on true
              where member_id = $1) as pref
cross join meal_restaurants
join (select * from json_populate_recordset(null::resMemberData,$2)) 
    as r on meal_restaurants.res_id = r.res_id
    where meal_restaurants.meal_id = $3
    group by pref.member_id, 
    r.res_id, r.rating, 
    r.tags,pref.bad_tags, 
    meal_restaurants.in_budget, 
    meal_restaurants.is_open, 
   pref.min_rating,
    pref.bad_tags,
    meal_restaurants.meal_res_id) as data
      on conflict(member_id, meal_res_id) do update set score = excluded.score, hidden_from_user = excluded.hidden_from_user`,
      [member_id, google_data_string, meal_id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.update_member_restaurants = async (
  member_id,
  google_data_string,
  meal_id
) => {
  console.log(member_id, google_data_string);
  try {
    const result = await pool.query(
      `update member_restaurants set score = newScores.score, hidden_from_user = newScores.hidden_from_user from(
        select data.member_id,
      data.meal_res_id,
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
      (data.all_bad_tags or data.bad_rating) as hidden_from_user from(select
          pref.member_id,
          r.res_id,
          count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count,
          (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags,
          r.rating < avg(pref.min_rating) as bad_rating,
          in_budget,
          is_open,
          meal_restaurants.meal_res_id,
          pref.min_rating,
          pref.bad_tags
          from (
 select member_id, 
              min_rating, 
              t.tag,
              bad_tags from meal_members
left join lateral unnest(bad_tags) as t(tag) on true
              where member_id = $1) as pref
cross join meal_restaurants
join (select * from json_populate_recordset(null::resMemberData,$2)) 
    as r on meal_restaurants.res_id = r.res_id
    where meal_restaurants.meal_id = $3
    group by pref.member_id, 
    r.res_id, r.rating, 
    r.tags,pref.bad_tags, 
    meal_restaurants.in_budget, 
    meal_restaurants.is_open, 
   pref.min_rating,
    pref.bad_tags,
    meal_restaurants.meal_res_id) as data) as newScores 
          where member_restaurants.member_id = newScores.member_id 
          and member_restaurants.meal_res_id = newScores.meal_res_id 
          returning member_restaurants.*`,
      [member_id, google_data_string, meal_id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.update_google_restaurants = async (mealId, google_data) => {
  try {
    console.log(google_data);
    // add all new restaurants
    let response = await pool.query(
      `insert into member_restaurants (meal_res_id, member_id, score, hidden_from_user) 
      select meal_res_id, member_id, 
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
      (data.all_bad_tags or data.bad_rating) as hidden_from_user
      from (select meal_res_id, 
      member_id,
      is_open,
      in_budget, 
      r.rating < avg(members.min_rating) as bad_rating, 
      count(case when members.tag = any(r.tags::text[]) then 1 end) as bad_count,
      (array_length(r.tags::text[],1) is not null and (members.bad_tags::text[]) @> (r.tags::text[])) as all_bad_tags
      from json_populate_recordset(null::resMemberData, $2) as r 
      join (select * from meal_restaurants where meal_id =$1) 
      as this_meal_restaurants 
      on r.res_id = this_meal_restaurants.res_id 
      cross join(
             select distinct member_restaurants.member_id, 
             t.tag,
             meal_members.min_rating, meal_members.bad_tags from member_restaurants
             join meal_members on member_restaurants.member_id = meal_members.member_id 
             left join lateral unnest(meal_members.bad_tags) as t(tag) on true
             where meal_members.meal_id = $1) as members
      group by 
      member_id, 
      meal_res_id, 
      r.tags, 
      r.rating, 
      is_open, 
      in_budget, 
      members.bad_tags)as data
             on conflict(meal_res_id, member_id) do update set score = excluded.score, hidden_from_user=excluded.hidden_from_user`,
      [mealId, JSON.stringify(google_data)]
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// exports.update_all_member_scores = async (mealId, google_data_string) => {
//   try {
//     const result = await pool.query(
//       `update member_restaurants set score = newScores.score, hidden_from_user= newScores.hidden_from_user from(select member_id,
//       data.place_id,
//       (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
//       (data.all_bad_tags or data.bad_rating) as hidden_from_user  from(select pref.member_id,
//           r.place_id,
//           count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count,
//           (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags,
//           r.rating < avg(pref.min_rating) as bad_rating
//           from member_restaurants join (${google_data_string})
//           as r(place_id, rating, tags) on r.place_id = member_restaurants.place_id
//           join (select member_id,
//               meal_id,
//               min_rating,
//               t.tag,
//               bad_tags from meal_members
// left join lateral unnest(bad_tags) as t(tag) on true) as pref on pref.member_id = member_restaurants.member_id
//           where pref.meal_id = $1 group by pref.member_id, r.place_id, r.tags, pref.bad_tags, r.rating) as data) as newScores
// api-> where member_restaurants.member_id = newScores.member_id and member_restaurants.place_id = newScores.place_id;`,
//       [mealId]
//     );

//     return;
//   } catch (err) {
//     console.log(err);
//     throw err;
//   }
// };

exports.get_member_restaurants = async (mealId, memberId) => {
  try {
    let result = await pool.query(
      `select * from (select res_id,
      count(case when member_restaurants.member_id is not null and (approved = 1 or approved * -1 > meals.round) then 1 end) = 0 as unseen,
      mul(case when score is not null
            then(case when approved = 1 then 1
                      when approved * -1 > meals.round then score * (power(10,approved*-1)::numeric) else score end)
                      else 2 end) as total_score,
      count(case when approved * -1 > meals.round then 1 end) > 0 as disliked,
      count(case when vetoed = 't' then 1 end) > 0 as vetoed,
      sum(case when member_restaurants.member_id = $1 then approved else 0 end) as approved_by_user,
      sum(case when meal_members.member_id = $1 then (case when score is not null then score::real else 2 end) else 0 end) as user_raw_score,
      count(case when member_restaurants.member_id = $1 and member_restaurants.hidden_from_user = 't' then 1 end) > 0 as hidden_from_user,
      is_open,
      in_budget
      from meal_restaurants
      join meal_members on meal_restaurants.meal_id = meal_members.meal_id
      left join member_restaurants
      on member_restaurants.meal_res_id = meal_restaurants.meal_res_id and
      member_restaurants.member_id = meal_members.member_id
      join meals on meals.meal_id = meal_restaurants.meal_id
      where meals.meal_id = $2
      group by res_id, is_open, in_budget) as data
      order by disliked, unseen, case when data.unseen then data.user_raw_score 
      when not data.unseen then data.total_score end, case when data.unseen 
      then data.total_score when not data.unseen then data.user_raw_score end
      `,

      [memberId, mealId]
    );
    // console.log(result.rows);
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_member_restaurant_dislikes = async (memberId) => {
  try {
    let result = await pool.query(
      `select 
      res_id,
      meal_res_id,
      mul(case when score is not null
                  then(case 
                      when approved = 1 then 1
                      when approved = -1 then score * (power(10,approved*-1)::numeric) 
                      else score end)
                  else 2 end) as total_score,
      sum(case when member_id = $1 
          then (case when score is not null 
                then score::real else 2 end) 
          else 0 end) as user_raw_score
      from (select res_id, 
            me_r.meal_res_id, 
            score, 
            approved, 
            mm.member_id, 
            count(vetoed = 't') over (partition by res_id, me_r.meal_res_id) as total_vetoed
            from (select meal_id, meal_res_id, res_id from meal_restaurants where is_open and in_budget) as me_r
            join meal_members as mm on me_r.meal_id = mm.meal_id
            left join member_restaurants as mem_r on mem_r.meal_res_id = me_r.meal_res_id and
            mm.member_id = mem_r.member_id
            join (select meal_res_id 
                  from member_restaurants 
                  where member_id = $1 and approved= -1) as disliked_ids
            on disliked_ids.meal_res_id = me_r.meal_res_id) as data
      where total_vetoed = 0
      group by res_id, meal_res_id
      order by total_score, user_raw_score limit 5`,
      [memberId]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.restaurants_set_ranks = async (member_id, meal_id, rankArray) => {
  try {
    console.log(rankArray, meal_id, member_id);
    const result = await pool.query(
      `update member_restaurants 
      set rank = newData.rank 
      from (select 
            $2-ordinal as rank, 
            meal_res_id 
            from unnest($1::int[]) with ordinality as data(res_id, ordinal)
            join (select res_id, 
                  meal_res_id 
                  from meal_restaurants 
                  where meal_id = $3) as me_r 
            on me_r.res_id = data.res_id) as newData
      where member_restaurants.member_id = $4 
      and member_restaurants.meal_res_id = newData.meal_res_id
      returning member_restaurants.meal_res_id;`,
      [rankArray, rankArray.length + 1, meal_id, member_id]
    );
    const deleteResult = await pool.query(
      `update member_restaurants 
      set rank = null 
            where member_id = $2 
            and rank is not null and not exists(select  
            1
            from unnest($1::int[]) as data(meal_res_id)
            where data.meal_res_id = member_restaurants.meal_res_id)`,
      [result.rows.map((item) => item.meal_res_id), member_id]
    );
    console.log(result.rows);
    console.log(result.rows.map((item) => item.meal_res_id));
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.restaurants_get_rank_count = async () => {
  try {
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_restaurant_by_ids = async (member_id, res_id) => {
  try {
    const result = await pool.query(
      `select mem_res_id from member_restaurants 
      join meal_restaurants 
      on member_restaurants.meal_res_id = meal_restaurants.meal_res_id
    where member_id = $1 and res_id = $2`,
      [member_id, res_id]
    );
    // console.log(result.rows);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.member_restaurants_get_by_user = async (memberId) => {
  try {
    const result = await pool.query(
      `select place_id, approved from member_restaurants where member_id=$1`,
      [memberId]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurant_delete = async (memberId, place_id) => {
  try {
    await pool.query(
      `delete from member_restaurants
    where member_id = $1 and place_id = $3`,
      [memberId, place_id]
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.clear_member_restaurants = async (mealId) => {
  try {
    await pool.query(`delete from meal_restaurants where meal_id = $1`, [
      mealId,
    ]);
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurant_like = async (member_id, res_id) => {
  try {
    const result = await pool.query(
      `update member_restaurants set
    approved= 1 from (select mem_res_id from member_restaurants 
      join meal_restaurants on meal_restaurants.meal_res_id = member_restaurants.meal_res_id 
      join meals on meal_restaurants.meal_id = meals.meal_id where member_id = $1 and res_id = $2) as oldData
      where member_restaurants.mem_res_id = oldData.mem_res_id returning approved`,
      [member_id, res_id]
    );
    // console.log(result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurant_dislike = async (member_id, res_id) => {
  try {
    const result = await pool.query(
      `update member_restaurants 
      set approved = -1 from(
      select mem_res_id from member_restaurants 
      join meal_restaurants on meal_restaurants.meal_res_id = member_restaurants.meal_res_id 
      where member_id = $1 and res_id = $2) as oldData
      where member_restaurants.mem_res_id = oldData.mem_res_id returning approved
      `,
      [member_id, res_id]
    );

    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

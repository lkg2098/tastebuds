const pool = require("../pool");

exports.add_restaurants = async (ids) => {
  try {
    const response = await pool.query(
      `insert into restaurants (place_id) 
      select place_id from unnest($1::text[]) as place_id on conflict do nothing returning *`,
      [ids]
    );
    return response.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurant_create = async (data) => {
  let { meal_id, place_id, user_id, approved } = data;
  try {
    const result = await pool.query(
      `insert into meal_restaurants
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

exports.create_member_restaurants = async (member_id, google_data_string) => {
  try {
    const result = await pool.query(
      `insert into meal_restaurants(member_id, place_id, score, hidden) select data.member_id, 
data.place_id, 
(2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score, 
(data.all_bad_tags or data.bad_rating) as hidden from(select 
    pref.member_id, 
    r.place_id, 
    count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count, 
    (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags, 
    r.rating < avg(pref.min_rating) as bad_rating 
    from (select member_id, 
              min_rating, 
              t.tag,
              bad_tags from meal_members
left join lateral unnest(bad_tags) as t(tag) on true
              where member_id = $1) as pref
cross join (${google_data_string}) 
    as r(place_id, rating, tags) 
    group by pref.member_id, r.place_id, r.rating, r.tags,pref.bad_tags) as data returning *;`,
      [member_id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.update_member_restaurants = async (member_id, google_data_string) => {
  console.log(member_id);
  try {
    const result = await pool.query(
      `update meal_restaurants set score = newScores.score, hidden = newScores.hidden from(
        select member_id, 
      data.place_id, 
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score, 
      (data.all_bad_tags or data.bad_rating) as hidden 
      from(select 
          pref.member_id, 
          r.place_id, 
          count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count, 
          (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags, 
          r.rating < avg(pref.min_rating) as bad_rating 
          from (select member_id, 
              min_rating, 
              t.tag,
              bad_tags from meal_members
left join lateral unnest(bad_tags) as t(tag) on true
              where member_id = $1) as pref
      cross join (${google_data_string}) 
          as r(place_id, rating, tags) 
          group by pref.member_id, r.place_id, r.rating, r.tags,pref.bad_tags) as data) as newScores 
          where meal_restaurants.member_id = newScores.member_id 
          and meal_restaurants.place_id = newScores.place_id 
          returning meal_restaurants.*`,
      [member_id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.update_google_restaurants = async (mealId, google_data_string) => {
  try {
    // add all new restaurants
    // console.log(google_data_string);
    let response = await pool.query(
      `insert into meal_restaurants (place_id, member_id) select * 
      from (select place_id, member_id from (${google_data_string}) as r(place_id, rating, tags) cross join(
             select distinct meal_restaurants.member_id from meal_restaurants
             join meal_members on meal_restaurants.member_id = meal_members.member_id where meal_members.meal_id = $1) as ids) as data
             where not exists ( select 1 from meal_restaurants where meal_restaurants.member_id = data.member_id and meal_restaurants.place_id = data.place_id)`,
      [mealId]
    );

    //delete all restaurants not in list
    let deleteResponse = await pool.query(
      `delete from meal_restaurants
      where place_id not in (select place_id from (${google_data_string})
      as r(place_id, rating, tags))
      and member_id in (select member_id from meal_members where meal_id = $1)`,
      [mealId]
    );

    let check = await pool.query(
      `select meal_restaurants.* from meal_restaurants where member_id = 2752`,
      []
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.update_all_member_scores = async (mealId, google_data_string) => {
  try {
    const result = await pool.query(
      `update meal_restaurants set score = newScores.score, hidden= newScores.hidden from(select member_id, 
      data.place_id, 
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score, 
      (data.all_bad_tags or data.bad_rating) as hidden  from(select pref.member_id, 
          r.place_id, 
          count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count, 
          (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags, 
          r.rating < avg(pref.min_rating) as bad_rating  
          from meal_restaurants join (${google_data_string}) 
          as r(place_id, rating, tags) on r.place_id = meal_restaurants.place_id 
          join (select member_id,
              meal_id, 
              min_rating, 
              t.tag,
              bad_tags from meal_members
left join lateral unnest(bad_tags) as t(tag) on true) as pref on pref.member_id = meal_restaurants.member_id
          where pref.meal_id = $1 group by pref.member_id, r.place_id, r.tags, pref.bad_tags, r.rating) as data) as newScores
api-> where meal_restaurants.member_id = newScores.member_id and meal_restaurants.place_id = newScores.place_id;`,
      [mealId]
    );

    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurants_get = async (mealId, memberCount) => {
  try {
    const result = await pool.query(
      `select counts.place_id as place_id,
  counts.dislikes,
  power(2, responses_needed) * power(10,counts.dislikes) as score,
  counts.responses_needed from 
  (select place_id,
    count(case when approved < 0 then 1 end) as dislikes,
    $1 - count(distinct user_id) as responses_needed
    from meal_restaurants
    where meal_id = $2
    group by place_id) as counts
    order by responses_needed = 0, score`,
      [memberCount, mealId]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_meal_restaurants = async (mealId, memberId, google_ids) => {
  try {
    //       sum(case when meal_members.member_id = $1 then (case when score is not null then score::real else 2 end) else 0 end) as user_raw_score

    let result = await pool.query(
      `select * from (select google_ids.place_id,
      count(case when meal_restaurants.member_id is not null and meal_restaurants.approved != 0 then 1 end) = 0 as unseen,
      mul(case when score is not null
            then(case when approved = 0 then score
                      when approved < 0 then score * (power(10,approved*-1)::numeric) else 1 end)
                      else 2 end) as total_score,
      count(case when approved < 0 then 1 end) > 0 as disliked,
      count(case when vetoed = 't' then 1 end) > 0 as vetoed,
      sum(case when meal_restaurants.member_id = $1 then approved else 0 end) as approved_by_user,
      sum(case when meal_members.member_id = $1 then (case when score is not null then score::real else 2 end) else 0 end) as user_raw_score,
      count(case when meal_restaurants.member_id = $1 and meal_restaurants.hidden = 't' then 1 end) > 0 as hidden
      from unnest($2::text[]) as google_ids(place_id)
      cross join meal_members
      left join meal_restaurants
      on meal_restaurants.place_id = google_ids.place_id and
      meal_restaurants.member_id = meal_members.member_id
      join meals on meals.meal_id = meal_members.meal_id
      where meals.meal_id = $3
      group by google_ids.place_id) as data
      order by disliked, unseen, case when data.unseen then data.user_raw_score when not data.unseen then data.total_score end, case when data.unseen then data.total_score when not data.unseen then data.user_raw_score end
      `,

      [memberId, google_ids, mealId]
    );
    // console.log(result.rows);
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_restaurant_by_ids = async (memberId, placeId) => {
  console.log(memberId, placeId);
  try {
    const result = await pool.query(
      `select * from meal_restaurants
    where member_id = $1 and place_id = $2`,
      [memberId, placeId]
    );
    // console.log(result.rows);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurants_get_by_user = async (memberId) => {
  try {
    const result = await pool.query(
      `select place_id, approved from meal_restaurants where member_id=$1`,
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
      `delete from meal_restaurants
    where member_id = $1 and place_id = $3`,
      [memberId, place_id]
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.clear_meal_restaurants = async (mealId) => {
  try {
    await pool.query(
      `delete from meal_restaurants where member_id in select member_id from meal_members where meal_id = $1`,
      [mealId]
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurant_like = async (member_id, place_id) => {
  try {
    const result = await pool.query(
      `update meal_restaurants set
    approved= 1 where place_id = $1 and member_id = $2 returning place_id, approved`,
      [place_id, member_id]
    );
    // console.log(result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_restaurant_dislike = async (member_id, place_id) => {
  try {
    const result = await pool.query(
      `update meal_restaurants 
      set approved = (oldData.appr - 1) from(
      select approved as appr, mr_id from meal_restaurants) as oldData
      where meal_restaurants.mr_id = oldData.mr_id
       and meal_restaurants.member_id = $1 
       and meal_restaurants.place_id = $2 returning place_id, approved;
      `,
      [member_id, place_id]
    );
    console.log(result.rows);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

import pool from "../pool.js";
import { Sequelize, DataTypes } from "sequelize";
import db from "../config/database.js";

const Restaurant = db.define("restaurant", {
  place_id: { type: DataTypes.STRING, allowNull: false },
});

export default Restaurant;

export const add_restaurants = async (ids) => {
  try {
    const response = await pool.query(
      `insert into restaurants (place_id) 
      select place_id from unnest($1::text[]) as place_id on conflict do nothing returning *`,
      [ids],
    );
    console.log(response.rows);
    return response.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const get_restaurants_by_place_ids = async (place_ids) => {
  try {
    let rows = [];
    let count = 15;
    while (rows.length != place_ids.length && count > 0) {
      console.log("try fetching ids: ", count);
      const result = await pool.query(
        `select * from restaurants where place_id = any ($1::text[])`,
        [place_ids],
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

export const meal_restaurants_exist = async (meal_id) => {
  try {
    let result = await pool.query(
      `select 1 from meal_restaurants where meal_id = $1 limit 1`,
      [meal_id],
    );
    return result.rows.length > 0;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const all_guest_restaurants_exist = async (meal_id) => {
  try {
    let result = await pool.query(
      `
      select 
      count(distinct mem_r.guest_res_id) = count(distinct me_r.meal_res_id) * mem.guest_count
      as valid
      from (select meal_res_id from meal_restaurants where meal_id = $1) as me_r
join guest_restaurants as mem_r on mem_r.meal_res_id = me_r.meal_res_id 
cross join(select count(guest_id) as guest_count from meal_guests where meal_id = $1) as mem
group by guest_count;`,
      [meal_id],
    );

    return result.rows[0].valid;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const upsert_meal_restaurants = async (json_data) => {
  try {
    let result = await pool.query(
      `insert into meal_restaurants (meal_id, res_id, is_open, in_budget)
      select * from json_to_recordset($1::json) as m(meal_id int, res_id int, is_open boolean, in_budget boolean)
        on conflict(meal_id, res_id)
        do update set
        in_budget = excluded.in_budget,
        is_open = excluded.is_open`,
      [JSON.stringify(json_data)],
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const delete_meal_restaurants = async (meal_id, res_ids) => {
  try {
    let result = await pool.query(
      `delete from meal_restaurants where meal_id = $1 and res_id = any ($2::int[])`,
      [meal_id, res_ids],
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
export const pare_old_meal_restaurants = async (meal_id, res_ids) => {
  try {
    let result = await pool.query(
      `delete from meal_restaurants where meal_id = $1 and not (res_id = any ($2::int[]))`,
      [meal_id, res_ids],
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const guest_restaurant_create = async (data) => {
  let { meal_id, place_id, user_id, approved } = data;
  try {
    const result = await pool.query(
      `insert into guest_restaurants
    (place_id, meal_id, user_id, approved)
    values($1,$2,$3,$4) returning place_id`,
      [place_id, meal_id, user_id, approved],
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

/*
 * params: guest_id: int,
 * google_data_string: stringified array of objects:
 * [{res_id: int, rating: numeric, tags: string[]}]
 *
 */
export const create_guest_restaurants = async (
  guest_link_id,
  google_data_string,
  meal_id,
) => {
  try {
    const result = await pool.query(
      `insert into guest_restaurants (guest_id, meal_res_id, score, hidden_from_user) select data.guest_id,
      data.meal_res_id,
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
      (data.all_bad_tags or data.bad_rating) as hidden_from_user from(select
          pref.guest_id,
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
 select guest_id, 
              min_rating, 
              t.tag,
              bad_tags from meal_guests
left join lateral unnest(bad_tags) as t(tag) on true
              where guest_id = $1) as pref
cross join meal_restaurants
join (select * from json_to_recordset($2::json) as r(res_id int, rating numeric, tags text[])) 
    as r on meal_restaurants.res_id = r.res_id
    where meal_restaurants.meal_id = $3
    group by pref.guest_id, 
    r.res_id, r.rating, 
    r.tags,pref.bad_tags, 
    meal_restaurants.in_budget, 
    meal_restaurants.is_open, 
   pref.min_rating,
    pref.bad_tags,
    meal_restaurants.meal_res_id) as data
      on conflict(guest_id, meal_res_id) do update set score = excluded.score, hidden_from_user = excluded.hidden_from_user`,
      [guest_link_id, google_data_string, meal_id],
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const update_guest_restaurants = async (
  guest_link_id,
  google_data_string,
  meal_id,
) => {
  console.log(guest_link_id, google_data_string);
  try {
    const result = await pool.query(
      `update guest_restaurants set score = newScores.score, hidden_from_user = newScores.hidden_from_user from(
        select data.guest_id,
      data.meal_res_id,
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
      (data.all_bad_tags or data.bad_rating) as hidden_from_user from(select
          pref.guest_id,
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
 select guest_id, 
              min_rating, 
              t.tag,
              bad_tags from meal_guests
left join lateral unnest(bad_tags) as t(tag) on true
              where guest_id = $1) as pref
cross join meal_restaurants
join (select * from json_to_recordset($2::json) as r(res_id int, rating numeric, tags text[])) 
    as r on meal_restaurants.res_id = r.res_id
    where meal_restaurants.meal_id = $3
    group by pref.guest_id, 
    r.res_id, r.rating, 
    r.tags,pref.bad_tags, 
    meal_restaurants.in_budget, 
    meal_restaurants.is_open, 
   pref.min_rating,
    pref.bad_tags,
    meal_restaurants.meal_res_id) as data) as newScores 
          where guest_restaurants.guest_id = newScores.guest_id 
          and guest_restaurants.meal_res_id = newScores.meal_res_id 
          returning guest_restaurants.*`,
      [guest_link_id, google_data_string, meal_id],
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const update_google_restaurants = async (mealId, google_data) => {
  try {
    console.log(google_data);
    // add all new restaurants
    let response = await pool.query(
      `insert into guest_restaurants (meal_res_id, guest_id, score, hidden_from_user) 
      select meal_res_id, guest_id, 
      (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
      (data.all_bad_tags or data.bad_rating) as hidden_from_user
      from (select meal_res_id, 
      guest_id,
      is_open,
      in_budget, 
      r.rating < avg(guests.min_rating) as bad_rating, 
      count(case when guests.tag = any(r.tags::text[]) then 1 end) as bad_count,
      (array_length(r.tags::text[],1) is not null and (guests.bad_tags::text[]) @> (r.tags::text[])) as all_bad_tags
      from json_to_recordset($2::json) as r(res_id int, rating numeric, tags text[]) 
      join (select * from meal_restaurants where meal_id =$1) 
      as this_meal_restaurants 
      on r.res_id = this_meal_restaurants.res_id 
      cross join(
             select distinct guest_restaurants.guest_id, 
             t.tag,
             meal_guests.min_rating, meal_guests.bad_tags from guest_restaurants
             join meal_guests on guest_restaurants.guest_id = meal_guests.guest_id 
             left join lateral unnest(meal_guests.bad_tags) as t(tag) on true
             where meal_guests.meal_id = $1) as guests
      group by 
      guest_id, 
      meal_res_id, 
      r.tags, 
      r.rating, 
      is_open, 
      in_budget, 
      guests.bad_tags)as data
             on conflict(meal_res_id, guest_id) do update set score = excluded.score, hidden_from_user=excluded.hidden_from_user`,
      [mealId, JSON.stringify(google_data)],
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// export const update_all_guest_scores = async (mealId, google_data_string) => {
//   try {
//     const result = await pool.query(
//       `update guest_restaurants set score = newScores.score, hidden_from_user= newScores.hidden_from_user from(select guest_id,
//       data.place_id,
//       (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
//       (data.all_bad_tags or data.bad_rating) as hidden_from_user  from(select pref.guest_id,
//           r.place_id,
//           count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count,
//           (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags,
//           r.rating < avg(pref.min_rating) as bad_rating
//           from guest_restaurants join (${google_data_string})
//           as r(place_id, rating, tags) on r.place_id = guest_restaurants.place_id
//           join (select guest_id,
//               meal_id,
//               min_rating,
//               t.tag,
//               bad_tags from meal_guests
// left join lateral unnest(bad_tags) as t(tag) on true) as pref on pref.guest_id = guest_restaurants.guest_id
//           where pref.meal_id = $1 group by pref.guest_id, r.place_id, r.tags, pref.bad_tags, r.rating) as data) as newScores
// api-> where guest_restaurants.guest_id = newScores.guest_id and guest_restaurants.place_id = newScores.place_id;`,
//       [mealId]
//     );

//     return;
//   } catch (err) {
//     console.log(err);
//     throw err;
//   }
// };

export const get_guest_restaurants = async (mealId, guestLinkId) => {
  try {
    let result = await pool.query(
      `select * from (select res_id,
      count(case when guest_restaurants.guest_id is not null and (approved = 1 or approved * -1 > meals.round) then 1 end) = 0 as unseen,
      mul(case when score is not null
            then(case when approved = 1 then 1
                      when approved * -1 > meals.round then score * (power(10,approved*-1)::numeric) else score end)
                      else 2 end) as total_score,
      count(case when approved * -1 > meals.round then 1 end) > 0 as disliked,
      count(case when vetoed = 't' then 1 end) > 0 as vetoed,
      sum(case when guest_restaurants.guest_id = $1 then approved else 0 end) as approved_by_user,
      sum(case when meal_guests.guest_id = $1 then (case when score is not null then score::real else 2 end) else 0 end) as user_raw_score,
      count(case when guest_restaurants.guest_id = $1 and guest_restaurants.hidden_from_user = 't' then 1 end) > 0 as hidden_from_user,
      is_open,
      in_budget
      from meal_restaurants
      join meal_guests on meal_restaurants.meal_id = meal_guests.meal_id
      left join guest_restaurants
      on guest_restaurants.meal_res_id = meal_restaurants.meal_res_id and
      guest_restaurants.guest_id = meal_guests.guest_id
      join meals on meals.meal_id = meal_restaurants.meal_id
      where meals.meal_id = $2
      group by res_id, is_open, in_budget) as data
      order by disliked, unseen, case when data.unseen then data.user_raw_score 
      when not data.unseen then data.total_score end, case when data.unseen 
      then data.total_score when not data.unseen then data.user_raw_score end
      `,

      [guestLinkId, mealId],
    );
    // console.log(result.rows);
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const get_guest_restaurant_dislikes = async (guestLinkId) => {
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
      sum(case when guest_id = $1 
          then (case when score is not null 
                then score::real else 2 end) 
          else 0 end) as user_raw_score
      from (select res_id, 
            me_r.meal_res_id, 
            score, 
            approved, 
            mm.guest_id, 
            count(vetoed = 't') over (partition by res_id, me_r.meal_res_id) as total_vetoed
            from (select meal_id, meal_res_id, res_id from meal_restaurants where is_open and in_budget) as me_r
            join meal_guests as mm on me_r.meal_id = mm.meal_id
            left join guest_restaurants as mem_r on mem_r.meal_res_id = me_r.meal_res_id and
            mm.guest_id = mem_r.guest_id
            join (select meal_res_id 
                  from guest_restaurants 
                  where guest_id = $1 and approved= -1) as disliked_ids
            on disliked_ids.meal_res_id = me_r.meal_res_id) as data
      where total_vetoed = 0
      group by res_id, meal_res_id
      order by total_score, user_raw_score limit 5`,
      [guestLinkId],
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const set_guest_ranks = async (guest_link_id, meal_id, rankArray) => {
  try {
    console.log(rankArray, meal_id, guest_link_id);
    const result = await pool.query(
      `update guest_restaurants 
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
      where guest_restaurants.guest_id = $4 
      and guest_restaurants.meal_res_id = newData.meal_res_id
      returning guest_restaurants.meal_res_id;`,
      [rankArray, rankArray.length + 1, meal_id, guest_link_id],
    );
    const deleteResult = await pool.query(
      `update guest_restaurants 
      set rank = null 
            where guest_id = $2 
            and rank is not null and not exists(select  
            1
            from unnest($1::int[]) as data(meal_res_id)
            where data.meal_res_id = guest_restaurants.meal_res_id)`,
      [result.rows.map((item) => item.meal_res_id), guest_link_id],
    );
    console.log(result.rows);
    console.log(result.rows.map((item) => item.meal_res_id));
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const restaurants_get_rank_count = async () => {
  try {
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const get_restaurant_by_guest_ids = async (guest_link_id, res_id) => {
  try {
    const result = await pool.query(
      `select guest_res_id from guest_restaurants 
      join meal_restaurants 
      on guest_restaurants.meal_res_id = meal_restaurants.meal_res_id
    where guest_id = $1 and res_id = $2`,
      [guest_link_id, res_id],
    );
    // console.log(result.rows);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const guest_restaurants_get_by_user = async (guestLinkId) => {
  try {
    const result = await pool.query(
      `select place_id, approved from guest_restaurants where guest_id=$1`,
      [guestLinkId],
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const meal_restaurant_delete = async (guestLinkId, place_id) => {
  try {
    await pool.query(
      `delete from guest_restaurants
    where guest_id = $1 and place_id = $3`,
      [guestLinkId, place_id],
    );
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const clear_guest_restaurants = async (mealId) => {
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

export const meal_restaurant_like = async (guest_link_id, res_id) => {
  try {
    const result = await pool.query(
      `update guest_restaurants set
    approved= 1 from (select guest_res_id from guest_restaurants 
      join meal_restaurants on meal_restaurants.meal_res_id = guest_restaurants.meal_res_id 
      join meals on meal_restaurants.meal_id = meals.meal_id where guest_id = $1 and res_id = $2) as oldData
      where guest_restaurants.guest_res_id = oldData.guest_res_id returning approved`,
      [guest_link_id, res_id],
    );
    // console.log(result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const meal_restaurant_dislike = async (guest_link_id, res_id) => {
  try {
    const result = await pool.query(
      `update guest_restaurants 
      set approved = -1 from(
      select guest_res_id from guest_restaurants 
      join meal_restaurants on meal_restaurants.meal_res_id = guest_restaurants.meal_res_id 
      where guest_id = $1 and res_id = $2) as oldData
      where guest_restaurants.guest_res_id = oldData.guest_res_id returning approved
      `,
      [guest_link_id, res_id],
    );

    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};


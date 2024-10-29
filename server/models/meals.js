const pool = require("../pool");

exports.get_meals_by_user_id = async (id) => {
  try {
    const result = await pool.query(
      `select my_meals.*, 
      array_agg((case when other_members.name is not null 
      then other_members.name 
      else other_members.username end)) as members 
      from (select meals.* from meals 
              join meal_members on meals.meal_id = meal_members.meal_id 
              where meal_members.user_id = $1) as my_meals
              left join (select * from meal_members 
                      join users on meal_members.user_id = users.user_id 
                      where meal_members.user_id != $1 
                      order by users.name, users.username) as other_members 
      on my_meals.meal_id = other_members.meal_id 
      group by my_meals.meal_id, 
      my_meals.meal_name, 
      my_meals.meal_photo, 
      my_meals.created_at, 
      my_meals.scheduled_at, 
      my_meals.location_id, 
      my_meals.location_coords,
      my_meals.radius, 
      my_meals.budget, 
      my_meals.chosen_restaurant, 
      my_meals.liked,
      my_meals.round
      order by my_meals.scheduled_at`,
      [id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_past_meals_by_user_id = async (id) => {
  try {
    const result = await pool.query(
      `select my_meals.*, 
      array_agg((case when other_members.name is not null 
      then other_members.name 
      else other_members.username end)) as members 
      from (select meals.* from meals 
              join meal_members on meals.meal_id = meal_members.meal_id 
              where meal_members.user_id = $1 
              and meals.scheduled_at < current_date) as my_meals
              left join (select * from meal_members 
                      join users on meal_members.user_id = users.user_id 
                      where meal_members.user_id != $1 
                      order by users.name, users.username) as other_members 
      on my_meals.meal_id = other_members.meal_id 
      group by my_meals.meal_id, 
      my_meals.meal_name, 
      my_meals.meal_photo, 
      my_meals.created_at, 
      my_meals.scheduled_at, 
      my_meals.location_id, 
      my_meals.location_coords,
      my_meals.radius, 
      my_meals.budget, 
      my_meals.chosen_restaurant, 
      my_meals.liked,
      my_meals.round
      order by my_meals.scheduled_at`,
      [id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// exports.update_meal_round = async (meal_id) => {
//   try {
//     const result = await pool.query(
//       `update meals set round = (oldData.round + 1)
//       from (select meal_id, round from meals
//               where meals.meal_id = $1) as oldData
//               where meals.meal_id = oldData.meal_id
//               and not exists (select 1 from meal_members
//                                 left join member_restaurants
//                                 on meal_members.member_id = member_restaurants.member_id
//                                 join meals on meal_members.meal_id = meals.meal_id
//                                 where meal_members.meal_id = $1 and
//                                 (member_restaurants.approved is null
//                                 or member_restaurants.approved = meals.round)
//                                 order by meal_members.member_id) returning meals.round;`,
//       [meal_id]
//     );
//     return result?.rows?.length > 0;
//   } catch (err) {
//     console.log(err);
//     throw err;
//   }
// };

exports.meal_unseen_rows = async (meal_id, member_id) => {
  try {
    const result = await pool.query(
      `select 1 from (select meal_id, meal_res_id 
                      from meal_restaurants 
                      where is_open and in_budget)as me_r 
        join meal_members as mm on mm.meal_id = me_r.meal_id
        left join member_restaurants as mem_r
        on me_r.meal_res_id = mem_r.meal_res_id and mm.member_id = mem_r.member_id
        where me_r.meal_id = $1 
        and mm.member_id != $2 
        and (mem_res_id is null
              or (approved = 0 
                  and vetoed is null 
                  and not hidden_from_user)) limit 1;`,
      [meal_id, member_id]
    );
    console.log("CHECKING ROUND", meal_id, member_id);
    console.log(result.rows);
    return result.rows;
  } catch (err) {
    console.log(err);
  }
};

exports.choose_best_ranked = async (meal_id) => {
  try {
    let result = await pool.query(
      `update meals set chosen_restaurant = best.res_id from (select res_id, mul(case when rank is not null then (5/rank::numeric)
                         when approved = 1 then 1 
                         when approved = -1 then score * 10
                         else score end) as ranked_score,
               mul(score) as raw_score,
               count(case when approved = -1 then 1 end) as dislikes
               from (select 
                     res_id, 
                     me_r.meal_res_id as meal_res_id,
                     approved, 
                     score, 
                     rank,
                     count(case when vetoed = 't' then 1 end) over (partition by res_id, me_r.meal_res_id) as vetoed
                     from (select meal_res_id, res_id, meal_id 
                     from meal_restaurants 
                     where meal_id = $1 
                     and is_open 
                     and in_budget) as me_r
                     join meal_members as mm on me_r.meal_id = mm.meal_id
                     join member_restaurants as mem_r on me_r.meal_res_id = mem_r.meal_res_id
                     and mem_r.member_id = mm.member_id) as data where vetoed = 0
               group by res_id, meal_res_id
               order by ranked_score, dislikes, raw_score
               limit 1) as best where meals.meal_id = $1 returning chosen_restaurant`,
      [meal_id]
    );
    return result.rows[0].chosen_restaurant;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_check_round = async (meal_id) => {
  try {
    const result = await pool.query(
      `select round from meals where meal_id = $1`,
      [meal_id]
    );
    return result.rows[0].round;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.update_meal_round = async (meal_id) => {
  try {
    const result = await pool.query(
      `update meals set round = round + 1 where meal_id = $1 returning round
     `,
      [meal_id]
    );
    console.log(result);
    return result.rows[0].round;
  } catch (err) {
    console.log(err);
  }
};

exports.get_remaining_unranked_members = async (meal_id) => {
  try {
    let result = await pool.query(
      `select member_id
from (select mm.member_id, count(case when rank is not null then 1 end) as ranked,
  count(distinct mem_r.meal_res_id) as dislikes
  from 
      (select member_id 
       from meal_members 
       where meal_id = $1) as mm
  left join (select meal_res_id, member_id, rank 
             from member_restaurants 
             where approved =-1)as mem_r 
  on mm.member_id = mem_r.member_id
  group by mm.member_id) as data
  where case when dislikes < 5  
then ranked < dislikes 
else ranked != 5 end`,
      [meal_id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_future_meals_by_user_id = async (id) => {
  try {
    const result = await pool.query(
      `select my_meals.*, 
      array_agg((case when other_members.name is not null 
      then other_members.name 
      else other_members.username end)) as members 
      from (select meals.* from meals 
              join meal_members on meals.meal_id = meal_members.meal_id 
              where meal_members.user_id = $1 
              and meals.scheduled_at > current_date) as my_meals
              left join (select * from meal_members 
                      join users on meal_members.user_id = users.user_id 
                      where meal_members.user_id != $1 
                      order by users.name, users.username) as other_members 
      on my_meals.meal_id = other_members.meal_id 
      group by my_meals.meal_id, 
      my_meals.meal_name, 
      my_meals.meal_photo, 
      my_meals.created_at, 
      my_meals.scheduled_at, 
      my_meals.location_id, 
      my_meals.location_coords,
      my_meals.radius, 
      my_meals.budget, 
      my_meals.chosen_restaurant, 
      my_meals.liked,
      my_meals.round 
      order by my_meals.scheduled_at`,
      [id]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meals_search = async (queryTerm, currentUser) => {
  try {
    const result = await pool.query(
      `select meal_name,
        scheduled_at as date
        from meals
        join meal_members
        on meals.meal_id = meal_members.meal_id
        where meal_members.user_id = $2 and meal_name like $1`,
      [`%${queryTerm}%`, currentUser]
    );
    return result.rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// exports.meal_members_search = async (queryTerm, currentUser) => {
//   return new Promise((resolve, reject) => {
//     db.all(
//       `
//       select distinct user.name, user.username
//       from (select meal.meal_id from
//         meal
//         join meal_member
//         on meal.meal_id = meal_member.meal_id
//         where meal_member.user_id = ?) as user_meals
//         join meal_member
//         on user_meals.meal_id = meal_member.meal_id
//         join user
//         on meal_member.user_id = user.user_id
//         where user.user_id != ? and (user.name like ? or user.username like ?)
//       `,
//       [currentUser, currentUser, `%${queryTerm}%`, `%${queryTerm}%`],
//       (err, result) => {
//         if (err) {
//           reject(err);
//         }
//         console.log(result);
//         resolve(result);
//       }
//     );
//   });
// };

exports.meal_create = async (
  meal_name,
  meal_photo,
  created_at,
  scheduled_at,
  location_id,
  location_coords,
  radius,
  budget
) => {
  try {
    let result = await pool.query(
      `insert into meals(
  meal_name,
  meal_photo,
  created_at,
  scheduled_at,
  location_id,
  location_coords,
  radius,
  budget
) values($1, $2, $3, $4, $5, $6, $7, $8) returning meal_id`,
      [
        meal_name,
        meal_photo,
        created_at,
        scheduled_at,
        location_id,
        location_coords,
        radius,
        budget,
      ]
    );
    return result.rows[0].meal_id;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_update_meal = async (mealId, mealData) => {
  try {
    const result = await pool.query(
      `
    update meals set meal_name = $1,
    meal_photo = $2,
    scheduled_at = $3,
    location_id= $4,
    location_coords = $5,
    radius = $6,
    budget = $7
    where meal_id = $8 returning *`,
      [
        mealData.meal_name,
        mealData.meal_photo,
        mealData.scheduled_at,
        mealData.location_id,
        mealData.location_coords,
        mealData.radius,
        mealData.budget,
        mealId,
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_update_chosen_restaurant = async (mealId, restaurant) => {
  try {
    const result = await pool.query(
      `update meals set chosen_restaurant = $1 where meal_id = $2 returning chosen_restaurant`,
      [restaurant, mealId]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_update_liked = async (mealId, liked) => {
  try {
    const result = await pool.query(
      `update meals set liked = $1 where meal_id = $2 returning liked`,
      [liked, mealId]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_get_by_id = async (mealId, memberId) => {
  try {
    const result = await pool.query(
      `select m.*, memList.members, memList.member_ids, mem.min_rating, mem.bad_tags
from (select * from meals where meal_id = $1) as m
join (select meal_id, min_rating, bad_tags from meal_members where member_id = $2) as mem
on mem.meal_id = m.meal_id
left join (select array_agg((case when u.name is not null
      then u.name
      else u.username end)) as members, 
      array_agg(u.user_id) as member_ids,
                                    meal_id from 
(select meal_id, user_id from meal_members where meal_id = $1 and member_id != $2) as mm
join users as u on mm.user_id = u.user_id
group by meal_id) as memList
on memList.meal_id = m.meal_id
`,
      [mealId, memberId]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_get_scheduled_time = async (mealId) => {
  try {
    const result = await pool.query(
      "select scheduled_at from meals where meal_id = $1",
      [mealId]
    );
    return result.rows[0].scheduled_at;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.meal_delete = async (mealId) => {
  try {
    const result = await pool.query(`delete from meals where meal_id = $1`, [
      mealId,
    ]);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_chosen_restaurant_place_id = async (meal_id) => {
  try {
    let result = await pool.query(
      `select place_id from meals 
      join restaurants 
      on meals.chosen_restaurant = restaurants.res_id 
      where meals.meal_id = $1`,
      [meal_id]
    );
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
};

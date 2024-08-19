const db = require("../db");
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
  // return new Promise((resolve, reject) => {
  //   db.get(
  //     `insert into meal_restaurant
  //     (place_id, meal_id, user_id, approved)
  //     values (?,?,?,?) returning place_id;`,
  //     [place_id, meal_id, user_id, approved],
  //     (err, row) => {
  //       if (err) {
  //         console.log(err);
  //         reject(err);
  //       } else {
  //         if (row) {
  //           resolve(row);
  //         } else {
  //           reject("Could not add restaurant data");
  //         }
  //       }
  //     }
  //   );
  // });
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

// `insert into meal_restaurants(member_id, place_id, score, hidden) select data.member_id,
// data.place_id,
// (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
// (data.all_bad_tags or data.bad_rating) as hidden from(select
//     pref.member_id,
//     r.place_id,
//     count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count,
//     (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags,
//     r.rating < avg(pref.min_rating) as bad_rating
//     from (select member_id,
//         min_rating,
//         unnest(bad_tags) as tag,
//         bad_tags from meal_members where member_id = 138) as pref
// cross join (values('ChIJ3z_bIK6SwokRz3XMu8xCPI8', 4.3,'{"breakfast_restaurant"}'),
//     ('ChIJv0CFoxKTwokR4Sfgcmab1EI', 4.6,'{}'),
//     ('ChIJ23paVWmTwokRd0rp8kdKM0w', 4.8,'{}'),
//     ('ChIJK0BTQK6SwokRN5bYvABnbvU', 4,'{"coffee_shop","cafe","breakfast_restaurant"}'),
//     ('ChIJfxSm1EyTwokRYGIgYm3dqls', 4.3,'{"brunch_restaurant"}'),
//     ('ChIJG3TgE66SwokRX0scyzq-V6o', 4.5,'{"american_restaurant"}'),
//     ('ChIJl4RjnqeTwokRgvrQWgt9EmY', 4.4,'{"american_restaurant"}'),
//     ('ChIJ0aowaK6SwokRL-HTR_foN38', 4.5,'{"bar"}'),
//     ('ChIJZReJaq6SwokRbZGfHBROUZU', 4.1,'{"bar","american_restaurant"}'),
//     ('ChIJmV5ONq6SwokR9NUCEVE0DKI', 4.5,'{"italian_restaurant","pizza_restaurant"}'))
//     as r(place_id, rating, tags)
//     group by pref.member_id, r.place_id, r.rating, r.tags,pref.bad_tags) as data;`

// INSERT NEW PLACES INTO MEAL RESTAURANTS
// insert into meal_restaurants (place_id, member_id) select * from (select place_id, member_id from (values('ChIJ3z_bIK6SwokRz3XMu8xCPI8', 4.3,'{"breakfast_restaurant"}'),
//         ('ChIJ23paVWmTwokRd0rp8kdKM0w', 4.8,'{}'),
//         ('ChIJv0CFoxKTwokR4Sfgcmab1EI', 4.6,'{}'),
//         ('ChIJfxSm1EyTwokRYGIgYm3dqls', 4.2,'{"brunch_restaurant"}'),
//         ('ChIJK0BTQK6SwokRN5bYvABnbvU', 4,'{"coffee_shop","breakfast_restaurant","cafe"}'),
//         ('ChIJxxDLVlGNwokRPgtjAbxyevY', 4.3,'{"american_restaurant","bar"}'),
//         ('ChIJJZ99iq2SwokRkbZKRzJeoio', 4.6,'{"italian_restaurant"}'),
//         ('ChIJ3dQdIsCSwokRs0eyh6JtnNU', 4.5,'{"italian_restaurant","pizza_restaurant","bar"}'),
//         ('ChIJDYixUwKTwokRPRmLS0smLjY', 4.6,'{"bar"}'),
//         ('ChIJu0cRRTKTwokRfNplZS8Lbjc', 4.4,'{"italian_restaurant"}'),
//         ('ChIJBzAI6pKTwokRquXPFwGcFOA', 4.3,'{}'),
//         ('ChIJG3TgE66SwokRX0scyzq-V6o', 4.4,'{"american_restaurant"}'),
//         ('ChIJE4lzm8eSwokRiN93djbk0Ig', 4.1,'{"coffee_shop","breakfast_restaurant","cafe"}'),
//         ('ChIJl4RjnqeTwokRgvrQWgt9EmY', 4.4,'{"american_restaurant"}'),
//         ('ChIJN78jnMeSwokRpT5Sq_QGD58', 4.4,'{"indian_restaurant","bar"}'),
//         ('ChIJqyTM-MeSwokRwtBPDSglPUg', 4.5,'{"italian_restaurant"}'),
//         ('ChIJiUIlT3mTwokRrJDV5pZnTMs', 4.4,'{"pizza_restaurant","fast_food_restaurant"}'),
//         ('ChIJ0aowaK6SwokRL-HTR_foN38', 4.4,'{"bar"}'),
//         ('ChIJH-lolKzywokRCvohk-BdCT0', 3.8,'{"coffee_shop","breakfast_restaurant","fast_food_restaurant","cafe"}'),
//         ('ChIJZReJaq6SwokRbZGfHBROUZU', 4.2,'{"american_restaurant","bar"}')) as r(place_id, rating, tags) cross join(
//          select distinct meal_restaurants.member_id from meal_restaurants
//          join meal_members on meal_restaurants.member_id = meal_members.member_id where meal_members.meal_id = 27) as ids) as data
//          where not exists ( select 1 from meal_restaurants where meal_restaurants.member_id = data.member_id and meal_restaurants.place_id = data.place_id);

// DELETE OLD PLACES FROM MEAL RESTAURANTS ?
// delete from meal_restaurants where mr_id > 34 and place_id in (select place_id from (values('ChIJlZuJwOiSwokRrJNNhf-PrWE', 4.5,'{"pizza_restaurant","italian_restaurant","bar"}'),
//       ('ChIJZ7aROYmTwokRc95v_J8fw6o', 3,'{"vegan_restaurant","vegetarian_restaurant"}'),
//       ('ChIJsdgOWwKTwokRFMerkmAr0cY', 4.5,'{"italian_restaurant","bar"}'),
//       ('ChIJ3dQdIsCSwokRs0eyh6JtnNU', 4.5,'{"italian_restaurant","pizza_restaurant","bar"}'),
//       ('ChIJ--5iQuiSwokR7jxhtfFChCw', 4.3,'{"italian_restaurant","pizza_restaurant"}'),
//       ('ChIJvd_wzOiSwokRKwzdpR4KUM4', 4.2,'{"japanese_restaurant","sushi_restaurant"}'),
//       ('ChIJdXWPRu-SwokRa_l7nmeaCKk', 4.5,'{"sandwich_shop"}'),
//       ('ChIJDYixUwKTwokRPRmLS0smLjY', 4.6,'{"bar"}'),
//       ('ChIJVQGVOAOTwokRTb7nlptnV4o', 4.1,'{"italian_restaurant","pizza_restaurant","bar"}'),
//       ('ChIJc4PrvuiSwokRB9FSa4E-M2c', 4.5,'{"hamburger_restaurant","american_restaurant"}'),
//       ('ChIJjzQuZOmSwokRJY6Tl0nn3TM', 4.4,'{"american_restaurant"}'),
//       ('ChIJ9-DcCKKTwokRYUxQqy5dQlU', 4.5,'{"mexican_restaurant"}'),
//       ('ChIJu0cRRTKTwokRfNplZS8Lbjc', 4.4,'{"italian_restaurant"}'),
//       ('ChIJBzAI6pKTwokRquXPFwGcFOA', 4.3,'{}'),
//       ('ChIJE4lzm8eSwokRiN93djbk0Ig', 4.1,'{"coffee_shop","breakfast_restaurant","cafe"}'),
//       ('ChIJN78jnMeSwokRpT5Sq_QGD58', 4.4,'{"indian_restaurant","bar"}'),
//       ('ChIJqyTM-MeSwokRwtBPDSglPUg', 4.5,'{"italian_restaurant"}'),
//       ('ChIJW-Hq2ByTwokRL4y1jAbdAw4', 3.9,'{"coffee_shop","breakfast_restaurant","cafe"}'),
//       ('ChIJ466AQ6aTwokRsYGb5D8a3s4', 4.6,'{"spanish_restaurant"}'),
//       ('ChIJVV2WwceSwokR4t52AJ6MZ2M', 4.5,'{"bar"}')) as r(place_id, rating, tags)) and member_id in (select member_id from meal_members where meal_id = 27);

exports.update_member_restaurants = async (member_id, google_data_string) => {
  console.log(member_id);
  try {
    // console.log(`update meal_restaurants set score = newScores.score, hidden = newScores.hidden from(
    //     select member_id,
    //   data.place_id,
    //   (2*power(8, data.bad_count + (case when bad_rating then 1 else 0 end))) as score,
    //   (data.all_bad_tags or data.bad_rating) as hidden
    //   from(select
    //       pref.member_id,
    //       r.place_id,
    //       count(case when pref.tag = any(r.tags::text[]) then 1 end) as bad_count,
    //       (array_length(r.tags::text[],1) is not null and (pref.bad_tags ::text[]) @> (r.tags::text[])) as all_bad_tags,
    //       r.rating < avg(pref.min_rating) as bad_rating
    //       from (select member_id,
    //           min_rating,
    //           unnest(bad_tags) as tag,
    //           bad_tags from meal_members where member_id = $1) as pref
    //   cross join (${google_data_string})
    //       as r(place_id, rating, tags)
    //       group by pref.member_id, r.place_id, r.rating, r.tags,pref.bad_tags) as data) as newScores
    //       where meal_restaurants.member_id = newScores.member_id
    //       and meal_restaurants.place_id = newScores.place_id
    //       returning meal_restaurants.*`);
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
    count(case when not approved then 1 end) as dislikes,
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
  // return new Promise((resolve, reject) => {
  //   db.all(
  //     `select counts.place_id as place_id,
  //     counts.dislikes,
  //     power(2, responses_needed) * power(10, counts.dislikes) as score,
  //     counts.responses_needed
  //      from
  //         (select place_id,
  //         count(case when not approved then 1 end) as dislikes,
  //         ? - count(distinct user_id) as responses_needed
  //         from meal_restaurant
  //         where meal_id = ?
  //         group by place_id) as counts
  //         order by responses_needed = 0, score;`,
  //     [memberCount, mealId],
  //     (err, rows) => {
  //       if (err) {
  //         console.log(err);
  //         reject(err);
  //       } else {
  //         resolve(rows);
  //       }
  //     }
  //   );
  // });
};

exports.get_meal_restaurants = async (mealId, memberId, google_ids) => {
  try {
    //       sum(case when meal_members.member_id = $1 then (case when score is not null then score::real else 2 end) else 0 end) as user_raw_score

    let result = await pool.query(
      `select * from (select google_ids.place_id,
      count(case when meal_restaurants.member_id is not null and meal_restaurants.approved is not null then 1 end) = 0 as unseen,
      mul(case when score is not null
            then(case when approved is null then score
                      when approved = 'f' then score * 10 else 1 end)
                      else 2 end) as total_score,
      count(case when approved = 'f' then 1 end) > 0 as disliked,
      count(case when vetoed = 't' then 1 end) > 0 as vetoed,
      sum(case when meal_restaurants.member_id = $1 then(case when approved is null then 0 when approved = 'f' then -1 else 1 end) else 0 end) as approved_by_user,
      sum(case when meal_members.member_id = $1 then (case when score is not null then score::real else 2 end) else 0 end) as user_raw_score,
      count(case when meal_restaurants.member_id = $1 and meal_restaurants.hidden = 't' then 1 end) > 0 as hidden
      from unnest($2::text[]) as google_ids(place_id)
      cross join meal_members
      left join meal_restaurants
      on meal_restaurants.place_id = google_ids.place_id and
      meal_restaurants.member_id = meal_members.member_id
      where meal_members.meal_id = $3
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
  // return new Promise((resolve, reject) => {
  //   db.get(
  //     `select * from meal_restaurant
  //     where meal_id = ? and user_id = ? and place_id = ?`,
  //     [mealId, userId, placeId],
  //     (err, row) => {
  //       if (err) {
  //         console.log(err);
  //         reject(err);
  //       } else {
  //         resolve(row);
  //       }
  //     }
  //   );
  // });
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
  // return new Promise((resolve, reject) => {
  //   db.all(
  //     `select
  //         place_id, approved
  //         from meal_restaurant
  //         where meal_id = ? and user_id = ?`,
  //     [mealId, userId],
  //     (err, rows) => {
  //       if (err) {
  //         console.log(err);
  //         reject(err);
  //       } else {
  //         if (rows) {
  //           resolve(rows);
  //         } else {
  //           reject("Could not get restaurants for user");
  //         }
  //       }
  //     }
  //   );
  // });
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
  // return new Promise((resolve, reject) => {
  //   db.get(
  //     `delete from meal_restaurant
  //     where meal_id=? and user_id =? and place_id = ?`,
  //     [mealId, userId, place_id],
  //     (err, row) => {
  //       if (err) {
  //         console.log(err);
  //         reject(err);
  //       }
  //       resolve();
  //     }
  //   );
  // });
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
  // return new Promise((resolve, reject) => {
  //   db.get(
  //     `delete from meal_restaurant
  //     where meal_id=?`,
  //     [mealId],
  //     (err, row) => {
  //       if (err) {
  //         console.log(err);
  //         reject(err);
  //       }
  //       resolve();
  //     }
  //   );
  // });
};

exports.meal_restaurant_update_approved = async (data) => {
  let { member_id, place_id, approved } = data;
  try {
    const result = await pool.query(
      `update meal_restaurants set
    approved= $1 where place_id = $2 and member_id = $3 returning place_id, approved`,
      [approved, place_id, member_id]
    );
    // console.log(result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.log(err);
    throw err;
  }
  // return new Promise((resolve, reject) => {
  //   db.get(
  //     `update meal_restaurant set
  //       approved = ?
  //       where place_id = ? and meal_id=? and user_id = ?  returning approved;`,
  //     [approved, place_id, meal_id, user_id],
  //     (err, row) => {
  //       if (err) {
  //         console.log(err);
  //         reject(err);
  //       } else {
  //         if (row) {
  //           resolve(row);
  //         } else {
  //           reject("Could not add restaurant data");
  //         }
  //       }
  //     }
  //   );
  // });
};

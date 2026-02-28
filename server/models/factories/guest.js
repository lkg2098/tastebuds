import Guest from "../guests.js";

export async function guest({ meal_id, user_id, role }) {
  return await Guest.create({
    user_id,
    meal_id,
    role: role || "guest",
  });
}

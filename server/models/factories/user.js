import { faker } from "@faker-js/faker";
import User from "../users.js";
import bcrypt from "bcrypt";

export async function user({ username, password, name }) {
  const defaults = {
    username: faker.internet.username(),
    password: faker.internet.password(),
    phone_number: faker.phone.number({ style: "national" }),
    name: faker.internet.displayName(),
  };
  let passwordHash = await bcrypt.hash(password || defaults.password, 8);
  return await User.create({
    ...defaults,
    username: username || defaults.username,
    name: name || defaults.name,
    password: passwordHash,
  });
}

export function filter_by_hours(hoursList: string[], date: Date) {
  let weekday = date.getDay() - 1;
  if (weekday < 0) weekday = 6;
  let yesterday = weekday - 1;
  if (yesterday < 0) yesterday = 6;

  const processHoursString = (index: number, day: Date) => {
    const hoursString = hoursList[index].split(": ")[1];
    // console.log(hoursString);
    if (hoursString.trim() == "Closed") {
      return null;
    }
    if (hoursString.trim() == "Open 24 hours") {
      return true;
    }
    const hours = hoursString.split(" – ").map((time, index) => {
      let timeArr = time.split(" ");
      const output = timeArr[0].split(":");
      if (output[0] == "12") {
        if (timeArr[1] == "AM") {
          output[0] = "23";
        }
      } else if (timeArr[1] == "PM") {
        output[0] = `${Number(output[0]) + 12}`;
      } else if (output[0] == "1" && timeArr[1] == "AM") {
        output[0] = "0";
      }

      let returnVal = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );

      returnVal.setHours(Number(output[0]) - index);
      returnVal.setMinutes(Number(output[1]));

      return returnVal;
    });

    if (hours[1] < hours[0]) {
      hours[1].setDate(
        date.getDate() + 1
        // hours[1].getHours(),
        // hours[1].getMinutes()
      );
    }
    return hours;
  };

  const hours = processHoursString(weekday, date);
  if (hours === true) {
    return true;
  }
  const yesterdayHours = processHoursString(
    yesterday,
    new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
  );

  if (hours && date < hours[0]) {
    return (
      yesterdayHours &&
      yesterdayHours !== true &&
      date >= yesterdayHours[0] &&
      date <= yesterdayHours[1]
    );
  }

  return hours && date >= hours[0] && date <= hours[1];
}

export function filter_by_budget(
  res_budget: string,
  budget_min: number,
  budget_max: number
) {
  if (!res_budget || res_budget == "PRICE_LEVEL_UNSPECIFIED") {
    return true;
  }
  const budget_to_int = (budget?: string) => {
    if (budget == "PRICE_LEVEL_FREE") {
      return 0;
    }
    if (budget == "PRICE_LEVEL_INEXPENSIVE") {
      return 1;
    }
    if (budget == "PRICE_LEVEL_MODERATE") {
      return 2;
    }
    if (budget == "PRICE_LEVEL_EXPENSIVE") {
      return 3;
    }
    if (budget == "PRICE_LEVEL_VERY_EXPENSIVE") {
      return 4;
    }
  };

  const restaurant_budget = budget_to_int(res_budget);
  return (
    !restaurant_budget ||
    (restaurant_budget <= budget_max && restaurant_budget >= budget_min)
  );
}

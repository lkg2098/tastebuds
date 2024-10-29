const axios = require("axios");
const asyncHandler = require("express-async-handler");
const pool = require("../pool");
const restaurants_model = require("../models/restaurants");
const meals_model = require("../models/meals");

const KEY = process.env.PLACES_API_KEY;

exports.nearby_search = async (req, res, next) => {
  try {
    let { data } = await axios.post(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        includedTypes: ["restaurant"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: 40.9393651065372,
              longitude: -73.83199458046688,
            },
            radius: 500,
          },
        },
      },
      {
        headers: {
          "X-Goog-Api-Key": KEY,
          "X-Goog-FieldMask":
            "places.accessibilityOptions,places.addressComponents,places.formattedAddress,places.id,places.displayName,places.location,places.photos,places.types,places.primaryType,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.regularSecondaryOpeningHours,places.currentSecondaryOpeningHours,places.rating,places.userRatingCount,places.websiteUri",
        },
      }
    );
    console.log(data.places);
    res.status(200).json({ message: "this is working" });
  } catch (err) {
    console.log(err.response.data.error);
    res.status(500).json({ error: err });
  }
};

exports.get_google_photo = async (req, res, next) => {
  try {
    const { photo_name } = req.body;
    console.log(photo_name);

    // let { data } = await axios.get(
    //   `https://places.googleapis.com/v1/${photo_name}/media`,
    //   {
    //     params: {
    //       maxWidthPx: 500,
    //       skipHttpRedirect: true,
    //     },
    //     headers: {
    //       "X-Goog-Api-Key": KEY,
    //     },
    //   }
    // );
    // console.log(data);
    let data = {
      name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q49ztGYFvERo9SqWDxz_mnJSxMPniYqcVz_rKSj9Q4md2JyfLf7_OzmGTZ6ihs-6-SNHqWsa2SBWZucNrVq4kqMZGssrYNm_x23Tair343v1CcIIEhFosY75DfWp3pgoJhN-hkX3IhrOBoSCinsAhXtWUka1DAQ9J6E/media",
      photoUri:
        "https://lh3.googleusercontent.com/places/ANXAkqE4pa5LQsJMp_PvUQUJmsinyBQOy1n2BxIB4oI97Jg0iiGbpLov03aZM0hOq5vYCrkgFus4_ovXNDAQj3GosXJMz2WfvTlHmpY=s4800-w500",
    };
    res.status(200).json({ message: "this is working", photo: data });
  } catch (err) {
    console.log(err.response);
    res.status(500).json({ error: err });
  }
};

exports.get_geocoding_info = async (coords) => {
  try {
    // let { data } = await axios.get(
    //   "https://maps.googleapis.com/maps/api/geocode/json",
    //   {
    //     params: { latlng: coords, key: KEY },
    //   }
    // );
    // console.log(data);
    // console.log(data.results[0]);
    // console.log("RUNNING GEOCODING!!!!");
    return {
      formatted_address: "200 Geary St, San Francisco, CA 94102, USA",
      place_id: "ChIJpc9FisyBhYARPN5xBWS7KQc",
    };
    if (data.results.length) {
      console.log("RAN GEOCODING");
      return data.results[0];
    } else {
      throw "Could not find an address at this location";
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.get_address = asyncHandler(async (req, res, next) => {
  const coords = `${req.query.coords[0]},${req.query.coords[1]}`;

  let response = await this.get_geocoding_info(coords);
  res
    .status(200)
    .json({ placeId: response.place_id, address: response.formatted_address });
});

function parse_location_data(data) {
  return {
    location_id: data.location_id || "",
    location_coords: data.location_coords || [],
    radius: data.radius || 50000,
  };
}

function process_google_place(place, tag_map) {
  let tagList = [];
  let cleanTagList = place.types.reduce((types, type, index) => {
    if (
      type.match(
        /^.+restaurant$|bar|cafe|coffee\_shop|ice\_cream\_shop|sandwich\_shop|steak\_house/
      )
    ) {
      let styledType = type.replace(/\_|restaurant/g, " ").trim();
      styledType = styledType
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      types.push(styledType);
      tagList.push(type);

      if (type.match(/^.+restaurant$|sandwich\_shop|steak\_house/)) {
        tag_map[type] = true;
      }
      return types;
    }
    return types;
  }, []);

  let formattedPlace = {
    place_id: place.id,
    name: place.displayName.text,
    address: place.shortFormattedAddress,
    types: cleanTagList, //formatted tags
    tags: tagList, // raw tag data
    location: place.location,
    priceLevel: place.priceLevel,
    regularOpeningHours: place.regularOpeningHours?.periods || [],
    rating: place.rating,
    rating_count: place.userRatingCount,
    hours: place.regularOpeningHours?.weekdayDescriptions || "",
    photos: place.photos.reduce((results, photo, index) => {
      if (index < 4) {
        results.push({
          name: photo.name,
          authors: photo.authorAttributions,
          uri: "",
        });
      }
      return results;
    }, []),
    accessibilityOptions: place.accessibilityOptions,
    website: place.websiteUri,
  };

  return formattedPlace;
}

exports.process_google_data = (places, budget, date) => {
  const tag_map = {};

  // const place_ids = [];
  const places_data = {};
  const place_ids = places.map((res) => {
    let place = process_google_place(res, tag_map);

    places_data[res.id] = {
      ...place,
      is_open: this.filter_by_hours(
        res.regularOpeningHours?.periods || [],
        new Date(date)
      ),
      in_budget: this.filter_by_budget(res.priceLevel, budget),
    };
    return res.id;
  });
  console.log(places_data);

  return { tag_map, place_ids, places_data };
};

const MILES_TO_METERS = 1609.34;

let places = [
  {
    name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE",
    id: "ChIJlZuJwOiSwokRrJNNhf-PrWE",
    types: [
      "pizza_restaurant",
      "italian_restaurant",
      "bar",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "425 White Plains Rd, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.9563694,
      longitude: -73.8138311,
    },
    rating: 4.5,
    websiteUri: "http://www.burratapizza.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 21,
            minute: 30,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 5:00 – 9:00 PM",
        "Wednesday: 5:00 – 9:00 PM",
        "Thursday: 5:00 – 9:00 PM",
        "Friday: 5:00 – 9:30 PM",
        "Saturday: 12:00 – 9:30 PM",
        "Sunday: 12:00 – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 626,
    displayName: {
      text: "BURRATA",
      languageCode: "en",
    },
    primaryType: "pizza_restaurant",
    shortFormattedAddress: "425 White Plains Rd, Eastchester",
    photos: [
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q6CZfjrsM8fbpVLtQKlyPk32gIFkbHIl9wcoEHAF0vDedCBzZ1OKTPokaiTA8qgNI_s1QZ_qSy8AN78gkUG75k-VewCDroMyNoGZ-vfE4MJygDPyiTZRSRoNz0faoWfMYHNrZ8-PgyOEI-FcLsAm6ppxpfJ0BTFxFDl",
        widthPx: 1348,
        heightPx: 899,
        authorAttributions: [
          {
            displayName: "BURRATA",
            uri: "//maps.google.com/maps/contrib/102792430970730061751",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUbhwvIBJWKtr45_hWoLUvoVyKHTEr8ISi72LEMkUqmbkqZxqV-=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q68Ya2pYDONGNos9CyhkzCkpC0pxREa7eb6TeYpj_pJpmgSbZUKWNL2Jy_uqU35snOW0Ejlx_UjWaT8ANu_JhVButqK2NTTnm0rggzwW6vheEntiaryNgInEEDlL0iXl1t9yJSexJl9J4p5EnLUZME5xwMpxY1kqFrt",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "BURRATA",
            uri: "//maps.google.com/maps/contrib/102792430970730061751",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUbhwvIBJWKtr45_hWoLUvoVyKHTEr8ISi72LEMkUqmbkqZxqV-=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q5Sti1Albahg6zFaH_g5R1FnNYvYDbpjiAePqXDxCOmkXtQK7LgveDCvHEemef3TZxEgH8ns4NizZOJMcFNpzR_p_49ighjgihuAIVYMQX3GWuvXHTrFpAECb8pyzcBlwNSW24A830mjOIdN4rin6_b3nega7sU4Z7d",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "J Lim",
            uri: "//maps.google.com/maps/contrib/109935156740971751576",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKYnG11pwVBark64wiserzR8n-rEfTAglboJ7aaEgmmefWHqA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q6GBXTliI-V7gctPkRtHG4rn4sPtxLI1GF7BTzsQYpTyzoMq-S6NZKjDDgY6xROik-efbx_9EEAl03m9wKWyxM7PkRX4q_1rYOkVL1qsLi7KfrxbL3COpDIbp_dEDPLG9M1vHiaFi5nQ1vszkPPUf8t-HAFlTVZWe80",
        widthPx: 1713,
        heightPx: 1284,
        authorAttributions: [
          {
            displayName: "Bianca C.",
            uri: "//maps.google.com/maps/contrib/116185846034886264029",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVPHPzu70ySmPXIn0hvpY7LATjAvL-8ffHTtSOjtXEsY5rGCVRSjw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7FjFHbBwaAp7PUm5vIpw8WgVOUvUjq8sda9a-_WfoF8elhuMr59zAHsG3CNwBL12YDgbjzdOqFN4iXobXJEHUrq7meQsZz7p7hKdDI5yhVzgXV2z5K_rsrAamMBx28JvfwAz24nYQZXIqadkg-EahEMON11_N3cFeK",
        widthPx: 3024,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Johan Jonsson",
            uri: "//maps.google.com/maps/contrib/100207722052513615898",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVdChPFXKGqM-BqoCS5LTusXc53z0NwYcdioLJ9143qhrmjEuO7xA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7lVaufKa9w_dENa6jg2qSuuLuTWVJLMv1TJq8pgkkYKijjdG_DARYGRGObMUAQUK3Ypf2Zmo8xIIqB3ub9_Y1i60g0MQoeLNHsRUNl0JvO7UByWb3mAmbZ24pcogVO8MqZyn4Q1p0GDkz8UPgXWmYlTqOqYxhB3K1w",
        widthPx: 4800,
        heightPx: 2700,
        authorAttributions: [
          {
            displayName: "Eduardo Angel Ramirez Saavedra",
            uri: "//maps.google.com/maps/contrib/100701954365206116050",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX3vRK8Zux685a0FCG5qkyBHAQ8SzZswDgmmQ7MKZIYRuKlaOkaYQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q5YhAA3iyo_IfW6CHbCL6iF4_xRwRpckezTkIbhWogSDnsa8sKqoIsGAiTvJPa-dBOJBY07VUQFnH-IDUhPcaa9OIymOr7QFuRIZ8MWI8ZaQaOy_f5DdLLdV0CGlCxSqBTQJ9Kk1UYlzkW-w5hVy5JuRkkfv4z8L4hD",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Dominick Vellucci",
            uri: "//maps.google.com/maps/contrib/116345219794599247988",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7wZnyrRLlTsG2CSab-7Wjq0ohxOqOJEJTnJWo5p6qL_7h3E5NfghZ4xTze_by6NeIxxN8EpegfdEL0UoXDk5dOhEfIrJBchrkd76c0X4gJtcDxIxly-QS1i5er9OBrSs_IUzkth9Y8r6y6MoFpgBS80Yy6D6GZFqQ",
        widthPx: 2576,
        heightPx: 1932,
        authorAttributions: [
          {
            displayName: "Hiram Mendez",
            uri: "//maps.google.com/maps/contrib/115304703684795952242",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWZymh_J3YDVAjaXOxt4gFu8WbY1iAyR-089gYzXva2xED8q7sN=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q600sZmyAD1Z22Ql6YkFBn38A3PB_C_UymH5pTp5zqFQnjSXNePpUT3TkWg7f1Gk4hmCJsmCLnYIJVV_x5kJYTdsIgLX9hdEeNtSDfQm5UHkDpJ39kF7rGwf7mD06GvIg2gqwA-MHFXnlesHd2QcHmOdKFyi5oC_Mg3",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Adam Corrigan",
            uri: "//maps.google.com/maps/contrib/115051006048521434223",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUwhqqQ4QK9iUdBNQUMHPnsw7vAwUwC_QWed209cPTLnnaUPmnGuA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7nN3W6zwyPqxujCUhBIoQb4VOjh1pksIbeC9A0HCUVa-b79D1fSql7fa5yEOLhqiZrJcSgRgD1XkggFXahTbCtsqX5BdEUFowSz4kpLhfqtrT10b9No2wHgZHPmY-jbpE__ylv80J2P68GowW6cnNGY87--oLD9YOu",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Alex Kay",
            uri: "//maps.google.com/maps/contrib/112497667468245081491",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVU_5-Ygv-e9SsPOMfVZFRcaDlqFTM28WOa_hQQSuSfubejBua0=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o",
    id: "ChIJZ7aROYmTwokRc95v_J8fw6o",
    types: [
      "vegan_restaurant",
      "vegetarian_restaurant",
      "meal_takeaway",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "696 White Plains Rd, Scarsdale, NY 10583, USA",
    location: {
      latitude: 40.969953,
      longitude: -73.8060581,
    },
    rating: 3,
    websiteUri: "https://www.sweetgreen.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 10,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 10,
            minute: 30,
          },
          close: {
            day: 1,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 10,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 10,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 10,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 10,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 10,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 20,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 10:30 AM – 8:00 PM",
        "Tuesday: 10:30 AM – 8:00 PM",
        "Wednesday: 10:30 AM – 8:00 PM",
        "Thursday: 10:30 AM – 8:00 PM",
        "Friday: 10:30 AM – 8:00 PM",
        "Saturday: 10:30 AM – 8:00 PM",
        "Sunday: 10:30 AM – 8:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 191,
    displayName: {
      text: "sweetgreen",
      languageCode: "en",
    },
    primaryType: "restaurant",
    shortFormattedAddress: "696 White Plains Rd, Scarsdale",
    photos: [
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q6yVgUKIrOTzJ1L6Mldi974REJ4ihYvCB47XJPAdz3NhN9iMMI2NpB7WwL9UYNlzdQUbpLxYOR4MnERcxKWtDfFwH6ITR8fKbVkLpslh8xLUdR6yhBBCf7idDTTK6I0Oj4eWXgTY3FJijyb4aLnW9QXplFl_wnWs_yl",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Arthur Glauberman",
            uri: "//maps.google.com/maps/contrib/107011581015319368608",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUF_clVoSZmScPHXT5Ms-BUb8Jmo72X-xWBoI2U0vBLB_o86Ax6=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q5fl0xD_POhu-eeWSgAoAJ3338f1UX-hZYNNGlmz3jl_b0Xs5UcocXzVrev99OCAHBNDy1Tl1ix8gsZ3NnF929trnzsbD6Jr7BpD-vrjfdnHAF4fkqVV_bpbg7fwq3FJ0oFleDVHD2VHSjM-e3BNzgIASiF_9j3U56Y",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Anthony D",
            uri: "//maps.google.com/maps/contrib/113593374091455642063",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIAb03gYuo6tYQz1Cd4DyJmShfZGfc3PD0qTssU26NBcY4gzg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q6_Lr-XWe4sO-81WgS0q3DdljbZadKKY89NUdpDwKymRsj2y4Wo12avdjzt8ahFxHyXrQ6-lg7lLporxNfsyyS7fiHnHpDmirxQOBfR-6J1qEARD7Iwa1jNXJu5icUC5_yj7PQIaPbcJ1ASCDqY9f6OgwHmM9Nex-Q",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "O B",
            uri: "//maps.google.com/maps/contrib/103692497468421208893",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWjwnaVVjA7-gZY-VaXZ-Y0zCvzLwOwLhWmuqcaz7MMYIB_NhGi=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q73dk0lKJxRjRsiEFbYBc718rO6wj-XPsnRMjIdSuK5FjYD2susXbGPmjxVGLrDaaSeFsvJDaHRzukf9aAB53GJcVBojXA3Yg-2j8gJpF8UyR2S2NyAt9t840xknJsF53mNKWc-bCGtRbxH48lvq000JdLHasCik7t7",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Nathan Yakuza",
            uri: "//maps.google.com/maps/contrib/115302143144434841038",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXhpMjjMBEzNUWiYz0HQ2R9i3Hm31y7tA4-JVORNCtC8UAp5PcZ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q5Aeqv9rlpFpKmvh9oP4hw-9utX87DTKZpwL_KMWAnNFs34UfKd2-JN_FxpDYQmOWCsOMMNcSv9JlMD7fvMH01-Dfg8FfmDFr8AjJYe86ibPXziFggt8ERe27vzZj7PrFPoNxBerLDCJGkfGatvNAarYRZMxnGmAS3Q",
        widthPx: 3600,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Anthony Parsons",
            uri: "//maps.google.com/maps/contrib/108834210692397748717",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVKXxH27NdUl1QhGplW_knYdIgoFWOCw1m03C2L6n4npknNHPjAWQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q4ByhQEumeUou-ZbkrR1Z-RtG3_Np_feTXmDhscq2kE-POlqySWO7YAGOPfW4wCnARY2f__VTT2MhVpC5eiYpna2iCX0k6ZJX6nv_mp-TCy_UsAhAzbr6XcRCTD11AIDD58AM9A6GIb49GGehgaCD3YYA0rJm_fnwQ",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "O B",
            uri: "//maps.google.com/maps/contrib/103692497468421208893",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWjwnaVVjA7-gZY-VaXZ-Y0zCvzLwOwLhWmuqcaz7MMYIB_NhGi=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q739WCOcufI40G3uygGdj2RLcEvIzsAgfFW3DMXFHdVFQxbto2XPGNJZa6DBcMM0JtnCfQZ5uAQ8X_aVdDFv2MBqNFTS7b5y1VA5QrJZBIJ8w5VRDniVTP8YIIT9gMgrym8f9yHKEPsP156RhTId6HWcfm-IdEKt6zz",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Trix Gamma",
            uri: "//maps.google.com/maps/contrib/105538218373413180066",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKtOA6zfhpulr0m7gxl89HYYyLCxjDltnFR3Lpf2-m-o_E-sQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q7YJ4kzs4m8D-UI5doUkpne8LHukctTjCDvU7IMh07QfCSSfcNi1V3IQKuGj5zpbJgDsC0WRgWzy2wVwgw-sk8ofaMrz-DkSVUwJDehbCgqIlMU1KqT2vqLwcVhe9sGo6Ken6Oevmk_ItxoAZ29O-15VqJ78D7g7GPi",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Arthur Glauberman",
            uri: "//maps.google.com/maps/contrib/107011581015319368608",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUF_clVoSZmScPHXT5Ms-BUb8Jmo72X-xWBoI2U0vBLB_o86Ax6=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q4rJM5LwyMrGDJdROAnJuky2BKoafgXNTOjc2Ub_K3fZPk9mZoBqzwDLZToVlMQVgl6Ixc1u9HzG2pXoJcTbBCOt-x5KIKDOiIi8vkgiLHlq1moYCiMvoaRUyRvhuLeBBatwalFTz8FYVbS8zaoEEsQ6yqkGTlE-7Md",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Pinkie Lee",
            uri: "//maps.google.com/maps/contrib/106207340849886014808",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVgbqXQwjo6PqXai6gYvcr_01uBxS8Qsf2AvRvrg3TyECNQP4F2=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZ7aROYmTwokRc95v_J8fw6o/photos/AXCi2Q7V9G4HKl15N6HJEk-R98zsrqczgtrxft5NCWDcVeTDoWEVFuhzrj4oIJdheW2tJaMoJ1cQXO2qDZfDlHp_ySv25UsrYCvMuSkQmyre9jE8cxc49akj4onPW14h4FSQUFP8y2y2ljhy5HXpg9FgYUhHOQ_8f2Jyejbv",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Arthur Glauberman",
            uri: "//maps.google.com/maps/contrib/107011581015319368608",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUF_clVoSZmScPHXT5Ms-BUb8Jmo72X-xWBoI2U0vBLB_o86Ax6=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY",
    id: "ChIJsdgOWwKTwokRFMerkmAr0cY",
    types: [
      "italian_restaurant",
      "night_club",
      "bar",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "660 White Plains Rd, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.967052699999996,
      longitude: -73.806754099999992,
    },
    rating: 4.5,
    websiteUri: "https://www.giganterestaurant.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 1,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 1,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 5:00 – 10:00 PM",
        "Wednesday: 5:00 – 10:00 PM",
        "Thursday: 5:00 PM – 12:00 AM",
        "Friday: 5:00 PM – 1:00 AM",
        "Saturday: 5:00 PM – 1:00 AM",
        "Sunday: 11:00 AM – 3:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_INEXPENSIVE",
    userRatingCount: 381,
    displayName: {
      text: "Gigante",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 14,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: Closed",
          "Sunday: 11:00 AM – 2:30 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 30,
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 22,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 23,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 23,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: 5:00 – 9:00 PM",
          "Wednesday: 5:00 – 9:00 PM",
          "Thursday: 5:00 – 10:30 PM",
          "Friday: 5:00 – 11:00 PM",
          "Saturday: 5:00 – 11:00 PM",
          "Sunday: 11:30 AM – 3:00 PM",
        ],
        secondaryHoursType: "KITCHEN",
      },
    ],
    primaryType: "italian_restaurant",
    shortFormattedAddress: "660 White Plains Rd, Eastchester",
    photos: [
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q54-YO8hyVGDvvFG92GeS4alyQwznovrS_t-Pw1yfOBmiXKaDve753siGJM6FXkRCMpWs2ohgK8G9H9Z8LuxweP5egVyZJYSW4dk43spIkO6eZovdzLJ3t1ulgPpw-4A8lGGNdNLAtqvlhmqmMoRwTpjjto3MPYFdMo",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Gigante",
            uri: "//maps.google.com/maps/contrib/110627002007109250995",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXqrvUm0iIo-g92HIftEZLZqNy_ikHyXbDfqwaIBykqAOKlJA8q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q5hDNak2CvUmu-DhVKrCzm4PW5JifVhb1IM1XVl26-_X9dObnYljdC6zj2uB8veBRThzXWdjadr7uxo0yMBYuW404FmT3dLerLFlMz7GDUfiszZA4rV29J-GlGUN72e-G0mIkUZxoQF8aHHOppUPO2mdtu8QxmXfx7e",
        widthPx: 4800,
        heightPx: 3201,
        authorAttributions: [
          {
            displayName: "Gigante",
            uri: "//maps.google.com/maps/contrib/110627002007109250995",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXqrvUm0iIo-g92HIftEZLZqNy_ikHyXbDfqwaIBykqAOKlJA8q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q4m-Qev6q33H1k8JDOeD_dRziWWCY2m11s2Wa_J88VunAx4u5rrj67SU5PRFzXcysFsS9Euarg3NFM0wQxGO9NEnzoljEpNX6k45ei7uzAcrZcWjZzFIoTjF-OLJSWrcSIBwlaKqqJ70BjS4INxeqk7E3TS9W-F_6Ux",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Gigante",
            uri: "//maps.google.com/maps/contrib/110627002007109250995",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXqrvUm0iIo-g92HIftEZLZqNy_ikHyXbDfqwaIBykqAOKlJA8q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q7ON5IG1LgWUAQyydfRG7vhH0abeSWpoTZyWx_ePRoLA4lsoK2M9qAF6l9VhqvAR8y9GyM6FKL6idnLVT4bl_mv0WtKGQk5VUSHNvcBjPsSDkJyy_xOcB_B93jVsqI9fZCjKSUszRCsKolWU8I4RidFv8XBZT0zQE_i",
        widthPx: 1080,
        heightPx: 1080,
        authorAttributions: [
          {
            displayName: "Gigante",
            uri: "//maps.google.com/maps/contrib/110627002007109250995",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXqrvUm0iIo-g92HIftEZLZqNy_ikHyXbDfqwaIBykqAOKlJA8q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q6ePNGmHAVX6j-VAhkd9Hy6s3Hh9_cAwZs0A5ZBsApLtZorXX8DldUpfamG_zNuiV6F465Q2O9N4bjfI1E71YAuxVcd9TxZmp0UoccbegJhqFtl-PtDdk3-u69a2T0yxr65I60dLCA9Fyt72J7eQOjHOavprMJaRYf8",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Gigante",
            uri: "//maps.google.com/maps/contrib/110627002007109250995",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXqrvUm0iIo-g92HIftEZLZqNy_ikHyXbDfqwaIBykqAOKlJA8q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q7aVlsornwvSS_oXdF-rfA0IkFNqv4Usn9eTorvcwyIA0AsUsSFwLNqX29o1pJhB_8dLNxl5TdtbYSNC54RjaAhCGurpx_ohI-cEN4AKmp1lRxs5rnu-w0_jQJ0kZZJFpr2C7GbShq6R50ACfyUM4NoKklwHHfomVRk",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Marie Pavia",
            uri: "//maps.google.com/maps/contrib/101579886649390140224",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX5MCxW3B6WlDIXZWGfU49Dgjxs_kfItw_Aj2l7U28oMEf337MHhw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q7rwBUMTN7poeUr-wswThHduGXPUxEveN_QVv48HFmyDLalreFR2fW5daTAxi5YHr3E2n93yXhSeyHMG9DrVDKt-bl7rjXz4Hx1oc3nH7PoDzBqUIcMWjm1FuzDaRmoMbIxAUwQoPOIFQx9uHimsrFTiJ9NDTjsJxRe",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Darren Plateroti",
            uri: "//maps.google.com/maps/contrib/101344542437460749802",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXt7bFaxzajZoPDpOMonzkXNGsFI5akQlboX630EsBQ_WJDBljC-A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q4qC0a1CuCc0ACn6coR4IECLnqB2PreaOHgqoMR6QVHZ7ICZG2s_rNCtzBKD4kR3nEiTdKL2rq0VBCQNUPuSpYyXGXLDv8Wx6-wLTxYkyPXX4Ofak3tHRyZ-jFlcE0Vp3VwmD6rgWRaoW2d2OZQ4WcJJq0piTkjvVqG",
        widthPx: 3600,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Jessi",
            uri: "//maps.google.com/maps/contrib/113263006284678873475",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUtvhfHRyMj60YBfoYIuFKTApmD4mDGaHD-MYPlbt_Ve9DWij2v=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q5C2vDVCpcEfeSMUqq0qtF1za2ih-YpFe1FS-KUZXNn6cLhFaN4eti5Bp9T1eisqh8U5qHmeNTYyzj0nuSLGyy-MFf7pbKO9ifCh1Bj7B65RevV3AbzHrJrBv3On07Uw_kDaBSqiemhw05bU1En9gCDjgUa0kH6E5zL",
        widthPx: 1600,
        heightPx: 1200,
        authorAttributions: [
          {
            displayName: "Googlemyskills",
            uri: "//maps.google.com/maps/contrib/107430401041578557719",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUSprRCAgvyQ80IoWyeBuQcLWjk6IwBmCaxbZMMRXTu3C0G4QamYw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJsdgOWwKTwokRFMerkmAr0cY/photos/AXCi2Q6YpG8bgN84KgA4fWuU5Un0SGdZ5Mb8lU5czcOuxQoQKcRF8Wio5a_GR7n6r6MT-oVwTKVinnd94pPI5iYrrIkSamCFlbzk4POgsCa0ZI8qsfDKqamVSzBZkqTyfA5ZMdxie2Ed9I6P_BgzPHcaJCPRWgSaepcz3Bih",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Dominick Vellucci",
            uri: "//maps.google.com/maps/contrib/116345219794599247988",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw",
    id: "ChIJ--5iQuiSwokR7jxhtfFChCw",
    types: [
      "italian_restaurant",
      "pizza_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "102 Fisher Ave, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.956803099999995,
      longitude: -73.8167425,
    },
    rating: 4.3,
    websiteUri: "https://www.polpettina.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 0,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 11:00 AM – 3:00 PM, 4:30 – 9:00 PM",
        "Wednesday: 11:00 AM – 3:00 PM, 4:30 – 9:00 PM",
        "Thursday: 11:00 AM – 3:00 PM, 4:30 – 9:00 PM",
        "Friday: 11:00 AM – 3:00 PM, 4:30 – 10:00 PM",
        "Saturday: 11:00 AM – 3:00 PM, 4:30 – 10:00 PM",
        "Sunday: 11:00 AM – 3:00 PM, 4:30 – 8:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 427,
    displayName: {
      text: "Polpettina",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 2,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 17,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 17,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 17,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 17,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: 3:00 – 5:00 PM",
          "Wednesday: 3:00 – 5:00 PM",
          "Thursday: 3:00 – 5:00 PM",
          "Friday: 3:00 – 5:00 PM",
          "Saturday: Closed",
          "Sunday: Closed",
        ],
        secondaryHoursType: "HAPPY_HOUR",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: Closed",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
    ],
    primaryType: "italian_restaurant",
    shortFormattedAddress: "102 Fisher Ave, Eastchester",
    photos: [
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q5IatksZqvtuO8Bn7AeyhgbMdBNMsNf1cwDtfZLQn3V6S8vkjkeyqM11vNnQhAVDP_4aQlQEjzLXLAhIBn6y3-kagGGQ01Au3708zX15MfrHu71nUOngKCbGKVatL2wky8ijs1ltR_MmltU-A4TG6Scuqp5AfGH2zGq",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Muffetta's Housekeeping, House Cleaning & Household",
            uri: "//maps.google.com/maps/contrib/105457051218273602036",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVY1RGxGwIV3WXq5MczEHy8u0se8udfO_8kIv-FGzl1e09aMdI=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q6XYi5H7n_Lp6_YipTBRfyVFgnLCmlRhyIFYrEcMZiN4E0M9SfyWB_MoZsyekG41lXxFGdnXHfuL9vKRtwXqcaYghktKa2lw-kAuiNuGMgoOeuEPsI1HJiF5hy6zixWhKDR_z6qB7YljiK-mbEtgmXSCG8KuXD4jU4s",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "ML Ong",
            uri: "//maps.google.com/maps/contrib/103876713633083931019",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW_r50JhgdkBaSLfG3z23ZQfytAyq2FfMaUgSOsRJETzabYpO79=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q7qxA03fmItP_4j9f89RdiZl2U4kFzqHPhXNRJVBnDWHe4w83wT-zbiCQRWpmwM-2y7GlsBXI4_JpM5-g89OQvkQKHtL33kOTk6R9ru9h4A7h516myiryM1-xQgTXGF14ntSJEfwbX8LLP4_dKR5n51_Zm8eE9m2JDP",
        widthPx: 4000,
        heightPx: 2252,
        authorAttributions: [
          {
            displayName: "cory hartman",
            uri: "//maps.google.com/maps/contrib/117113678754225878848",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ2ZH3sAUp_WC4WVZdxYOSiTuKSHGBrqyp9xACvH7R8dMOtbw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q7MIBAznaZOtIUdb87WAe82_Gn3Vbb15utqzvUgqZu6LSpaU1jByjyt86z7VvFzMcjf-WKW8H2JO3uWV9uMjjQ_diRVT_ZP4CB2Y2PB6kLNEGrI6hDcgmYvPSF9D3CrAEDpSLDSJmTGTjMMjGvST5PR8rnWeROirjMy",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "J Lim",
            uri: "//maps.google.com/maps/contrib/109935156740971751576",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKYnG11pwVBark64wiserzR8n-rEfTAglboJ7aaEgmmefWHqA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q5l8vuS_IgOU4oHbIKvTcprJfXG6-OOCVOc0I_vK5NNnJiEm-72J9_Vodjd-iVDyjehZ-9BkERZ1z5LrKfV-kRbsgmDDtLv63iMaAEune4XNT3nJJQYPL2I_RNbYDYcnnbuhfEwyijIovseCH9-q-sly346BDe_nALm",
        widthPx: 3600,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Gianna Salmas",
            uri: "//maps.google.com/maps/contrib/112422668535582317523",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUBKPdwD_XhEp9TqzH8cd_YtCpQLtflV-5leBE7QOrQB99KcRvc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q5ohVv2eXtsHssCfjs89eAJfypCXOhEmVkbicM33eMj5RssTwjGJsWICu7Ej5IOF46F7o0iBZpvak1_47CNN4a7eS7rUBVDVINv_kciG4kcT5SsRWhYHbzOJwweX2B43f3vgLOZcI6eMwu2L0y9Eg03_lylHesmZePA",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Albert Belegu",
            uri: "//maps.google.com/maps/contrib/115126213285502150012",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJq7DbD2MZI3SNBz4CqXrjMp1NCo5qfZxu1WI_Mib3NBlcvyQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q4ygUKxOaJ2qlPwLkEfahMSpgS2BnYhGQVywF7U74DI5d2SomO7pXviQuWBtVzh7FXIOjOpggoV7Wz0dXSJwkn5_lU9WBpWLkA7YSgKpR5-i-yZclcSaU-JyQyO6_kHO_xkx-zWhedN8ho5heFDwpC9G0E6DOlxzptC",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Maggie H",
            uri: "//maps.google.com/maps/contrib/105905109091108364011",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUrk_-BPSIyptNscSnvoYDXFqWFkk5I056EVWvtAXBVGbB0aHtt=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q5ks2E5nmIv9sSTLnW10g1asJbwEmJnd42cy2fditBvTDJyTEzswc68XgTbCSHq5lAHTYx6AfUB7xfDgHvbiX7kEH3uH_tSoh9wM1lV6hcBTi7m-UE8Q1NXbh2N4iq_ZGHWNXFUufvN7xX0qQZNk267CfNHHS_weShh",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Malia Villafane-Robinson",
            uri: "//maps.google.com/maps/contrib/111182177539209873837",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVeGUQnN2PT3WDYX0t_b0k_VIIbn8sFYAcUyp4wjBaxd80mz9CN=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q7LrTMhKx2qicLgj6gohtIQBx6nWY-UiRRyYGQE8lyTrvCYguL79FCcEXgmwCLukw7HsLK8LE_UMHy0voUPjhZzJgPQotSiR-wa6PBZGrR9Uam4XSNrcz7YJ8ACTB7Euo7L5MGfnS6UP-R1OXIn4M2LjzPkAIkLmqw8",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "T Claz",
            uri: "//maps.google.com/maps/contrib/115336123914713811551",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXj7tUwf95VFY3i7Uey2K5F79YNztb8eOznSEWovQLdi-ayYwqA-Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q7-scN8FRpcwuwG7_FJnS6E68yiyFdp224x0EsQFZd7HWqBW1_0pi8nf1T0x1osffs8hFRwaPvNYM5kSS2Lfr0sgQPVm6knvokhHAVPasNAJBTeW_Owjye5cWRrnHqgAQPkD_8u4ECJOLlGLkOvgrTwRgLVcyLl_o5y",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Jay Shin",
            uri: "//maps.google.com/maps/contrib/116593646974560181054",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzKsu0oxd3cRHAHv4Rw0ZSHHi81T8uQMVmqLamHPrGc4T7SRDg=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU",
    id: "ChIJ3dQdIsCSwokRs0eyh6JtnNU",
    types: [
      "italian_restaurant",
      "pizza_restaurant",
      "bar",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "5-7, John R Albanese Pl, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.9496325,
      longitude: -73.818533899999991,
    },
    rating: 4.5,
    websiteUri: "https://ciaoeastchester.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 – 10:00 PM",
        "Tuesday: 12:00 – 10:00 PM",
        "Wednesday: 12:00 – 10:00 PM",
        "Thursday: 12:00 – 10:00 PM",
        "Friday: 12:00 – 10:00 PM",
        "Saturday: 12:00 – 10:00 PM",
        "Sunday: 12:00 – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 606,
    displayName: {
      text: "Ciao",
      languageCode: "en",
    },
    primaryType: "italian_restaurant",
    shortFormattedAddress: "5-7, John R Albanese Pl, Eastchester",
    photos: [
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q49ztGYFvERo9SqWDxz_mnJSxMPniYqcVz_rKSj9Q4md2JyfLf7_OzmGTZ6ihs-6-SNHqWsa2SBWZucNrVq4kqMZGssrYNm_x23Tair343v1CcIIEhFosY75DfWp3pgoJhN-hkX3IhrOBoSCinsAhXtWUka1DAQ9J6E",
        widthPx: 4800,
        heightPx: 3179,
        authorAttributions: [
          {
            displayName: "Lou Golato",
            uri: "//maps.google.com/maps/contrib/102880101573343990198",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX_8kVeoYUZApB790hDUekbmCMAj5-_pc_GvVS6ulITX5y7wem26w=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q70lbIYgtZAnR_BYzLhat5G2vOqLGX45SKBZOI0BKiSTd1SN0R-3XSygJr8VbxP5M0flz5CYsV20V3SQmV6OeAAHqJ5Cd1BMzAQdbDFgFd3O1PFejAcdypQ_XXxi0vUolD5mQF2QtalvfyQsSSAAqrWn55NWN0nsFX3",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Jenna Vote",
            uri: "//maps.google.com/maps/contrib/111299801266815766160",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJriZlX18i1Z_4DH1govj-a4IdGmdTCEgOL9PZ70_VNvj99mA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q6VCB8ntQS1cKGeq2LplUw6rOIHK0oJX8MIgC0Slg0BohhDAkwCciaj2z99nrf8BLfI4WgyBfkt1su-MaVntjpQZlDHg-s--TWl_OLmturhiuZckeGBTxA5VHHfvl8sNo2uatwvW8KFFDX5qFdge4l2p5FFFjP4YigV",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Jenna Vote",
            uri: "//maps.google.com/maps/contrib/111299801266815766160",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJriZlX18i1Z_4DH1govj-a4IdGmdTCEgOL9PZ70_VNvj99mA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q6WvgXjQuVn2ftIgc5AOxCzIqS_o6C7ni44RDdViZhPsAJbEHwXom-VXyLsME-Ar0-AsSUotQFk8OtYFUmf24345AvrLpj9Jrix-FafIicj1VacdPHtdKVs48lXAXBkfLRzNlEhZDzZ5N7JVKhJLczUEdfzOp6jcbrI",
        widthPx: 3072,
        heightPx: 4080,
        authorAttributions: [
          {
            displayName: "Arten Smajlaj",
            uri: "//maps.google.com/maps/contrib/102664203995006830765",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWyh0vpO_D25IeVBwXKj9mW4eDU3zR-seCEofhnNGthQ9Uu1Sog=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q4UOM7rW1p4TG5nJJ6iOhG2xhYASat7ymRP66wtxIUHLKHmPGfr3XuIxiVN4kyGrj7HqaQH_ceFX54nu3T49uJ8nJd5knrKNMKQtmCMFvdUrnQHhjbw01rEi_DZGxV2CqhNV9_104uJTXVUwE4nl5uNepkI8mkMfs2h",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Christopher",
            uri: "//maps.google.com/maps/contrib/107911222164872331774",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIt_67rX-r0d2gT09Xo7j3Av__6eiGpc-uEAgPLrkYYAKFAnA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q5bmc0GwxeYs2bi4kSgphGmuQcCvuMpQCj7DGCee_ekXpA_TXfGtTO1OS8ZEQ3DcwJZDx-efzKQ6RcHFmZV6MMcBOHMiCeEFIP-v285cfaBVooY93f15gHUrUhgHdPIBH3OO7rJ-d7GVI-hUO4RykRBJR2-KRokKO8R",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Nedim Hogic",
            uri: "//maps.google.com/maps/contrib/102315801071165511766",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKK5FP7T484k8VzX6G4IAcjcoU_Zyg1jH37-_qLZho940TL7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q477bIV-pLuQ1_GzC5Zyrrao3nhsde5oXy8dbHP9ta1AFD9XcB8OUwBZs_eFGVm1eQJ5reRdrGpK4qscOnfQ3SBeyp7AukltNPjJcPWF77acAVQsQWqsXZ5PbpzVHr0wC7Va9xOGadOjTVogg6LTHIYoOvV6ww4IaQU",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "T Claz",
            uri: "//maps.google.com/maps/contrib/115336123914713811551",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXj7tUwf95VFY3i7Uey2K5F79YNztb8eOznSEWovQLdi-ayYwqA-Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q5vMMPdHjnW8WNu2mm_hBCTM_swaUf1gsv02FIQGZW4w6EsxYYT8SJ4wAW2reSn0hbhdYjNgKdthlNaciur3777AGbpIqZnMaYozl0up1B_4RahO5Nt-VDnsjbiGEXkvDxzzY8UxMUvRL_5p2SeSgKXdVG7LPv7naxY",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Jenna Vote",
            uri: "//maps.google.com/maps/contrib/111299801266815766160",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJriZlX18i1Z_4DH1govj-a4IdGmdTCEgOL9PZ70_VNvj99mA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q42_G807lKZvn7o8EU0GOP5-5DyRbPoIqelNpkhYq63eWXSov3ToT4_hlO_Lv0z1bm3ObyL6hVqLiLubNyCI05hiZ9LeWrLBdvrOgJuQ4cdkCWv3qiZqhnxhBwZ5s3d8xrt16yj2l3C_UAKPH9phRvWZ0-SeV5q9oQ0",
        widthPx: 2252,
        heightPx: 2638,
        authorAttributions: [
          {
            displayName: "Tabby 007",
            uri: "//maps.google.com/maps/contrib/117574740610815778780",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWPh7iTn-ZgvbxzBxfXBd-IumHoBMPcbLyLHpePXQdSypz-unR8=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AXCi2Q5BH1FzSiw78dYsAht9Pklzqw2oTxOzWRS_kgImE7nuapeEoXsFL_lXmYccvTfSXXpbPqy9UL1kNMRN02iM6xIQ0jY2LEM-7UUlBDmjBlTynWyL5JhqF3jV5KHPNszY5qkxy_6zdJhINvoTz8iGoFVLte3y7rBzz2yL",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Franco Fontana",
            uri: "//maps.google.com/maps/contrib/104484406281956701863",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5apAeZmPNG6L90HI34uBWX1jJOhRQXwbBEEKSS3RSpq8cCpT9uA=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4",
    id: "ChIJvd_wzOiSwokRKwzdpR4KUM4",
    types: [
      "japanese_restaurant",
      "sushi_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "36 Mill Rd, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.9559032,
      longitude: -73.8125465,
    },
    rating: 4.2,
    websiteUri: "http://www.eastchestersushi.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 1,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:30 AM – 9:30 PM",
        "Tuesday: 11:30 AM – 9:30 PM",
        "Wednesday: 11:30 AM – 9:30 PM",
        "Thursday: 11:30 AM – 9:30 PM",
        "Friday: 11:30 AM – 10:00 PM",
        "Saturday: 12:30 – 10:00 PM",
        "Sunday: 12:30 – 9:30 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 638,
    displayName: {
      text: "Sushi Castle",
      languageCode: "en",
    },
    primaryType: "japanese_restaurant",
    shortFormattedAddress: "36 Mill Rd, Eastchester",
    photos: [
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q7OM9iqeESdEm7Yxncr8orBJ3ulRhvKhH6sttqWIoPGvL64dZS5lfOYl1rB36IEgwlMKhaOrtXlQCzpJ1yawlssRURfZB07NK4GuzDIB3UX-CsIGQZNtYiYpJjsumZxonEYGlpCKF1Ux4JwY5cm51mtW3aaYGekLWMt",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Bianca C.",
            uri: "//maps.google.com/maps/contrib/116185846034886264029",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVPHPzu70ySmPXIn0hvpY7LATjAvL-8ffHTtSOjtXEsY5rGCVRSjw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q7tq8bNMN8wADkvXxBiZNn6CTZ7iJY71G43IHNs7Vd2fzRKpue5K4iirK0K7oIu_S1330DLo-C8Nb2T2Lrqxy1XF6I07AvMFPdPTXKWLUQbNQBsFgfxCAmCfxY1pkfFp0C1TXQrNxKEg-53jbVADh0ce9IeicUfrixz",
        widthPx: 1017,
        heightPx: 612,
        authorAttributions: [
          {
            displayName: "Sushi Castle",
            uri: "//maps.google.com/maps/contrib/106612539680170731762",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXj_G2kkzBzQIO5hZ4MHLWKdF0u_UBLZ6h98tdDjH_ZB45Xe70=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q6GtsNlLOx-KP_pf8mWwXR4DSY87BBbMnE2xqb7EUKsoK5ig1lTDmLl341s55lk4NQOEBaxt7A1fBaZoDjgbYFMTIaTWe8VLhKfoubbp86oslPV5kM1cWhsdDrfyaueqx66u4qu2OGldC-ZqIM2bfLlVqxKdWAdEV4u",
        widthPx: 1712,
        heightPx: 1284,
        authorAttributions: [
          {
            displayName: "Bianca C.",
            uri: "//maps.google.com/maps/contrib/116185846034886264029",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVPHPzu70ySmPXIn0hvpY7LATjAvL-8ffHTtSOjtXEsY5rGCVRSjw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q5v_lQaBsyy_G3JP0w5Ku8TAs_ZwO2McDxX7c6LPWBq8_JwoBUrNjtY6Les3ngaXzXErdypkLXTMqpkD7hTX-qofyGFKL2Q6-NnmQQOUeToIYBLX-urdY8D4Otj_zLrVxiDKVRtTMcaDm7k8Rxl-f-gmzX4gsvbDRMl",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Lindsay Baum",
            uri: "//maps.google.com/maps/contrib/117886812567082072385",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWbtQxNnCFQ7FYcMKUYQgck9CZtme7DiOdFG83Sft3YIvO21APv=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q7D4kQsne3up16THy1D_o95_kb4c0pf6-z8M8NBuddmcq_Irt3bj4IVz5Zrj6-k7gYkOBkJEvbZr4O1jY_sbHUzhWL_3xfnrzyVYXWtWrdXzUyjhjGgJKycBbNBVJrJPPrs11n3Anbw_SfXp6ZgUV5vO-oTy9O30bpG",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Iris Z. Stucchi de C. de C.",
            uri: "//maps.google.com/maps/contrib/112442927169769262813",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXlEwygxg5DhcEyLzc-teFQf9KHGkBwefjYR8Izq555bEbuq-gr=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q4eZHeE897GetI_r6oazBj4oofaiq9_4zajBFf-d97OjDnGfrWe3l6s983R-FOZ53SqAcwgnXkis9XokPDEO4p7jpTFvVNcq3SEmmArBH9Ti0hhUtMwQ3ftrWBPpZM-gI1J3qEW-nyFIUgKO3mUnIyI7ujvioOB6NBr",
        widthPx: 1440,
        heightPx: 1440,
        authorAttributions: [
          {
            displayName: "Long Ho",
            uri: "//maps.google.com/maps/contrib/110854011937575254013",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXiD0KpDr1ihiiRGlXfa8x42rwn1XNSN2HrkkdTaYM7KaML1F3L=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q4hNFIuxrxqGEfUGI3XCd-TQJzwpIOS2SthC6EAdMgQ8EutIWCEcLZ6zjRR1WA_UPiCaM0GJDmU8_8xITDwHwnmJyHyGzFfie0rIqxNY2p5GuNDF7f73yDU5rgUMbvX-VuS7U1ocYNzjp1EAoOeG7va_MyA5KqGLxby",
        widthPx: 4618,
        heightPx: 3464,
        authorAttributions: [
          {
            displayName: "Eric Velazquez",
            uri: "//maps.google.com/maps/contrib/110693572211916477709",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUsXrx5XhHKdaB2taPkBG2ftlIjmOSyAApczymt5otVVaOuerUZjQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q4XcULi5cdYfQyYVZ_xDI9KrYw5OWOvCKE0hyem1eB7BYwoMhHsE29SN8KjhxILT_76b1dmJYYNVwnHVrEnZUs-5kRDo3ICa3wcMw2Vwp_qxiSPCMm-U0i3EHj9CauRMGXyRB9tVj0cmx7TU-WefNTsIRb5S5QZqyyg",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Mei Ly",
            uri: "//maps.google.com/maps/contrib/100509301056425583485",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjU0u7J2TNfxF_rQMWtetUd0xutbAAsVfrtXtmph9T1pIAgtp9fJ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q4NQkcD65r6Sesri5783kxLW5rmz1DihGeYt26XBf7IltD1ev6u5Vs4iVjf0DLlT7VqUjOX-kQkE6AuOBsegoCZ1-gvZVNVDEJHtU22c-hU4ohRhb7LfRN_T65ziGq96Jnzmc5Lpp6TbM2AdT-VncvBN1PKNzSYRTrG",
        widthPx: 1440,
        heightPx: 1440,
        authorAttributions: [
          {
            displayName: "Long Ho",
            uri: "//maps.google.com/maps/contrib/110854011937575254013",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXiD0KpDr1ihiiRGlXfa8x42rwn1XNSN2HrkkdTaYM7KaML1F3L=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJvd_wzOiSwokRKwzdpR4KUM4/photos/AXCi2Q6rdw5B281vXfbdW8f4BFHSnR0uakygmrdeOt9H81rUQmREpEcK0Th8uxvq_PIAVUR-xRPBlyKjTSd5AeMEF6WObnYGXnezQM4hhVmjGG8DX7tSuaMot_xhCLJtl3leaYunWkgnB8gMES6Qhp0jYWjrHYFLF8niFQRt",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "KC Choi",
            uri: "//maps.google.com/maps/contrib/102587242510383059186",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWTBGcR9F3i_H-xjc6yYo_p4chWxQREuFCPNA6dksQhR3oDfaj-Og=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk",
    id: "ChIJdXWPRu-SwokRa_l7nmeaCKk",
    types: [
      "sandwich_shop",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "33 Mill Rd, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.956421,
      longitude: -73.811545,
    },
    rating: 4.5,
    websiteUri: "http://www.masonsandwiches.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 21,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 8:00 PM",
        "Tuesday: 11:00 AM – 8:00 PM",
        "Wednesday: 11:00 AM – 8:00 PM",
        "Thursday: 11:00 AM – 8:00 PM",
        "Friday: 11:00 AM – 9:00 PM",
        "Saturday: 11:00 AM – 9:00 PM",
        "Sunday: 11:00 AM – 8:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 551,
    displayName: {
      text: "Mason Sandwich Co.",
      languageCode: "en",
    },
    primaryType: "sandwich_shop",
    shortFormattedAddress: "33 Mill Rd, Eastchester",
    photos: [
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q7A77BlNFrRCh5Vm7DQ41Gigd2QVRY3sUL1b9UTmthOQ0oeARXa6Q9j_VYXoV83vvsMz-VMcudjY63QHrWU8RP7C9AtBGAG15hcHSMOrTMtr7qf-NtsXcb69j62yq1Zzu4Q0jRFqQ16uinZjllZ8tAj9tI9OTfmGLfq",
        widthPx: 480,
        heightPx: 640,
        authorAttributions: [
          {
            displayName: "Mason Sandwich Co.",
            uri: "//maps.google.com/maps/contrib/117174005420327472282",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXy-o-DvI-iKafrczx8k_W_Aq4e_Rb32r3-RV_wfNEW487tfTKC=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q4KjA5hpU7ee_d246bk7rIU5P_H_59XFDyi3R-ZYmDnxzzIZG433hDEOPNJ3FxB_u3g_oZA7KQ3Y8Os5wnmpkKFcHVuujbn8SmUjoVdDkpx7cHvtQdKURRGdrw7IMrA3k-r4NT5FwG8K6cyeJsn57QxfN_WhC3Gz1jl",
        widthPx: 1284,
        heightPx: 1474,
        authorAttributions: [
          {
            displayName: "Mason Sandwich Co.",
            uri: "//maps.google.com/maps/contrib/117174005420327472282",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXy-o-DvI-iKafrczx8k_W_Aq4e_Rb32r3-RV_wfNEW487tfTKC=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q7rn_b43LGypHZz7Diyd6WEOV7kWZm3ZPqjXDDGjatYokBBeNfggeZOsLEi8qA_sofvlJ7knKocJX0avuz9xbsyZ6BgMTYe3qO8G28zvyi2fqIGrZ3Psc0NihndoETL1Ad3E1w57EG5JGmWnTvfJaD994H_QRNCsKxN",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Cristina Cruz",
            uri: "//maps.google.com/maps/contrib/108566340892873914144",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVXNl0uvXJRsFxY_jRCJloDJsRhLNNXTqi9QquFTnlayYeiGIgf=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q40tmeC6U6kd-Jr_iXHf0S-MQMD7vCl2PMQ4Dw59j5GBKHGEQhzC8PJjgVMf33NuSlaq_5pCeIDGc0gHnF8fytBZGkiKBTsgPs3wEt_9KysvMITaPQknUynpP0vfXxuktX45vtZHERZg9kK4H05tC1WcGgA6yfNLkk_",
        widthPx: 4419,
        heightPx: 2946,
        authorAttributions: [
          {
            displayName: "Mason Sandwich Co.",
            uri: "//maps.google.com/maps/contrib/117174005420327472282",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXy-o-DvI-iKafrczx8k_W_Aq4e_Rb32r3-RV_wfNEW487tfTKC=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q6ookdWm23qUzbluS7Mq3cYtblu82kktdkWdFSa1hb5_hTu0seQELMOmHVf3g5q2ZkRLak70fEKacBxI99RymK7r8bd9rJgCltMZhdsm9lgTABYPBvYFanGPZU19x-8TuK4KNEkTk6E08XZqv1cQlaSs2OzBVfBtJKW",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Rich LoPresti",
            uri: "//maps.google.com/maps/contrib/105616908630415566190",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXNVZH4g8di7rLAO-jHn-b5U4gDT6LbDauQFfGk16MELWivBX3kZA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q5wguaxyZdoQu0gyqQs5C5KkUeHVHs0oPHyeyznd1KS85mBrsipBeI9kJR1f8x7KWqrBOXffgM8nHK5GmL3qHHY715FSYGCk3evkWXZU0jDF_mDUyT3kP-e3rk4c3hGXrA6rPh_v8EaWRPckM85QIadB8rEm3pdHt8Q",
        widthPx: 476,
        heightPx: 640,
        authorAttributions: [
          {
            displayName: "Mason Sandwich Co.",
            uri: "//maps.google.com/maps/contrib/117174005420327472282",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXy-o-DvI-iKafrczx8k_W_Aq4e_Rb32r3-RV_wfNEW487tfTKC=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q6sM3eHKmJmm-7CdpzDeFINHWIIrK-e-iysHSC0KeT-Lj0fvSopsqcXMg1I_0PostuRYELtg6zhMjhPz0QQ_2Z5So4-HP8v1yV_hnHpo6NqUr7bmYtSoTVgtc6im6Sqj4hbBf3f6lDRcJDdP9wflO0UqvzyWCj20NRj",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Cristina Cruz",
            uri: "//maps.google.com/maps/contrib/108566340892873914144",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVXNl0uvXJRsFxY_jRCJloDJsRhLNNXTqi9QquFTnlayYeiGIgf=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q6CDbjDUt76urokInENZEKFoDmTbOeUv9DrJ-M51YWXKL4bzCt0pkYD9DHEnCprjDaZ2UmQWU_hjBM8svVAFJodO9Wvmch4bqko9NRJQkO1eK_K6jOdoOsoe77YuypFeImsMW-1tXlNK51b-zxut0HrrPbj0IDOyyTm",
        widthPx: 4000,
        heightPx: 2252,
        authorAttributions: [
          {
            displayName: "cory hartman",
            uri: "//maps.google.com/maps/contrib/117113678754225878848",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ2ZH3sAUp_WC4WVZdxYOSiTuKSHGBrqyp9xACvH7R8dMOtbw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q6FILsUuwdpacBhda3Q_fq0mg_l6zQKyscFonWEPr2AhroHkmx1LIqK4s4es5l72JZVbeke5bzm5ns1MX3YRrfZIkuo4MxrzPrAleY0GkzWKF_E_IBw_IhXJVOjU5J8Gefzlyhl4F89eM0NKYE_b8p5McEtLm1r_SrK",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Aurelia Baker",
            uri: "//maps.google.com/maps/contrib/112229304119874866482",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWtFdIpALY4kZ0qWrdK9Uq1D01oYOQspNultz7shO-lRAxz4XJk=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJdXWPRu-SwokRa_l7nmeaCKk/photos/AXCi2Q7nGrnSUtudBdW67XPud2rkGzC2N5-uC5ok7bU-BoDeY_a1bqbu5MIf4A4qDrLJucbYKL-85wQKlJ9tEuXu9bohwm2YJpci-xZRX6YLXJ0YhxG0QqMJEVkz_6JaXiYP95LgArm_h_Y-jqrGKpdCLTcVCqRvBjhVevE6",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Franjez",
            uri: "//maps.google.com/maps/contrib/112464858785745680405",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX054yhN_LPVH-1PywZ2qPn-1t5PoxvuKIsVK4umjSTY9EHYMyx=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJDYixUwKTwokRPRmLS0smLjY",
    id: "ChIJDYixUwKTwokRPRmLS0smLjY",
    types: ["bar", "restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "219 Main St, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.950269299999995,
      longitude: -73.818876,
    },
    rating: 4.6,
    websiteUri: "http://www.jackseastchester.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 2,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 PM – 12:00 AM",
        "Tuesday: 12:00 PM – 12:00 AM",
        "Wednesday: 12:00 PM – 12:00 AM",
        "Thursday: 12:00 PM – 12:00 AM",
        "Friday: 12:00 PM – 2:00 AM",
        "Saturday: 11:30 AM – 2:00 AM",
        "Sunday: 11:00 AM – 12:00 AM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 342,
    displayName: {
      text: "Jack's",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 30,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 22,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 22,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 30,
            },
            close: {
              day: 6,
              hour: 22,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 9:00 PM",
          "Tuesday: 12:00 – 9:00 PM",
          "Wednesday: 12:00 – 9:00 PM",
          "Thursday: 12:00 – 10:00 PM",
          "Friday: 12:00 – 10:00 PM",
          "Saturday: 11:30 AM – 10:00 PM",
          "Sunday: 11:30 AM – 9:00 PM",
        ],
        secondaryHoursType: "KITCHEN",
      },
    ],
    primaryType: "bar",
    shortFormattedAddress: "219 Main St, Eastchester",
    photos: [
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q7hv9bIHG2xK_kEYkT0kv2bMxb4yp2HY8XsR0rnir8hvJKiDRTq0S4nsRsnshtFUSY4lloVVxMNTd-7KEBSekRh5hPnQhETb4Y8JzNvFpAP_KqBlGhan4cXjmaCqU60eGPdMTJ3kR6gn-hzsFiB30woEJla1W1-o3-W",
        widthPx: 640,
        heightPx: 480,
        authorAttributions: [
          {
            displayName: "Jack's",
            uri: "//maps.google.com/maps/contrib/114144078933753421404",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWhVCxMfSOgUaisdkOTvMHU8Sf1Mlwk54Uurdwnb60ON5XG1Vg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q6pZUz2mXrtQdrf5GMjne_94wRyE5FrepojA8QVz7Hmf-0gnj9wm3UlwBNMKPzvAJPjje5M6toIo8DxEQN5HHZuemOLacmG0JPqOXkZtd0hBEg8iXFdqeNaGuPre2dzEAwax8LEAEh1EAK0t0AvF60z_Lvre6gOs1Dd",
        widthPx: 1284,
        heightPx: 1645,
        authorAttributions: [
          {
            displayName: "Jack's",
            uri: "//maps.google.com/maps/contrib/114144078933753421404",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWhVCxMfSOgUaisdkOTvMHU8Sf1Mlwk54Uurdwnb60ON5XG1Vg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q5Fe55ufG1ufulM5dGE8WZ0FSV2q0WISGsKFUVP24-LuW5fJH0UWAtpD8N3IulLn3_6hdtXXJx5FAuJxsfMe9mNSgTrTzVCknYNXeg29gK1db9-klnOkcBJ4M6VjWg3x2o_UNKc5-HzS4XB6dbT7gCG0npF12CjVdQz",
        widthPx: 2610,
        heightPx: 4640,
        authorAttributions: [
          {
            displayName: "Yalitza Rosario",
            uri: "//maps.google.com/maps/contrib/108455200207497416099",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVCYDwYnCScxCYBtnTamNSMmgLkhcH2d2srlh_aLKmo8nlniPD6-w=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q4qmtGXRyE4wylvo9xhc7KYoOszcLYfMzsr7L9BRXheYtyTYSDnGWyWPdnwbQ_XZ27qAqu6wFtxeKYaFpNzPKpCebkzXjYBaqfXJKF5JqjHgs-048CEc8kPBazSZLrRgxDLLv5wKTVnkeHPW9tjiqjZlmHhj01gpmvj",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Jeramie OK",
            uri: "//maps.google.com/maps/contrib/102502995502536648210",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJm6LK9T4GO8H2o6Ixn085dgQjFLDzaxhjOGzRlIBqZhTYd-g=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q5G-2KyYrxaAiFZI1rY0KlTA1431FCJi3RULi_9iKWQb82j0x67J32PjpBf10Oxw7AIFcMS5kVVn_Lgxe97aUzfxfrO_VTIu-cu3WpreiRfzb9MVfVyTHXdewI1zV5CUye9L-ayVQd9DUjFzKRjfLRDKkAjjcsiGd5j",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Jeramie OK",
            uri: "//maps.google.com/maps/contrib/102502995502536648210",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJm6LK9T4GO8H2o6Ixn085dgQjFLDzaxhjOGzRlIBqZhTYd-g=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q7y8kegUBTIV9rgHiN7I06IOA9nNWA12Yno1UWk0XxRQoELC82N5C7YOiltqOttsOJ5nRjuhBATAervTUQDP60T6cOYMXyWXrT6NlMOKH0HYKtJkxDzj1bEBv4xryfmPUT7tVBlNufPW3doIgIEerfVN-ehW38BI7es",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Marie Pavia",
            uri: "//maps.google.com/maps/contrib/101579886649390140224",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX5MCxW3B6WlDIXZWGfU49Dgjxs_kfItw_Aj2l7U28oMEf337MHhw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q7hMGr3esQKWiNbHKFahW7LDw2ui9cKcsECtnTnFl3kxsA3Go1jgD2L0XK32mkZL9bnGPUZlkDASQdPMI1BT1bdie0kiK2V83_nA91DxS8-tVBB9dfQn-4tNgTv7rR-vSTPzmYNfNo1sWAnmN0cgodjcFj7xubqZ7Hp",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Jeramie OK",
            uri: "//maps.google.com/maps/contrib/102502995502536648210",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJm6LK9T4GO8H2o6Ixn085dgQjFLDzaxhjOGzRlIBqZhTYd-g=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q7efqgPkVXqBPmSSMtuXZDkycB2QvY-TQK5Dd9ryue6QYPTrivBlc5yUYXjiBloY8x27hI89j-OW--aPV-ARuVRqb0sJxgVUXgkZf8xa6Y3pkSfId7Cc9NR-7B_WDOFS5m7IN-q7_r-wW62AlT-qKVmnvusEXiTFE4c",
        widthPx: 4640,
        heightPx: 2610,
        authorAttributions: [
          {
            displayName: "Yalitza Rosario",
            uri: "//maps.google.com/maps/contrib/108455200207497416099",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVCYDwYnCScxCYBtnTamNSMmgLkhcH2d2srlh_aLKmo8nlniPD6-w=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q7Dd8OuQT81LV-qQIgEp8HGO6rNViczo31Asva4q5s1IwTWcptcbcq0IGMfOlF4RvxzWqB0KZ0-IqvJ3Be4XBVPYPYhK4EXXAd6wwiMZNsFLfYlOQ7n2T-S6TNNhibegO1_VMZDsTU-AYvFjCiWKCWU98bQfxau0P_J",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Laura S",
            uri: "//maps.google.com/maps/contrib/102477198696170101239",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJXIaflwRaeXGCu95dcdZXWZ9sBNi1fFTtvWfyquOA3bmQHrQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AXCi2Q42HfAg0gSnoQj8KEW4gCdoLrZu-9ERtXWiq60Gfj02I9l7RQiy574dFYstjsWKZ0KK4frMx7ptE_-vGqi_lwSjJRjl1DZNZdJoXPCfiHpuIL3WsbApOU8VQFpKKEfQvIoIeKrXk5lP20e4pLipWD-mGiV_nbbtxpX2",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Yvia Laguerre",
            uri: "//maps.google.com/maps/contrib/112918318986860252877",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXnvQ4--fFCCGYT3yCclRpdE9tk967H_pMYSCd2N2e5AvNNp-yP=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o",
    id: "ChIJVQGVOAOTwokRTb7nlptnV4o",
    types: [
      "italian_restaurant",
      "pizza_restaurant",
      "meal_delivery",
      "bar",
      "meal_takeaway",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "696 White Plains Road, NY-22, Scarsdale, NY 10583, USA",
    location: {
      latitude: 40.9698766,
      longitude: -73.8061,
    },
    rating: 4.1,
    websiteUri:
      "https://www.serafinarestaurant.com/location/serafina-scarsdale/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 21,
            minute: 30,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 – 9:00 PM",
        "Tuesday: 12:00 – 9:00 PM",
        "Wednesday: 12:00 – 9:00 PM",
        "Thursday: 12:00 – 9:00 PM",
        "Friday: 12:00 – 9:00 PM",
        "Saturday: 12:00 – 9:30 PM",
        "Sunday: 12:00 – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 192,
    displayName: {
      text: "Serafina Italian Restaurant Scarsdale",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 15,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 12:00 – 3:00 PM",
          "Sunday: 12:00 – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 15,
              minute: 30,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 21,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 3:00 – 9:30 PM",
          "Sunday: 3:30 – 9:00 PM",
        ],
        secondaryHoursType: "DINNER",
      },
    ],
    primaryType: "italian_restaurant",
    shortFormattedAddress: "696 White Plains Road, NY-22, Scarsdale",
    photos: [
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q6MGzHZ0kFYy2xOZ4gO0Q1Vvac41tNBMhk4fTamTwa0-974KM6py6juR9X2s0csAROT31Hrkx_iO4VUJy6gGdbygAU2_lkHgcxlzEnOFgO2pbnelnOyuFDOnyFKf7g7dxq7RthZ029CuY3l4FWwmP1VGXSdsx4VQZTZ",
        widthPx: 3535,
        heightPx: 2653,
        authorAttributions: [
          {
            displayName: "Serafina Italian Restaurant Scarsdale",
            uri: "//maps.google.com/maps/contrib/106644107406854249277",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV_rQ1bJLcS2VWvekO0_LvlgF_6fzzEBFqygYfGBxwOH-f1NBmD=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q4sxwJ-7D-bXvZ11HwlKbeEvaXeJpl5SBPF2Zj7rQrKt-zPaCNj_IW4skSEfm-mm3MlhRXSrRN7I1hRvY4xi5s9msTfEcHxqS78FrckpCM8um3tBLo6QB-_bN6sKZMvuEVGZ1zVrhmuaHKrkvlOhm0iXL2B6EgUzQzN",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Serafina Italian Restaurant Scarsdale",
            uri: "//maps.google.com/maps/contrib/106644107406854249277",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV_rQ1bJLcS2VWvekO0_LvlgF_6fzzEBFqygYfGBxwOH-f1NBmD=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q4QRzt-HaWJqZCaNTQ7ea_Bdod7qpm8fDTkx0HJ_QfMZZxMes9yjDgG8xKrAMHzAPD09OzUmMSYOqrb94Xf6vE2wZv_b1drJxY0YkWBR1feRMGBKK1RM6t6kc9LrsEkc6x8gMmOOeoZY_tG5ksc3-1orTpqhJVBgkS8",
        widthPx: 3600,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Herta",
            uri: "//maps.google.com/maps/contrib/116091518199794408654",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzF2_W51slavYJ1Yfl00N0vDXgn7U26jscDZpwr_GT4lNhjn6l=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q603azknXCmvr_CJYB7UbudU3AVWzRWufIx2y5wM-um27iG-KedNGjLv78jPlhHO9y8UKF6nG-S4LznVSmOa1vkym2XVcbN8zemsAlm2KLJSesC1Ssv42PeJ05UK0Zx-zt2ruQ7Ypj6Pp6fKY92EQoTthsP7FPcSBmU",
        widthPx: 4000,
        heightPx: 1868,
        authorAttributions: [
          {
            displayName: "Luis Ruiz",
            uri: "//maps.google.com/maps/contrib/113543986670124079972",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX__zEYY8Jep0HjiViNkzVQY-w1hAjtidcI8R_sWWiXAzYZnVC9=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q6AMUs3gzpkHP8rt7e2GUQFN_YyJ8hrhkAEFUsluJp7ALSEIDULtp8VM14AtIrH_DHPTwdg5MP-qBiwjmYPXxdL-bq9LIyaczQSrsz8Pf3vnVddHQXGInU8y83AC5_vVur0U4C5EVHGluXKCUONqJ4ALsIhtZPyDjHC",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Joann Hassan",
            uri: "//maps.google.com/maps/contrib/105451520381023512013",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLv8pVHoDdOJBNhY6OgeHhoOwp11I9WyXy329ZUKm5_S75xYGtZ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q7Tr_jXqMyRF9uitzMBpNC0gFdmPGwjSSCnnIGurTGDkb5rBzmXx0xORvrs5ocSDsJuU9DJyoXj6ms5uI-pUTFmh7zNZhRGNkMr3jjzYvkz0ywo-lFkTw0DLKy1PxXhvjfdX-rld_owkzLGz7YFiSJ4r84U-xENfDJG",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Sweet Wheels",
            uri: "//maps.google.com/maps/contrib/112656066010342058497",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWLb9z2efEpXiBriM4U2JO1oP3eTYK9gwfw4CV9GdKyiD2R9aOC=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q5w27MI9E5OdFtzMiBeeg6EnrinV17w7N6jGJJ4YAYmmXTsxkv05eSCxIV-47teEc73lml0p1o30j5iFi7uG-j2Uy9-oY1hCKa8unKgUqZn1g4XVvXyVl8wSU0Ld99bNVGIyHZMDvCUN4D3En0xk_qjDdul7dEJnJpj",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Dominick Vellucci",
            uri: "//maps.google.com/maps/contrib/116345219794599247988",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q6if6wqH1yfHKe6sFFIhoWF5KmcfmQYHt1TJPCpWj3hZWzh6SSFK-gYB1C_7dtBNQx3r_8bK6hZyLtvEy57oW2XdN0o0kONR83dxiObxToESZNIv-bvVcSCvOLU4fPVPFAGSZiqEHDpJs5kl_Jyl12aloVEkO177zgZ",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Serafina Italian Restaurant Scarsdale",
            uri: "//maps.google.com/maps/contrib/106644107406854249277",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV_rQ1bJLcS2VWvekO0_LvlgF_6fzzEBFqygYfGBxwOH-f1NBmD=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q7_VCv_V-SUozOLacAmMOC3eaM4S0TySnUTUVzZgTqV3l2tQM_LckpmPE53WY0BYggQTVs13MQu1M2ZK-FvuYc4q1fI3_vujmH7tmN-jxQkecnyM8BGjH06BNB6nBvqryzkOtA-qwHQtFWwqXc4YKS3q_7bLsT9AwU5",
        widthPx: 3614,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Ethan Fixell",
            uri: "//maps.google.com/maps/contrib/109757193752719986290",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUAVINn7kJAOASY36pmRQPYk-633MpLNygac0ULA7_NwRF10ouqSg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVQGVOAOTwokRTb7nlptnV4o/photos/AXCi2Q68q2xOvtCHtEa4HUc4ZLAPYFjK9ums7cESHGRXcvgrbj9vrzPek7Q0Jpl3Ege9klc_mOusLOxMuos87N8Qz8rJK4jZCzUYMcQiw7hcVnOsTmAehVysUOQxEN886_WGomlwwhTw5h0iXUgSuGlXJ2H4GYBSQRwBxhbz",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Serafina Italian Restaurant Scarsdale",
            uri: "//maps.google.com/maps/contrib/106644107406854249277",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV_rQ1bJLcS2VWvekO0_LvlgF_6fzzEBFqygYfGBxwOH-f1NBmD=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c",
    id: "ChIJc4PrvuiSwokRB9FSa4E-M2c",
    types: [
      "hamburger_restaurant",
      "american_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "433 White Plains Rd, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.956677500000005,
      longitude: -73.8138207,
    },
    rating: 4.5,
    websiteUri: "https://piperskilt.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 1,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:30 AM – 11:00 PM",
        "Tuesday: 11:30 AM – 11:00 PM",
        "Wednesday: 11:30 AM – 11:00 PM",
        "Thursday: 11:30 AM – 11:00 PM",
        "Friday: 11:30 AM – 11:00 PM",
        "Saturday: 11:30 AM – 11:00 PM",
        "Sunday: 11:30 AM – 11:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 963,
    displayName: {
      text: "Piper's Kilt",
      languageCode: "en",
    },
    primaryType: "hamburger_restaurant",
    shortFormattedAddress: "433 White Plains Rd, Eastchester",
    photos: [
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q5fd685W_SNDTyHkH9v-t773IJQ2CUD3D-WnIEJ5uGXdcqHSzZiVR6ziePcvUx3WF5Eo7ooGZFXsXmmwDkTUl_FGQ8xNoTjtbUDDX6nTuZ5cqINbSe5kDce9o3xYRihLTusBAJeaQcw30_C5MT5xh2FZafPRJhbP0l5",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Justin Jose",
            uri: "//maps.google.com/maps/contrib/104461110991213594947",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIkNNYNWeD6XfqQD6Gv-6ELJ5TVcrAMy8P6yYCadimz4iSfsg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q6A50MPoe1NRJomxEPhVY66sTRGdWzESPzVdBL5li6L86iyxIjvrfWesDVkcuOZZPuDP8EeRcSFI0Bjfl6m-5IDKxIh2Z61RrFn8NHv6lH_50wLPn6O1rNC10nMDYjWoXX5VDsY2mqP-cuEBqA1NXQM6OFNNveXsVJj",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Michael OSullivan",
            uri: "//maps.google.com/maps/contrib/112973660369400591056",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXA3nss9f2BdBEmXIkHZplyNN1GsfafMtzLe2orkHuOvWBcnA0KIg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q5cevkWomxfigYlNExLBzbi8HN-NmSFJTsWi8FHmxE2NSMBe-Z7hBmaOv-1OKq8MoEMMu-wXcLr_Cpk707v_spaoElvfaXaHEMRnm60SWwC62s4zr58_bBe-libgIEg4XiBcn3lLt0rLVLbc7mDVmBTAXpNrMz1XnGM",
        widthPx: 3284,
        heightPx: 2794,
        authorAttributions: [
          {
            displayName: "Space Dandy",
            uri: "//maps.google.com/maps/contrib/100563658592719678557",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUpsyu8vW2oXbHTCKLwcc5cH-Jvk0s4MCCm5AZoYHbnHtDP22X9=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q4h--y4pBGbOQAAJQZ4uREdOUdjwqBTLXOp0qZaw-zm_Q-cPBdjiV5fdKrGuk8Sczg3IWbPjfPvwV20MRbjEuK3C9jDao8LRG8zr-3-Y691mg_X92DebOzbBK7fQtvjPHJCX-V3Cl7zHo70i4Zrh9eBI3PA2kDriuxi",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "RAM IMAGERY",
            uri: "//maps.google.com/maps/contrib/114290696883181775441",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVRuWVTHxpSa2udh3aSgz6sasZf8Kv_Kt21M5XuzGvUuyZXfHmOSA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q5kT6RACK2p6EDAgqIzefFPSJ23_bEUdJ-a3Khvt5-TS9KKI39ANSM81_mSCDPfwznsewDIlYDNLxJa0wM-khz8duoBBuJxFwV65O7KRVYlWD3uRc7jEIyyJkxNmI9WqNRZKxjvZ-LC2CB9Ji65RJX1sz3-e7ky0uyD",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "RAM IMAGERY",
            uri: "//maps.google.com/maps/contrib/114290696883181775441",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVRuWVTHxpSa2udh3aSgz6sasZf8Kv_Kt21M5XuzGvUuyZXfHmOSA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q4-XodUgDqw6fzlJeP5PMA2AQQJJkguUMIcaIxe-Xxz2HObX9HKh64RPytbaHm9aiUrTOzQeWL0sHh4eKtjJsaBwEmVRI52m5DMPTSpNzH7aQwMwTGZbqtZ26Jaszg51tr6scNCLwpLop9KnhKDV3094KCOSPkwNf0L",
        widthPx: 2897,
        heightPx: 2326,
        authorAttributions: [
          {
            displayName: "Space Dandy",
            uri: "//maps.google.com/maps/contrib/100563658592719678557",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUpsyu8vW2oXbHTCKLwcc5cH-Jvk0s4MCCm5AZoYHbnHtDP22X9=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q5nUcj10t89rmbga-I7IHMLo4FqzsQxA36snqJBKOk0_GlnAZL7i7K1xRkkIngsmK0ybs5VANNLwE8rFle2V79NK21URXPNIHaHwCsFkOPSmWUGAUY412onpw-jQDzsavwS3k3PQJz1Tf27vfK2tGMB1PL1sd06fR5j",
        widthPx: 2122,
        heightPx: 2528,
        authorAttributions: [
          {
            displayName: "Space Dandy",
            uri: "//maps.google.com/maps/contrib/100563658592719678557",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUpsyu8vW2oXbHTCKLwcc5cH-Jvk0s4MCCm5AZoYHbnHtDP22X9=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q5KiD0Auiek7cMx2qioCd8gYrVgmrZaXkU5kcMZlnqgC3EPASD1IMw-cVhD6-c-vXuLj8XGl1IRKv9a17CL5MHwj5wzU_f8a-kAqR9GewIrBIg1pxpmEZbtG46OyQi0I1XprMOpMY9nbm6Loo5LvYt6aDtG_xjlFWOb",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Gigi!!",
            uri: "//maps.google.com/maps/contrib/112478717277988621985",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXm_Nf5VzVwHtcj36e92xTIxgH81PpwgHLnauqZ-5AXRXjHb-vw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q6nf3nX0ne0jRI17tFcC186M6fY5nwZ2q6ehJmKMtsHaBHlTVeeg3HlKoAH4i-7Qa0uxjDFeBVq1QkFNldYevbTuObsacYGSfnI8XQniJrqFRXA3nEVCPXfoJlH1Y_eU6YPMS214HUXuD_n2ZF477P5j6efle0U41u5",
        widthPx: 3072,
        heightPx: 4080,
        authorAttributions: [
          {
            displayName: "Sergio Henry",
            uri: "//maps.google.com/maps/contrib/117985336786129991115",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUF3JTgkFU6-7Wu22cxwNhtn5PqFxei1NNEgRx2pjqn0hvbG9OJ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJc4PrvuiSwokRB9FSa4E-M2c/photos/AXCi2Q7TstZo5Jmbdn4Ckf1L6zeRbjXoKyBkXuwfEpgEhxc6kmQCKCEVjog4O6hB9iBZpCw_H5ZXjDXCpdLj7Nb62B3nSZQEV6y2WbNq-DGCi7B5J88WCiZwX5g9_c7VTo1xT9fHJuRO1F6LLwPLjWUJSOjHJmLvgJ-3wYEJ",
        widthPx: 4000,
        heightPx: 2252,
        authorAttributions: [
          {
            displayName: "Joseph Raczynski",
            uri: "//maps.google.com/maps/contrib/105936865002446491373",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV89Dpajb5B4XQMIQwgph41Z9YGQ8o_x3x3rRiN1sCIy0hcTBMq=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU",
    id: "ChIJ9-DcCKKTwokRYUxQqy5dQlU",
    types: [
      "mexican_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "296 Columbus Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.9589335,
      longitude: -73.8201667,
    },
    rating: 4.5,
    websiteUri: "http://riobravotuckahoe.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 10:00 PM",
        "Tuesday: 11:00 AM – 10:00 PM",
        "Wednesday: 11:00 AM – 10:00 PM",
        "Thursday: 11:00 AM – 10:00 PM",
        "Friday: 11:00 AM – 11:00 PM",
        "Saturday: 11:00 AM – 11:00 PM",
        "Sunday: 11:00 AM – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 558,
    displayName: {
      text: "Rio Bravo Tacos & Tequila",
      languageCode: "en",
    },
    primaryType: "mexican_restaurant",
    shortFormattedAddress: "296 Columbus Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q4uiK3wtsTGhs7-vtc3PZ8HanlYraE0G_fUEPFeq0UGzFvhTM8lL3tNqyJd4Ns7Bg_4qllqX52TewJdeS2L0oeV3wFIHpPI7gGy_ltR9fouaoE_qy6ebLTy31A1Gfye1WoYZLD6JFasRK1EgFvU95JHPen1oho3kH05",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "mike blumenthal",
            uri: "//maps.google.com/maps/contrib/118405393025299785535",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXNBIj4GyrdQx1rW0r7x4SDWQ6ugNoTn3KelLQt_Xf4AUANLYp8dQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q7oQeox02Zx6vMB46p5DgoBBbPneoNekiIVMRCavbROdtXcdZIe8w0_qaRaANTibje9D4NHwy-2_0mKivWSeXsneBRWeqO1Wn4k0RK3eJm8IaRXhsajNzk4HRv_aP8JbscYstzXM7iLHisarR2Jw3GPf8BnA-Ets2nZ",
        widthPx: 3024,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Timothy Smith",
            uri: "//maps.google.com/maps/contrib/116486913247567213032",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjULTSsQfxgrRP-PtdWaSsCteJGVFCwSELJ0OTd7qbIQcyXy_clpjw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q4Eu5cvtJoCtn8tO9p4GifScPMfSBnpEZ5EzSHB0Vkgwz9pEaajNWF0SRXNAi7JGBgcRDH8tCcOZnKNAH7mmwLUn_QhOZ9iYa3LDsOPIDM8gxC9SgYyomutFvA3LsGlkMacx8iDpexP_HVLefFfjjjOMlvx-y_Xj9TK",
        widthPx: 2992,
        heightPx: 2992,
        authorAttributions: [
          {
            displayName: "Timothy Smith",
            uri: "//maps.google.com/maps/contrib/116486913247567213032",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjULTSsQfxgrRP-PtdWaSsCteJGVFCwSELJ0OTd7qbIQcyXy_clpjw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q7pF_o_SEAspltzAkvj4EoFzwEYsQW95O3t3A6X1RBMiDF-ZCEJwL25XvkUDzG6o3UQvvQLxx8QSu8GmuqB4XuTxG-0fXhkpHa1O7nhIhoQA2DwRF0b48OFhLfSpm5bMNprzHthd4vO6CTXGucBhKYOY68TONjp74Tv",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Trevor John",
            uri: "//maps.google.com/maps/contrib/112912470598506815753",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV3al8-fZk9sB06rSa08L-43C8pNDGZh_lCqAJEBfTdYHRT5ww=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6zvv9cNlZ93XwM3n2zqLstOA4tAMq3OlknxvaCyetJrpSMGfMxMZgvtZlRexLZaLOoxYKaUCyZCgRLKaFY_SP57VPFQOnVwPPJvHgRBax4V-omc55WudwsXymWriZiUmQNBO-5utGy-SKDcX9p3kFkpXerye53dJ5D",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "French Mex",
            uri: "//maps.google.com/maps/contrib/101904452653254582234",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVaxE_sXOwdfU6HzmBYDl9L19C9_mcEgbDuqH3z1Jv1LKqPw9ps=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6pO8dKCBx0P_71cCqlwbjbtBOfMbtujcKqr0_x7nXe0LmtjLRZXp9eld-aM88VYLTaVn-IzepszJmUEPhju05JAH46S74OzFJPfE3lgctQTYvL7uspn7y6rg6cQ_7TEKt6RbGJEshOCt1zvlgNxnCAutXcJd122C0n",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Dominick Vellucci",
            uri: "//maps.google.com/maps/contrib/116345219794599247988",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6lLQGwKBq3KhPdxzMgw3ncHeYaaSh148ez4A-tOMMnA1N72AgnASl_5ub2AyYiCeKGN407AIfKx8xAWtPSrDi5D5o8x9VXd4FAEVjxNNc_4sCMA3SxTaO2rWCeFr1zM7BH_6tX5yRMF_CvESclhEzQPmO9nmqEsOkr",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Dominick Vellucci",
            uri: "//maps.google.com/maps/contrib/116345219794599247988",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q7Bb7QYVDIDi3OAtyMRpeWMXC71iROwyZuGRi06vHUxGC8X7eagvzpdD1iT1RJFJJEFbnI8ZtE0twU9p4_mexZeHwJLGxyTCc1w-LH3tVZzSxrMEAoayerIGFhYCLiNlPat7HvGJ321y_vcWQhP8mABcdC0Aj1sQZcR",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Trevor John",
            uri: "//maps.google.com/maps/contrib/112912470598506815753",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV3al8-fZk9sB06rSa08L-43C8pNDGZh_lCqAJEBfTdYHRT5ww=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6nU2ViwrzvuDkOsPDs2miVBf-E_F5oLQmiFE5CWXUtUUGEXCMJ-XOzpexunrjJ7fuiv9V6fO6PbcA83RBQy58uaAiNUNsWK2YHUo6dcl0f62hHWjCmRlDISVT6ZetB_Gni0a2q4KBQHMevVGXLcTWOJRoYdstoY_5Q",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "French Mex",
            uri: "//maps.google.com/maps/contrib/101904452653254582234",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVaxE_sXOwdfU6HzmBYDl9L19C9_mcEgbDuqH3z1Jv1LKqPw9ps=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q66e6ks7z_zgawIa-Q4BJ66vsinVrHg1o37WvYiZJUWesFulFSELUPnpPZDE7bF6XgAA1G3rnmFZ3Dtp6h3TP4FVuwKao-VY4ozchKz-tkykSWIzOAozKzzgDjm9TJEdi3lWwbstR-nLI7JXdCjZGt0rIKn53c0DLDw",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "French Mex",
            uri: "//maps.google.com/maps/contrib/101904452653254582234",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVaxE_sXOwdfU6HzmBYDl9L19C9_mcEgbDuqH3z1Jv1LKqPw9ps=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM",
    id: "ChIJjzQuZOmSwokRJY6Tl0nn3TM",
    types: [
      "american_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "431 White Plains Rd, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.9565834,
      longitude: -73.8138199,
    },
    rating: 4.4,
    websiteUri: "https://www.mickeyspillanes.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 1,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 15,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 4,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 4,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 3:00 PM – 2:00 AM",
        "Tuesday: 11:30 AM – 2:00 AM",
        "Wednesday: 11:30 AM – 2:00 AM",
        "Thursday: 11:30 AM – 2:00 AM",
        "Friday: 11:30 AM – 4:00 AM",
        "Saturday: 11:30 AM – 4:00 AM",
        "Sunday: 11:30 AM – 2:00 AM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 470,
    displayName: {
      text: "Mickey Spillane's",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 17,
              minute: 0,
            },
          },
          {
            open: {
              day: 1,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 18,
              minute: 0,
            },
          },
          {
            open: {
              day: 2,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 18,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 18,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 18,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 18,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 18,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 11:00 AM – 6:00 PM",
          "Tuesday: 11:00 AM – 6:00 PM",
          "Wednesday: 11:00 AM – 6:00 PM",
          "Thursday: 11:00 AM – 6:00 PM",
          "Friday: 11:00 AM – 6:00 PM",
          "Saturday: 11:00 AM – 6:00 PM",
          "Sunday: 12:00 – 5:00 PM",
        ],
        secondaryHoursType: "HAPPY_HOUR",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 1,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 2,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 21,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 4:00 – 9:00 PM",
          "Tuesday: 4:00 – 9:00 PM",
          "Wednesday: 4:00 – 9:00 PM",
          "Thursday: 4:00 – 9:00 PM",
          "Friday: 4:00 – 9:00 PM",
          "Saturday: 4:00 – 9:00 PM",
          "Sunday: 3:00 – 9:00 PM",
        ],
        secondaryHoursType: "DELIVERY",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 1,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 21,
              minute: 45,
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 45,
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 45,
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 21,
              minute: 45,
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 21,
              minute: 45,
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 21,
              minute: 45,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 4:00 – 9:45 PM",
          "Tuesday: 12:00 – 9:45 PM",
          "Wednesday: 12:00 – 9:45 PM",
          "Thursday: 12:00 – 9:45 PM",
          "Friday: 12:00 – 9:45 PM",
          "Saturday: 11:00 AM – 9:45 PM",
          "Sunday: 12:00 – 9:30 PM",
        ],
        secondaryHoursType: "KITCHEN",
      },
    ],
    primaryType: "american_restaurant",
    shortFormattedAddress: "431 White Plains Rd, Eastchester",
    photos: [
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q4dZY8CWQLCL65YGrz0wiy-ItSNngrv1T3OrCWT8O1723r7vxZvBnLVz0ONXDdRV6meHrgHfBXW7uXOOZfP0cWcB7DYSDuoWQskWNZ1yDd6V6iOk7bPNSLRrI5c_ADrHb_1irxqR1kfons6XZeojkfHBn_kGoSfqq05",
        widthPx: 2048,
        heightPx: 1153,
        authorAttributions: [
          {
            displayName: "Mickey Spillane's",
            uri: "//maps.google.com/maps/contrib/111547767710877828673",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXQQasecNH-zF_n1xM2jjm9e2G60S9Aon_FGcsftvtuw4O2h_1D=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q6j7eH61SRqC9SBb-1gD61He3XcrOikM0AVRSCk07zFLkiNoiZJNWGGeMjD5bFl_jrsYrD8jq7EIDju9V3R4uqfvh6YjRNBhxEhDDHTTQY7EWDkttkgLxnJKtNdaVcpEp_AtL0N0-pWvRXrUcFshQ3_XAWFl2KGZzmS",
        widthPx: 3000,
        heightPx: 2251,
        authorAttributions: [
          {
            displayName: "Mickey Spillane's",
            uri: "//maps.google.com/maps/contrib/111547767710877828673",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXQQasecNH-zF_n1xM2jjm9e2G60S9Aon_FGcsftvtuw4O2h_1D=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q6r2S8olUe1AJZ9IxC02VAN3bhheB6llQvPOlN22mTp6DBIPwEwuxwmjVrvRf4Hvm5E9zK6AP6uULqaD2UyChaC370Ev38YtO7aXEovbxcRwp8Btr9wo1tLn9iDqu5C9vKfRoL7AAzttEg9VYxC1NVtqlhJePSHh4Ev",
        widthPx: 2048,
        heightPx: 2048,
        authorAttributions: [
          {
            displayName: "Mickey Spillane's",
            uri: "//maps.google.com/maps/contrib/111547767710877828673",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXQQasecNH-zF_n1xM2jjm9e2G60S9Aon_FGcsftvtuw4O2h_1D=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q4eNSzprLDo7GD3Lm55ZEFs_ejQddNM3KgRAH520KeyhbmEtFYfPjW41FY8U28zqBMP6iUYL7slGw9ZTpdTayJH3XA4Ur1GkTBCPfwz4Ma2u1SPuZkSk45RltEkPsgywFMDfBPRLY37AttuYlsWok0NxJVPpCjoHcB-",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "JP Cone",
            uri: "//maps.google.com/maps/contrib/117105371824823478012",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5CI5dm_g-qc2cCT5H5ifKBZmWqeeEnqbFpcHToBapta9eFI_X=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q6xbb8TVE260dkh0-TuyHW2MxUHpGcAUpEQESPvR5Y8MTTZrSfa7WOF4aLgbQvizSLxDeWTx3ZAD3yjOUH2otXSHqAZYTvbhiEjR9fBEqiJdOSjxtPkuXcohu2IXOGbfLm02qSTuDITVkE0SA29D4YqmPqRI3-ibbqq",
        widthPx: 4000,
        heightPx: 1848,
        authorAttributions: [
          {
            displayName: "Traci Laffin",
            uri: "//maps.google.com/maps/contrib/101450108017878290375",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUFwvZzONyDyukqgDUhqq-mPY-6mCau7VXfPLnzjylV0I5AibNs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q4q0_29D2LaWO53C5imT6bvy8f2lb_Hhk3Dfie-zTKEDsfq4tK-c3ITQ4qMJa3uklnxGO9R3_avvM5QC8BWeJzOyZUTV7FSY3yj-54h4vvB2CQbe6gsBD5PVYROvMhsqouewa4fAWp6hDVQUutAUASOKuhcAlYrB4oN",
        widthPx: 960,
        heightPx: 661,
        authorAttributions: [
          {
            displayName: "Mickey Spillane's",
            uri: "//maps.google.com/maps/contrib/111547767710877828673",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXQQasecNH-zF_n1xM2jjm9e2G60S9Aon_FGcsftvtuw4O2h_1D=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q59bdmBnO9KKOHFvKDrcvx3O33ZCFeKzl_iKP9noNerCWp5ERBHC8fYr52--3_srLpscNw9Rf48Bkhax6t8DD1eSQjEDaJTMiDfwq6YZEDzUyCUTxVC2p8x-rhV_ck9ssEhZ9X3cs728ct_9ToJ0dsEpAxFIPAq-ctc",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Mickey Spillane's",
            uri: "//maps.google.com/maps/contrib/111547767710877828673",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXQQasecNH-zF_n1xM2jjm9e2G60S9Aon_FGcsftvtuw4O2h_1D=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q4obc38mlv8TkLmlhUXz6JpKJWOpF78k2Skp7rvQxADEwwYeaQL5ARfaniUpv6NQ8CPTc5Cua7jJQnlM74crHlipIpPVdCAutFbYSbCS9VPIgMyML_Co3l1b1YR9T8W6PPnNRaN33SZVtq_IrUJNUpw4LT8IqXSydP_",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Mickey Spillane's",
            uri: "//maps.google.com/maps/contrib/111547767710877828673",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXQQasecNH-zF_n1xM2jjm9e2G60S9Aon_FGcsftvtuw4O2h_1D=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q7PKUfpJj5_ZOozFGJwwq77qr7C5AvFOx4CAOuZfDr1WbPQhWZ_EcdGHkkXFNf-w7_NT4a5tSP2KAlT-QE2bw4A4YVFgU3_I3NjbLjHxIfomtGP_WD1mHseVQemQVASod7T_EJMLiwaGW_lO4Hl3it7VoZPHvAtigxW",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Alan Klayman",
            uri: "//maps.google.com/maps/contrib/115483301734295559069",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUycxPWqIhB93lLVC_UWWWcZiKLTk08oAJ4iaVsSxGafW8GOGeI=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJjzQuZOmSwokRJY6Tl0nn3TM/photos/AXCi2Q7krz24zNAD4uhFlE3dMeF_8J1_JVAEXSI-DUVwF2E5Hrboe00AR7FZtzFCreqyrHaGMQPu11HRJhF3kU0tMdLO37qIchwyLULZ0zXh-3Ykk_63xJmovrTXqu4HKGWLdW9zAZYGkI6J1vUav88FskXYVdyvEAsraL8Y",
        widthPx: 960,
        heightPx: 960,
        authorAttributions: [
          {
            displayName: "Mickey Spillane's",
            uri: "//maps.google.com/maps/contrib/111547767710877828673",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXQQasecNH-zF_n1xM2jjm9e2G60S9Aon_FGcsftvtuw4O2h_1D=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: false,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc",
    id: "ChIJu0cRRTKTwokRfNplZS8Lbjc",
    types: [
      "italian_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "16 Depot Square, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.9501585,
      longitude: -73.82773139999999,
    },
    rating: 4.4,
    websiteUri: "https://www.zeroottonove.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 13,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 12:00 – 3:00 PM, 5:00 – 10:00 PM",
        "Wednesday: 12:00 – 3:00 PM, 5:00 – 10:00 PM",
        "Thursday: 12:00 – 3:00 PM, 5:00 – 10:00 PM",
        "Friday: 12:00 – 3:00 PM, 5:00 – 11:00 PM",
        "Saturday: 12:00 – 3:00 PM, 5:00 – 11:00 PM",
        "Sunday: 1:00 – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 139,
    displayName: {
      text: "Zero Otto Nove",
      languageCode: "en",
    },
    primaryType: "italian_restaurant",
    shortFormattedAddress: "16 Depot Square, Tuckahoe",
    photos: [
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q63akkKLulk1sd7Z3TJt4WCaHw5K7tlB-4-CHdSu7NTno3LmwJuqeZeIKWyv8VLdhJdCDoBJj8P9xT6tYZIvn-7mJpj1IE42KgYEk0dtFIORfB0tM-VVTf9t953xLibsViK7f_hjVCcVym-_5bzecHKliK3eIp7c3iz",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Zero Otto Nove",
            uri: "//maps.google.com/maps/contrib/116081592469160318182",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXpYlzZNMA1DpsWeCG--93jArDOGYvo5H5Agu4kh-hyNoJ7atc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q4fFipV1B-5kUfFXRQLMwe7uqHmVNM-tJO9DfunNaK0fXfQp3YpWjouFZA-4MXVZTHZiWNtByw2_HLxXRRxMEyTwFM_5-rV-2Ix3uWS8CH6W0sAuHbLwMcIoluVlWGwNldn-7MtrOrzFnB22Hg-msHza0ZOGvgG9Arh",
        widthPx: 3600,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Zero Otto Nove",
            uri: "//maps.google.com/maps/contrib/116081592469160318182",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXpYlzZNMA1DpsWeCG--93jArDOGYvo5H5Agu4kh-hyNoJ7atc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q5mE7sPwFrK4xpV1vCJBvh8NfIYhXSxDyHOcAz4ug29zxc3sPYUWityUOwOK-cNvenxTplV7bSvHlLIMXSukWvQtmvpjPsLQ7VAGKnaxHWND1qGf3kTlDczPHcC_CK9E08PFBpNf2snA3cNsQ8XhBcuuChJwuc-YjnT",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Zero Otto Nove",
            uri: "//maps.google.com/maps/contrib/116081592469160318182",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXpYlzZNMA1DpsWeCG--93jArDOGYvo5H5Agu4kh-hyNoJ7atc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q5N6GCC9LdeEv2IaS1bCqyZbiT5Lc_VKoESYEbCE9tkgh1C7UEg9Tdgbi9vFDWBtOuqavC3xqRjY33TESQ0HvxtFUjsBkoWVvkTlZ5xCeDJPW0kJfgs8nwukSsC-DucDWsHKFjAgPST1uiZu2P33j6E15Soph-67YuY",
        widthPx: 2252,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Dmitriy Chumovitskiy",
            uri: "//maps.google.com/maps/contrib/110579590881409217830",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWpO0f08VhP7s2fz9Um4VIJMJ292DOAxoEiywPxWPzYKSwQeMi0ig=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q65kZoIsFKHv19-rc9eMSjb8E5j4yLlFKtllOE4YlotaHmlS7OW_inwTk55JSdu8Yr_MxyGcejqjvab1BfSg-JYtW3b2CZqu01P0wsQoswswNv55xgJJR4ekIzjaXQM8kU5XsMyQX0FGelx0KhF2NR10chn4IB7oNvV",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Zero Otto Nove",
            uri: "//maps.google.com/maps/contrib/116081592469160318182",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXpYlzZNMA1DpsWeCG--93jArDOGYvo5H5Agu4kh-hyNoJ7atc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q57cbo56DsMFUMMr8_-xNPiHcBp2T3HYLcRPk6z0puvHqveW5KrutJCk4E3FDTL3n9oy6oDnTEdab5mGGy89UPw7Q3ej7bdNu44zvsmduXSvmyUC5T7zD7UM1w3WZHvVATue5lzRYIC4mqGSgtLPInGXdy4VMdHTnLT",
        widthPx: 2448,
        heightPx: 3264,
        authorAttributions: [
          {
            displayName: "Michael",
            uri: "//maps.google.com/maps/contrib/105211200153995401663",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKj1Aspy8BXzyyP1apx1-Q9llQ-De_-NU5_42JIcFDeZB4yYA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q561XQxB3y97IIAfb6OXuYn22kmbCoiaWBsR9eCLOh7Se37nf7YFsUFmZCNes7vQqMkd8D4_Zn1rlP0hFli-YAm1INyPZtEfYsA0UG_PzQRfnNmQgPBZCPDReZBLCj4cz0IZDT8ySZXndoSJDq-6UDmroKkDcmGrP3u",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Miya ko",
            uri: "//maps.google.com/maps/contrib/117570797442064915482",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJnC80TaKIo_CisjxhJ34qQg9F5fT7oF507kzmieQ_56LK9Uws=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q64ze1XZBQIORnH-QAQC2vVP1vPJbM9ZdK_GaOF-V1a74h5jYtWdX38RIyZ0cWqpXFiMfh1EY6n6WVc9z2RD6tBdWkS_g_92UXWSqr9J9XQZoaTCtFFMBNf7CR2gOdNDNkiApace9WQls9M0qQY_OBpz-jjhtSZolLu",
        widthPx: 828,
        heightPx: 621,
        authorAttributions: [
          {
            displayName: "Sumit Kumar",
            uri: "//maps.google.com/maps/contrib/107372912487772157290",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVjfowaCPUpPdW0CiVCdbIth0Kgb6W4C4L8H1qvLCrwsSfp84HJ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q6qXrPrTrvMva9SNdVKwC1x7zAfTtmn_nL7-07hLP-y4iSbVyRFdfHepNa8NL8ONiNPTVXSA47RyBjMHZUUtJ4BRTtOT9VNTdVHlGL89V-C15hQ01pYE3Z2RvAlcVfUhz2HqnqzgmSnDj5TjtLiGnUD9pa84RfXRRkQ",
        widthPx: 2268,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Bill D'Ambrosio",
            uri: "//maps.google.com/maps/contrib/105150057202037169165",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKjWLps5XzvQsQ2QTVaXakx9r3VUglBltEmTNBHEZVC4YDsx9k=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AXCi2Q7DPxIhKYYXSWSmzdtF2okRuzHEi3_UdbYHQ8CY8vtgTqtC6QrONMtpfltvd-kex77_9Vgj6yZFeLeZCco65Ca9LlnWVhx_QZfgqlnjHFufMTog8lsKq1gB0AuNpZ5Mb1avemWDiUyLAGPGRYYJvLoyAEWzIyTBlwCk",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Chris Gerber",
            uri: "//maps.google.com/maps/contrib/107448670651566569306",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUGW-rgBfRJzHWXmt3SCLPn2-NV4rTYL2psrhmOBkQoX1gMOg1fNQ=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA",
    id: "ChIJBzAI6pKTwokRquXPFwGcFOA",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "2 Scarsdale Rd, Yonkers, NY 10707, USA",
    location: {
      latitude: 40.9523248,
      longitude: -73.8294315,
    },
    rating: 4.3,
    websiteUri: "http://www.thewolfnorth.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 – 9:00 PM",
        "Tuesday: 12:00 – 9:00 PM",
        "Wednesday: 12:00 – 10:00 PM",
        "Thursday: 12:00 – 10:00 PM",
        "Friday: 12:00 – 11:00 PM",
        "Saturday: 12:00 – 11:00 PM",
        "Sunday: 12:00 – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 118,
    displayName: {
      text: "Wicked Wolf North",
      languageCode: "en",
    },
    primaryType: "restaurant",
    shortFormattedAddress: "2 Scarsdale Rd, Yonkers",
    photos: [
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q6u2_khj9sWUFjbTUyfAzgBVrk-hFm2jytzQ4zEebl5PZ05AJg5oWE1iJ6hvVs0sSWeHettRqgWPooP-u6WWlZEoIlCrIPvXt7DqKHokjHCmDWsB7ltphKDOMsUDNWkVGoMt8MgOoEt3XAbzRQQDtugGrW8mR9C9AYw",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Wicked Wolf North",
            uri: "//maps.google.com/maps/contrib/106877857044942206275",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzb7SmGSkn0IJ4_NjtmSgCRf6IFfyzmsGeZw1TsqKqbmARWw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q6nDPWKIdAjq3RTM_cM6gv-vFJ-9qVnc007jkhl9ZVFojfrFKevNG3Ez__Mh8joEsLGQgcGISR47SfyxCN-_VpI7o-BJnZfxvM0pFReO1NNwHRH-sIvWudtFbFP8nADJ60_04OBP1fxl4zmLIe_TfiIRQEB9xKfKXa5",
        widthPx: 1080,
        heightPx: 2340,
        authorAttributions: [
          {
            displayName: "Wicked Wolf North",
            uri: "//maps.google.com/maps/contrib/106877857044942206275",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzb7SmGSkn0IJ4_NjtmSgCRf6IFfyzmsGeZw1TsqKqbmARWw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q5v2wMEYgfdt39rX5ZxTDCkFqXJ6aIUxNn5mBkBb-GKHmo5mTLU-EbXyFoW6ClEL0Ai-SAHACcei-K0O59p24lowuft6elEYneVPhCsEvqrhDjhbm2tPlWe0G-7wfsFJyHAbJmsFXKMW2ui2tj81alOCPvr6oYIzIST",
        widthPx: 1080,
        heightPx: 2340,
        authorAttributions: [
          {
            displayName: "Wicked Wolf North",
            uri: "//maps.google.com/maps/contrib/106877857044942206275",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzb7SmGSkn0IJ4_NjtmSgCRf6IFfyzmsGeZw1TsqKqbmARWw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q7SSHECnVuUmmFVgQj6AawwHp7w2iKQojukE1iwwLFfttmBh-Ye15iWJszcqXmcUn8hUYVZVpyGk1TrRx5qdBduWYEvrwR9la2GPbHjYJNi0daJhDvVbqnFRkWQcYYdr1C2-AWp_bGPBTtKlN9dc7_yn5D2jC4st-DD",
        widthPx: 3024,
        heightPx: 3546,
        authorAttributions: [
          {
            displayName: "James Hynes",
            uri: "//maps.google.com/maps/contrib/106509990577861510655",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIYBVe8_r8aKKBtOjvJixBnNIo0fdmyBouFtoRxf742iZv53Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q7jXZEf9YpwFoxFBgFHwmi-LzPkXBYLW7Xbck9vh6QiPQIkrkFyWH4-ylVzz3xScIopgslTfGlHRXUzDc1UVYQ7AtdMFxX6Iwi9Q2yetzefvm7Sjj5njN20Zq1WG2MhmSJC9PRTxlr7oU_BDYLEkA35EliMYOHe6Kba",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Miya ko",
            uri: "//maps.google.com/maps/contrib/117570797442064915482",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJnC80TaKIo_CisjxhJ34qQg9F5fT7oF507kzmieQ_56LK9Uws=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q5m3C178s0llveFP8byCPTKuC9AjxpVt5YEIdWrzpuKraEmstLlYga0lHm9LGiwXjO-ap035WXOyC7Or5NX6Qdd14CUmiBuIeYSrPFpkwERQ3TiCcN8kyj9DOs3wl5yK5L18C6uc9GN-HI6ruMg3QgNkyitYYtG9eXQ",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Marielle Barton",
            uri: "//maps.google.com/maps/contrib/103558722631547641873",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVxildREoETktWU9pnNblbZjUTmuxjC6swc0RtWfm1lb82HZFEr=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q4qgW0oAhS5h_9iCIgl3v8jbpZ0MkKGGqLMT9MKcA-fawhVoUiPE3VE-zI8HluxmBrYpTNzlkdlZGdUPg8FMAJf_IYZPUN5zgfnt2NSScCqdVrG_3878cTz_YWUP-hhE4FtDJuZd7HttRDfk4GiVNbgi5PZmJm7ibeQ",
        widthPx: 3072,
        heightPx: 4080,
        authorAttributions: [
          {
            displayName: "Michelle Ciofalo",
            uri: "//maps.google.com/maps/contrib/105555818638232816628",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUstqMBmP41Y3BAqUEQH14xKmJBN13ItiTeSuxxmfibYsejkGBY=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q57HGkAg_ymtf19AScJJZLiDgS72t0AdxVo5pznDDytWyd-bSTly_QYgg30Cles1b9Bi31nmn5HvqVClpHN_eISi9H-W92FHDgsiIbLKh-WZGC4ZngGj1UylG0sLVN5D4AYZVUIEV2_BFw-fsBThAqzIfEG1PsP9eUf",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Miya ko",
            uri: "//maps.google.com/maps/contrib/117570797442064915482",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJnC80TaKIo_CisjxhJ34qQg9F5fT7oF507kzmieQ_56LK9Uws=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q7mZ2WQlM2ay6pLQxcBgsq9SMi1TVPa_K_4_jON3R_QmGSV4WJHjOkBRUj14qJSIAHKxN7mMhIFAibGOceizLpKV85t4pFY6rJd2hpzFU8bmEJz6DKpRzlL2kDsmye_n50dT8oPTxW3aXTSetnYISpFa5zEdOG1szuC",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Wicked Wolf North",
            uri: "//maps.google.com/maps/contrib/106877857044942206275",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzb7SmGSkn0IJ4_NjtmSgCRf6IFfyzmsGeZw1TsqKqbmARWw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AXCi2Q5Af3cLcPEIu11btU19KOE1Dn2Vw90RPltyGpxSQItx_vBUgEbShMBjspZW6VDD5o8TDTKe6W-J-Fr2UeQxaNNDrazO_t1s_QrFBnr2IjJEXbzKt0ksanYKeGUrM32m0QcWUIZTri3-CZkeplok-V2wWTnjJEIR4iVT",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Miya ko",
            uri: "//maps.google.com/maps/contrib/117570797442064915482",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJnC80TaKIo_CisjxhJ34qQg9F5fT7oF507kzmieQ_56LK9Uws=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig",
    id: "ChIJE4lzm8eSwokRiN93djbk0Ig",
    types: [
      "coffee_shop",
      "breakfast_restaurant",
      "cafe",
      "restaurant",
      "food",
      "point_of_interest",
      "store",
      "establishment",
    ],
    formattedAddress: "Train Station, 1 Depot Square, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.95043,
      longitude: -73.82833,
    },
    rating: 4.1,
    websiteUri: "https://www.starbucks.com/store-locator/store/7414/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 6,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 19,
            minute: 30,
          },
        },
        {
          open: {
            day: 1,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 6,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 20,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:00 AM – 8:00 PM",
        "Tuesday: 5:00 AM – 8:00 PM",
        "Wednesday: 5:00 AM – 8:00 PM",
        "Thursday: 5:00 AM – 8:00 PM",
        "Friday: 5:00 AM – 8:00 PM",
        "Saturday: 6:00 AM – 8:00 PM",
        "Sunday: 6:00 AM – 7:30 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 270,
    displayName: {
      text: "Starbucks",
      languageCode: "en",
    },
    primaryType: "coffee_shop",
    shortFormattedAddress: "Train Station, 1 Depot Square, Tuckahoe",
    photos: [
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q4T7qYis5HChGubFipCTVTParNr2WoUMzW_E03L2oW2j47V2yUngn6r1H0ehGcqKtdkir2gJTF-E4_5Y7S53cK-kiYxlAXvR-lXbOIPPkzkwtlGUeakKgoyecJhEPwRaghgqaQDzegrTmEgPFj9WNAIZFwALgo2ARkm",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Christopher Hsu",
            uri: "//maps.google.com/maps/contrib/104095367793440444126",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJqft1-hyWCq7sDTfGieVTlOk94av-DXEtStk1kV_1yj0WABPEg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q6HX1SKVAJWb-KqkpXrk-HFaza6XACz92Pi7t9Tfx4LMLDcZwo5FtJ7wDYY9BBsMEeSTeBT0_x3PDhO-sWzmPfONaUlJo52puTO5Qiqx1t4htadXXyKddyRgdrkZPZaq_zsrpFs41lKcGaTspnjThz98x7R0q6TIF1L",
        widthPx: 1600,
        heightPx: 900,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/114115355025338064950",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUo8yBQNk9Cq3SuykPT2AtnH2fDfDmNNd_jQWojxLCmOYvLAR4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q6aJIKae06LRxwntgI8sihmSSkhowfoEJf4yHKP8oUWey2GiZ9yctNktuZtP2jmRB11FyanVR6Bs66Cx-CIg-ZLfrl5lHVUW6hTqvqoOgKJcQBXWm74zHIf8tRW-Ltu5YArQQ4Q38zU0-8NUvfEOOOKZv8hF727VCsW",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Christopher Hsu",
            uri: "//maps.google.com/maps/contrib/104095367793440444126",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJqft1-hyWCq7sDTfGieVTlOk94av-DXEtStk1kV_1yj0WABPEg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q6zGhb5_VC5geh9e5DZj-YY_p9XWw8X3OnH5skqrNoeO7E2aytNSXZnxRCxgdZCc_AR5TVxMHG3uJT7rOxHF4y6bPKR6PA60ol_0x6lH762ksBmspRSXzgHVM3yAl8Zc1y_NSmldU87WIHUnrZMt0BDa47l3Lb1T9QX",
        widthPx: 1284,
        heightPx: 1257,
        authorAttributions: [
          {
            displayName: "Yara Annechiarico",
            uri: "//maps.google.com/maps/contrib/110397492764314107681",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV1g7fWbUm4BJ-3Is0J5HalClaS0vlKpqXlF25m-0m3WJ2PQZ9ZeA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q7GRwBz5rVNXmgVCOjS_DnlRdaxWm7M_1OcDKLTTZS2Wa1SVgl9OAoarzufGPqkBCTLopseTrm83inwc-NH4hrwLRKsQfTQeBd_0KvMg-x_l8Szjh8-y-0aeQBAoaHZSOJ_nKbmxMyzXmYBeSUbuFL-l4WU1-mbF439",
        widthPx: 502,
        heightPx: 546,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/114115355025338064950",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUo8yBQNk9Cq3SuykPT2AtnH2fDfDmNNd_jQWojxLCmOYvLAR4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q60D6_n3lvoGZYa4c8d5xiVPUzGnm4aLUsT4EHmx5gzoF7XjCxedKr12kDGBf4_oqiBNxXaZuvCBS33X1hMD6iFczlkyD5acTXIFmpt8sn42O0oCYftEI6NlhRmWGADcF6ufii3DDknVgAIWqRxa4X83-RBENZBKeLa",
        widthPx: 732,
        heightPx: 664,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/114115355025338064950",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUo8yBQNk9Cq3SuykPT2AtnH2fDfDmNNd_jQWojxLCmOYvLAR4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q47282OcpeFL4wFGHvulHfLd7rILqRAAue_5cv0EcuhCu7f_mKQsVCYN8XjK_DWQADFlZjvfEX4QnbnzG1gES2I6PvMh2akcnccKqMeQT8Pa0zT53oMHN2k74l_zZ2JKa8Ks1meO1QikwbbJFxMi-70gN3DBR1ZRavh",
        widthPx: 640,
        heightPx: 640,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/114115355025338064950",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUo8yBQNk9Cq3SuykPT2AtnH2fDfDmNNd_jQWojxLCmOYvLAR4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q5Qto3jqClNAMb9i1Wotn01qjO1r5HwzRz-UkniiQZbZ5r5HfaVrztO0xW58pBbquoPFrQbSXCmFAoqtTxS3JgKXNZO8hYgq8PmFbbTw1brQDk6AtTVWwtMRRln75COFWE9mucRqynLQ0UBtAi2q7jvAlBJS8tTReg",
        widthPx: 3480,
        heightPx: 4640,
        authorAttributions: [
          {
            displayName: "Michael Kelly",
            uri: "//maps.google.com/maps/contrib/100114475100992665629",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVcQ02qFOxIPTSxLe1CkH4iQ1PDizZHhnTyApFsNnYoLWYs0_Qh=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q4OTQPobW7a1jnhvM_qTuoFtI5idt6XC0H0vSr08hC42tMB7vK04jBNEfSeebd8EFaRL8iDj_BJ1j84UKfLqaTNjczRosNOjXsBt6tLpGR5Sb5orTGDS0Ye6RmXkj3sic5e3dgjQ2yF7AGJTBrVVx1s4WCcsItm0iEd",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "remotelyviewed",
            uri: "//maps.google.com/maps/contrib/117299558731347708313",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLQmCqSb7WbF-dZVxvKZmniK-VbFzuJn9c-ZcehvSaE4Tbs8A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AXCi2Q6hgzFkpkqPwT7XxqNRtmcXLPdIlYjeWB7vtbsv1Yn_0A025YPSbLyxECdVfwIHBTH7HkHYirGPuUxgC029xtQOPZzX_9DbmhhsvOefYd3zHPMxd2F8uR1QFjwSbkfJLvOVxwrPejE34hyOkc5ze8zlm3lXyXm4-7p2",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Besnik Daci",
            uri: "//maps.google.com/maps/contrib/106722867839747949312",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIzCET56OVNh5snC3sCWtg_PPQkTRub5OV-QsrPaF2xWaQhEA=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58",
    id: "ChIJN78jnMeSwokRpT5Sq_QGD58",
    types: [
      "indian_restaurant",
      "bar",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "8 Columbus Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.950565300000008,
      longitude: -73.8271834,
    },
    rating: 4.4,
    websiteUri: "http://www.spicevillageny.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 14,
            minute: 30,
          },
        },
        {
          open: {
            day: 0,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 14,
            minute: 30,
          },
        },
        {
          open: {
            day: 1,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 14,
            minute: 30,
          },
        },
        {
          open: {
            day: 2,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 14,
            minute: 30,
          },
        },
        {
          open: {
            day: 3,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 14,
            minute: 30,
          },
        },
        {
          open: {
            day: 4,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 14,
            minute: 30,
          },
        },
        {
          open: {
            day: 5,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 14,
            minute: 30,
          },
        },
        {
          open: {
            day: 6,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 21,
            minute: 30,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        "Tuesday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        "Wednesday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        "Thursday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        "Friday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        "Saturday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        "Sunday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 512,
    displayName: {
      text: "Spice Village",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 0,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 1,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 21,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Tuesday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Wednesday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Thursday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Friday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Saturday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Sunday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        ],
        secondaryHoursType: "DELIVERY",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 0,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 1,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 14,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 21,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Tuesday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Wednesday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Thursday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Friday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Saturday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
          "Sunday: 12:00 – 2:30 PM, 5:00 – 9:30 PM",
        ],
        secondaryHoursType: "TAKEOUT",
      },
    ],
    primaryType: "indian_restaurant",
    shortFormattedAddress: "8 Columbus Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q5hun7R2URRKUI3pe30iv8a_MsBVAWB7lyfn0XOxerqzUpr7j6-sTh2nFP0MVkOSsN8jbHizGAWMAQb9hcBidQaSF7Zgxip6gt52wBSEn5sTlh2OntqNjhr8P2CazEe8ZOTqHTfVWINgUz5Qt5hcIMDwL2dQ_qkdHFQ",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Abdul-Rahman Syed",
            uri: "//maps.google.com/maps/contrib/113551651303557774076",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUB5LEBAJqwZqaTwBN8skIlUrFB1Pd2ug4knNrU8O8hiFq6AFZJ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q7509ck7v-SLg_VlurB1Z26PqAKXPz59GHH-P_9DXEGj0cWdiaIMpisZbltHb_UkuHMqYYSaKMvb3l_BZ8683-qPrXvINkVgvUl6buHAemBXs5OJYHozIKsfDQc21qCb3KEA5i89Sl632mYZVeg1zG6YbXeJoKNaIUQ",
        widthPx: 2163,
        heightPx: 2759,
        authorAttributions: [
          {
            displayName: "Dmytro Kovalenko",
            uri: "//maps.google.com/maps/contrib/112937757951491962434",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXbOMLPFwitDvVEHjou_k29JToKhXmyuetQ0pHe56x0Sbg1w0b_tA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q6RZZqy7rVISdZ2Lm_9KlbCm654kkDOiGV9Li2UyzLojAcBFPK_eqzQfv1RKmSyQVTrNCePfSF-NodBhwnFTiTMAeTxPgH9SQXwyvFan09OOKrGwVKAXcY6iKaCACtUAO7y5evYR6llFGUElIo6D9dhULnK7WA8CQsR",
        widthPx: 3024,
        heightPx: 3301,
        authorAttributions: [
          {
            displayName: "Ally",
            uri: "//maps.google.com/maps/contrib/103755954737290449470",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUMy1B6L8yv1M_2KEmWv58ajpdUNxPhbXmCVCQGbX3p6hOip6OP=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q7QeD6kaaIMdEnQGuK89NFZ-_FZ0Iu8iX8G1gM_7JePWpgCsFrlZv4ger7vKN54cWdAB71w993MV7DotEDWtwq35OMaEk2lPEXpM5LZjYJGQprvNKWvKGkUHkDWxdyytcCdU9r5Px2U_NpF0NTIypdYD6K3m2GohUom",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Abdul-Rahman Syed",
            uri: "//maps.google.com/maps/contrib/113551651303557774076",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUB5LEBAJqwZqaTwBN8skIlUrFB1Pd2ug4knNrU8O8hiFq6AFZJ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q6L6cy-N8s-OBM6psydNcYLXOe9S6X94_iSp8zo_Wqg3wqljvQTq9by75a8IBz5KxR3XWuKEQY2dbqnZDeFwucHscG1PCN_P_dLnofN5YCAFnyD4dgoXFPFjklopMWtWlkNdNQxqiLafqSy60kEanBD5CVImbGX9muA",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Jay Shin",
            uri: "//maps.google.com/maps/contrib/116593646974560181054",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzKsu0oxd3cRHAHv4Rw0ZSHHi81T8uQMVmqLamHPrGc4T7SRDg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q7N5YTzLeTA54IX44dmzpd-v4TfFu58BAxmUa_CZyYiSMT0pltHPMujVyyNBLN7e8h2kzUx80PpmRvMikLoKN6c9Ta0F-S_kF3cXhwgoIlWGmTS74YS48KMQ_WYAjLX37dDVtGjIPqoNdacwShAotwhANqsftTbQwQi",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Sanae Masuda",
            uri: "//maps.google.com/maps/contrib/102637691433525810252",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW-yBEecwlWdeYwog_C8xFVWHlKWfvcWNqs8PmjqLJp9AvqPHIK=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q4QhFo7yKHr5GLjR3G9D2SGHjGqmk9BFZMzcewMkGT-BgVUiP74omkd1_6hq9k-0gLtwpHwiY9isId-ExI75i_svLHDnPll1h9HNxN8kkZ1EAbLxQNqUuwb-Vbyk-AXk85aJeUibSHu6nswdyPyHXiobq40yJKaZg3u",
        widthPx: 3264,
        heightPx: 2448,
        authorAttributions: [
          {
            displayName: "joison Manavalan",
            uri: "//maps.google.com/maps/contrib/106400489467102815187",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUWWSANLb9BnxPB7iEDlwjwkH-9_BT3d7UZ60TMpOAxE03r04HD=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q5xo_q-oukYO9hMTwpl_Lnmt-Zf4loyYJdwOI6jnKTbOyhiPyT0HA-jvX2vip_Dp8WhHqsGI28c_6FM00OFoKV8Zzfo15dWE3fpbr0w3sVcQCNVK3XlrZJHtfAupS9mutu61_3gvQS1aqJNdCgU6szO7RmAaI9fM61M",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Abdul-Rahman Syed",
            uri: "//maps.google.com/maps/contrib/113551651303557774076",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUB5LEBAJqwZqaTwBN8skIlUrFB1Pd2ug4knNrU8O8hiFq6AFZJ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q5ZDwsvWl70z1wMOwE0MDOC8tYQMQkPUQpOEo1_btWJy705uQSaKeqewDDUXozS4xCDU_ZbBXJQFa4E8k5ywrHkrzgKM-Yj-flBxFJ4IlgMXYGTgXL32lU0DUpwbpD3JnYEUnNSoxLQ-MmCP3TViHdrTM4Jnu47sokT",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Harish G Nair",
            uri: "//maps.google.com/maps/contrib/103146103390158678170",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWJgcmIVfkVnIxCUNiL6WDOIG9Or0F0yi9E8mNcr5TF7TQMyiAmZw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AXCi2Q6whwA3FEJwquReKLlGoY3LnHF8foVElYbqa-95aq09hmd5THkrQ17wiMgAXQ0xHfB8oB-_TgJI7zcUsaikNxmlFicJ-8TxbQ9-CcaV6XOk6O2EaI6cFNg2W0A-3nZe7hnvKq3L8pJVmHl9DOQ_ATgHnA9X9kDMriDC",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Alan Varghese",
            uri: "//maps.google.com/maps/contrib/110620966140771264252",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVCGE23ha28yxtQcoEbnccStYuWXH17KYLKkIiAwqpw-oQUSd3w=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg",
    id: "ChIJqyTM-MeSwokRwtBPDSglPUg",
    types: [
      "italian_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "97 Lake Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.950946599999995,
      longitude: -73.8292244,
    },
    rating: 4.5,
    websiteUri: "http://angelinasoftuckahoe.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 12:00 – 10:00 PM",
        "Wednesday: 12:00 – 10:00 PM",
        "Thursday: 12:00 – 10:00 PM",
        "Friday: 12:00 – 10:00 PM",
        "Saturday: 12:00 – 10:00 PM",
        "Sunday: 12:00 – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 572,
    displayName: {
      text: "Angelina's",
      languageCode: "en",
    },
    primaryType: "italian_restaurant",
    shortFormattedAddress: "97 Lake Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q76ClbKx9dfP2N1T-12SQuUPh8IvKNR_Jxq4ldfBBN9xQrGccIa39qa63zcPv8O1Vgd6aAgkn9VW1cN1mi8DJfcg62XFEkSmTn2qGdvEJA3mRcaCYQi1FPOLVPAwPl0xgXaSHZp070PsT8cj9XXWIarRvAiFS7Xk6Vd",
        widthPx: 2721,
        heightPx: 2001,
        authorAttributions: [
          {
            displayName: "Angelina's",
            uri: "//maps.google.com/maps/contrib/111961368510838484053",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUNXhFPQMQLRMqOiI_Vhp25h30ef8pDGGFVFiWqaecDL0yaVm4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q5qdlQUKOXirI6QRjrw6NhsYD7hWGecrclKrW0jYO6NdxnailCyW08NNmrADR1lbclQbM5WA7666jTqJ0Bdfq47wZse0GE4FtsJRqcV5Ce_s3acmSSQKuFdXwZmuykgUj2uvkboyBQawrMKW7ZQqj5D8yC3oemwsB0S",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Angelina's",
            uri: "//maps.google.com/maps/contrib/111961368510838484053",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUNXhFPQMQLRMqOiI_Vhp25h30ef8pDGGFVFiWqaecDL0yaVm4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q4_Hs8T-1ekyJkDd680h40BW1Vn8h7u8ZKFkHjL82zOCvGGXOdn5ePYunMizKABqBgDopb-1vBw3Fp81tKNkG5y-8YF9NipofmockCkzmseV4_c6iCNj2ZR_5KySL0kafP1_86NpFAnVzsqLvjNh-EmrgK8Ld6Vlo2Y",
        widthPx: 1388,
        heightPx: 457,
        authorAttributions: [
          {
            displayName: "Angelina's",
            uri: "//maps.google.com/maps/contrib/111961368510838484053",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUNXhFPQMQLRMqOiI_Vhp25h30ef8pDGGFVFiWqaecDL0yaVm4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q5Ksb1FmRJ9yCAMUroGX17GMF0zD6oNzWCoREnU8V4dro-8HpazMAYeHwTvgQOXVLbUVGN2-mBbCSO1sa7xsb4XHXgB7ti3qZSUoXmin1r9KHNJf2Vbl4voUYehNlc3htmxP8wL97C8NMz2CKapKfJY9SpFuLx0V1eg",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Angelina's",
            uri: "//maps.google.com/maps/contrib/111961368510838484053",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUNXhFPQMQLRMqOiI_Vhp25h30ef8pDGGFVFiWqaecDL0yaVm4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q5CBHz6jv6HvGbuSp-uL3olaWrYsg9qtfm8KH8cq2taKd9ckiP1ealjU3Rhd3zS1i9wT5B-CcCwF7_YMWdkYZxHeh_DZLas7tYl2kVt9byfrfqHn4DyjuiuBl0ZgX6kAcewyez8x9NMNEvb6uwou6IRLPcICShIzapQ",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Angelina's",
            uri: "//maps.google.com/maps/contrib/111961368510838484053",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUNXhFPQMQLRMqOiI_Vhp25h30ef8pDGGFVFiWqaecDL0yaVm4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q7B2b_ssh7Fll8gaeFbOr0zabwKeCQbpc1S2mpvkogGqDnAJg__TCXEgQwbe0Uq9Z-A42tc5tAQQZcC-CKaNY2TA5TOQOxZKLzCkd6Ju3NICt5V3Mf72w4lUs0kp187l_Vdv6EfkN0NsmwquQyiNHANxDUk-SXzZN_L",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Gene Gaffney",
            uri: "//maps.google.com/maps/contrib/116609663123164895462",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXr0C54z1M1-DBGLX0lKp41tfI2geceR7P8glBnpnYmCkhH1l_n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q4in1qTfwH-gYt8UQ0EnGSUoEIpN9t38N--IYRc87KA8VwORNVn2AREy0k47tb__7eP6JdNW0aKuDGsaLzhnX0QcUrD0YCR-9oRu_8DrzCNzO6FVjepTQktL27msrP3zQrS5zAYBhiyCFeud_q7fRAEyhEdHqiFgBU5",
        widthPx: 3042,
        heightPx: 1848,
        authorAttributions: [
          {
            displayName: "DM 99",
            uri: "//maps.google.com/maps/contrib/116181954693954159221",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVOeiIPFb0Lo4MFf34F38UYEF60pafF_scNzNjWZjj-9BStLzSGFg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q5qnNzb9XwTZaBz_wsuDybyBeOkNtIrzt_A-QNOfiMfPJdizu3K2r7odhXSwEvbgDhHy07zciAj7yAyUbLD9E42YB4A5X6IqVpGnYmQXvPXA4HQyUbLwOTqMUAQcva77E_t7pqlh1XcFDtAo7I4ACnu3kRi1lC7z6_x",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Susan Di Girolamo",
            uri: "//maps.google.com/maps/contrib/111247548378182998823",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzCxtJU2Qo_CryuhOp1l4okBs4ahLA88a7O7ghy1Y63wccLg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q4tknHmFiLP97phqH_q5ZLfnV-SP4wPRd8Doq7vIhUSEyUhPP1ItSDVOeM768BY2_V-qRNaM2RlnW9EUg3hOd_316XWhW_jmfVBWhwVDsU9WdtQ9fZC36OqXal1P_VEunNpU_Enrxx6pBMc7RVVTdoXBLnWfo2rnT4G",
        widthPx: 2992,
        heightPx: 2992,
        authorAttributions: [
          {
            displayName: "Steve McCoy",
            uri: "//maps.google.com/maps/contrib/109465633195625529607",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVXSLuF2mq_dwVHMMTsgYoXZozafebHOci3qJAsJWquT9O5pY6UEg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AXCi2Q7FkySirCFqo_Q_tBd0RbZwOc5vvGud67Xet9AcRhViVjMc5WvS5zv2049uGeJwZntGtKBONomyvCDQZC7jE-sZUuJ0ehoaAf1PbwtobIbJoWQrfYE4acODANp3wwIAop7AoQS49STYrRpFTx1eCcrUC3Ti523LOCJN",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Gene Gaffney",
            uri: "//maps.google.com/maps/contrib/116609663123164895462",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXr0C54z1M1-DBGLX0lKp41tfI2geceR7P8glBnpnYmCkhH1l_n=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4",
    id: "ChIJW-Hq2ByTwokRL4y1jAbdAw4",
    types: [
      "coffee_shop",
      "breakfast_restaurant",
      "cafe",
      "restaurant",
      "food",
      "point_of_interest",
      "store",
      "establishment",
    ],
    formattedAddress: "684 White Plains Rd, Scarsdale, NY 10583, USA",
    location: {
      latitude: 40.969569,
      longitude: -73.806473,
    },
    rating: 3.9,
    websiteUri: "https://www.starbucks.com/store-locator/store/15039/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 5,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 20,
            minute: 30,
          },
        },
        {
          open: {
            day: 1,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 5,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 20,
            minute: 30,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:00 AM – 9:00 PM",
        "Tuesday: 5:00 AM – 9:00 PM",
        "Wednesday: 5:00 AM – 9:00 PM",
        "Thursday: 5:00 AM – 9:00 PM",
        "Friday: 5:00 AM – 9:00 PM",
        "Saturday: 5:30 AM – 8:30 PM",
        "Sunday: 5:30 AM – 8:30 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 281,
    displayName: {
      text: "Starbucks",
      languageCode: "en",
    },
    primaryType: "coffee_shop",
    shortFormattedAddress: "684 White Plains Rd, Scarsdale",
    photos: [
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q421ihcR8zJkHhinzNz4jzxFzXqXaTbXhRnQ-Grgtl5mtOrnMz5FA_5qI4rDXHjcSSf8qxHPBYjEIUhZGNpy1ygdV2OdCTp3YbCtO7TokAKt28cYxfaoxzqEBhcmOD0LzuINAoROfUHU-_cCigwLtSJLSEx7mPWxdAb",
        widthPx: 3072,
        heightPx: 4080,
        authorAttributions: [
          {
            displayName: "Noah Snavely",
            uri: "//maps.google.com/maps/contrib/116632334637894969561",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWNXxpVXzabgNRTLciuRod3VZjFd1jsuG0gHIr3Y0H155Lo7bBSFQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q6vHntA5G9prPbUnzwC9CwM5UuN8v2HHg48vTDFkm2-RFHcKF_5TsRuCEkuMMcqzPw3jfyCb_FTAzVAnr1NTet31kEPl_A6XhtkrUbu8SWWBiHFH0xyB2xLRkQxrjdI8CFADJ-EakSTcqFW-kR45J_j61owyKlh1CLS",
        widthPx: 1600,
        heightPx: 900,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/112227315764648850647",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVl6HbqOA9RErl6kKAPkN5-5C_aKneOPJh2ajMpYnj9k2Ze268=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q7eiwrKK61afwL35JZanAxLfMC9Xv4BEEjW47rqQjv_FrvtccGhgR_ABUeVQkCUHM8OLYuWGwrzcfWidYvPHVmXzBOyASLBsDzw7AgTc-zSmZOezttYhg62vO4mVfNJB22Q5v3zSlzTHh5TwKTTfLh67TuJEtwoh626",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Steven Buchbinder",
            uri: "//maps.google.com/maps/contrib/113816940528446301194",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWSTQELSTwqJ-LFceSc_klY7VYQUZti16_bdUyxLppLwqC40L68=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q5t86DFzL7nbSjZBWtOs5VxodsfsEI2gbAJxm3h0TuuHN7OfjCQVsTUSwaXqD_-TEKZgmaVbjj82tjsEPrnKuXUZBivPtItCC9MUlX8NHp8Ufx62q6Kepq2ey74yOiESuFnA3jbmLG1nUeWkMR9tvJnOQpEdw3txHL3",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Alan Klayman",
            uri: "//maps.google.com/maps/contrib/115483301734295559069",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUycxPWqIhB93lLVC_UWWWcZiKLTk08oAJ4iaVsSxGafW8GOGeI=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q5Riw4haI9XwwkiuB9hpRjvioROCH7TT9v-n0xv5vGMsAXpyfbG6470F-fN4fq-_nCRRas4iZplDHnWGsnqyXX3aJrFFxGU2bodG0pYPph94weYJI0HjoWyXmMjjKYlYYZOOS2UnoyVQ799mINGfr-fZkgkqVDSl_7E",
        widthPx: 1600,
        heightPx: 1200,
        authorAttributions: [
          {
            displayName: "Jeff Daza",
            uri: "//maps.google.com/maps/contrib/117302891142381239827",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX3P2WSf8cyWx4I0bv1_FiZSJUnPzZiwDT11TkyJuLXTOY6TEbGUw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q7MDx-FsrI_PGWUwUgasMMpOfQzfos0wUqlQQ33EXnXeLjjJQ8TmZzdh0A0GiiCji387VKWj90_-VqVyEuJrAZ0dldH_KAs0Gu_BAP38uIABsHrLEtm8qYOSvdP3LalcoHhkf_LuG-A2QLTaDIrIropazYWGt389pKq",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Jeff Daza",
            uri: "//maps.google.com/maps/contrib/117302891142381239827",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX3P2WSf8cyWx4I0bv1_FiZSJUnPzZiwDT11TkyJuLXTOY6TEbGUw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q6V_n4IYPS6x5gfOGgr4xtI8l37Xj3FSenvcimfbVWRBQZeAZap6KsleFw2Re-PlFJQZ4r199j5Mok-M5uSb7VGnJULX3SHpfrpSGehpSSOss_gq_Gx3UQEK-xkn2R0HmUWs7cGe3Zty4Q6srWvnJIEewnHleZ_GheQ",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Alberto Modolo",
            uri: "//maps.google.com/maps/contrib/102144263703558713743",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUD-XW36QIqwJTAEuNZoDiqoVV5j7ufPYbKH4SusGRtg3xGqcU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q5TrOMfUmxVuWbXXDMgK0aD53UJBzbYRBat_iXqeIzmUUUxSXmAkkTbYj4_BYSqCT-ueY2fvTzqFqUaecyzE7s4LpzPTEH7MH26UlsDzkEnJSqScxDHZR8ief5isMGnC1-YZPhl5Ti3-IHkt6vDIqxrzhHWSMTwlxyA",
        widthPx: 502,
        heightPx: 546,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/112227315764648850647",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVl6HbqOA9RErl6kKAPkN5-5C_aKneOPJh2ajMpYnj9k2Ze268=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q5ElBtFyi1pDLeSVE_aG3E17ToMH-Baqwvt9XLqflDw3I6kEU6edry2pnTkM9x0K49LJjkDoPdjEWRm_6RxeOL_j-Nc27z8qR8Y7RGyTSeEh5L87dqZMPW25Yd64VVgACLvdA8S8aP12zTMUbxraVDDx84SLu9m1xrh",
        widthPx: 732,
        heightPx: 664,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/112227315764648850647",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVl6HbqOA9RErl6kKAPkN5-5C_aKneOPJh2ajMpYnj9k2Ze268=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJW-Hq2ByTwokRL4y1jAbdAw4/photos/AXCi2Q5Fntnzxofa1SzmbbPsAOwGPUq8eWGC3SEVfvDIOOYrgOreQQDrsRosncezNWgymjSVa4mdV24ArmZsN52_9bJN7mkOQB2mJ0XnTDzhbHo5IxOnyEd4_PHHjWoqsO8SHneeRW_8OVlIV4V4ZpAnGBfAdtQHT5Z8i2eQ",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Jeff Daza",
            uri: "//maps.google.com/maps/contrib/117302891142381239827",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX3P2WSf8cyWx4I0bv1_FiZSJUnPzZiwDT11TkyJuLXTOY6TEbGUw=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4",
    id: "ChIJ466AQ6aTwokRsYGb5D8a3s4",
    types: [
      "spanish_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "106 Main St, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.9492877,
      longitude: -73.8251183,
    },
    rating: 4.6,
    websiteUri: "http://buleriatapas.com/",
    regularOpeningHours: {
      openNow: false,
      periods: [
        {
          open: {
            day: 0,
            hour: 16,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 16,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 16,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 16,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 16,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 16,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 16,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 4:00 – 10:00 PM",
        "Tuesday: 4:00 – 10:00 PM",
        "Wednesday: 4:00 – 10:00 PM",
        "Thursday: 4:00 – 10:00 PM",
        "Friday: 4:00 – 10:00 PM",
        "Saturday: 4:00 – 10:00 PM",
        "Sunday: 4:00 – 9:00 PM",
      ],
    },
    userRatingCount: 166,
    displayName: {
      text: "Buleria Tapas & Wine Bar",
      languageCode: "en",
    },
    primaryType: "spanish_restaurant",
    shortFormattedAddress: "106 Main St, Tuckahoe",
    photos: [
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q4BPf-Nv_DBZAeD5wmz0aymMwMXuXzgftYWZ2YHEuce-_Qw5GRiA87QfChwr2lIqDU3z4mMKlufpHUeyMfH5zdzp2nf6iU9eTOaN_lwYI34OexbfaVcVNoGmV3RnpA14Zp-hrRr3XSitPYe4NMTC5FE0UoYChZhDvwe",
        widthPx: 4800,
        heightPx: 3199,
        authorAttributions: [
          {
            displayName: "Buleria Tapas & Wine Bar",
            uri: "//maps.google.com/maps/contrib/102650034883474966912",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLiE1j9gcV4X86lv6RzDbx2-C1zcIgmbLI1KS9LT-BjNab6BA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q4BDB57T4wXr2aXSE-PT8NbHzFNssv-LufwyNvgWnv-fLfMkACaHwwHPPYDWhGLgkSQxd8T885l0Hjhgu0kHEYNzM0BpKwAFkfvVMQS8_nC_lr3s_1QgujWRJ-1-DUflcNgoiM7mc9EXfxWRGid5Ltjr0mmnKaJZ9jX",
        widthPx: 1080,
        heightPx: 707,
        authorAttributions: [
          {
            displayName: "Buleria Tapas & Wine Bar",
            uri: "//maps.google.com/maps/contrib/102650034883474966912",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLiE1j9gcV4X86lv6RzDbx2-C1zcIgmbLI1KS9LT-BjNab6BA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q4_fd95hA4wDDG27cdW4TlR7yDazIEIq1Y9xEpzO9UEF-yslU9Ybg7hcDjCFfUtJCJ_8pMLIy5MfrBwftni3RtTldaVUEJ0AHgYSWXF3DB1ayc6OZn-0qrxZ2YVCGdpnuh4dd2LhKLhAOGI-rHqpv2A43hwWvfkgN7v",
        widthPx: 1080,
        heightPx: 621,
        authorAttributions: [
          {
            displayName: "Buleria Tapas & Wine Bar",
            uri: "//maps.google.com/maps/contrib/102650034883474966912",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLiE1j9gcV4X86lv6RzDbx2-C1zcIgmbLI1KS9LT-BjNab6BA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q7MSkIap74MFb-6ZBEOl34KVnS3sXyIBRq2PXXQwPttgb4V5se-ZlqCp9NFzcusbJ4xeT-wvYf1QvYotlshwFgyqV9e-Jg20UVeXeC6o94Js5hk1hwVuLgHKDfQOeelAyIM68HL-yWckeKL5KDhkfwygS_JhIdk3OJq",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Oscar Velz",
            uri: "//maps.google.com/maps/contrib/106235349916931311197",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXaAc7k12LH45oy5iXYz8cSQjRNSXrMt_C7wAOSbUh3aBive2v9eA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q70r-8zwaITCz-125xYRm4s9R-fECuTvj-TrQxwhXfNvnzNFJG88LJfrex0UMPllP78jO621W7wAs6qS89i0l1uusI8rqipuMsERka6PF94Z8IgrqoJzDET_r8J2aWgm0XTfO1ZxsQYdZudl3BdrxEbYcezgHvRiwJO",
        widthPx: 4800,
        heightPx: 3484,
        authorAttributions: [
          {
            displayName: "Buleria Tapas & Wine Bar",
            uri: "//maps.google.com/maps/contrib/102650034883474966912",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLiE1j9gcV4X86lv6RzDbx2-C1zcIgmbLI1KS9LT-BjNab6BA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q4x_ZysaB6RwIsXBDEYGDSfsWzTvbzwb-2pqgP8wBRBrVP5UydFncpJErH8xRGaB-_LHGjQWGJSxzx861795676ew-WYj8EEham64LaAnfICTSgf6GODYrS3J5dm4LEEU6jMBjk_G2z1eX3yqkQg1Ts2rSeIQTT7omW",
        widthPx: 1079,
        heightPx: 691,
        authorAttributions: [
          {
            displayName: "Buleria Tapas & Wine Bar",
            uri: "//maps.google.com/maps/contrib/102650034883474966912",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLiE1j9gcV4X86lv6RzDbx2-C1zcIgmbLI1KS9LT-BjNab6BA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q4Vkri0PCq_FVJFrlWwQLpJ62M4N2Vw0rz8lI1wihPspZ1CZgpb8h7N99Mnno4K6dLehyQ2qgtgyqRamhmg6Ri_ZK4RwuiWbBBCs41c97-DMkz306Ya489QIhDF94XZpHp9rQj1YSAw8Mq7nspQwjuoIQcRwAWSVctN",
        widthPx: 3072,
        heightPx: 4080,
        authorAttributions: [
          {
            displayName: "Michelle Ciofalo",
            uri: "//maps.google.com/maps/contrib/105555818638232816628",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUstqMBmP41Y3BAqUEQH14xKmJBN13ItiTeSuxxmfibYsejkGBY=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q6rvH3kWIzCdhONRyyqmnT3TYiZgUZyW0a_meHnYXi7CwGJhVtwArQyKyx_FAFJE_t7-g_urvpeImsoFLuZaVsQNz-cvjumKdd6-ORESwJRhc5o4mgSZILCx2gRpr3GNE6fvlKvUsxgWUJfQIgplfyTSAdWMGqQvjEx",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Edel Sanchez",
            uri: "//maps.google.com/maps/contrib/109152514540488957270",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWTDgSgU1sosFEAoVr3mT_vzoVsq2iCOKpWvagga6W1nD0W3x5m=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q5PXz6sQDnUg4UK-3IgbozmyPiZitRHPUOYuIZ4TUgKXLwqCj0-U0Iyd4geTRIMuj7skloYAs_WAeU1oiKZczU09wTCckYSPgdHjRU1SSXg6f2_a0n3ftOfRfI-slodivItNJNNrGNCk90q1x9QscOwHn9gIj29NFBm",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Madhu Philips",
            uri: "//maps.google.com/maps/contrib/108580525282620779778",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVaS_b5GqmRc8ZEoXmidQkHnUWl0X4g1iDf1XGr6vOv8XrJg73sIw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ466AQ6aTwokRsYGb5D8a3s4/photos/AXCi2Q6z-CKPSL7NhZm9n-GMne-qQ2OTliDU1LJDJplyaFbjstEFy-Drv27-v_ziIMXQZcjIcDGoGR8EluHO4y6UfJUc2Bx-xDc1lxHtqu_XRYVCuEEPlJ4Kwk36hAETLgFbmIIYpDzP2uA4jcyqFwypdzDMV8_oWYVOq2zN",
        widthPx: 2268,
        heightPx: 2750,
        authorAttributions: [
          {
            displayName: "Vin B",
            uri: "//maps.google.com/maps/contrib/107091544165091660750",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUcUkqOhqM4R6vE2EPe-rASm820Xkg3-phCl1htg9qltF3kZl2t9Q=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M",
    id: "ChIJVV2WwceSwokR4t52AJ6MZ2M",
    types: ["bar", "restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "90 Yonkers Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.951326400000006,
      longitude: -73.8289191,
    },
    rating: 4.5,
    websiteUri: "http://tuckedaway90.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:30 AM – 10:00 PM",
        "Tuesday: 11:30 AM – 10:00 PM",
        "Wednesday: 11:30 AM – 10:00 PM",
        "Thursday: 11:30 AM – 10:00 PM",
        "Friday: 11:30 AM – 11:00 PM",
        "Saturday: 11:30 AM – 11:00 PM",
        "Sunday: 11:30 AM – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_INEXPENSIVE",
    userRatingCount: 400,
    displayName: {
      text: "Tuck'd Away Bar and Grill",
      languageCode: "en",
    },
    primaryType: "bar",
    shortFormattedAddress: "90 Yonkers Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q4XM2c90qIiesaxxH7Prx2TC_n4UGdzoqS8W4cuXUcYV7WDBLIBk-ryiGlOCUHHMCbDyLNm_PJbA4rXAGVLbgib58K4I1HwLXwDyCFX82pcVJ3M3idkvcZTXbqMjep13uuhhxDCeRP3o27spToEIlZALk0hE7l7GXwK",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Tuck'd Away Bar and Grill",
            uri: "//maps.google.com/maps/contrib/117004170607535197001",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXKcrSr-GpQTBoL60I18yw2ORb276RxqEzgtGfj_F9wkhrAuYU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q6cUMjnz9laSjwWut1MX1AyC3Xswu6tkk0zRFOzZs1QXFgABSXZYiKPXyNR-MBPYmrPRNskawGk_pxI92qelkw9o1NmATBQFS8dujfknOYuRY5pzmnjBcdw2estqPsy-FcnxVqiUu2MZwLPVi6Ewow-h2dBTsmtDdFq",
        widthPx: 453,
        heightPx: 302,
        authorAttributions: [
          {
            displayName: "Tuck'd Away Bar and Grill",
            uri: "//maps.google.com/maps/contrib/117004170607535197001",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXKcrSr-GpQTBoL60I18yw2ORb276RxqEzgtGfj_F9wkhrAuYU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q4ZAFGn7Wcc5DAUuYsztj6UXwzdWdYrdl6CGVpsAQcVwoC3haCAemzC0sUVtafXoSqIIH3nDGQKHDAt7yfdP3cylxcf08oMyzyR3t313yxq8kRrtVQdS4QoPT8-0Ta_XqHsECNYyW8nyn9CFvdH9EdIGYtXo3gCOCdO",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Gerard Visser",
            uri: "//maps.google.com/maps/contrib/117835854773569504294",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVIo-uGyIVfdSS9OnqrsUw79rnAplzsVIMjxz1BCLhstSO480Fjnw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q4EDFMuuuHzMCaZlqm48LJABbxz6SsDNnKjDb0mMg8xgHm7gbaG--YrjbI8nxF1X8Ys7Z-LS8utebYyrf_iXc9OEVCMLH63rBA7J4vAiUH4h0mO1r09aaV7IFBUPkVzqNXfdMDsvplDNh-xFD_cgDKAzB_A4IXu8Ggd",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Tuck'd Away Bar and Grill",
            uri: "//maps.google.com/maps/contrib/117004170607535197001",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXKcrSr-GpQTBoL60I18yw2ORb276RxqEzgtGfj_F9wkhrAuYU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q44nqZcjYcFjJ2pCHN8lxIlEYDnkwplHZ66uIrejA-BQquWg1FLZ-AtuB5TkLunS-HA8FC5saRkq0CQZ22wiAPz305H17RlhVvwHYQaYMGdc0qk67xo7Lr8JL4Or3XWiUM7XrDaQkZwkVypCgBYKbfdwgzY8p5jGeAW",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Oscar Filipe",
            uri: "//maps.google.com/maps/contrib/112538865213364934261",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWvJrV92PMP5FoNS3BXDFmNfcTarboSZuNlBFCzAPRGC9K53ya8jw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q4qReMx_teGQ59S__WhDyAdCtjQTtvEN7IpkOsFlNQe_LStfUmi9pOCN5WDXAYHUPs3I3dcodY_Oe0O66egWvTy1n7X1AE_wDop4V4yIdLUC0DxQ3kJLcXaMHp9E1QKfQQhIohhCNUe25Zp7sacZLcimphqG-m5pAZm",
        widthPx: 454,
        heightPx: 303,
        authorAttributions: [
          {
            displayName: "Tuck'd Away Bar and Grill",
            uri: "//maps.google.com/maps/contrib/117004170607535197001",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXKcrSr-GpQTBoL60I18yw2ORb276RxqEzgtGfj_F9wkhrAuYU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q7vRCyz1YbIlGakK5MFGQ6Et8oqABs_uzCyuOMayB4SR3iNZbce93m5FwQEv3bw6Z9P8vg5xCE4vZu_GhAa3epqtNyjkl-q4H1lEri3XhygyzsLOL0MN01ZYl3he09aBSfN-ciAAJQJu8R-2YJSv5Y4_shnGiTAvOyw",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Space Dandy",
            uri: "//maps.google.com/maps/contrib/100563658592719678557",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUpsyu8vW2oXbHTCKLwcc5cH-Jvk0s4MCCm5AZoYHbnHtDP22X9=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q4fksC630lxTZBTBjCXiSaCoPDuLa9qrp0PrleyUvw079bDk5uUGGEkOGzFv8znmRjNFj2IJNxQH6v0GmelBsmHrlRWaaylP5NoZImMRI1NnNJdEYXxoArxalKyY1TU5gmRMbDM9Yanoi5f1sjt4zauUcJw_1cn-HT2",
        widthPx: 3264,
        heightPx: 1836,
        authorAttributions: [
          {
            displayName: "Joe Munoz- adspinmedia",
            uri: "//maps.google.com/maps/contrib/110498938233204946619",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUGNQ11Xd-78cLHEjYZFi_KfeXxWMmQ6Mmv17PNVVJnaEAOn9YTTg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q4DqvdSTd979cFH88Yp0E-TiX9KsPnjU5P3MEZidbMyEH8xZCueZzacWN7ZjE9E0r1CqVkwhsZsZkintixeCTuU6HS2RpOwluHj3L4rSKlvC3lL4YV2gqFg7iMjQIj2PcwU9ir_wS5UPt-HjH5y1AQjT8EGwGqzXyT6",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Space Dandy",
            uri: "//maps.google.com/maps/contrib/100563658592719678557",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUpsyu8vW2oXbHTCKLwcc5cH-Jvk0s4MCCm5AZoYHbnHtDP22X9=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJVV2WwceSwokR4t52AJ6MZ2M/photos/AXCi2Q6gaspyWJ7Q4HPpbv8UPn7tEafTImuW937Ms-cwJ_DowNG4ige8-2zQ66uKocjlxPSRvapdEuCShE45pumPiymxc9hXwDr-yADN9MZZpegGyA0SYNEk0gTsVhgr4bUqPBE3wjPN0LSrN00YWTNqIQ1WY_CjLshH9ilF",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Marie Pavia",
            uri: "//maps.google.com/maps/contrib/101579886649390140224",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX5MCxW3B6WlDIXZWGfU49Dgjxs_kfItw_Aj2l7U28oMEf337MHhw=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleEntrance: false,
      wheelchairAccessibleRestroom: true,
    },
  },
];

exports.sample_google_data = asyncHandler(async (req, res, next) => {
  //get lat and long and get address info if we don't already have it
  try {
    const { date, budget } = req.query;
    // need lat, long, and radius
    const { location_id, location_coords, radius } = parse_location_data(
      req.query
    );
    let locationInfo = {
      location_id: location_id || "",
      location_coords: location_coords || [],
      address: "",
    };

    console.log(req.decoded.member_id);
    if (location_id) {
      locationInfo = {
        location_id: "ChIJ-b2RmVlZwokRpb1pwEQjss0",
        location_coords: [40.752714, -73.97722689999999],
        address: "89 E 42nd St, New York, NY 10017, USA",
      };

      // let { data } = await axios.get(
      //   `https://places.googleapis.com/v1/places/${location_id}`,
      //   {
      //     headers: {
      //       "X-Goog-Api-Key": KEY,
      //       "X-Goog-FieldMask": "id,shortFormattedAddress,location",
      //     },
      //   }
      // );
      //
      // locationInfo = {
      //   location_id: data.id,
      //   location_coords: [data.location.latitude, data.location.longitude],
      //   address: data.shortFormattedAddress,
      // };
    }

    const metersRadius = radius * MILES_TO_METERS;

    // get google data
    // let { data } = await axios.post(
    //   "https://places.googleapis.com/v1/places:searchNearby",
    //   {
    //     includedTypes: ["restaurant"],
    //     maxResultCount: 20,
    //     locationRestriction: {
    //       circle: {
    //         center: {
    //           latitude: locationInfo.location_coords[0],
    //           longitude: locationInfo.location_coords[1],
    //         },
    //         radius: metersRadius,
    //       },
    //     },
    //   },
    //   {
    //     headers: {
    //       "X-Goog-Api-Key": KEY,
    //       "X-Goog-FieldMask":
    //         "places.accessibilityOptions,places.formattedAddress,places.name,places.id,places.shortFormattedAddress,places.displayName,places.location,places.photos,places.types,places.primaryType,places.priceLevel,places.regularOpeningHours,places.regularSecondaryOpeningHours,places.rating,places.userRatingCount,places.websiteUri",
    //     },
    //   }
    // );
    // console.log(data);
    // let places = data.places;

    let { tag_map, place_ids, places_data } = this.process_google_data(
      places,
      budget,
      date
    );
    await restaurants_model.add_restaurants(place_ids);

    let db_ids = await restaurants_model.get_restaurants_by_place_ids(
      place_ids
    );

    req.googleData = { tag_map, db_ids, places_data };
    req.locationInfo = locationInfo;
    next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

const GOOGLE_UPDATE_1 = [
  {
    name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw",
    id: "ChIJ--5iQuiSwokR7jxhtfFChCw",
    types: [
      "italian_restaurant",
      "pizza_restaurant",
      "restaurant",
      "point_of_interest",
      "food",
      "establishment",
    ],
    formattedAddress: "102 Fisher Ave, Eastchester, NY 10709, USA",
    location: {
      latitude: 40.956803099999995,
      longitude: -73.8167425,
    },
    rating: 4.3,
    websiteUri: "https://www.polpettina.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 0,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 20,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 15,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 16,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 11:00 AM – 3:00 PM, 4:30 – 9:00 PM",
        "Wednesday: 11:00 AM – 3:00 PM, 4:30 – 9:00 PM",
        "Thursday: 11:00 AM – 3:00 PM, 4:30 – 9:00 PM",
        "Friday: 11:00 AM – 3:00 PM, 4:30 – 10:00 PM",
        "Saturday: 11:00 AM – 3:00 PM, 4:30 – 10:00 PM",
        "Sunday: 11:00 AM – 3:00 PM, 4:30 – 8:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 427,
    displayName: {
      text: "Polpettina",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 2,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 17,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 17,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 17,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 17,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: 3:00 – 5:00 PM",
          "Wednesday: 3:00 – 5:00 PM",
          "Thursday: 3:00 – 5:00 PM",
          "Friday: 3:00 – 5:00 PM",
          "Saturday: Closed",
          "Sunday: Closed",
        ],
        secondaryHoursType: "HAPPY_HOUR",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: Closed",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
    ],
    primaryType: "italian_restaurant",
    shortFormattedAddress: "102 Fisher Ave, Eastchester",
    photos: [
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q6kAY-gFlQkSwaId3jYrmuDBtnoUrwkqngWw3GUnD7M_VISTNKedXm8jk1Zql8kfhdgUGmz5fShXU4XORpZCkEDZD1LS8YSWk7BiGFfONWWyOcNEFHSpgsyfNDZFFeM5BJiCWQzOCKUXinrKjMyKe_ZOLN8mMAgLaK6",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Muffetta's Housekeeping, House Cleaning & Household",
            uri: "//maps.google.com/maps/contrib/105457051218273602036",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVY1RGxGwIV3WXq5MczEHy8u0se8udfO_8kIv-FGzl1e09aMdI=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q5uJIZILqnkorHwbDonbniP7ZeYjo4eZ8wH3hzvZDQO8VumSKwasFVfrJ2qLmEUKzGIUUdFDg1OOMl8nXewmWPSdNuush0KzsMi73LLH-lQr7dNEC0Td5UOcqCsAZlZRCq236sIAMotJwljc-pTy_XTI2pvf89zyR7q",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "ML Ong",
            uri: "//maps.google.com/maps/contrib/103876713633083931019",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW_r50JhgdkBaSLfG3z23ZQfytAyq2FfMaUgSOsRJETzabYpO79=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q7W-eatkIkVaajuUKFCgqhIGAeBdFgFNqZBJdvuNojMX8cU6pdWoZAQsLR-rYjYo2RE8DSJB-Ai9Tulfmi3HnEfczpBwQsBBBOHg_7D_5BjOs5bk-tjYJddQD4Yxk6UxBlg2J9ErMUMsnBHegTp5q3yxrkx4TT-c6E2",
        widthPx: 4000,
        heightPx: 2252,
        authorAttributions: [
          {
            displayName: "cory hartman",
            uri: "//maps.google.com/maps/contrib/117113678754225878848",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ2ZH3sAUp_WC4WVZdxYOSiTuKSHGBrqyp9xACvH7R8dMOtbw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q6P_Tiy_Ntx4yGUNaOcJJaf1WNtE6WPCtHrJOlxgWzwahcxjA4ONnksUB3OZfHuUxViPpe3EfPX3dEzZoQ1RasYEJ1_mqGP2MNmGcjOllAyivIRp6S4E3VWEzfR1Hl693bi7haQXNkqWTdqX8ZglQdEVVkEn4-ONL_d",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "J Lim",
            uri: "//maps.google.com/maps/contrib/109935156740971751576",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKYnG11pwVBark64wiserzR8n-rEfTAglboJ7aaEgmmefWHqA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q6jY0wmpP43Whj_NhV719ap955cRrmvr12aXCZhkZzRTIZ6RJgOYLfkXSown4gzrAI0y-eYky8GJz_pVm4TCbh1jJaQj4Zq4RacJNsMEx_rPq4MSEd8Zy8cdFwi1NOpTvKL7P_3MrLt6Df6JpxpEcDHsNT5AiW0C-Zx",
        widthPx: 3600,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Gianna Salmas",
            uri: "//maps.google.com/maps/contrib/112422668535582317523",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUBKPdwD_XhEp9TqzH8cd_YtCpQLtflV-5leBE7QOrQB99KcRvc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q5lRfxC-I2-PQ9mQzNJipSoj4KiSK4dwtiSLIvUMWM7zEma91Hvi7wI2bgcfREi2tmnqtpZf3VhJpCNXy180Txe6dE341oqu2eL4ckPIK09dT8Pc2VV2QfIUgSEbRKZw3StXUz_Hz2flhgX6AUSB45u9JjiS_G_30YX",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Albert Belegu",
            uri: "//maps.google.com/maps/contrib/115126213285502150012",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJq7DbD2MZI3SNBz4CqXrjMp1NCo5qfZxu1WI_Mib3NBlcvyQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q6psF7WSOwgtXh_kf3KAeBYbV4giEX9CQPlHzTRvWSU5ZqqWa6iKTWLrYGiwWmXC9xyeXFZ-fLfRWzbMpSxDKofXUqF3BLXVDGN2MG-X-rkhQOp7MXlrD_3dlpXSRuH8DaG-AciGjdwXdtWoY5U-6Udav7uTShvp4Lj",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Maggie H",
            uri: "//maps.google.com/maps/contrib/105905109091108364011",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUrk_-BPSIyptNscSnvoYDXFqWFkk5I056EVWvtAXBVGbB0aHtt=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q4Gx-Fgw2_BuTsnxXdZlRlSz0CGRLMd0JaeSal8BvocEvOmFhxszj0uqExJpBbbl8imwgP5xnZi4LjscyxNB87vCM1aUTb24shDI9pcIPvwV_WwZG_mYqpPONxY9PE83BLyFd8EBe4ItLsSv9YsAW62qCSNhBjAKegq",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Malia Villafane-Robinson",
            uri: "//maps.google.com/maps/contrib/111182177539209873837",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVeGUQnN2PT3WDYX0t_b0k_VIIbn8sFYAcUyp4wjBaxd80mz9CN=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q7WY_TKM3pq-Mk1xUAKKZ43BP4BJHba8VqlQzy71nwQ2gk_PWwPQ1UhCV8v2Q5WfsS_mE-ZFqsvlr_yFxr_JQO7GoHoaFi_sU3s68isxmAUJCc6l4TFL42K1Ah7hf6_KETRu7MocBv6Q3hCJt3JJNx7lRE5_POW9wqJ",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "T Claz",
            uri: "//maps.google.com/maps/contrib/115336123914713811551",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXj7tUwf95VFY3i7Uey2K5F79YNztb8eOznSEWovQLdi-ayYwqA-Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ--5iQuiSwokR7jxhtfFChCw/photos/AXCi2Q65_0tnF-yivEBKFxIBgdpRKYzL95UgfYPB2zMUmYZRkhxjeMo6yBzX22f0b9LDPTS1cMMyiSkeHhQ109mHVM94NfWwOfhMPQzk2ZqYae6G9F8gITTya2ONbAE2936Wq4zoQHwRmn71B5d_mS61nDm9dqDfsmWSOhYN",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Jay Shin",
            uri: "//maps.google.com/maps/contrib/116593646974560181054",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzKsu0oxd3cRHAHv4Rw0ZSHHi81T8uQMVmqLamHPrGc4T7SRDg=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU",
    id: "ChIJ9-DcCKKTwokRYUxQqy5dQlU",
    types: [
      "mexican_restaurant",
      "restaurant",
      "point_of_interest",
      "food",
      "establishment",
    ],
    formattedAddress: "296 Columbus Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.9589335,
      longitude: -73.8201667,
    },
    rating: 4.5,
    websiteUri: "http://riobravotuckahoe.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 10:00 PM",
        "Tuesday: 11:00 AM – 10:00 PM",
        "Wednesday: 11:00 AM – 10:00 PM",
        "Thursday: 11:00 AM – 10:00 PM",
        "Friday: 11:00 AM – 11:00 PM",
        "Saturday: 11:00 AM – 11:00 PM",
        "Sunday: 11:00 AM – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 558,
    displayName: {
      text: "Rio Bravo Tacos & Tequila",
      languageCode: "en",
    },
    primaryType: "mexican_restaurant",
    shortFormattedAddress: "296 Columbus Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q4hViS-0I2grKO0_uaxVFqeqL0m9FjIV1KQZTGQ0KVD47E9z8lcIoXTy_7SiixOj94pZw2aQXOgrWXG8vpLADe9N7Qn7BlmYTq8Ax8__Fv9YgfByJLRORzFDK_SZSAzFAOcKiaDULgUplClZn4HU5ciDoB_HeK2iWLz",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "mike blumenthal",
            uri: "//maps.google.com/maps/contrib/118405393025299785535",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXNBIj4GyrdQx1rW0r7x4SDWQ6ugNoTn3KelLQt_Xf4AUANLYp8dQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q5nB2WnFkY-OEAsJxIySDBfacfLXGj2clTZ_5lFO7EunCh5_BLGUEHhu4b80NevgezsNSgLhlSJ6t6trd5s7MfyGU1MGDcrrtLce0J-Sn-WMFR5dNJnZxfzZWvE8PmHk5-uBS6-lYTIB8-Odg7ti4SbzPnj5G_pfyjQ",
        widthPx: 3024,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Timothy Smith",
            uri: "//maps.google.com/maps/contrib/116486913247567213032",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjULTSsQfxgrRP-PtdWaSsCteJGVFCwSELJ0OTd7qbIQcyXy_clpjw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q71Zg1zl1VQ486IpL9QJesmi5WDmDJU08j4OOUM9Y_JQfM2-y79H1U40c2ChEJzYZ9gJqUar-91rm1OF-6I8f5dPMeYS90ksjVjbfElAwrDZGuFzB4h7lcVNJFnEEA75zRAc2ejR1MphdKhh-RlC2wyis3UQD8jJxI5",
        widthPx: 2992,
        heightPx: 2992,
        authorAttributions: [
          {
            displayName: "Timothy Smith",
            uri: "//maps.google.com/maps/contrib/116486913247567213032",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjULTSsQfxgrRP-PtdWaSsCteJGVFCwSELJ0OTd7qbIQcyXy_clpjw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6HmZJoaRweuUBLsoOTTH8L3D9aLSuzIhIkSE149cGic2cX6kpw0rqzP1Bp6d_xfejB0ANaW5oYkazj43P-z5zEDzRsaHAf-TOURU4XXo3IrwftVtTUk791QF7700Pc1i8mSyWY12zSjA1vfThet03r3RTEsYsYQ2EP",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Trevor John",
            uri: "//maps.google.com/maps/contrib/112912470598506815753",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV3al8-fZk9sB06rSa08L-43C8pNDGZh_lCqAJEBfTdYHRT5ww=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q68McLsh-4aR-6ANtnqVWZJBzDVuWguWv8tJOydJdOz3da_AsRyBBcl7BGkWKEcZqxle_t5KICnONzejqTF69XHeNrZwyaGk5bJ-KkQr7jO2Oim7t6X-ndbuTeoji80CM-enAAnn9CfZeci1uHDpqQDh78KuOWJXOU2",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "French Mex",
            uri: "//maps.google.com/maps/contrib/101904452653254582234",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVaxE_sXOwdfU6HzmBYDl9L19C9_mcEgbDuqH3z1Jv1LKqPw9ps=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6q2EMnKu3WSl-Ttv37Ox-KgeWeRRvsy3v_Pb3ga8iruxTYKeEf5xxmaS0_sET9E2KQ7FpcBvTlPMt8fHvzyVmWQICZJXBukQBdahqQxNi6FdmOk35dTNuP_tj7ZUZwoG7p5eY1-nJF8lKM5iKzYHU9QfTd_ujuUjey",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Dominick Vellucci",
            uri: "//maps.google.com/maps/contrib/116345219794599247988",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6Pv2eLbar6huKRzzV2yzmQRR1oUAaOcl0mAEsBb8w4TPV2nYlwzM4e4kCynrsJJAT1RqeKIiVwp4Whr91VWaPlwIqtiuMSAP2BRH3N6B5b2BDAWw56TdUtzPasCEoSYxaeHu5ATqvSjoKfxTTfkYvwFb3lQGrL4azx",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Dominick Vellucci",
            uri: "//maps.google.com/maps/contrib/116345219794599247988",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q6np6s-fsI-O6n3gBQ8gy36WbFcppzxvG1iXzF-15aXyTssZ1ulSL5iPvpMQ47H4ruNq8cd1xMU3k_R2rFntCYSu9dQX7M2TeJVd4O2ZVPbZhaP9qTiymq7E3mUZBZigCg4z3MMa5xzyEtqs_6KuvOaM5_Pk3oRe_oW",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Trevor John",
            uri: "//maps.google.com/maps/contrib/112912470598506815753",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV3al8-fZk9sB06rSa08L-43C8pNDGZh_lCqAJEBfTdYHRT5ww=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q5BC9lLr5u8bBD4sPtpeWoMEFzuHJgWnEtwpLQla2qBqCx1IBx2AATOYjp-m6El1bvxZWVldOg2399Jib-plIhg18ejwATCJxex9dADju1-Txj9BacnafCB7SMUj4kcdF_a76mz3RdW32WsMKxZE5C3betGjtwobB3h",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "French Mex",
            uri: "//maps.google.com/maps/contrib/101904452653254582234",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVaxE_sXOwdfU6HzmBYDl9L19C9_mcEgbDuqH3z1Jv1LKqPw9ps=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ9-DcCKKTwokRYUxQqy5dQlU/photos/AXCi2Q4Si7D4lwyxI_RkZdcCEPsAGb0-z_hIsIavmB9AFsTlHJ6Grtv0fu7lz5UD87sz1zhpm2Giej0SvmqlDtuyPq9k649iF0qTV3LkVzblkENgDh9vJnlM4eCWcacnPJPWxE9C_2Nt_eeTS1wHNgDdUe51JU5ubTaNNSjl",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "French Mex",
            uri: "//maps.google.com/maps/contrib/101904452653254582234",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVaxE_sXOwdfU6HzmBYDl9L19C9_mcEgbDuqH3z1Jv1LKqPw9ps=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU",
    id: "ChIJ-zImzcKSwokR7tczKj1jRHU",
    types: ["bar", "restaurant", "point_of_interest", "food", "establishment"],
    formattedAddress: "12 Fisher Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.9585436,
      longitude: -73.8204252,
    },
    rating: 4.5,
    websiteUri: "https://www.stephensgreenpublichouse.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 1,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 17,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 2,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:00 PM – 12:00 AM",
        "Tuesday: 12:00 PM – 2:00 AM",
        "Wednesday: 12:00 PM – 2:00 AM",
        "Thursday: 12:00 PM – 2:00 AM",
        "Friday: 12:00 PM – 2:00 AM",
        "Saturday: 12:00 PM – 2:00 AM",
        "Sunday: 12:00 PM – 1:00 AM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 221,
    displayName: {
      text: "Stephens Green Bar Restaurant",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 19,
              minute: 30,
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 1,
              hour: 20,
              minute: 30,
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 20,
              minute: 30,
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 20,
              minute: 30,
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 20,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 20,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 20,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 8:30 PM",
          "Tuesday: 12:00 – 8:30 PM",
          "Wednesday: 12:00 – 8:30 PM",
          "Thursday: 12:00 – 8:30 PM",
          "Friday: 12:00 – 8:30 PM",
          "Saturday: 12:00 – 8:30 PM",
          "Sunday: 12:00 – 7:30 PM",
        ],
        secondaryHoursType: "TAKEOUT",
      },
    ],
    primaryType: "restaurant",
    shortFormattedAddress: "12 Fisher Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q6JYUxv1TJ37qLpiBv-hAnVHn78kJ1q4t8--5ay3yBQ_PSDUGZckPXlESMEY1QQzvOYrf6gyGwKXdMMNG2lxeO3bsaJ3mSIJoKOz1tdUrnhYPhSA4rb5yi0OiPiaEwnu9eHtrTHfCJ8_lvwNfeUdQqpejdb35aRr-Hk",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Stephens Green Bar Restaurant",
            uri: "//maps.google.com/maps/contrib/116180127258829445153",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUCkN44ppd8xDH-2MRtQ32OOM48JB8vztF_WCmoUGFeq_HVNNc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q6S8_BGAJ95cIWdgjKkdu3xT6YfLx2qXZFIr7y5xN7RP86cok50KFxnY74KSWvf_zb31k6d9y91U2RV9iTHr1HOcOS5GpcEMTLz-qvtsPPXk9LytfgT8D3A5jf5Bd1Ifqy7IPI8YfcHVKt7Q61u4xa2mEq66qCHqt7j",
        widthPx: 4800,
        heightPx: 3599,
        authorAttributions: [
          {
            displayName: "Stephens Green Bar Restaurant",
            uri: "//maps.google.com/maps/contrib/116180127258829445153",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUCkN44ppd8xDH-2MRtQ32OOM48JB8vztF_WCmoUGFeq_HVNNc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q7WuGY1Fm6Z74mNw4QMQyawF92vtNaf7hyKOJRw0KUdvAVDmA71SF5OaWSJ2F2S_D6Wr2fs9g6FWLxUnnST4rDg4SncCp5mZpfsLbMoyNQwTEKvXuJ1l4os3BWp6K069LFjbNU4ENE7ogtumIGCSwuSw5578tNOeAbp",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "Chris Gerber",
            uri: "//maps.google.com/maps/contrib/107448670651566569306",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUGW-rgBfRJzHWXmt3SCLPn2-NV4rTYL2psrhmOBkQoX1gMOg1fNQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q5NPQiwhWWttsSvCBtIj7rbneXOc16V4yNhBuQpCMe7FQwsXdSVRRW6Qhcf8tDNhcNxmusvr8GgMEL3U5pa6uynFQHVheLULSY7zRfwOgDw6ruTkHgDnzHRt4CaBPXRrD07dJ9ktDOceeFnqV3dEYShNoP13ugxr_BM",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Ye Liu",
            uri: "//maps.google.com/maps/contrib/101152292621667480096",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVjc69Gs1y0tAUCSUGKI8HBhEa38uSw1vY9xkR3XClvGrRFcgsSPQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q44XaEdpJF-ezfwfJsE5BcddgoonUpoietFtXrA1WIUliFLMPFjeqPSVeY8t5m5PFOn4R-JeHVqHfKJ7dYMHrXQsIu2OsqSgl2m03I48q1Pim6C6gq8Ri2o2vH2zrZWZIyKYNORbTLfzJ7h_uPr_cbrOmK0yjLE12xW",
        widthPx: 3311,
        heightPx: 2485,
        authorAttributions: [
          {
            displayName: "Ye Liu",
            uri: "//maps.google.com/maps/contrib/101152292621667480096",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVjc69Gs1y0tAUCSUGKI8HBhEa38uSw1vY9xkR3XClvGrRFcgsSPQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q7t-yir1PvMokVsUcXoOodirkqzO7ANVkVDPjvQHmsNeARQPTCN_WUcMJHv4f9AX_-xQ3SPqStqFBRCcumkVyfiIIus9WuYN7blTyK4cbKRckb5hWak2ULPCPuFeF-dV5i1eNo1JPsOIsfWNPGfCfIuhbw2EChWoY7C",
        widthPx: 3072,
        heightPx: 4080,
        authorAttributions: [
          {
            displayName: "cac cac",
            uri: "//maps.google.com/maps/contrib/110652896303538078160",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocI6vN4shFLyK7qsjttMUqS8nZ_FSOJZW3-W9EIuxFjybwaJVw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q7uCdNuXjP2DKXNJswiq30ZXFDAEcNfS9UxqQ5OHurm2g6XbU44uXlKHU5WTzrqhm5BrjGoxBKJ393EMPYF3QMRZcALlA0Awf12oYXA9BbBHhQJjvHvQ4xwpwstlp7V3taxqOB5jkJ-ol3Qv4xFly7JbX5S3P4igBl9",
        widthPx: 1960,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Samuel Blakley",
            uri: "//maps.google.com/maps/contrib/104297796377836110668",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV5GMfSqea1gFCwf1zTyTdeh48ezbl4JWS5lx2Fn_-4UnfDN56VEg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q6TmY9WfeaUBny814_u_xs9i6yE235TigDglv6qJ4EJHQyUGte1Q9bFVMHeJLVRp6JKoo_KaU7dZXtWrgQtph2ltdy0DktxL46xWGDVWWLcIMHLYKKkSpOPkX90KIORbmKG0I7oqg4tV7G153PmVHHe0K46jylJNWzA",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Stephens Green Bar Restaurant",
            uri: "//maps.google.com/maps/contrib/116180127258829445153",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUCkN44ppd8xDH-2MRtQ32OOM48JB8vztF_WCmoUGFeq_HVNNc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q5w3oM_CQavZ7YFCDWrknp3Ddxx5n7VilHVnpLqngmhU_FtY10NC_-zuNGeTkhhmoxy7ZYWw4PCtFIksoLKj0shxaJi3_toTtyCQJb7JjyDECm7ZW43BKVcVVkXhjMi9hGv-ikIDxNnZ7oeiTsly9UMfVNDsJTi4C_3",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Chris Gerber",
            uri: "//maps.google.com/maps/contrib/107448670651566569306",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUGW-rgBfRJzHWXmt3SCLPn2-NV4rTYL2psrhmOBkQoX1gMOg1fNQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ-zImzcKSwokR7tczKj1jRHU/photos/AXCi2Q6oXU-C2ikr4GTcvWcfpXahpzNeIor5Fvi0iKsaYmDxJp1NBq-UDhaGs9-MQ3BCmf8j0V0uTt_n_Ae8sbC-0O4dYFwFjJIvgZUnwZnfB1mZvUkwVwFhgQc33nADdBpdZiWW1F41zRRizUiFNOKvx1KfYrexplEkxHSr",
        widthPx: 4800,
        heightPx: 3599,
        authorAttributions: [
          {
            displayName: "Stephens Green Bar Restaurant",
            uri: "//maps.google.com/maps/contrib/116180127258829445153",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUCkN44ppd8xDH-2MRtQ32OOM48JB8vztF_WCmoUGFeq_HVNNc=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA",
    id: "ChIJcZH0TsKSwokRd0dSTOmC6MA",
    types: [
      "pizza_restaurant",
      "meal_delivery",
      "italian_restaurant",
      "store",
      "restaurant",
      "point_of_interest",
      "food",
      "establishment",
    ],
    formattedAddress: "286 Columbus Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.958897199999996,
      longitude: -73.820378699999992,
    },
    rating: 4.6,
    websiteUri: "http://www.crestwoodpizzeriaandrestaurant.com/",
    regularOpeningHours: {
      openNow: false,
      periods: [
        {
          open: {
            day: 0,
            hour: 15,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 10:00 PM",
        "Tuesday: 11:00 AM – 10:00 PM",
        "Wednesday: 11:00 AM – 10:00 PM",
        "Thursday: 11:00 AM – 10:00 PM",
        "Friday: 11:00 AM – 10:00 PM",
        "Saturday: 11:00 AM – 10:00 PM",
        "Sunday: 3:00 – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 139,
    displayName: {
      text: "Crestwood Pizza",
      languageCode: "en",
    },
    primaryType: "pizza_restaurant",
    shortFormattedAddress: "286 Columbus Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q4fmWaHpfGNjhdCpM6SfeRxyAkKfeitpFsnIz4GXVMKXL630y2E8Nb80ztVXMWbWHl3mI4TJbYmM8tYujC81iAqJ8Gdk046KKtrtnLzZBPLrnVQBzh4ejBh-It4_XKkDPIxelsTURqJrlm8O4mIB8uPQJ8vS0jukJRy",
        widthPx: 1000,
        heightPx: 750,
        authorAttributions: [
          {
            displayName: "Crestwood Pizza",
            uri: "//maps.google.com/maps/contrib/106463761947036241792",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIuZOSajZTFyJ0b5VuiZHiVZsHsFloNi5lsqLs05fquyMEqLQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q4qoM8lqMgKwx3i4bfEGKBq3yexxp0ltUThO0fmHsG4sAB_JWHmLT2hjaIeGHWnXfBDHzcz0rXWg6fgP4AqqzcknMcH-ybMqLqMgdn6Jmwqe8mfrtIxrbMk0sHC6mfWY9AwubPNBOgTyBStxvJcaboR6Puh9Xo1c7i9",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Crestwood Pizza",
            uri: "//maps.google.com/maps/contrib/106463761947036241792",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIuZOSajZTFyJ0b5VuiZHiVZsHsFloNi5lsqLs05fquyMEqLQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q42w87_bHOUpidEVOZg0iZpR8hoUinhAhc3vr7y_hA5OdCjtQlcqcXjKpxvBaQJPX-3g9rCx3UEUnrNC-Oz19_19z6j7OiUK5Oe7mXZJfewM3lFPxaC2M8E09hx2yiKTFYyZM5y-Ve_YRX-LSf8fGmjQMRLDSl5Qoc9",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Crestwood Pizza",
            uri: "//maps.google.com/maps/contrib/106463761947036241792",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIuZOSajZTFyJ0b5VuiZHiVZsHsFloNi5lsqLs05fquyMEqLQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q7oJiHk51TKWo4t8OzadHghaZGpdU0RVkQqZqsjSXRdsEhJ-Zrs6DJA1lh_X3vjQaoO3MSBfKC29XaaX8eeXFbURPI07xdhcg02m20Xilap6jHbGxpLHbEKuA1bJQNfd6Hi0QB5u5VnWbc_IL7EG89dHr7x5LyFJnMc",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Crestwood Pizza",
            uri: "//maps.google.com/maps/contrib/106463761947036241792",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIuZOSajZTFyJ0b5VuiZHiVZsHsFloNi5lsqLs05fquyMEqLQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q7K2gM8x3kbJGWbgDCCJlr7mBa7YQLI5IV3kUe8JmZh6-EATBk7XHNLVbLdIjiHunHSRXk63V7NiW2NnxrT2m1FeVyaEXXqzpuMzdF2JzfPxIhkMTGMXUGTZ9Z6qi5iaxc_SIotFR7q7y2WkLiGj6xrRWuiumsqX4dS",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Crestwood Pizza",
            uri: "//maps.google.com/maps/contrib/106463761947036241792",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIuZOSajZTFyJ0b5VuiZHiVZsHsFloNi5lsqLs05fquyMEqLQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q4GYvCJcHyO32Oots2NgPq19vKJ-M0V3vLtsM-o34ngtg0D55qUhmbFiFasQKlGibhNGc1xviR_EDlx46PQgBV5-m7OBTdrnEflTcjQUwfd6K5Am8ThVbKnJccB8uI0y5If4CmXMGGdtk3EOzNM_7sRTFtEEqLzdQwP",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Crestwood Pizza",
            uri: "//maps.google.com/maps/contrib/106463761947036241792",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIuZOSajZTFyJ0b5VuiZHiVZsHsFloNi5lsqLs05fquyMEqLQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q7FlKTOU-bGkoSU5yBoIxE8P049L6Iw1x8DaDNyStMgJFZi8Mq6gwjtlRBD4UDZCe7VJiLV7A3U54XYC-uriBmDLHnWr-wLkybXQyfPsUZVhn_gjUUoogRIdKLgGU9JQAvPEtzWQ3eB8QaxXyvcJA2osxhCXyro-Ja4",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Crestwood Pizza",
            uri: "//maps.google.com/maps/contrib/106463761947036241792",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIuZOSajZTFyJ0b5VuiZHiVZsHsFloNi5lsqLs05fquyMEqLQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q6edUrNm64-fgxqW7z_b75nxBySNJ03mizPO4XRxp5w_I1JxQSxxdDej2mOL6py0yuKzqntRfLDVDRLC28GZZvdUv3i4MXhUc_Oce2V6Gu40C0d7a0Ykk8efQYtcKWenxNgOx6AELa960geaDdXnLOKDWo6-wsgq4n7",
        widthPx: 4080,
        heightPx: 3060,
        authorAttributions: [
          {
            displayName: "John Galluzzi",
            uri: "//maps.google.com/maps/contrib/100996336935688938713",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjU2zW8oL5nk_WLY-k-F9bObKtBI1dUc0ZJl7ePDEoWCrPGWeVUf=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q6B0hkWVwiI-42mTushKZFW9x3xPXReZC-SikuECmdJyNCf2IdbiOu4nDLT3QpgZhyxeJMBvzEudJPG2Tf2tGh3lISwhXTNPqticEIE7RQDc532ESO1vQXapDKLhH3hln0G8HCSlRyrRslGWSvjDbn0KuTEOCMU-FTj",
        widthPx: 1960,
        heightPx: 1400,
        authorAttributions: [
          {
            displayName: "Space Dandy",
            uri: "//maps.google.com/maps/contrib/100563658592719678557",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUpsyu8vW2oXbHTCKLwcc5cH-Jvk0s4MCCm5AZoYHbnHtDP22X9=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJcZH0TsKSwokRd0dSTOmC6MA/photos/AXCi2Q4XKgByGRdnsDwoiO7UGPeV04Pq5N_Xo-6UAPXt-iOmdpjmE4-7Nnyp0iBP_SW2PpKXQAXLAhFKWcoPyEy2V24abMqAWmK7vQDlBa5tLQAfSM-TzWpBZKRKx0vGcY6_3PPlr9_m9YIy9pp-_5DVf4yrdc02quAUDJ2i",
        widthPx: 3600,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Rich LoPresti",
            uri: "//maps.google.com/maps/contrib/105616908630415566190",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXNVZH4g8di7rLAO-jHn-b5U4gDT6LbDauQFfGk16MELWivBX3kZA=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleSeating: false,
    },
  },
  {
    name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg",
    id: "ChIJe8H2Z-WTwokR7GTG1rxwkxg",
    types: [
      "chinese_restaurant",
      "restaurant",
      "point_of_interest",
      "food",
      "establishment",
    ],
    formattedAddress: "284 Columbus Ave, Tuckahoe, NY 10707, USA",
    location: {
      latitude: 40.9588292,
      longitude: -73.8204702,
    },
    rating: 3.9,
    websiteUri: "http://happyluckydragon.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 11:00 AM – 9:00 PM",
        "Wednesday: 11:00 AM – 9:00 PM",
        "Thursday: 11:00 AM – 9:00 PM",
        "Friday: 11:00 AM – 10:00 PM",
        "Saturday: 11:00 AM – 10:00 PM",
        "Sunday: 11:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_INEXPENSIVE",
    userRatingCount: 56,
    displayName: {
      text: "Happy & Lucky Dragon",
      languageCode: "en",
    },
    primaryType: "chinese_restaurant",
    shortFormattedAddress: "284 Columbus Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q6J4GrtSPGQKwlL5AI1gzzql2ufGj9HxY-QcxkIbUXzEV2aq_nJ4lvVwBFYjCU2_f2QBIDvQgR1fNLRz_L2KB7BZ1qHrvFajoNNwCRdfI-z1FnLTvOp8WXnYCFP1Ydam_BBJyp0Rhe1IPrG2N2LXyl_uMdUX_gozkiK",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q4tELhzZRz-uP7Zhw_6fWHknddGjpHqvawlYNB6YbzohxwjP_I2_QXoe9jlBL6n4BzpCVrwesYLj05f5wLHKuEJEdAZ5-Y3y-pu7FM0ErxAvHLH5oeyE4FhAAalF-3xxsDth5DmpL9mxbMUgq9h4XP3fLemUJVPuHI-",
        widthPx: 1280,
        heightPx: 550,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q4mAI_e7Q51HA-9zpXKDGnk1MGJGUb8BLIbx6Zl0j19gfocnYG_GpASK_WCJHEnh5x4R1AFNZHj2zJ1F_fGg_O2NnD5mVtS9FdRzsd4StehNISrFYY5_EA4Zutxa2WvndHybNupdIe1pQWQEPoLJiNOejGEPzSGPzSy",
        widthPx: 3865,
        heightPx: 2576,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q6zH3eh1xFYMG4xJ4NqFtFPZpMaL0l2Qsovig-E9HsHtSqqUbGNXQruytIlBCFqlXYz8EJTChLVaNf0fEwFPmdY3IA8IO9wWp-3BTIeR0R-1MAf-CfpQ2fwgfoHzMUX7epHf79xylE3eGlmla2_UXk0N12en_1XeqLp",
        widthPx: 4080,
        heightPx: 3072,
        authorAttributions: [
          {
            displayName: "John Carbone",
            uri: "//maps.google.com/maps/contrib/109226104174531680350",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWjifgizlg2YyXeWz_c_P-v1FidmlMtyRI_0MJ4HluUhnXaroweYQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q7bl43Ya0k03VgTucgaCkss29nBeMq-90Dd4U1rSQ1un6nmxFMHRoLwDEmGBpjMfY1yO_0lFH4EEB5asjHdh9rUvMLFPGin2HDXnBA35zLYmvTYnpkpuYlgqXKlvuNEOQmtPxmyg4U4nTaTar_3kn7JtWP-BfyTprLp",
        widthPx: 700,
        heightPx: 370,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q5uiZ6BXlHYlvUkE4DBUHA_n_D0_Tq61ty6KwfNqi-HRwAjRf25pfVOSLHhqBfTS5foBzZSMrS5XzB9JBo21Y7mDw5jelKJEYaLITXBWT5-yZ75WJN-cKO9h8kCR8ItQz68iMpxx9Gck9oZAfTXSNXodx9YUXSJHzzZ",
        widthPx: 500,
        heightPx: 500,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q6fj6o6KFUpPvU0OGU4Vidr5oyWXwCBanuuSQGsFJp_31HnU5TDE3u5QuT478JTa4JNmcNywGngdOhTgishfhpaelpCF_zbyQC9nCHX-uvbNvHObAiH_oaMm6Hcpsnh6KrISgd3U21Sxfpm7XH0XCfO4dU9bNp1AWeL",
        widthPx: 458,
        heightPx: 458,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q7kJCNhU2OgKIIuBkIXM3pLk-zm6VLWJrCHBhX1lkYRtA5N3EecsN0PSkm7ADOsYmgC9n7sui_NGQJW6GMUqBU3gK3RkOFLs8TcSS98JTcF2cniG9zMcMCjNRoyICVL7YJhQfNpgP6chmttCtnJ7X5GHcMfxPGihrJ7",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Anthony P",
            uri: "//maps.google.com/maps/contrib/106436106222742053543",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLP_UrKBbmU9CCETY3pshQDOx3pbwP4ofU_3VPHqRQARCzRhg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q54M7cxoiEDS-gSJ7YgQ2ivba8kHvu__xUbKud1VSJgEzVN9XvPzW5v-ivCsfXCPUDn8R-JIVRrdFPsYKITzHzfxjuhXzq6z3khH25JV8GwaUieLMzY8lSJdf-EkNX4HJO1AtN7a6Et8-LwWU28cuCYbz3r9VknGo-i",
        widthPx: 700,
        heightPx: 464,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJe8H2Z-WTwokR7GTG1rxwkxg/photos/AXCi2Q4I9vQQEgaRfhLEZQCXRbmuGT4XKmTj7wvPxleDUiuF60A38UjsuIbkhwi3s7virwhr8S03Cd3J9Vjj7njHt1jWSqy4UhnIeCck16yaQhEzPLICqfGdH2Ml5V_Q8QCqbRCGCCbvXbUjKjxobMwrN9KLtZJt2M_7spOh",
        widthPx: 1000,
        heightPx: 925,
        authorAttributions: [
          {
            displayName: "刘水",
            uri: "//maps.google.com/maps/contrib/118414550207630804585",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ5pbRXiaMhqfjFGO1Ybt9n2dN66zmyLDkw8W0NpqhE5p_h7Q=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleSeating: false,
    },
  },
];

const GOOGLE_UPDATE_2 = [
  {
    name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY",
    id: "ChIJN3_y5ReVwokRPt4tn3jR4SY",
    types: [
      "fast_food_restaurant",
      "hamburger_restaurant",
      "american_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "91 Saw Mill Road, Elmsford, NY 10523, USA",
    location: {
      latitude: 41.0574529,
      longitude: -73.817605399999991,
    },
    rating: 4,
    websiteUri:
      "https://locations.wendys.com/united-states/ny/elmsford/91-saw-mill-road?utm_source=Yext&utm_medium=Google_My_Business&utm_campaign=Local_Search&utm_content=EN_US",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 6,
            minute: 30,
          },
          close: {
            day: 1,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 6,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 6,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 6,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 6,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 6,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 0,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 6,
            minute: 30,
          },
          close: {
            day: 0,
            hour: 0,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 6:30 AM – 12:00 AM",
        "Tuesday: 6:30 AM – 12:00 AM",
        "Wednesday: 6:30 AM – 12:00 AM",
        "Thursday: 6:30 AM – 12:00 AM",
        "Friday: 6:30 AM – 12:00 AM",
        "Saturday: 6:30 AM – 12:00 AM",
        "Sunday: 6:30 AM – 12:00 AM",
      ],
    },
    priceLevel: "PRICE_LEVEL_INEXPENSIVE",
    userRatingCount: 1856,
    displayName: {
      text: "Wendy's",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 6,
              minute: 30,
            },
            close: {
              day: 1,
              hour: 0,
              minute: 0,
            },
          },
          {
            open: {
              day: 1,
              hour: 6,
              minute: 30,
            },
            close: {
              day: 2,
              hour: 0,
              minute: 0,
            },
          },
          {
            open: {
              day: 2,
              hour: 6,
              minute: 30,
            },
            close: {
              day: 3,
              hour: 0,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 6,
              minute: 30,
            },
            close: {
              day: 4,
              hour: 0,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 6,
              minute: 30,
            },
            close: {
              day: 5,
              hour: 0,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 6,
              minute: 30,
            },
            close: {
              day: 6,
              hour: 0,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 6,
              minute: 30,
            },
            close: {
              day: 0,
              hour: 0,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 6:30 AM – 12:00 AM",
          "Tuesday: 6:30 AM – 12:00 AM",
          "Wednesday: 6:30 AM – 12:00 AM",
          "Thursday: 6:30 AM – 12:00 AM",
          "Friday: 6:30 AM – 12:00 AM",
          "Saturday: 6:30 AM – 12:00 AM",
          "Sunday: 6:30 AM – 12:00 AM",
        ],
        secondaryHoursType: "DRIVE_THROUGH",
      },
    ],
    primaryType: "fast_food_restaurant",
    shortFormattedAddress: "91 Saw Mill Road, Elmsford",
    photos: [
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q5CdnaakjCYEdZlpzGwPD7iX1wfqUrUjcL1ChLkJkXtf-aQgMVundv1sRBYHyW9j5qIC5S0ISc9tpcP54xDHNORfOBwmuBmDRf_YFcT6jZBlHKGXD6bO1RQrIzoCOf6Gdn2-K6Vxt2O_U6UHuhelc0tZtgklunkyJ4K",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Ed Tatton",
            uri: "//maps.google.com/maps/contrib/113851382166904335808",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWCFMb2dHWnl4_9kSg9NFz63LzNU30PO6eGUVDsEeB6OD3De7xysA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q5BpU3ocAouus75QxMFcTQ21QjhAfqYKaI7GdBf-HS9wuLV3baUSOUd6KBLILwgqPxnjnGfoImdzM_4QznfCbqaFbhVDgnfod6_Vw7DdHiQ6UlAyMa_WJTzEaEk5dSAqPkVl3o-40hvEN6ipXlrDNC7knx50jhyNTN3",
        widthPx: 555,
        heightPx: 504,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q4Xdxq3uDlhAWNMt_eYrq-EMJs8WxFsrCe7U91JrJcY0x0-cZx0qGRtBbrmmOLBADDKdqRUhTbZUoQyBHgiwiHeRu2N8KfvZNn6quHfCiQ5-wl4_T_Y997tO_tAWeYpfMbD6c3HhdYoCh56lCD-fjCw1Uaii36vI7z1",
        widthPx: 442,
        heightPx: 478,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q7sp4WmtTrphZxOSPA3AFiBnZjpjCz5yPN8a-V-XlnDfenr-XbtaZzRZhfT1aTKngIVB7ip5OeaS3KjvnzoQ7hBjgQ1I2C26HlKSQjm8q1eCGbzAd7ZFkYXDhub0sQ1uJn_7jcUt-gePQjzjWJTFeyWmR94tRWOiymr",
        widthPx: 555,
        heightPx: 555,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q6nwMsGbvRvtM_7SLNFd4AzjfV1lYMBlesCxwUMIEC1c4rFDe8IdWQysIHQmpZEyZWMWZ0CTt-p9Ce_QbIhMCaJurzmBnbJ5sqTS2I5zTi99LMOf_laz9Bl23aizD0axQ-fCumaAMEMyGBmOwcrw7cRtUmTUDHlM3TN",
        widthPx: 555,
        heightPx: 555,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q4YQCzdWW_mjFLIeRpXoqaU7fr3g1-CXKXsaswzbBjPLSjcFVSAXTeerOZURh4ETLNzeH88HgmbizSGLK57b451i1RGYHRuO66LKgRKz_dUSAZttQYsssDjZo1N9EEur07zfxdGeTLCrz8m7fhCjAXQ0DiPjGMXklht",
        widthPx: 512,
        heightPx: 494,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q6JlBcTLOtrx7zjQtVgSqnpm30azJVeoIMQLzAoahXt9uCi7JIxpz21ovRsWYR7i8d23yfIYmRpf6j975mpEnze6x0qhdFkVZEVo0cVc8lZHmndB1VboqD5yBZmHqkdNi8FPg8UL4r_4kamIlQHoCnxu7y0bbA93AfN",
        widthPx: 555,
        heightPx: 555,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q6mO6kTxyZbLbwRbW1c_ykDkZrmrLYu8A-pDIfNboWv_p7kSseCLehN-FEFBwVUuWMfFf5_9z2_fbku4Lu4v6RyRYq4oddmDAGM1w85CV-HajyDktzV_1l4eWfdfOYEycoO1L6xD0SPlsGImGHxQenPIajFNsdy_pVM",
        widthPx: 555,
        heightPx: 555,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q7ahADhkfFodfbvpBXlzKtA7WnIUHWEZS5YfUvLyGwOByJFawgNP99fIHX3Dc8fRr9gGMyJzLsQnMtC-R_VKOhyWoWrpIPZhkbOjwgsRVYL8b2ZgLYNZugXDIKiNiZyx8KpNNHM5kdq6OezniiCXbAPLLfU3JQbB1-w",
        widthPx: 555,
        heightPx: 555,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN3_y5ReVwokRPt4tn3jR4SY/photos/AXCi2Q6M1A8T2HcBCpHpHG-sscdZp96prunu675piuX9p2wRF6lhNYTl83pVEwXdQmz1wnnJ1y5HIGobQPiAiUZcrTH_tlf7O7x6VB5pQZ4eEsTJIz1buIxFwES2clCiZT0F_0p-06LvMPHPezOvvf1r9klR5YfhUSyLWjJ_",
        widthPx: 555,
        heightPx: 555,
        authorAttributions: [
          {
            displayName: "Wendy's",
            uri: "//maps.google.com/maps/contrib/102157968937028772970",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWurByyXHKA28tG7SxrNMQyJCFWDQlc4tecszVk7Bx-SDU_7X6n=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0",
    id: "ChIJ2wPdmtWVwokRWW6Aqiv_Ut0",
    types: [
      "mexican_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "210 Saw Mill River Rd, Elmsford, NY 10523, USA",
    location: {
      latitude: 41.061790099999996,
      longitude: -73.814657099999991,
    },
    rating: 4.7,
    websiteUri: "http://invitorestaurantny.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 30,
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 2,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 15,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 2,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Closed",
        "Tuesday: 12:00 – 9:30 PM",
        "Wednesday: 12:00 – 9:30 PM",
        "Thursday: 12:00 – 9:30 PM",
        "Friday: 12:00 PM – 2:00 AM",
        "Saturday: 3:00 PM – 2:00 AM",
        "Sunday: 11:00 AM – 10:00 PM",
      ],
    },
    userRatingCount: 120,
    displayName: {
      text: "Invito Restaurant",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 22,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 22,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: 12:00 – 9:30 PM",
          "Wednesday: 12:00 – 9:30 PM",
          "Thursday: 12:00 – 9:30 PM",
          "Friday: 12:00 – 10:30 PM",
          "Saturday: 12:00 – 10:30 PM",
          "Sunday: 3:00 – 9:30 PM",
        ],
        secondaryHoursType: "TAKEOUT",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: Closed",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 15,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 15,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 15,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 15,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: 12:00 – 3:00 PM",
          "Wednesday: 12:00 – 3:00 PM",
          "Thursday: 12:00 – 3:00 PM",
          "Friday: 12:00 – 3:00 PM",
          "Saturday: Closed",
          "Sunday: Closed",
        ],
        secondaryHoursType: "LUNCH",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 2,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 3,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 4,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 5,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 22,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 15,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 22,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: 3:00 – 9:30 PM",
          "Wednesday: 3:00 – 9:30 PM",
          "Thursday: 3:00 – 9:30 PM",
          "Friday: 3:00 – 10:30 PM",
          "Saturday: 3:00 – 10:30 PM",
          "Sunday: 3:00 – 9:30 PM",
        ],
        secondaryHoursType: "DINNER",
      },
    ],
    primaryType: "mexican_restaurant",
    shortFormattedAddress: "210 Saw Mill River Rd, Elmsford",
    photos: [
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q6YNvYKuvBktgEN7HR_Z9dKqlPFiEo9i6bYRyPTPmCGCp9SzCuJemSGWmkVt2qGe0Lq0mLX5upbZYhlguG2Qj5tEw0R0MPX4lpdHraUkR1he2YzQHriB-5eK29JIy5CHdwFJpq5V2n4gK0oyWHLMk0BtVB-jGeNF8Nd",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Joselyn Vargas",
            uri: "//maps.google.com/maps/contrib/109062827595312372211",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjU-G_l_8XLPteWEtQ7eP0l9kRTLxx8pxaavuK4NR20I9iAJNHWlyA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q5KGTkYd-kzTVKIJX3jmkNjXn6b3C57o0TRNUBnR6PHzrUKChQ0rdKh84Ka7_ivMnEpjmnJ4Qs4SFJM_Qz9RkhwyL33ox45MyiV4GnXL1HTu1uMrCcXwxCVIs4FXn0j8yzOK5UMJO7WOuYiXpob0PG0rw_pB7-6meUk",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q46QzBfGGfvQesiyAJjPIciaT4UEsttPm3hvRUKTiv0-kzMTayeFJKiv9sdVrfm_TeD7MigSaMO4vdy0NK3rhMfyR0qY3LXX1yKGNOg1E-ttUMGinquEp8oxlga3wgKCvUmFOGrpKS0EolrNiCMyZOQZwdyEbCCI4xK",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q4RUjFC39UGZ1EOew_uoVKG03maiPA31ZTo1KuC6N4wscR0yw9lISoGem-THkBCjCeqo-iXRP2taabg0pEoI_UrcSMcDIuMryjIvFTvQ6ciutla9j6f6emlq_MWbMug74ITSnap4A2boDoA5LuPF0Nzwp5yYZ3cYMVK",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q6YxBwGFZTgvq6ldOTgT65d5rxg3LsdDz5U2QbfVhOUIl77p_vxH0KQ6Pa2ULPVFTbvNVjy74DneFc5kcKG8uFbpF3STUiO7Q73od_lFciupR1fiLYA0qJXbbg45FM30dZz4VU19-guynZGut4tx-x-1nU_fdkER_c2",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q7G16CCKFax2YF2PynMAoXzilOGuWCtWA8doa5vvPto5fS-jGr5FdU1DDy2NDRw0bBf9f2QCSbIh4TQokp_x3MhckTrsVX49z4h7Rns2CSREk7RGnpbeXK4W_O6t3460F3Bajev2QJtrMpWA0L_qt-zzD_VtAfo3sgA",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q47-OOeUNmKQrm38-2H3UJwWTTQVmaTvtFSWEUR5dCb80O3o69K5qD6wkHL8-aXa0_ZXcBZJCCFXoY5NlxInakkGVRkCPLiOse2gt1-UIGCLmUz8FIaTfIO1pWNtxXQ8-k_UkyCiowXJpRgrbuyH6XRXhNbTrkjxwhc",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q7suCwU_QRm99u_NNTmu6z0FiS7y3RWFXcAPRyp7QslwOt4sOoPmCoY6SwPkmfrz8A1n-t1vc0yiONs4omzBxkFQYGQF4kWqrcbsJugKoG0ib__shs3Y9Ban-f473WDEZlJxyRwhDh-DR1vvwdcaU4M3e6_b-NQbOgd",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q6xUfU03TkL-Y9xEu_03mCh3Pwa4hrPGq961bVngQOCJhHkzGDvZba8e0jna5txuGNK_2A2tOLTFcUk6dsidl7UwaQ-X5DLQv2E6qfrVAyVOyQ2cdoofHYRk-3PVaGfwgZHtUuQ9aerUixvhICpY4OLhGeYkRV7benw",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ2wPdmtWVwokRWW6Aqiv_Ut0/photos/AXCi2Q40oM4RHkGVcnNywEYAlMis4cTB1qmHXV4ACUiNjTTA8-pj3Lp8vJN-pbUYGJnTOdg-dPewj2zNVOfDW2wM8WPG0_IV_9ACZ5o8xYFBgvLleMxPzp6Q2Z_AxAxyeE6QMW61wREdiXcLh_mEfg8W7-oZKWlJSN58UD50",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "Invito Restaurant",
            uri: "//maps.google.com/maps/contrib/114252986918966350204",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWzNs0BNWA9Cjcr62Z_1qRJP0-FBzjAYUq65w3QP4TILqsq5cs=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE",
    id: "ChIJ7xSVPhSVwokRFYt9yY972pE",
    types: [
      "meal_delivery",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "209 Saw Mill River Rd, Elmsford, NY 10523, USA",
    location: {
      latitude: 41.0619163,
      longitude: -73.8151407,
    },
    rating: 4.1,
    websiteUri: "http://www.elmiski2.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 9,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 10,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 10,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 10,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 10,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 10,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 9,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 10:00 AM – 10:00 PM",
        "Tuesday: 10:00 AM – 10:00 PM",
        "Wednesday: 10:00 AM – 10:00 PM",
        "Thursday: 10:00 AM – 10:00 PM",
        "Friday: 10:00 AM – 10:00 PM",
        "Saturday: 9:00 AM – 10:00 PM",
        "Sunday: 9:00 AM – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 187,
    displayName: {
      text: "El Miski II",
      languageCode: "en",
    },
    primaryType: "restaurant",
    shortFormattedAddress: "209 Saw Mill River Rd, Elmsford",
    photos: [
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q6TYZ_HJbkbnSiD0K99zsb3uCzquwMfL13BIVcUR_FTWQfjaQt447G5twmBzO869tkVR5Ij8B6l6H8tDDFCxfd_IdonUwsihHk3IhjEp1XjgzkSmAjyNJZ1XckFGu6CM6v25cwZ76xi6YqDsmR5_EnLMWGGoNPnQEsC",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Kevin Cleary",
            uri: "//maps.google.com/maps/contrib/101178602725688057130",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVvG5qHZDoVaxRBSCcre1QWuRPZFVaUw-HjSo2yNQDDG1R1D0W3=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q6f_Foi9KMTebIneAq8daUkD2kxKtYw807n94oTxQIhAZKxyAFKvxMeb2mMbU0tjk04U3b61U4y1nsWgS7DrxWExPqsX2oaweq4PUKskj3fUGjVNw2PwMefwHwxluYVM40qTclPjFI2eY4gVzMtHKfk0lT1OmZCGLBF",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "carlos garcia",
            uri: "//maps.google.com/maps/contrib/100388263834332136590",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUEI2TT-8Dwd_GX_HBiCIFYm8P2orGzgKV36YCMCbJrY3xU6pYv=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q7kj5lkXjkfQmsKWYWygSZNsSNeChQj3luLbTBFBFxBHgu3-9RmbsmooYKI2uQ6A3Oh-QQjsTHJ3s2Cr0gQb2DgbGP3g9YaSmPMccwqnkWh1v-4KRjjBmJBSfHFIIZcwO85cRRks1p2Ze7lma5qSzxX7jRBhtnylHrx",
        widthPx: 3072,
        heightPx: 4080,
        authorAttributions: [
          {
            displayName: "Maximino Reyes",
            uri: "//maps.google.com/maps/contrib/116362220585447226219",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXMn0MW_doHXEnlaiM8kpZPj7XAgg7ygxroJrPkgDqKG0G40tcS=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q70-QwIx4-F4WwORqUN2Gnazbl_0Maw_W-jr1LaYh2I9fxVUlY0aoBJdeXpTgKZOWoiAaozFdEgfgtY1rDrwYGSVw7fGqe2hKNVxFmM2v6OWzL3PP208cVKnSWCWkPepcfTbFzJB5gyQelQjZAfVCpKHrwFYFaL8iw9",
        widthPx: 2268,
        heightPx: 2705,
        authorAttributions: [
          {
            displayName: "Nino Ken",
            uri: "//maps.google.com/maps/contrib/103254410187577088197",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX2BWIm9GG_MH8P9nE_LoasECX2EMPamWN4qJIzJ1-KcE6So0aP=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q5hWfZAKhJHMYvlDraXbhg2WPNEaGJKsSK_gX2maC6b3CSci13Ylep0GkuWqJ9bJmM1dxEmNhYCMcwAmS53scaqbjMxeu4Pb7iTjP1qulsgdVz2ar1Pjt1Sp-myRTnJK23p9LOyUI9lp-i6Z7QvIB8zdILLSOajyOMV",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Herbie",
            uri: "//maps.google.com/maps/contrib/108400146478832900515",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWPkolMmFEvhQcuQnMIJC481F-2Xkq0wz13HnaqI-f0oc6CZ6e2mg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q6_Yl1zbDre1q_rg_NWa_qijyDJ2TirYqdn7sDs8p1zSto8WXGoEGdt4SYs5Hq2F08ZT3PlDci_r3_aeIjHgROftIGcViL2V3siNyrCedN07wFkFFu-0tQk_jQ5_W8YdC9F4uhInPWEWf_V8sT1nObAVYUG6CqeYKdV",
        widthPx: 2448,
        heightPx: 3264,
        authorAttributions: [
          {
            displayName: "Mass Engineer",
            uri: "//maps.google.com/maps/contrib/110254466485522626981",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLUyDiKK5AwEGmek_xeCITf6sgbTxjnqIdhkeOG33Bt7hGc_Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q4NEQPnbBeknXjBOcQO_NC-LUjus52ecMeAWb34esuNoxv5ImzN_3YeL_jn8b8Go5qHIxBMM7aOP8NeUhlayEf8iAdbCGlbnFdKGPy0-Km4ifFb9NmXbSHQys0wCu5OKlXllVPq_icOLCqFXxt3CAQtsRaiciXXO9py",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Herbie",
            uri: "//maps.google.com/maps/contrib/108400146478832900515",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWPkolMmFEvhQcuQnMIJC481F-2Xkq0wz13HnaqI-f0oc6CZ6e2mg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q7cSWgzEnSu_LVWHT-2OAjhl8FJ-F1Qr6Wm8sN5M22xh0hNzvMh_Y2ky8NC5t6VKFdMEht8m5Cviu0okHB606YY0LrKGJHx3bUXI1hyldO2txKolTLvwWq1ONIZIIapCB3GgCfjD9HSPnkqgMYKlu2zg7OcaSECqQeb",
        widthPx: 2592,
        heightPx: 4608,
        authorAttributions: [
          {
            displayName: "Fernando Chacha",
            uri: "//maps.google.com/maps/contrib/107387706305697434117",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVfn5aM0D4qRqxCBHRDdqYAONpLiveNLtxWZj_Ro-Fl2AZhEXc=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q77jWEb2qNmaLpCngdkM3bJEPY2zPrs56FVuEYSy7sGskH6izGJBnUJwQxhNWtWRiP3jgqz6VBRsKGLdKdJqfu-QKYDLDuKTUW7CryGOqkRZfzIweN8czj2T3mOmu_JFxsk64pU6fGzIHuqTE0OHlT6fxDEJzrvCb9W",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Walter Reyes",
            uri: "//maps.google.com/maps/contrib/105275799351501120336",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX0QWS5o5HYlraLIMw--WHDEoq-he5PDmtTESNSU6zviIu5gUEL=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ7xSVPhSVwokRFYt9yY972pE/photos/AXCi2Q5PoulI3Y2lFdHUdWozuyZafAI3_Vb-08_Q738DbeOuQiPw51QmVzEvZwe6Jp7oXwD_HfWjv6VWrOE8MsghS8jkCmzp3ANdE7wEZgAiQ_yC--dEPx_1HOTe7bx7PV0oT_l2axm0KJP1TZekvKZxwokGmDtWrjT2DQAO",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Rickie-NYC",
            uri: "//maps.google.com/maps/contrib/114140617235833272631",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWa8K1fEQFNKlZjKS8QyhP1eKwpYJopXxmjTyqyZmp5lEMmQkA=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8",
    id: "ChIJy5gMsReVwokRVOA6cZGJMI8",
    types: [
      "coffee_shop",
      "fast_food_restaurant",
      "breakfast_restaurant",
      "meal_takeaway",
      "bakery",
      "cafe",
      "store",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "182 Saw Mill River Rd, Elmsford, NY 10523, USA",
    location: {
      latitude: 41.06078,
      longitude: -73.8150236,
    },
    rating: 4,
    websiteUri:
      "https://locations.dunkindonuts.com/en/ny/elmsford/182-saw-mill-river-rd/334933?utm_source=google&utm_medium=local&utm_campaign=localmaps&utm_content=334933&y_source=1_MTIxMDg5MzMtNzE1LWxvY2F0aW9uLndlYnNpdGU%3D",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 5,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 21,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:00 AM – 9:00 PM",
        "Tuesday: 5:00 AM – 9:00 PM",
        "Wednesday: 5:00 AM – 9:00 PM",
        "Thursday: 5:00 AM – 9:00 PM",
        "Friday: 5:00 AM – 9:00 PM",
        "Saturday: 5:00 AM – 9:00 PM",
        "Sunday: 5:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_INEXPENSIVE",
    userRatingCount: 435,
    displayName: {
      text: "Dunkin'",
      languageCode: "en",
    },
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 5,
              minute: 30,
            },
            close: {
              day: 0,
              hour: 20,
              minute: 0,
            },
          },
          {
            open: {
              day: 1,
              hour: 5,
              minute: 30,
            },
            close: {
              day: 1,
              hour: 20,
              minute: 0,
            },
          },
          {
            open: {
              day: 2,
              hour: 5,
              minute: 30,
            },
            close: {
              day: 2,
              hour: 20,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 5,
              minute: 30,
            },
            close: {
              day: 3,
              hour: 20,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 5,
              minute: 30,
            },
            close: {
              day: 4,
              hour: 20,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 5,
              minute: 30,
            },
            close: {
              day: 5,
              hour: 20,
              minute: 0,
            },
          },
          {
            open: {
              day: 6,
              hour: 5,
              minute: 30,
            },
            close: {
              day: 6,
              hour: 20,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 5:30 AM – 8:00 PM",
          "Tuesday: 5:30 AM – 8:00 PM",
          "Wednesday: 5:30 AM – 8:00 PM",
          "Thursday: 5:30 AM – 8:00 PM",
          "Friday: 5:30 AM – 8:00 PM",
          "Saturday: 5:30 AM – 8:00 PM",
          "Sunday: 5:30 AM – 8:00 PM",
        ],
        secondaryHoursType: "DELIVERY",
      },
    ],
    primaryType: "coffee_shop",
    shortFormattedAddress: "182 Saw Mill River Rd, Elmsford",
    photos: [
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q4gSDFF4kPqF_tNIQUghNRoAJ0rVSa-AsrRDPdyyrvWG7-enGuMiRdgh4nTlp1n-KTd_ywxU043WJKhRW_9n_iMTOwAmU1xbGL99-DVHXAc9MM34lnS_iw7Ori5yPO6oGXbJxIfFjgN8HswaKN_ZjpdasxOeYpCMWY4",
        widthPx: 4048,
        heightPx: 3036,
        authorAttributions: [
          {
            displayName: "Jay Last",
            uri: "//maps.google.com/maps/contrib/114273198225564253463",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXVHnxx9FAGF-h4GnVTJESu8_SeZJTcbbRnewTVcwFU2FsTYXZolw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q5nKFL98QTUHpKRIZuwmgRYs1aWhG7_7zeNV7pTQRm4FrCOXuOZjtXDOt7T5jehxdj5jaVR7d6YwIfRx9YV385mWpqARTpYlBaSfBCNkecdc5yaghATFtLO3CdYNiNg7mVv6AQX0Wk-ckPDy14gfyCrDjRZ1Z_fGoEm",
        widthPx: 480,
        heightPx: 270,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/114248160793891830248",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWOwfBrQLo09hkCrdKxeH5AUw4JRLZffpQMtpGkDdhT7tYc3y9x=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q7s7faKrLGUqlBEKHR899lURb_zJxVjaU2WZxh-L54decvAK7_MOwugfj5A32cawrZ7PO4Ti4obzSEDh7Q20g91w4b34t2H8vLgwpAQ5DdpUURY5S1n_HSD8V3rP5xtSHDsPLDfG2qc78aM0UxkTXWrZh7498rF9YEM",
        widthPx: 374,
        heightPx: 374,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/114248160793891830248",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWOwfBrQLo09hkCrdKxeH5AUw4JRLZffpQMtpGkDdhT7tYc3y9x=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q63cTx5fLOBoQsfVBJ8SnzSW9oQGqkLAqFSvft5VNi3tXvSz7WL5QfYXUYeq1Bczy4Zoh5GGkwgXj-Wh7GHB0MzKfXjfWrVQKCBqU_uxWb9kcaYUqQFH6OZr8JVbKJJ8DMU9KaI4ZMNdvbQ0XIpVCtpYzP9VY0WSTq_",
        widthPx: 2304,
        heightPx: 1295,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/114248160793891830248",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWOwfBrQLo09hkCrdKxeH5AUw4JRLZffpQMtpGkDdhT7tYc3y9x=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q5u4yP8FaPm64dETE9jEDa7uWp5pg4_MXjQvYKJCBTRcjB-hG2Ewj7LEvugC3j_doPMhnUHinJHqimjjHLJg8Gq3FixhxblYcVf6C7esnZfhLjMtUYRQ-uLuDAzGyOZ2mbfCgkWd16OojbTop0y0blPxR2HYgGrm6uG",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Rolando Rosales",
            uri: "//maps.google.com/maps/contrib/108662213895514898808",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUlH7_uLReQeNqgQNafmla48QCb6Ip67PwdqVKUoTR_y_gInsLK=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q604_p_EudXKLaydLA3HvmszBwa29lqTF4yHLcrsMY9ICXKUEjuSsicVO061-HqWe2vO0p5hAgSZKzGaCa5y-VbxK23cXHyYeyeZN6H7UqgjpnTL6UJxDYzJ2s0xJRlwBWMYQJdsu6IK_ym1QhdMKZ2ShsEH4air2RN",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Alexander Shyshla",
            uri: "//maps.google.com/maps/contrib/107387949310156571235",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXiv4kcwPbhjnXZCWrY2eUgWlljoUcQ2YCp3RCVPmBZA7BH4j_p=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q47PQmdlqKTYUQZBogTrTqCBYEf_HqhGSXDxDvmEX29c5jQdWjfUdaJQkyD7ZH5Xvmu2oFzLmCkmm1OpKbmaTMYdcE9Ds5wY0NM9U-_AyWOc3an65tcMq7nsdPFfxvoXNheLuFU1S-vCRW3Q5jA-BMxvbsOhJEU9vXW",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "cabo2wire",
            uri: "//maps.google.com/maps/contrib/112419057088731589653",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXi216xKe8Rmx0y1jzaZJcZp1ooZjeqScQis79tJAtJm4ZdSXIrjA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q6hUxMoLk4FDhIDFQ2gtk_jf3B7PFUyeL9lKlFsM8AQeRY7c4ZjU8k7rGeiVhPORpatTfBiY8KjX0OX0UpIjKD6jbKuuMoPekkcjIsEuVNJ4D_Cl3UyNEnXDDyveozc9srL6Fjsbea_N_nskMkBgABYtAPnyITpTBnn",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Krystle",
            uri: "//maps.google.com/maps/contrib/110536710081043577990",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVHS_N8fHY3Pw4IeusdSVqZAAIsA5-K4oBEp1XRbbp2gNauI1pXaw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q5HqHA39GwxmykIi30mvwzp3Gs9jEzKFar3p2UZxyIu7pf0JW15DOwoXNl9ABmizxhE446KVmmu9JaK-R29llq6XmEa-HF2fq3hiUcIr8YoJ8cj5cXBgs5F1qO6bBUQeSn51Q1OiTKK1aM1JjeVlREZvAriiAp0zQIq",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Rolando Rosales",
            uri: "//maps.google.com/maps/contrib/108662213895514898808",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUlH7_uLReQeNqgQNafmla48QCb6Ip67PwdqVKUoTR_y_gInsLK=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJy5gMsReVwokRVOA6cZGJMI8/photos/AXCi2Q4XvOMUX5i1bOTrk5LdIVEE33t0DGBBP82ZDh_LqSh_Un4H9A-GBFqVHUqOHZYxzslann2_UPEWsFtoeFcBLzC9G6EeJpZzsfXHM5aSwqcCm3-ItJnhfusXKw-Ez8p9-Jx7i9Cj0vXvX6AAkQcuuBirKASqyl4MTU2J",
        widthPx: 2700,
        heightPx: 4800,
        authorAttributions: [
          {
            displayName: "Robert Tocco",
            uri: "//maps.google.com/maps/contrib/106400870402305914097",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKzB_WbWoSsWnrGgjxuZoCdJGxzEva7FX486V5ZDfE8XtkEhw=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJt865ZZWVwokRZC5487llZBk",
    id: "ChIJt865ZZWVwokRZC5487llZBk",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "213 Saw Mill River Rd, Elmsford, NY 10523, USA",
    location: {
      latitude: 41.061993099999995,
      longitude: -73.8151407,
    },
    rating: 3.6,
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 7,
            minute: 30,
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 2,
            hour: 7,
            minute: 30,
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 3,
            hour: 7,
            minute: 30,
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 4,
            hour: 7,
            minute: 30,
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 5,
            hour: 7,
            minute: 30,
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
          },
        },
        {
          open: {
            day: 6,
            hour: 7,
            minute: 30,
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 7:30 AM – 10:00 PM",
        "Tuesday: 7:30 AM – 10:00 PM",
        "Wednesday: 7:30 AM – 10:00 PM",
        "Thursday: 7:30 AM – 10:00 PM",
        "Friday: 7:30 AM – 10:00 PM",
        "Saturday: 7:30 AM – 10:00 PM",
        "Sunday: 11:00 AM – 9:00 PM",
      ],
    },
    userRatingCount: 111,
    displayName: {
      text: "Big Jerk Caribbean Restaurant",
      languageCode: "en",
    },
    primaryType: "restaurant",
    shortFormattedAddress: "213 Saw Mill River Rd, Elmsford",
    photos: [
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q6MG_-u76CSnLh27payK2zkNHH5ZpcwJUmuLM74oDLwICsBrci06HMIkqPWyDzHwGsaISGseIq_2bKrwCodrQWBAenVSW-0TMcZdooiBrrcVcUEqpp8hOL4VOjQYlNKCydg2zhk0Gn5_RPpbw5f4tm--plVaX5z6sSM",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Sheba Gemini",
            uri: "//maps.google.com/maps/contrib/107923009676354374209",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUc4NtGbHvQjuPz34s34sEoe45HJyN8Cy59423WUrGjOSxonZ6c=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q6Ls1PriZCMm37FV7P9kLGSo1Id9OjpiFnTS43XJhy3aS9WaXWfdhMQHVFZ3iFXNbXvAOSEJAhWUUe7RMv6LtUc7swLUQr7JOC81bHic07xnWFbfrMUNBFfMPAnzFIUvx27szaQAQBZZ-D2NW5lM3LFBRSAaTOytIb5",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Sandra Batrony",
            uri: "//maps.google.com/maps/contrib/117287207854556786647",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVRgYoyYNwxxaUVQXBNjuNbg1yPZhaCWmFCNdfjwP7WuIYYFA5M_w=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q5s1FPZ8b5ew-k9aOEmwYZYkqdVfLIBjliEKBRhVSbQiICfPmrBKjkdW9SkDZHJDsP95vCDVO4xwGH6yBpJ-PZMZae_2ivkRRN1OYSpoSPpUyc1Fga5sUU4v23T3xg5K9LFOd2qZF7rVCtx6sV2lK9PrEAqjHui1uNe",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Dominic Berlingeri",
            uri: "//maps.google.com/maps/contrib/108624298437922791280",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXcnUq6i5N58lQhxhBURf4vg1GnO9YZ_jg4QKcEFpUw7RoBTEew=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q4hxGYrTZsxODfCWpBzk8eIXWjNb6L-MKhO1SPOlCYmenh1xVXoyYqO01a6toDW-hm4zECbBvklEKyyZTdZaJRGHQTv02EAyaAHyktzLBp_0LitP_nWepdGwyTTJRyp12wqZMNPv7Od6D1Ea5ybpgEgm-8FO2hc6_wh",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Nippon Fraser",
            uri: "//maps.google.com/maps/contrib/112251033429899430132",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX7YTYJJs70uQLIeRUOZ9F3fayYeRmfOPwjW45VQcWkvYqrxrbTQA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q7aHyv9gszhK2wgzeL_YiBrg39u0hyGaqZdSZWRaEeCD0x4pxb9vcHo6mnClDBGOu4hu7gXV30tL_lrer6cpVJ4tlnngNiOHfVSYard0VK1FzlhSBMJ_DpUn0Cao6a1uLxQA_M7QgSEQFNPDITX1Rz_ZdMnY9av9PJQ",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Sheba Gemini",
            uri: "//maps.google.com/maps/contrib/107923009676354374209",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUc4NtGbHvQjuPz34s34sEoe45HJyN8Cy59423WUrGjOSxonZ6c=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q5OMNduv2-02xtLHx2dqQwmRscefMg4MiN6qRtnC9ABgEzpjRtO_7ALRzfUNthga5rc17HZ-A-x4fG9BmEauDl9UOG0zmk4QY3a5fcfRyjOQr7pIK-TmBMCEHYaG4GjPmuILUa0yXUevlwp7m9xrOYT8CmfSX01GKK0",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Sheba Gemini",
            uri: "//maps.google.com/maps/contrib/107923009676354374209",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUc4NtGbHvQjuPz34s34sEoe45HJyN8Cy59423WUrGjOSxonZ6c=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q5e5obBCMqC9ganQGIQAIsQpvk9PqRv4OGtBVAd3DsfV6MuMwzL3-L_AcR4_CUfI0KvuJ1kjVMTrK8K7gj4xztDsYQKfzZKeZmfW7kD9joftu0suVat-Kumjct4chXcYmw6C4ofW_BE3Tjy1pwtTmDW-cwwDk1yD0Vj",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "S K",
            uri: "//maps.google.com/maps/contrib/116744425717691789505",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUoLx1_1uFs-OFsIwTXvw9WXHI8ns6qUYoJa8vVLeIj04SiwDT7lA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q7J_11sWSdr9QL7XHPLp7MrHh4eB8ZS3kxklSE1_tCMmyVYeXH0HP57FMANqY07qK09DZNdsw-EL8sTW3ahizHSyZo9ULUFUWxP6bwN0xKIn3g4gYaCJqJf4Ekf19hIYfzY5sg1_4WwP5D6RU-q1DfYObQXzaTEw6CR",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Sheba Gemini",
            uri: "//maps.google.com/maps/contrib/107923009676354374209",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUc4NtGbHvQjuPz34s34sEoe45HJyN8Cy59423WUrGjOSxonZ6c=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q48WlRl3-ItWqrt5gqLNx_T_skyQCTR95Izb-u63fxrnQOO8PVuF6C16YK3la8smwf3loKcoT4Z2Jnd6W909cGnCiM0qXJs4PRGiMGn37vSBAZ_SRNpd-7NCLdy6ehKBLLjnnGnqJHdgDwQWVanYBBdCthahCJP56FE",
        widthPx: 1236,
        heightPx: 2543,
        authorAttributions: [
          {
            displayName: "Anthony Ash",
            uri: "//maps.google.com/maps/contrib/106026313861545878771",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUb9WnpLi2NMsVIwR8U6JPRe3tx3lrzBXa7xVVEAPTB3rSB2USf=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJt865ZZWVwokRZC5487llZBk/photos/AXCi2Q6v144A1R0rW_PU-miUy_YrXIHbK_eI7ZVTDXbHHNIXEVuYR8mqNYo0tJb9kt3ipm6r1mvbGEUn8kg8lp0IOmJiYmuzve-ozfsjr8kXJukHgE8Zk5RAegKGPJRqC9mIwn0zAbm2nz_UEmSmgUn5DgmVEm1EAgo3GZ-0",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Sheba Gemini",
            uri: "//maps.google.com/maps/contrib/107923009676354374209",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUc4NtGbHvQjuPz34s34sEoe45HJyN8Cy59423WUrGjOSxonZ6c=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
    },
  },
];

exports.update_google_data = async (req, res, next) => {
  try {
    let { tag_map, places_data, db_ids } = req.googleData;
    console.log("GOOGLE DATA", req.googleData);
    let locationInfo = req.locationInfo;

    let price_hours_data = [];
    let res_ids = [];
    let rating_tags_data = [];
    console.log(Object.keys(places_data));
    for (let id of db_ids) {
      console.log(id.place_id, id.res_id);
      places_data[id.res_id] = places_data[id.place_id];
      delete places_data[id.place_id];
      price_hours_data.push({
        meal_id: req.params.mealId,
        res_id: id.res_id,
        is_open: places_data[id.res_id].is_open,
        in_budget: places_data[id.res_id].in_budget,
      });
      res_ids.push(id.res_id);
      rating_tags_data.push({
        res_id: id.res_id,
        rating: places_data[id.res_id].rating,
        tags: places_data[id.res_id].tags,
      });
    }

    console.log(price_hours_data);
    console.log(rating_tags_data);
    // perform updates first
    await restaurants_model.upsert_meal_restaurants(price_hours_data);
    await restaurants_model.update_google_restaurants(
      req.params.mealId,
      rating_tags_data
    );

    // then delete all old restaurants
    await restaurants_model.pare_old_meal_restaurants(
      req.params.mealId,
      res_ids
    );

    res.status(200).json({
      restaurantsMap: places_data,
      tag_map: tag_map,
      locationInfo: locationInfo,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
};

exports.get_chosen_restaurant_details = async (req, res, next) => {
  try {
    let { place_id } = await meals_model.get_chosen_restaurant_place_id(
      req.params.mealId
    );
    console.log(place_id);

    // let { data } = await axios.get(
    //   `https://places.googleapis.com/v1/places/${place_id}`,
    //   {
    //     headers: {
    //       "X-Goog-Api-Key": KEY,
    //       "X-Goog-FieldMask":
    //         "accessibilityOptions,formattedAddress,name,id,shortFormattedAddress,displayName,location,photos,types,primaryType,priceLevel,regularOpeningHours,regularSecondaryOpeningHours,rating,userRatingCount,websiteUri",
    //     },
    //   }
    // );
    let data = {
      name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE",
      id: "ChIJlZuJwOiSwokRrJNNhf-PrWE",
      types: [
        "pizza_restaurant",
        "italian_restaurant",
        "bar",
        "restaurant",
        "food",
        "point_of_interest",
        "establishment",
      ],
      formattedAddress: "425 White Plains Rd, Eastchester, NY 10709, USA",
      location: {
        latitude: 40.9563694,
        longitude: -73.8138311,
      },
      rating: 4.5,
      websiteUri: "http://www.burratapizza.com/",
      regularOpeningHours: {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 2,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 3,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 4,
              hour: 21,
              minute: 0,
            },
          },
          {
            open: {
              day: 5,
              hour: 17,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 21,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
            },
            close: {
              day: 6,
              hour: 21,
              minute: 30,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: 5:00 – 9:00 PM",
          "Wednesday: 5:00 – 9:00 PM",
          "Thursday: 5:00 – 9:00 PM",
          "Friday: 5:00 – 9:30 PM",
          "Saturday: 12:00 – 9:30 PM",
          "Sunday: 12:00 – 9:00 PM",
        ],
      },
      priceLevel: "PRICE_LEVEL_MODERATE",
      userRatingCount: 626,
      displayName: {
        text: "BURRATA",
        languageCode: "en",
      },
      primaryType: "pizza_restaurant",
      shortFormattedAddress: "425 White Plains Rd, Eastchester",
      photos: [
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q6CZfjrsM8fbpVLtQKlyPk32gIFkbHIl9wcoEHAF0vDedCBzZ1OKTPokaiTA8qgNI_s1QZ_qSy8AN78gkUG75k-VewCDroMyNoGZ-vfE4MJygDPyiTZRSRoNz0faoWfMYHNrZ8-PgyOEI-FcLsAm6ppxpfJ0BTFxFDl",
          widthPx: 1348,
          heightPx: 899,
          authorAttributions: [
            {
              displayName: "BURRATA",
              uri: "//maps.google.com/maps/contrib/102792430970730061751",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjUbhwvIBJWKtr45_hWoLUvoVyKHTEr8ISi72LEMkUqmbkqZxqV-=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q68Ya2pYDONGNos9CyhkzCkpC0pxREa7eb6TeYpj_pJpmgSbZUKWNL2Jy_uqU35snOW0Ejlx_UjWaT8ANu_JhVButqK2NTTnm0rggzwW6vheEntiaryNgInEEDlL0iXl1t9yJSexJl9J4p5EnLUZME5xwMpxY1kqFrt",
          widthPx: 4800,
          heightPx: 3200,
          authorAttributions: [
            {
              displayName: "BURRATA",
              uri: "//maps.google.com/maps/contrib/102792430970730061751",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjUbhwvIBJWKtr45_hWoLUvoVyKHTEr8ISi72LEMkUqmbkqZxqV-=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q5Sti1Albahg6zFaH_g5R1FnNYvYDbpjiAePqXDxCOmkXtQK7LgveDCvHEemef3TZxEgH8ns4NizZOJMcFNpzR_p_49ighjgihuAIVYMQX3GWuvXHTrFpAECb8pyzcBlwNSW24A830mjOIdN4rin6_b3nega7sU4Z7d",
          widthPx: 4032,
          heightPx: 3024,
          authorAttributions: [
            {
              displayName: "J Lim",
              uri: "//maps.google.com/maps/contrib/109935156740971751576",
              photoUri:
                "//lh3.googleusercontent.com/a/ACg8ocKYnG11pwVBark64wiserzR8n-rEfTAglboJ7aaEgmmefWHqA=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q6GBXTliI-V7gctPkRtHG4rn4sPtxLI1GF7BTzsQYpTyzoMq-S6NZKjDDgY6xROik-efbx_9EEAl03m9wKWyxM7PkRX4q_1rYOkVL1qsLi7KfrxbL3COpDIbp_dEDPLG9M1vHiaFi5nQ1vszkPPUf8t-HAFlTVZWe80",
          widthPx: 1713,
          heightPx: 1284,
          authorAttributions: [
            {
              displayName: "Bianca C.",
              uri: "//maps.google.com/maps/contrib/116185846034886264029",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjVPHPzu70ySmPXIn0hvpY7LATjAvL-8ffHTtSOjtXEsY5rGCVRSjw=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7FjFHbBwaAp7PUm5vIpw8WgVOUvUjq8sda9a-_WfoF8elhuMr59zAHsG3CNwBL12YDgbjzdOqFN4iXobXJEHUrq7meQsZz7p7hKdDI5yhVzgXV2z5K_rsrAamMBx28JvfwAz24nYQZXIqadkg-EahEMON11_N3cFeK",
          widthPx: 3024,
          heightPx: 3024,
          authorAttributions: [
            {
              displayName: "Johan Jonsson",
              uri: "//maps.google.com/maps/contrib/100207722052513615898",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjVdChPFXKGqM-BqoCS5LTusXc53z0NwYcdioLJ9143qhrmjEuO7xA=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7lVaufKa9w_dENa6jg2qSuuLuTWVJLMv1TJq8pgkkYKijjdG_DARYGRGObMUAQUK3Ypf2Zmo8xIIqB3ub9_Y1i60g0MQoeLNHsRUNl0JvO7UByWb3mAmbZ24pcogVO8MqZyn4Q1p0GDkz8UPgXWmYlTqOqYxhB3K1w",
          widthPx: 4800,
          heightPx: 2700,
          authorAttributions: [
            {
              displayName: "Eduardo Angel Ramirez Saavedra",
              uri: "//maps.google.com/maps/contrib/100701954365206116050",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjX3vRK8Zux685a0FCG5qkyBHAQ8SzZswDgmmQ7MKZIYRuKlaOkaYQ=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q5YhAA3iyo_IfW6CHbCL6iF4_xRwRpckezTkIbhWogSDnsa8sKqoIsGAiTvJPa-dBOJBY07VUQFnH-IDUhPcaa9OIymOr7QFuRIZ8MWI8ZaQaOy_f5DdLLdV0CGlCxSqBTQJ9Kk1UYlzkW-w5hVy5JuRkkfv4z8L4hD",
          widthPx: 4080,
          heightPx: 3072,
          authorAttributions: [
            {
              displayName: "Dominick Vellucci",
              uri: "//maps.google.com/maps/contrib/116345219794599247988",
              photoUri:
                "//lh3.googleusercontent.com/a/ACg8ocLL_owKx7Ll_ECHNGV8gYvICGsjANzrOOhaddLlAt_rs7dnEw=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7wZnyrRLlTsG2CSab-7Wjq0ohxOqOJEJTnJWo5p6qL_7h3E5NfghZ4xTze_by6NeIxxN8EpegfdEL0UoXDk5dOhEfIrJBchrkd76c0X4gJtcDxIxly-QS1i5er9OBrSs_IUzkth9Y8r6y6MoFpgBS80Yy6D6GZFqQ",
          widthPx: 2576,
          heightPx: 1932,
          authorAttributions: [
            {
              displayName: "Hiram Mendez",
              uri: "//maps.google.com/maps/contrib/115304703684795952242",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjWZymh_J3YDVAjaXOxt4gFu8WbY1iAyR-089gYzXva2xED8q7sN=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q600sZmyAD1Z22Ql6YkFBn38A3PB_C_UymH5pTp5zqFQnjSXNePpUT3TkWg7f1Gk4hmCJsmCLnYIJVV_x5kJYTdsIgLX9hdEeNtSDfQm5UHkDpJ39kF7rGwf7mD06GvIg2gqwA-MHFXnlesHd2QcHmOdKFyi5oC_Mg3",
          widthPx: 4000,
          heightPx: 3000,
          authorAttributions: [
            {
              displayName: "Adam Corrigan",
              uri: "//maps.google.com/maps/contrib/115051006048521434223",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjUwhqqQ4QK9iUdBNQUMHPnsw7vAwUwC_QWed209cPTLnnaUPmnGuA=s100-p-k-no-mo",
            },
          ],
        },
        {
          name: "places/ChIJlZuJwOiSwokRrJNNhf-PrWE/photos/AXCi2Q7nN3W6zwyPqxujCUhBIoQb4VOjh1pksIbeC9A0HCUVa-b79D1fSql7fa5yEOLhqiZrJcSgRgD1XkggFXahTbCtsqX5BdEUFowSz4kpLhfqtrT10b9No2wHgZHPmY-jbpE__ylv80J2P68GowW6cnNGY87--oLD9YOu",
          widthPx: 4000,
          heightPx: 3000,
          authorAttributions: [
            {
              displayName: "Alex Kay",
              uri: "//maps.google.com/maps/contrib/112497667468245081491",
              photoUri:
                "//lh3.googleusercontent.com/a-/ALV-UjVU_5-Ygv-e9SsPOMfVZFRcaDlqFTM28WOa_hQQSuSfubejBua0=s100-p-k-no-mo",
            },
          ],
        },
      ],
      accessibilityOptions: {
        wheelchairAccessibleParking: true,
        wheelchairAccessibleEntrance: true,
        wheelchairAccessibleRestroom: true,
        wheelchairAccessibleSeating: true,
      },
    };
    let restaurant = process_google_place(data, {});

    res.status(200).json({ restaurant });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
};

exports.filter_by_hours = (periods, date) => {
  // never open
  if (periods.length == 0) {
    return false;
  }

  // open 24 hours
  if (periods.length == 1 && !periods[0].close) {
    return true;
  }

  let weekday = date.getDay();
  let hour = date.getHours();
  let minute = date.getMinutes();
  /*
   * checks if period2 is before period1 returns false if period2 is after
   * period1, or if both periods are at the same time
   * parameters:
   * period1: {day: int 0-6, hour: int 0-24, minute: int 0-59},
   * period2: {day: int 0-6, hour: int 0-24, minute: int 0-59}
   */
  const isBefore = (period1, period2) => {
    if (
      period2.day > 6 ||
      period2.day < 0 ||
      period2.hour > 24 ||
      period2.hour < 0 ||
      period2.minute > 59 ||
      period2.minute < 0
    ) {
      throw "invalid time values provided";
    }

    if (
      period1.day == period2.day + 1 ||
      (period2.day == 6 && period1.day == 0)
    ) {
      // edge case for closing time - check if within an hour of
      // closing if close is early morning the next day and date
      // is late at night
      if (
        period2.hour == 24 &&
        period1.hour == 0 &&
        period1.minute <= period2.minute
      ) {
        return false;
      }

      return true;
    }
    if (period1.day == period2.day) {
      if (period1.hour > period2.hour) {
        return true;
      }
      if (period1.hour == period2.hour && period1.minute > period2.minute) {
        return true;
      }
    }
    return false;
  };
  for (let period of periods) {
    if (
      (period.close.day == weekday &&
        period.close.hour == hour + 1 &&
        period.close.minute == minute) ||
      isBefore(period.close, { day: weekday, hour: hour + 1, minute })
    ) {
      if (weekday != 6 || period.open.day != 0) {
        return !isBefore(period.open, { day: weekday, hour, minute });
      }
    }
  }
  return false;
};

exports.filter_by_budget = (res_budget, budget) => {
  if (!res_budget || res_budget == "PRICE_LEVEL_UNSPECIFIED") {
    return true;
  }
  const budget_to_int = (budget) => {
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
  return restaurant_budget <= budget[1] && restaurant_budget >= budget[0];
};

function calculate_coord(latitude, longitude, distance) {
  const lat1 = (latitude * Math.PI) / 180;
  const long1 = (longitude * Math.PI) / 180;

  const R = 6378137;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / R) +
      Math.cos(lat1) * Math.sin(distance / R) * Math.cos((4 * Math.PI) / 3)
  );

  const long2 =
    long1 +
    Math.atan2(
      Math.sin((4 * Math.PI) / 3) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  console.log(`${(lat2 * 180) / Math.PI}, ${(long2 * 180) / Math.PI}`);
}

exports.more_results = asyncHandler(async (req, res, next) => {
  // concentric
  const test = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Maggie Spillane's Ale House and Rooftop",
    "Ciao",
    "Rosie's Bistro Italiano",
    "Jack's",
    "Zero Otto Nove",
    "Wicked Wolf North",
    "Starbucks",
    "Underhills Crossing",
    "The Urban Hamlet",
    "Spice Village",
    "Angelina's",
    "Gino’s Pizza",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Buleria Tapas & Wine Bar",
  ]);

  const test3 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Rosie's Bistro Italiano",
    "Underhills Crossing",
    "The Urban Hamlet",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Gino’s Pizza",
    "Dumpling + Noodle",
    "Il Bacio Trattoria",
    "Pondfield Cafe",
    "Haiku Asian Bistro",
    "Scalini Osteria",
    "Jade Spoon bronxville asian cuisine",
    "OpaOpa Fresh Greek",
    "Lange's Delicatessen",
    "Park 143 Bistro",
  ]);

  const test2 = new Set([
    "Bronxville Diner",
    "Playa Bowls",
    "La Casa Bronxville",
    "Starbucks",
    "The Taco Project",
    "Underhills Crossing",
    "The Urban Hamlet",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Il Bacio Trattoria",
    "Haiku Asian Bistro",
    "Scalini Osteria",
    "OpaOpa Fresh Greek",
    "Lange's Delicatessen",
    "Wild Ginger",
    "Tredici SOCIAL",
    "Ernie’s Wine Bar + EATS",
    "Hunan 3",
    "Bacione Pasta Shop",
    "111 Kraft Avenue",
  ]);

  // 4 subsections
  const test4 = new Set([
    "Bronxville Diner",
    "Playa Bowls",
    "La Casa Bronxville",
    "Starbucks",
    "The Taco Project",
    "Maggie Spillane's Ale House and Rooftop",
    "Rosie's Bistro Italiano",
    "Underhills Crossing",
    "The Urban Hamlet",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Il Bacio Trattoria",
    "Dumpling + Noodle",
    "The Bayou",
    "Haiku Asian Bistro",
    "Scalini Osteria",
    "OpaOpa Fresh Greek",
    "Lange's Delicatessen",
    "Joe's Fleetwood Pizzeria",
    "Wild Ginger",
  ]);

  const test5 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Rosie's Bistro Italiano",
    "Zero Otto Nove",
    "Wicked Wolf North",
    "Starbucks",
    "Underhills Crossing",
    "The Urban Hamlet",
    "Spice Village",
    "Angelina's",
    "Gino’s Pizza",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Buleria Tapas & Wine Bar",
    "Dumpling + Noodle",
    "Il Bacio Trattoria",
    "Tuck'd Away Bar and Grill",
  ]);

  const test6 = new Set([
    "BURRATA",
    "Ciao",
    "Polpettina",
    "Jack's",
    "Piper's Kilt",
    "Zero Otto Nove",
    "Rio Bravo Tacos & Tequila",
    "Wicked Wolf North",
    "Mickey Spillane's",
    "Starbucks",
    "Spice Village",
    "Angelina's",
    "Buleria Tapas & Wine Bar",
    "Tuck'd Away Bar and Grill",
    "Growlers Beer Bistro",
    "Roma",
    "ODO",
    "Tuckahoe Station Cafe",
    "Meat The Greek",
    "The Burrito Poblano",
  ]);

  const test7 = new Set([
    "Wendy's",
    "Chuck E. Cheese",
    "Outback Steakhouse",
    "Rancho Grande Yonkers",
    "Carlo's",
    "The Halal Guys",
    "Popeyes Louisiana Kitchen",
    "Zero Otto Nove",
    "Wicked Wolf North",
    "Starbucks",
    "Arby's",
    "Angelina's",
    "El Cantito Cafe",
    "Spice Village",
    "Tuck'd Away Bar and Grill",
    "Growlers Beer Bistro",
    "Cravwings",
    "Lola On the Grill",
    "Hapag Filipino Cuisine",
    "Roma",
  ]);
  // entire circle
  const test8 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Maggie Spillane's Ale House and Rooftop",
    "Rosie's Bistro Italiano",
    "Ciao",
    "Jack's",
    "Zero Otto Nove",
    "Wicked Wolf North",
    "Starbucks",
    "Underhills Crossing",
    "The Urban Hamlet",
    "Spice Village",
    "Angelina's",
    "Gino’s Pizza",
    "J C Fogarty's",
    "Dunkin'",
    "Pete's Park Place Tavern",
  ]);

  // 3 subsections
  const test9 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Rosie's Bistro Italiano",
    "Underhills Crossing",
    "The Urban Hamlet",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Il Bacio Trattoria",
    "Dumpling + Noodle",
    "Haiku Asian Bistro",
    "Pondfield Cafe",
    "Scalini Osteria",
    "OpaOpa Fresh Greek",
    "Lange's Delicatessen",
    "Park 143 Bistro",
    "Tredici SOCIAL",
    "Wild Ginger",
  ]);

  const test10 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Rosie's Bistro Italiano",
    "Underhills Crossing",
    "The Urban Hamlet",
    "Gino’s Pizza",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Dunkin'",
    "Dumpling + Noodle",
    "Il Bacio Trattoria",
    "Pondfield Cafe",
    "Jade Spoon bronxville asian cuisine",
    "Haiku Asian Bistro",
    "Scalini Osteria",
    "OpaOpa Fresh Greek",
    "Lange's Delicatessen",
  ]);

  const test11 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Rosie's Bistro Italiano",
    "Zero Otto Nove",
    "Wicked Wolf North",
    "Starbucks",
    "Underhills Crossing",
    "The Urban Hamlet",
    "Spice Village",
    "Angelina's",
    "Gino’s Pizza",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Buleria Tapas & Wine Bar",
    "Dumpling + Noodle",
    "Il Bacio Trattoria",
    "Tuck'd Away Bar and Grill",
  ]);

  const test12 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Rosie's Bistro Italiano",
    "Zero Otto Nove",
    "Wicked Wolf North",
    "Starbucks",
    "Underhills Crossing",
    "The Urban Hamlet",
    "Spice Village",
    "Angelina's",
    "Gino’s Pizza",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Buleria Tapas & Wine Bar",
    "Dumpling + Noodle",
    "Il Bacio Trattoria",
    "Tuck'd Away Bar and Grill",
  ]);

  const test13 = new Set([
    "Bronxville Diner",
    "La Casa Bronxville",
    "Playa Bowls",
    "Starbucks",
    "The Taco Project",
    "Rosie's Bistro Italiano",
    "Underhills Crossing",
    "The Urban Hamlet",
    "J C Fogarty's",
    "Gino’s Pizza",
    "Pete's Park Place Tavern",
    "Dumpling + Noodle",
    "Il Bacio Trattoria",
    "Pondfield Cafe",
    "Jade Spoon bronxville asian cuisine",
    "Haiku Asian Bistro",
    "Scalini Osteria",
    "OpaOpa Fresh Greek",
    "Lange's Delicatessen",
    "Park 143 Bistro",
  ]);

  const test14 = new Set([
    "Bronxville Diner",
    "Playa Bowls",
    "La Casa Bronxville",
    "Starbucks",
    "The Taco Project",
    "Underhills Crossing",
    "The Urban Hamlet",
    "J C Fogarty's",
    "Pete's Park Place Tavern",
    "Il Bacio Trattoria",
    "Dumpling + Noodle",
    "Haiku Asian Bistro",
    "Scalini Osteria",
    "OpaOpa Fresh Greek",
    "Lange's Delicatessen",
    "Wild Ginger",
    "Tredici SOCIAL",
    "Park 143 Bistro",
    "The Tav'ery",
    "Full Moon Pizzeria",
  ]);

  console.log(test.union(test2).union(test3));
  console.log(test4.union(test5).union(test6).union(test7));
  console.log(test9.union(test10).union(test11).union(test8));
  console.log(test12.union(test13).union(test14).union(test8));
  calculate_coord(40.939659194496, -73.83177411572733, 536);
  // 40.93484422457312, -73.83177411572733
  // 40.944474164418885, -73.83177411572733
  // 40.93484422457312, -73.82540004985798
  // 40.93484422457312, -73.83814818159667

  // 40.937853506739366, -73.82763415166725
  // 40.937853506739366, -73.8359140797874
  // 40.94327042193816, -73.83177411572733

  // 40.937251577917515, -73.82625421394573
  // 40.937251577917515, -73.83729401750891
  // 40.944474164418885, -73.83177411572733
  res.status(200).json({ message: "all good" });
});

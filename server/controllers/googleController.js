const axios = require("axios");
const asyncHandler = require("express-async-handler");
const pool = require("../pool");
const restaurants_model = require("../models/restaurants");
const meals_model = require("../models/meals");

exports.nearby_search_old = async (req, res, next) => {
  try {
    let location = [40.93941850319317, -73.83195923491385];
    let key = process.env.PLACES_API_KEY;
    let { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location[0]}%2C${location[1]}&radius=1500&type=restaurant&key=${key}`
    );
    console.log(data);
    res.status(200).json({ message: "this is working" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
};

exports.nearby_search = async (req, res, next) => {
  try {
    let key = process.env.PLACES_API_KEY;
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
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.accessibilityOptions,places.addressComponents,places.formattedAddress,places.name,places.displayName,places.location,places.photos,places.types,places.primaryType,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.regularSecondaryOpeningHours,places.currentSecondaryOpeningHours,places.rating,places.userRatingCount,places.websiteUri",
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
    let key = process.env.PLACES_API_KEY;
    let { data } = await axios.get(
      `https://places.googleapis.com/v1/${photo_name}/media`,
      {
        params: {
          maxWidthPx: 500,
          skipHttpRedirect: true,
        },
        headers: {
          "X-Goog-Api-Key": key,
        },
      }
    );
    console.log(data);
    res.status(200).json({ message: "this is working", photo: data });
  } catch (err) {
    console.log(err.response);
    res.status(500).json({ error: err });
  }
};

exports.get_geocoding_info = async (coords) => {
  try {
    let key = process.env.PLACES_API_KEY;
    // let { data } = await axios.get(
    //   "https://maps.googleapis.com/maps/api/geocode/json",
    //   {
    //     params: { latlng: coords, key },
    //   }
    // );
    // console.log(data);
    // console.log(data.results[0]);
    console.log("RUNNING GEOCODING!!!!");
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

function process_google_data(places) {
  const tag_map = {};
  let sqlValueString = "values";
  // const place_ids = [];
  const places_data = {};
  const place_ids = places.map((res, index) => {
    sqlValueString += `('${res.id}', ${res.rating},'{`;
    let place_id = res.name.split("/")[1];
    let tagList = res.types.reduce((types, type, index) => {
      if (
        type.match(
          /^.+restaurant$|bar|cafe|coffee\_shop|ice\_cream\_shop|sandwich\_shop|steak\_house/
        )
      ) {
        types.push(type.replace(/\_|restaurant/g, " ").trim());
        sqlValueString += `"${type}",`;

        if (type.match(/^.+restaurant$|sandwich\_shop|steak\_house/)) {
          tag_map[type] = true;
        }
        return types;
      }
      return types;
    }, []);
    if (tagList.length) {
      sqlValueString = sqlValueString.substring(0, sqlValueString.length - 1);
    }
    sqlValueString += `}')`;
    if (index < places.length - 1) {
      sqlValueString += ",\n";
    }

    places_data[place_id] = {
      id: place_id,
      name: res.displayName.text,
      address: res.shortFormattedAddress,
      types: tagList,
      location: res.location,
      priceLevel: res.priceLevel,
      rating: res.rating,
      rating_count: res.userRatingCount,
      hours: res.regularOpeningHours.weekdayDescriptions,
      photos: res.photos.reduce((results, photo, index) => {
        if (index < 4) {
          results.push({
            name: photo.name,
            authors: photo.authorAttributions,
          });
        }
        return results;
      }, []),
      accessibilityOptions: res.accessibilityOptions,
      website: res.websiteUri,
      // open: filter_by_hours(
      //   res.regularOpeningHours.weekdayDescriptions,
      //   new Date(scheduled_at)
      // ),
      // inBudget: filter_by_budget(res.priceLevel, 1, 4),
    };
    return place_id;
  });

  return { sqlValueString, tag_map, place_ids, places_data };
}

const MILES_TO_METERS = 1609.34;

let places = [
  {
    name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8",
    id: "ChIJ3z_bIK6SwokRz3XMu8xCPI8",
    types: [
      "breakfast_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "112 Kraft Ave, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "112",
        shortText: "112",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Kraft Avenue",
        shortText: "Kraft Ave",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.940843,
      longitude: -73.83425,
    },
    rating: 4.3,
    websiteUri: "http://thebronxvillediner.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 7,
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
            hour: 7,
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
            hour: 7,
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
            hour: 7,
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
            hour: 7,
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
            hour: 7,
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
        "Monday: 7:00 AM – 9:00 PM",
        "Tuesday: 7:00 AM – 9:00 PM",
        "Wednesday: 7:00 AM – 9:00 PM",
        "Thursday: 7:00 AM – 9:00 PM",
        "Friday: 7:00 AM – 9:00 PM",
        "Saturday: 7:00 AM – 9:00 PM",
        "Sunday: 7:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 990,
    displayName: {
      text: "Bronxville Diner",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 7,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 7,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 7,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 7,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 7,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 7,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 7,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 7:00 AM – 9:00 PM",
        "Tuesday: 7:00 AM – 9:00 PM",
        "Wednesday: 7:00 AM – 9:00 PM",
        "Thursday: 7:00 AM – 9:00 PM",
        "Friday: 7:00 AM – 9:00 PM",
        "Saturday: 7:00 AM – 9:00 PM",
        "Sunday: 7:00 AM – 9:00 PM",
      ],
    },
    primaryType: "restaurant",
    shortFormattedAddress: "112 Kraft Ave, Bronxville",
    photos: [
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CsTYW0yGXsEBd2yCkDnmL6ZNrComgouZ_v_-DD63My5rmQFhz7FYYzT7iQJ62hxUdmhFGhP7rAdWmYHaMMl9d3Q44eope0YnbtL8GF2x7FjccyYGmqN9M7RcOVE7UFz79OuPP4IuZ9NSkultsCkUkjDG7gWuruMKFOv",
        widthPx: 2048,
        heightPx: 1228,
        authorAttributions: [
          {
            displayName: "Bronxville Diner",
            uri: "//maps.google.com/maps/contrib/103536951004213398224",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWm1PgYl7vrRK2bfkv856TWASYTnz49w6RKH-uHOObSUhqR4_I=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_Cvy_MPC11QqoHtB0yNvF3o-rJUy76K02bu4YkyIWyAYyzj048uXIH7nKQiWOCaw4BsdCieNg4NA_RedSibEUNhy7pRCzDsQbsamQs0FJL__vvufOHNBn-guFrcQrQJIPfb8gyDxHeDYRVDkTJNhh4J8e02Uaog72Xav",
        widthPx: 1024,
        heightPx: 682,
        authorAttributions: [
          {
            displayName: "Bronxville Diner",
            uri: "//maps.google.com/maps/contrib/103536951004213398224",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWm1PgYl7vrRK2bfkv856TWASYTnz49w6RKH-uHOObSUhqR4_I=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CsiJcO7P-82LgcMANWmdw-tEVaDjca80UfpL1mQ-ScjbgP8JycNYeUI83aRKioluw26kZkjR6KUferJ6dg-PmyN7GZOlh7u7Fg-EubxpCcYIirZnKVYY6vlkEr9PZub2ugA_sjMkWmWd0lDY2HlQr5y7Xd9UkftyWo",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Kim Gullberg",
            uri: "//maps.google.com/maps/contrib/111035411571893892330",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVQICCQe1aOgee88QVbprScdUHTpWq2rX57R_XTGsCrMzDyW7A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CtQl-s4kXhT-sx-Fh66X4MGxttmfJ9e6qIZ4OeHP3U6zupEN8hoaKLI2lKpsdTXXf_YXKWQX29atX0ey8p2PiZvu_l1K_abSkCkuvrBTlo_RGt99v3LGFYLZEzMzVaSQ0fKWSu8PFkHlFQ1JMvUww6Dp90M5vMIKp9_",
        widthPx: 2585,
        heightPx: 3295,
        authorAttributions: [
          {
            displayName: "Tom Moncho",
            uri: "//maps.google.com/maps/contrib/114125059648511830046",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVIp0U9d6wWacj8xmefHG8bluUDQi8UHlEY4abaq0TDMmoMQYTo0w=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CsUPy3FP1H5RVDcQW3fqqA9i9BYTdk4oZiuzMIQ5la1FaYafZN29V-6zzwt_1mfMeWoZRfs0i3rxev9RsM47sxDJxfDyts1vQxOYEkuXaGOHcgMKzZgOkhz2jey40XbX9M9ozXtgy-bI0sA3g4980pGd2KkLSyEe4gL",
        widthPx: 1080,
        heightPx: 1439,
        authorAttributions: [
          {
            displayName: "Mia Flores",
            uri: "//maps.google.com/maps/contrib/106875505515876382969",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocI3RsiJ0CYqyuJCbEkBj3AoR55I45wSSLaVFoxo4bShgi0ZRQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CtirJ3q-lOMERReoTMLJNeqUEmw66ipjkJKu_X5AVYktgSQlnHBHeH5wT0COtevEKxP_aTVWKxhHBLv3JxraSZippFzLeieECScLrQWqMqUs3XOboHqH0XKD6E8wRqyPK6ZmQlkz5I9tfN9uYMvqLuH-fMbVlj9odlA",
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
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CvGOlSmKt82T4MFMoILUNtuaR2zfxAhDgDUXnzeifA3mM4LrSWZJO5KPQQi2EbdFK0Uu0RDEnEu6Qto4yQWlIPfVe6NGYxA3atjO-Q76SOzTRmlCM28K2qNFr9r3gJhiLsZcgOZYr-B1AzoTa-yf_SWxYJ2quvlqRDq",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Anand Pande",
            uri: "//maps.google.com/maps/contrib/103660647979898389800",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKkiZoDzZKxdsAgjBbc8eJa331GdYw3LiXdH2FXM_Fz5sbckb_d=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CuR-XCtsEFRRP8E35JUDtT1mvVZ7ID7DGOBpuH2M5buhobR419nem0BLmM5DbmkhYkpeH8YgldHdg2KPdIQZwEK0zLVHejpe6tsQ0epvCMWZJbjowZDBMHu9pXmjQvXfV_NtDiIT5xjyplpbikVwN5i59bizEotFnCJ",
        widthPx: 3984,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Tom Moncho",
            uri: "//maps.google.com/maps/contrib/114125059648511830046",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVIp0U9d6wWacj8xmefHG8bluUDQi8UHlEY4abaq0TDMmoMQYTo0w=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_Ctlgs52dubQg41fSHjitMsNOBW5cmLXPdSG8rj6PvncuU1aTVA9YHYzI-PGnM44lR-XUReOKX68-6Q6c7_fg5eomrjKUlnozRDGMelfC8m7FyouoYBopU-Xn9HgLMQBSRK6iTxWyMXYJ_P4S5v9CKi1QMK11pUaV4Am",
        widthPx: 4000,
        heightPx: 2252,
        authorAttributions: [
          {
            displayName: "Marcel Younes (Marco)",
            uri: "//maps.google.com/maps/contrib/107319038800645389560",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUOo8BYqeyYxILKD8LnOb9SK7HcC6SdR9FCgaOuPmHy9b0s4l8N_A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ3z_bIK6SwokRz3XMu8xCPI8/photos/AelY_CvlrocVg53S5u-aC76UFtZ7YIfU9xr85lTgOHkI4upHss_dXzc3nVVs2E7XDU49T8sLM9DqunEQdyu-Th1jzkPzdRPXST55ZgvUUAzBWHeBa3oJGDK_u0FSckggGmsn8gDvpQHkev4QdWN2bZxrCiriSnBJSZSNHe_f",
        widthPx: 4000,
        heightPx: 2252,
        authorAttributions: [
          {
            displayName: "Marcel Younes (Marco)",
            uri: "//maps.google.com/maps/contrib/107319038800645389560",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUOo8BYqeyYxILKD8LnOb9SK7HcC6SdR9FCgaOuPmHy9b0s4l8N_A=s100-p-k-no-mo",
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
    name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w",
    id: "ChIJ23paVWmTwokRd0rp8kdKM0w",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "15 Park Pl, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "15",
        shortText: "15",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Park Place",
        shortText: "Park Pl",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9395715,
      longitude: -73.8337966,
    },
    rating: 4.8,
    websiteUri: "http://playabowls.com/",
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
            hour: 21,
            minute: 0,
          },
        },
        {
          open: {
            day: 1,
            hour: 9,
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
            hour: 9,
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
            hour: 9,
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
            hour: 9,
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
            hour: 9,
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
            hour: 9,
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
        "Monday: 9:00 AM – 9:00 PM",
        "Tuesday: 9:00 AM – 9:00 PM",
        "Wednesday: 9:00 AM – 9:00 PM",
        "Thursday: 9:00 AM – 9:00 PM",
        "Friday: 9:00 AM – 9:00 PM",
        "Saturday: 9:00 AM – 9:00 PM",
        "Sunday: 9:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 527,
    displayName: {
      text: "Playa Bowls",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 9:00 AM – 9:00 PM",
        "Tuesday: 9:00 AM – 9:00 PM",
        "Wednesday: 9:00 AM – 9:00 PM",
        "Thursday: 9:00 AM – 9:00 PM",
        "Friday: 9:00 AM – 9:00 PM",
        "Saturday: 9:00 AM – 9:00 PM",
        "Sunday: 9:00 AM – 9:00 PM",
      ],
    },
    primaryType: "restaurant",
    shortFormattedAddress: "15 Park Pl, Bronxville",
    photos: [
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CvYoeiAvOkj2xShDdtnH9fh5ctuf3_fXgl_63wzw4lLpqZOvJs_2_OOLgjGLozraMq45cqJPhhZqLdWRs0_TeNfCHocauMXcHDviCtg4E3pCJ1SJi_wBYwdYPgPbi_I48nKmOd5E-XX5hpjTo9Z4Mfwu6aIiB-fhpPA",
        widthPx: 2649,
        heightPx: 2895,
        authorAttributions: [
          {
            displayName: "SPD",
            uri: "//maps.google.com/maps/contrib/109954214289545768470",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLjhs5L_LaggmEjon3Gw1VQApDXiMs4j73QBROytW8x7mf2FA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_Ct_Nf1x4LT0C0dqxTCIzfFN22DBu0pO47d8-jVpjvff1NuO4Nz1stUAAqpt0-EcDcxbwYeTPeZOEdvs2XqHzlvLsqaFWviwUVULIUgc2zLy6bnN95vt340G_YzytcdT4ofAzXPsWqoi1ueo-Y_Nlj0piOYg_cIK3RnA",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Ryan Raaum",
            uri: "//maps.google.com/maps/contrib/105892243175315839968",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWrZIE1TvBwgB1gtW7zA83gkX2Gc_WtF0UZCeVz075Jbk-l0LNd=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CsPjnB7AvVVgnOQeUkXxkds9dYQsB0FfysU0oUUs0szGfa0PHIZDY8CZnoRWBETMV35SO9Qu46-FEuFscmnkNQX6EyCAxdv0xiiKrYpPBS5ahuWx4CPo5gd2E-3_8c1qlViY-CmK42y0QUaB8TExbe1If4QBapzt-XI",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Renee Perkins",
            uri: "//maps.google.com/maps/contrib/111666520096562646940",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWPXEvAr30F89xDB3LZp4HkVUHjHbwtbnhOUpp8wr3MRJZpoxI=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CvZtY1oxxi1aGUEjZuqx3g_WqCPy0m1y3aVDVTnr1vp4tYHEf8mJ_8s-7a-F6FICXBVJTTAJP0drITePCBBSZQzcNp7DroMdrdakxN2DOBg2RPDDTc-ebBB_DOj2EJUhErbMeh8VpfKU3WEZZ5dFG11n0DyL3dpFsmZ",
        widthPx: 3000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "among us Gamer",
            uri: "//maps.google.com/maps/contrib/112552625260623853690",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUUu6_f-_b_NV1TRb9I3dIeXX5Q0eA9-B884nPglsIGb4udMMM=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CvoB6yxQJEDhEkISqwR_zauW8XCwSZ-AKEJZAWXQtba2M-iPgFM4fUwGm7BBFugetIunhjMP5FI49cDOBgMOUBQ7EAU51u31DZGe-BrZx2lXeGYwSnpybSZom6-SarLzUZZ0QJkGOF8oEwdfQg_KYjNquwUghJpgeU",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Jess the Blessed",
            uri: "//maps.google.com/maps/contrib/108398016219706138219",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUBiio_GFueTlO7D5EvMjvB0If0eEBczigdDhndJNTvRq1jUBs=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CtQq9NEn9P81xnWqmRmHu7CtBnazB52rKG2sPXesKPYgpnsOM_02HH5G18AcBWmiIcx0ABZgdgjPbkanDl7mhk6tAsVJpP_2atnhZPOP4-_fIxtyBmxEbZNN1arwwKQO3Ek3F87nPUROmgf7nxez-w8GrI7U7xYqjxd",
        widthPx: 1920,
        heightPx: 1080,
        authorAttributions: [
          {
            displayName: "kamal maq",
            uri: "//maps.google.com/maps/contrib/106311411889971113392",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUwz4M34bAEKlPxrWmsq0NpwOfFiCwepaIpFyQM5ib1-g1mSC91=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CtMB1raz7NF_OUA3H6njzQMLezURWm5iKqLflctzjgsOK2825-ZNC5s6AucrH1-rFO_Zb49FyARDyCaySZJyjoPEAWKxb7iQTY6QNj_qwQsnA-yZe0rWt1uyJkTIN6ah0uvAv7_yMT8s8uybeNw2KJcV6G_nVS4TpNl",
        widthPx: 3024,
        heightPx: 4032,
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
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CtEa0QQl9mSzji0gwVrJTvTcKDfvhEooAvyKMR-yNVdMIK5l_fttQ8kuj3ntOwlhcnWDh31roX7qdvPfpPitzCSz58t7zAMiIR8G9vqpmIPYdFkU_CLEby3aJDU-NFZ1iRKOM4GQmoatId17Idosyrpm8b1g5GGqBKe",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Gabriela Lêdo Franco",
            uri: "//maps.google.com/maps/contrib/112720967901361075004",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX6n2oLQGm24NNJ6QmKD1x5z1rcTnTocG4RCmurf1ZCNZ11EMPIkg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CukykkSYDz0rVaQMvPGKamcI7-F44n-NEF0Kj90wj1EiE3CMjK5m_c1Yo-Ya2G173N9_1YnFV0aif10YqI532c-xU6EBZdsETGES7aVU3_Kof1O-NbitdFz_ioyYqlZCAP6ekUsftVt20ZpS0UJk-A7levuYLynTXla",
        widthPx: 4032,
        heightPx: 1960,
        authorAttributions: [
          {
            displayName: "cesar duque",
            uri: "//maps.google.com/maps/contrib/114571796102722332405",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV33CZnN8uGtrOlUwZLqy4TrNnvvPhboqNiQ4BkvSWPPp_lfapgTA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ23paVWmTwokRd0rp8kdKM0w/photos/AelY_CsLYdqRrqNGaAeUKAhBo8AwDYHShfWCKoHj6zD0PdSB8iY39SgWAMQhc8nVIdfgLHOUna5FwBmGnNoywtAfBjC4W3Y6llh8lewD5rSqN2oIG2mS5Prm6BsFQhCD70WfeUbwFgVnLdD3q2IgOcJtrwIQ8TVBoe6axTi7",
        widthPx: 1125,
        heightPx: 1164,
        authorAttributions: [
          {
            displayName: "HD13",
            uri: "//maps.google.com/maps/contrib/101333690446174682033",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLQQGA372_kEJZRWfCgl6jM6oToPDQ4iQ9efLxQBCgnHPSYag=s100-p-k-no-mo",
          },
        ],
      },
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI",
    id: "ChIJv0CFoxKTwokR4Sfgcmab1EI",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "7 Pondfield Rd, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "7",
        shortText: "7",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Pondfield Road",
        shortText: "Pondfield Rd",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.942234,
      longitude: -73.8340454,
    },
    rating: 4.6,
    websiteUri: "https://lacasabronxville.com/",
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
            hour: 21,
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
            day: 1,
            hour: 21,
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
            hour: 22,
            minute: 30,
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
            minute: 30,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:00 – 9:30 PM",
        "Tuesday: 5:00 – 9:30 PM",
        "Wednesday: 5:00 – 9:30 PM",
        "Thursday: 5:00 – 10:00 PM",
        "Friday: 12:00 – 10:30 PM",
        "Saturday: 9:00 AM – 10:30 PM",
        "Sunday: 9:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 398,
    displayName: {
      text: "La Casa Bronxville",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 22,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 9,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 22,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:00 – 9:30 PM",
        "Tuesday: 5:00 – 9:30 PM",
        "Wednesday: 5:00 – 9:30 PM",
        "Thursday: 5:00 – 10:00 PM",
        "Friday: 12:00 – 10:30 PM",
        "Saturday: 9:00 AM – 10:30 PM",
        "Sunday: 9:00 AM – 9:00 PM",
      ],
    },
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 1,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 5:00 – 6:00 PM",
          "Tuesday: 5:00 – 6:00 PM",
          "Wednesday: 5:00 – 6:00 PM",
          "Thursday: 5:00 – 6:00 PM",
          "Friday: 12:00 – 6:00 PM",
          "Saturday: Closed",
          "Sunday: Closed",
        ],
        secondaryHoursType: "HAPPY_HOUR",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 8,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 8,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 8:30 – 11:30 AM",
          "Sunday: 8:30 – 11:30 AM",
        ],
        secondaryHoursType: "BREAKFAST",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 11:30 AM – 4:00 PM",
          "Sunday: 11:30 AM – 4:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 5,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: 12:00 AM – 5:00 PM",
          "Saturday: Closed",
          "Sunday: Closed",
        ],
        secondaryHoursType: "LUNCH",
      },
    ],
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 1,
              hour: 17,
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
              hour: 17,
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
              hour: 17,
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
              hour: 17,
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
              hour: 12,
              minute: 0,
            },
            close: {
              day: 5,
              hour: 18,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 5:00 – 6:00 PM",
          "Tuesday: 5:00 – 6:00 PM",
          "Wednesday: 5:00 – 6:00 PM",
          "Thursday: 5:00 – 6:00 PM",
          "Friday: 12:00 – 6:00 PM",
          "Saturday: Closed",
          "Sunday: Closed",
        ],
        secondaryHoursType: "HAPPY_HOUR",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 8,
              minute: 30,
            },
            close: {
              day: 0,
              hour: 11,
              minute: 30,
            },
          },
          {
            open: {
              day: 6,
              hour: 8,
              minute: 30,
            },
            close: {
              day: 6,
              hour: 11,
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
          "Saturday: 8:30 – 11:30 AM",
          "Sunday: 8:30 – 11:30 AM",
        ],
        secondaryHoursType: "BREAKFAST",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 30,
            },
            close: {
              day: 0,
              hour: 16,
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
              hour: 16,
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
          "Saturday: 11:30 AM – 4:00 PM",
          "Sunday: 11:30 AM – 4:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 5,
              hour: 0,
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
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: 12:00 AM – 5:00 PM",
          "Saturday: Closed",
          "Sunday: Closed",
        ],
        secondaryHoursType: "LUNCH",
      },
    ],
    primaryType: "restaurant",
    shortFormattedAddress: "7 Pondfield Rd, Bronxville",
    photos: [
      {
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_CsKPgUlAHl2DHtbSFa4fwGE4UbcGRXZj6qcvAnmdzBkJvhUFtKwPiJhl_Fq2p308MHi4JEt-LNvo5FEniwpgC49W43YtTMfnFCnNGljrtDKroxRoCzIk_gPiojgEc-rIAyZUWAX1DGivG4fjFholRv6njm48p2q81s3",
        widthPx: 1100,
        heightPx: 734,
        authorAttributions: [
          {
            displayName: "La Casa Bronxville",
            uri: "//maps.google.com/maps/contrib/102498846217371794194",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVuX5PpDHz8y_nZtLKHBPTsopba_lHZmVRLrYCSBpcghX8-LAw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_CulFSMK_18BHGXFbEXGRXx2ls-PHgv9svKsRMi1qkLfzLMMdYCfi8q4sPnOuw6MJWkmWyeK8hQRrSCWebiODrU4w1sLWLSUhGYZtWqc7ZGj6QWPljfepOwlljA2I8dscgFvhdbX0QrTAPWI6bh9dPeBlbNOpEQeY1jH",
        widthPx: 2901,
        heightPx: 2723,
        authorAttributions: [
          {
            displayName: "La Casa Bronxville",
            uri: "//maps.google.com/maps/contrib/102498846217371794194",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVuX5PpDHz8y_nZtLKHBPTsopba_lHZmVRLrYCSBpcghX8-LAw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_CuEPZKBq_b5PjW07yTN9YzNNUmZewuKxdJyYKqnaX_GylHHN5Erbs1w21wxgfXmVSEgKD_f1Ufpt-MXyCjT_sEHmL57AXD3wpHwYxfUEZJsVHxwGp0UWjWqnaPrqYmnWsxukO55FRmDI9gZ4TwfSAPYYnPFRX8rHhNZ",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Jim Blinn",
            uri: "//maps.google.com/maps/contrib/118430726648511021467",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKK7F4x7i8c7wjIAJRr6nlW2Ks-iKEydLYreRMhaBu7Ypq0-A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_Cv1KpCX332WoujpmxuncxynCdVHaOJKwMPYC3HSEtTKf5tm64cCmMMuO8O1w9aOu3F26nSeL_XWHvd3setD3mViuc0_QYYxd9R2jbL2WgbaenbO5a48xp9Pl0MlA2QZAV0NCu-ZfbGr2fpHaKHvxrglvVI241j-Nvyc",
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
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_Cv7tq9PjOoBisxMcRg1X_Ti_YWcLh-eP9-aoTKEPdSDpvL2To-FrPobQklEFyS8_S_7BM6fZS095dsemy2qKW5eP0yK1WiPImIvbraEr4It7BM-mTl2oiKSd7INP9l2ePovvDd0pidgTlLRqwEGXQqfzbrMVi5yhPSZ",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Jim Blinn",
            uri: "//maps.google.com/maps/contrib/118430726648511021467",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKK7F4x7i8c7wjIAJRr6nlW2Ks-iKEydLYreRMhaBu7Ypq0-A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_CsmMD8XxA4vDEYsgSrrdG2rJIK4AszZkecDgJ0f9noVE0hvArPjNppSOjVl0t7tQLWpsHVFwneGnVRh9E6TqwqmlzdsX6XHmzWFTkn6tE-eIh_pV3n9gtDEkbcsBREz_5UKuKOVEPtp1WsmQQ-8Q48q7znj3HSLxfXH",
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
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_Ct8ycJNb7Q0Kg8tbm0pruxYE0vvkHD2XvjvrG9PqwvOJb6uGy3HIvXdC2kEpPDUki_3PGns3pSu0FVvuk3T_BjEe4w_54ertbseLTDHueGvwiAR4mR9yBjEZAYzfMXqVTmwDfI6L5ZAlwpwuTPjzYQAZmKAOly2qptL",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Chrystal Tyler",
            uri: "//maps.google.com/maps/contrib/100662241990079929790",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWxhnInuTDbq-JJZiquvvUsevxAQopl70sSoGjk42O5fksU0jYO=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_CtfHgqDHo0vX8MSPn6ryFnl6scuyOtWVyr9T0V9prwXAQLcVsOFWJYW2frS-TU7DS1CelIJvJ6I1PfRgdMaRi8u6_vfj7_swiEIYBqim8Fnj_fcYFhFQ5G_aAvHJcsXVl1LQEE_ADT8R0J3lpEG2kg5_xMmHjFEXZ7T",
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
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_Ct2-oKeKi-Z0wc_UmsioBITiHgsdGsC9tWrzEJcVHqEHIw_4jJoDjWdBHFNiahsQT5JwNDgDnZDZiIjtyoaPagD_KFzaSQDpfhMuSEB7oHghYaWV2mz7UzzNcHbfyMoRj4ub2sC1izROBFkoeNzOR8hU2Yw_Ol0XnkT",
        widthPx: 2992,
        heightPx: 2992,
        authorAttributions: [
          {
            displayName: "Izzy P",
            uri: "//maps.google.com/maps/contrib/106312316226975657938",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXXFxjJMQpmf98nMKdUpjBbEDGH_sJyGVDeWpUYDI8YUsXt8KFC=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJv0CFoxKTwokR4Sfgcmab1EI/photos/AelY_Cv5tZ6u5GpHeLMavV-lHDy6t19gSFICivdCCyEQMKx9ibXpmX79LSgVfYqQrquJsI3B3KIq_wSrVGaqTlBZ4vwYbyBmK6pwhmEjOpNEZdjEsc35-xy94AqnEc7aTamCzZdVpmlmtHijEeCt3L-oCDH9stX0dbSclzU2",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Chrystal Tyler",
            uri: "//maps.google.com/maps/contrib/100662241990079929790",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWxhnInuTDbq-JJZiquvvUsevxAQopl70sSoGjk42O5fksU0jYO=s100-p-k-no-mo",
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
    name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls",
    id: "ChIJfxSm1EyTwokRYGIgYm3dqls",
    types: [
      "brunch_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "65 Pondfield Rd, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "65",
        shortText: "65",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Pondfield Road",
        shortText: "Pondfield Rd",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9407694,
      longitude: -73.8332839,
    },
    rating: 4.2,
    websiteUri: "https://thetacoproject.com/locations/bronxville/",
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
        "Sunday: 11:00 AM – 10:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 388,
    displayName: {
      text: "The Taco Project",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
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
        "Sunday: 11:00 AM – 10:00 PM",
      ],
    },
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 4,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 18,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 4:00 – 6:00 PM",
          "Tuesday: 11:00 AM – 9:00 PM",
          "Wednesday: 4:00 – 6:00 PM",
          "Thursday: 4:00 – 6:00 PM",
          "Friday: 4:00 – 6:00 PM",
          "Saturday: 4:00 – 6:00 PM",
          "Sunday: 4:00 AM – 6:00 PM",
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
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 1,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 23,
              minute: 59,
              truncated: true,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 3,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 4,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 5,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 6,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 0,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 11:00 AM – 12:00 AM",
          "Tuesday: 11:00 AM – 12:00 AM",
          "Wednesday: 11:00 AM – 12:00 AM",
          "Thursday: 11:00 AM – 12:00 AM",
          "Friday: 11:00 AM – 12:00 AM",
          "Saturday: 11:00 AM – 12:00 AM",
          "Sunday: 11:00 AM – 12:00 AM",
        ],
        secondaryHoursType: "TAKEOUT",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 11:00 AM – 3:00 PM",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
    ],
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 4,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 18,
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
              hour: 18,
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
              hour: 18,
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
              hour: 18,
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
              hour: 18,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 4:00 – 6:00 PM",
          "Tuesday: 11:00 AM – 9:00 PM",
          "Wednesday: 4:00 – 6:00 PM",
          "Thursday: 4:00 – 6:00 PM",
          "Friday: 4:00 – 6:00 PM",
          "Saturday: 4:00 – 6:00 PM",
          "Sunday: 4:00 AM – 6:00 PM",
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
              day: 1,
              hour: 0,
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
              day: 2,
              hour: 0,
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
              day: 3,
              hour: 0,
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
              day: 4,
              hour: 0,
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
              day: 5,
              hour: 0,
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
              day: 6,
              hour: 0,
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
              day: 0,
              hour: 0,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 11:00 AM – 12:00 AM",
          "Tuesday: 11:00 AM – 12:00 AM",
          "Wednesday: 11:00 AM – 12:00 AM",
          "Thursday: 11:00 AM – 12:00 AM",
          "Friday: 11:00 AM – 12:00 AM",
          "Saturday: 11:00 AM – 12:00 AM",
          "Sunday: 11:00 AM – 12:00 AM",
        ],
        secondaryHoursType: "TAKEOUT",
      },
      {
        openNow: false,
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
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 11:00 AM – 3:00 PM",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
    ],
    primaryType: "restaurant",
    shortFormattedAddress: "65 Pondfield Rd, Bronxville",
    photos: [
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_Ct5LY_ki_tb5GJIR_payTo6_6N8rANhrtZ8kfrEf-r-_xYfmr2M9z1tkg7ub5-D8RwUIuwKrSI7enzPJpFJ6iHXSKcB-lG_EgLEN3esoFJGvR9Lne7kutLVCgsSWRcPi6bcH7sVASSnLhgh3najX1Q-B1D6AA0UtNb7",
        widthPx: 2992,
        heightPx: 2992,
        authorAttributions: [
          {
            displayName: "Cesar Blanco",
            uri: "//maps.google.com/maps/contrib/103754609233749771540",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUsSZU1uOH5PGcCPzqbQrtNioQ10hPbuIFrGMqcjILIMRUtiopcpQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_CuLUD8aN6YFdBf1WgbFEYQHTbvNwTvWd6097az-SXD0U4vMamLD7NHWLQmNB0jN9LXwUJMiwvrIT75-e5XkaHI8ukpm7jf1l-PTfCV79fofT7B8wjX2awiNtqKKXpDIFrHl6YelHMqDRMe7Zg1yH4NCD7fEGCAMH5LS",
        widthPx: 2048,
        heightPx: 1365,
        authorAttributions: [
          {
            displayName: "The Taco Project",
            uri: "//maps.google.com/maps/contrib/109397006751132688605",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXZ_NB9YpFdRPl1qbGsShixQcfG6KcjDm7dlUo1kv-tqLcijo4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_Cs4y8C09TBIDKFdnf9Z7euLxQx1Yc9IPHcv1wpsMgm-_eeHsLZ4sitOajxSVIKLlir22A_s8_ydbGFhSndQSAP-7qXiLHUdWkHsoMpfr0x6_a8NFMHO95B0NiIfdZeZFUzdrBSXy9WRvxg6QIWvD1s1wQlLbiMvB2za",
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
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_CtEBMRQ_s1H6NPpjkpCzazgYj__EMT88byCarzxOYWSR8860X1I-Ih_omNsueiitLmyWI4-CMhlIM73HIehpQjkFgfjy8jrLNFsbGAjDQdn0o2ZLeKrTMpjhWDGV_-GhB229WhQTi0E8mmNN7roZ4Y6t4Vr2NzXVB0Y",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "The Taco Project",
            uri: "//maps.google.com/maps/contrib/109397006751132688605",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXZ_NB9YpFdRPl1qbGsShixQcfG6KcjDm7dlUo1kv-tqLcijo4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_Ctjbt6qTgeN4WnPNSKgLX0f7vnXz3JqxFeLPXHlXz87DLkzkSV2zLQ1pp7wNDWFoejbHTRbBYq9MLOgwsqL8kzEO95Z58412s27TGgEUCLrO-Fry_D2qsHPjGV6z0L0j_Dt3pIuz6pdYS2MGl3oNZFcegG7yOUGPuUj",
        widthPx: 3646,
        heightPx: 2540,
        authorAttributions: [
          {
            displayName: "Brian",
            uri: "//maps.google.com/maps/contrib/105390863865115744044",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLSWyAbaJ_JS8tzZ2AcmpzQ0-_sPU9Ywearyf83OjauZBfvhA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_CusDl9FPwoaKGIp5Kg6NsOCe_M5bCF4rfIwEcfY4w6BCgfRYoAUJj4kc2ohdgJfCyvyi5YMeI7p_TOhEB0hi0xtUJ59sZ7nAzlpXV7UDfJB3aTtG0YjJdFgjGOPkkMKTofeiMk5SJcjGaewZbAkh0h5HEROp3_PeZc3",
        widthPx: 2048,
        heightPx: 1365,
        authorAttributions: [
          {
            displayName: "The Taco Project",
            uri: "//maps.google.com/maps/contrib/109397006751132688605",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXZ_NB9YpFdRPl1qbGsShixQcfG6KcjDm7dlUo1kv-tqLcijo4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_Cv8kPNheBln-J49wTPENUKiL1RZ2NBUHCU0DgnDRp5goNpRhDfQQNfA7ejEYMMYr6JqtdOacJh6MrfZCdhs4C-_k7B6o47BFRy5D6nqdioN7ACP7I1jvPSK77h17sUfEKXJButoSuLkiGpk-1lklY626q5mx4eXwqUE",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Eva Perez",
            uri: "//maps.google.com/maps/contrib/112367570864029807305",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW2mEbzLS5U_zWhFfjQtiKcxGx89P07qecm4fNgkNPJZit_0ibqyA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_CtaSDYtpNO93ZCB1jGoqiBVOi-IP_zG92vhgK0Ym29nnYKXVIuXBVWWtkIS1a0D8Yat6BzVDANfG99zX5RQeDav2Jlhptn2CdR-A9kSSTM8QMuwSuQL8JXRLQuZpjnJUZEpjJW8fAEvl9y1g5DABJCLv9yAvWWyqGeA",
        widthPx: 3000,
        heightPx: 4498,
        authorAttributions: [
          {
            displayName: "The Taco Project",
            uri: "//maps.google.com/maps/contrib/109397006751132688605",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXZ_NB9YpFdRPl1qbGsShixQcfG6KcjDm7dlUo1kv-tqLcijo4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_CsRNSkhlzr6DxC13pW57YDM8kVILH0GhOp8Yn-pxz1p-mUUOEEpnRTQ6kc3lQYst9OD1s3Tin0IPXZXgshHV0AqG6sv2GC9D8WTeH5MVR2CXbttXbfJsbES9vpVOY-DruU1JuHaW9RHzv3uERX5mcXxCtfRPOUbwjtl",
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
        name: "places/ChIJfxSm1EyTwokRYGIgYm3dqls/photos/AelY_CsofhE5uUyRONGIGG0h01BVAZlr5Zku8ZJrbuGZfo9A27zu1TWkx57wiytnzNZhCHmFq3zMrmOx8_1i-kExdZu2tr88YsemRear7yULmfgeOIAAsqoSsNAEkDBb1XpQIPqHrqbD6C2kELNVebnfW6GjHepIHEkZJAja",
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
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU",
    id: "ChIJK0BTQK6SwokRN5bYvABnbvU",
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
    formattedAddress: "29 Park Pl, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "29",
        shortText: "29",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Park Place",
        shortText: "Park Pl",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.939473,
      longitude: -73.8344161,
    },
    rating: 4,
    websiteUri: "https://www.starbucks.com/store-locator/store/12029/",
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
            hour: 21,
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
            hour: 21,
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
            hour: 21,
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
            hour: 21,
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
            hour: 21,
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
            hour: 21,
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
            hour: 21,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:30 AM – 9:00 PM",
        "Tuesday: 5:30 AM – 9:00 PM",
        "Wednesday: 5:30 AM – 9:00 PM",
        "Thursday: 5:30 AM – 9:00 PM",
        "Friday: 5:30 AM – 9:00 PM",
        "Saturday: 6:00 AM – 9:00 PM",
        "Sunday: 6:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 329,
    displayName: {
      text: "Starbucks",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 6,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 5,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 5,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 5,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 5,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 5,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 6,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 5:30 AM – 9:00 PM",
        "Tuesday: 5:30 AM – 9:00 PM",
        "Wednesday: 5:30 AM – 9:00 PM",
        "Thursday: 5:30 AM – 9:00 PM",
        "Friday: 5:30 AM – 9:00 PM",
        "Saturday: 6:00 AM – 9:00 PM",
        "Sunday: 6:00 AM – 9:00 PM",
      ],
    },
    primaryType: "coffee_shop",
    shortFormattedAddress: "29 Park Pl, Bronxville",
    photos: [
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_CtTM3FmxjffXxEjcKwpeSbAzs7qaMCn3Ilw0dyKwASEOZ05UItbcCuA5h3w2CnyqEaU73j0QQNg2Fxz-mAGaCmhQ_taHbl7Q9tQH7MN-Dxsy7UjFZwU06nIE4IVLJBxAlRxzUtlQzla0PcPpFA9JDEB2SeNoxL74aVj",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Reya OnTheRoad",
            uri: "//maps.google.com/maps/contrib/108638165399857172930",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUK2nFXaZICnPGsYUCq7FEObhR3HVHM6ABqwPqvBSOo_hffi7c8=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_CsYgWMQMxsuWXBcUofjt6RWQKkeG0WXDw-NBmCg2xPfqURXVtkMM8o4G9B1rNX63BjGvFeXw4s7mSmyWLFXHqVWA_mQrqQBk3o1VxD-W7uMPqkhPlSW472tbmEmFT-IItoaX9jxtjnHyxEBT0N1AU8YZN2fqZcWjiE",
        widthPx: 1600,
        heightPx: 900,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/116309899670369583156",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV-z-q_947yluoLBu1dv0f4I09OPKHIh7aST_ACe_V9hfAVPQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_Cs2eEmEP_e6ri-igC6cTTTJFkkHjrSxM6qUNUhFL19xTCLdbBsLgxum489LL78TUAqbQj-dp-RsjXtP32pK6LKXu-8fpQhAwC6ykgX5be6PN99dr8bx6B-MQpEqXaM6ydMmQOOUYjiNpHQVhAJ3dtbRwiti14fCHCkF",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Greg DeCristofaro",
            uri: "//maps.google.com/maps/contrib/111241687392768018033",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVuuRzqGwfBj6DIcfTpUjGbcSndZYp9VrS4H335pT62e7FjerOUgA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_Cu3Hu_Rg2PSco4mp2kL3egrO94mAZz7ELdGtAE659HBUFsph93xFSNocKa_NmebucC_grNRSkAfg_JyVHuPWecrKO23dpRg1yc-bbN1HYnlbbG8CzK0PL-9JLs8F3M7pFJKIEpI0d6UA94b_T3-EIz2CLjFep_8WYs",
        widthPx: 502,
        heightPx: 546,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/116309899670369583156",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV-z-q_947yluoLBu1dv0f4I09OPKHIh7aST_ACe_V9hfAVPQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_CvigSRXTxg9gbfeoXANuGMa5dZFN0Heqbhlq3YCYszKXnJNjruTGeTYrJ-BQkuESHmkl1BDU6p1w_7zHAUOpabS46oPMLRjU2inDLbdXEZ12xSfS7taqbWk-tepfA3FLPJlvbjma5rrJp5wBHxbVpXfgaMvcJTzE1A",
        widthPx: 732,
        heightPx: 664,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/116309899670369583156",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV-z-q_947yluoLBu1dv0f4I09OPKHIh7aST_ACe_V9hfAVPQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_Csb9YLSxdxQYKCC0j6LUfBYrj9J3fo8t-RsHIFbHyY0wCMDcIABB5uMJdshI5c2tpBg-gl5-_6vwI-vg60STAo9y2tyFt6iGu2UnuP6QPfXpxq9AAVQLuORB96bbVmtyMtc2PXTX1P1X3Zt1kkMfx6khavvfWd9A7Jy",
        widthPx: 1932,
        heightPx: 2576,
        authorAttributions: [
          {
            displayName: "soxxpuppet",
            uri: "//maps.google.com/maps/contrib/113279348064979698475",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXNBS72pjlA_sFxvr2t1B5nFUqkuqJaxKHKZ9K2hXrMOb_fiDpL=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_CvfqB4--SVUNyLzZ70WySL9EdEu6FIwoSDAncG4MQzJLrokk_jnntWOWX1gJIpz_9ErpCwaf7fDVBRK9Now61wdVDPjIUQfh3NZsDQK08JNuvPa0SOcqiEqAFP5Mle5tKngpTQlTlG0Vyi-x5IPImE4iVmSEcwn9HU",
        widthPx: 640,
        heightPx: 640,
        authorAttributions: [
          {
            displayName: "Starbucks",
            uri: "//maps.google.com/maps/contrib/116309899670369583156",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV-z-q_947yluoLBu1dv0f4I09OPKHIh7aST_ACe_V9hfAVPQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_Cs4g5mnfcWSI3La3Raqj_LoxYBpsNTQfhJim-ptui0s1RfOQEelg_KUbFHskQrxMkS9KivRlNfsPUQw06tX2D3jP5rZn3r8XS9TGm8Xr6qV9rdm39hv1T2dxJU-Y7vkma1qNDn2vEswzf48ZprNwZc8ALiyqqjmGP9p",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Rodrigo Olvera",
            uri: "//maps.google.com/maps/contrib/107112452808436073885",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjV7YnBjzz6nca0ZafVBTQecuegxRpt2vnAi0TThYkHylW0ONM5O=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_CvyUIGfmA7YrYAIUeDdBJBRsvBmTCEM2qOcyQ0sxYBMRchvRCferv5ZEvbyjgueOS4p5eJrk3erJafO5LpvflDBEuxY-nyh4NoQvvPp8JXfOpp2__PuiBrBL3_rbuAIKrSU1z8aJh2ARi_GX4owo0rM0bx_nEwv6h9A",
        widthPx: 4160,
        heightPx: 2340,
        authorAttributions: [
          {
            displayName: "Ger Regan",
            uri: "//maps.google.com/maps/contrib/117901930310042349773",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjX43iRjWIPD59lyZKLlALWI9JohsDqGEGjFldgAHTlobiJovlX_bw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJK0BTQK6SwokRN5bYvABnbvU/photos/AelY_Cuw_kp2Fdzt9aR1FG4alXS3r-PhZTAhPo4TI9rtZ8pbbTEVgr0PVu0ut_ArP7VELFDEbOUI1tlzk4MGuWjHtICr8z0rjrCAskShreYmxiN25pEmA9bErSomp4l4V64_jB5AF80M79H1PZ8f0kw20t_EVBRhGySXJNOA",
        widthPx: 1080,
        heightPx: 1920,
        authorAttributions: [
          {
            displayName: "Robert Alexander Boyle",
            uri: "//maps.google.com/maps/contrib/110748589967585680902",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUJ0FkTXmE5yfsHFquLesb1S9MwMj_umU_PJf9ntRWWYpP1ADHL=s100-p-k-no-mo",
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
    name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY",
    id: "ChIJxxDLVlGNwokRPgtjAbxyevY",
    types: [
      "american_restaurant",
      "bar",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "571 Gramatan Ave, Mt Vernon, NY 10552, USA",
    addressComponents: [
      {
        longText: "571",
        shortText: "571",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Gramatan Avenue",
        shortText: "Gramatan Ave",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Fleetwood",
        shortText: "Fleetwood",
        types: ["neighborhood", "political"],
        languageCode: "en",
      },
      {
        longText: "Mount Vernon",
        shortText: "Mt Vernon",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10552",
        shortText: "10552",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9259525,
      longitude: -73.835539799999992,
    },
    rating: 4.3,
    websiteUri: "https://maggiespillanes.com/",
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
            hour: 2,
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
            day: 2,
            hour: 2,
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
            day: 3,
            hour: 2,
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
            day: 4,
            hour: 2,
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
            day: 5,
            hour: 2,
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
            day: 6,
            hour: 4,
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
            day: 0,
            hour: 4,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 2:00 AM",
        "Tuesday: 11:00 AM – 2:00 AM",
        "Wednesday: 11:00 AM – 2:00 AM",
        "Thursday: 11:00 AM – 2:00 AM",
        "Friday: 11:00 AM – 4:00 AM",
        "Saturday: 11:00 AM – 4:00 AM",
        "Sunday: 11:00 AM – 2:00 AM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 1320,
    displayName: {
      text: "Maggie Spillane's Ale House and Rooftop",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 1,
            hour: 2,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 23,
            minute: 59,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 0,
            minute: 0,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 2,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 3,
            hour: 2,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 4,
            hour: 2,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 5,
            hour: 2,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 6,
            hour: 4,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 0,
            hour: 4,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 2:00 AM",
        "Tuesday: 11:00 AM – 2:00 AM",
        "Wednesday: 11:00 AM – 2:00 AM",
        "Thursday: 11:00 AM – 2:00 AM",
        "Friday: 11:00 AM – 4:00 AM",
        "Saturday: 11:00 AM – 4:00 AM",
        "Sunday: 11:00 AM – 2:00 AM",
      ],
    },
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 5:00 – 10:00 PM",
          "Tuesday: 5:00 – 10:00 PM",
          "Wednesday: 5:00 – 10:00 PM",
          "Thursday: 5:00 – 10:00 PM",
          "Friday: 5:00 – 10:00 PM",
          "Saturday: 5:00 – 10:00 PM",
          "Sunday: 5:00 – 10:00 PM",
        ],
        secondaryHoursType: "DELIVERY",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 14,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 14,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 11:00 AM – 2:00 PM",
          "Sunday: 11:00 AM – 2:00 PM",
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
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 23,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 23,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 23,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 23,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 23,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 6,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 0,
              hour: 0,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 11:00 PM",
          "Tuesday: 12:00 – 11:00 PM",
          "Wednesday: 12:00 – 11:00 PM",
          "Thursday: 12:00 – 11:00 PM",
          "Friday: 12:00 PM – 12:00 AM",
          "Saturday: 11:00 AM – 12:00 AM",
          "Sunday: 11:00 AM – 11:00 PM",
        ],
        secondaryHoursType: "KITCHEN",
      },
    ],
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 17,
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
              hour: 17,
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
              day: 4,
              hour: 22,
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
              hour: 22,
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
              hour: 22,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 5:00 – 10:00 PM",
          "Tuesday: 5:00 – 10:00 PM",
          "Wednesday: 5:00 – 10:00 PM",
          "Thursday: 5:00 – 10:00 PM",
          "Friday: 5:00 – 10:00 PM",
          "Saturday: 5:00 – 10:00 PM",
          "Sunday: 5:00 – 10:00 PM",
        ],
        secondaryHoursType: "DELIVERY",
      },
      {
        openNow: false,
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
              hour: 14,
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
          "Saturday: 11:00 AM – 2:00 PM",
          "Sunday: 11:00 AM – 2:00 PM",
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
              minute: 0,
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
              hour: 12,
              minute: 0,
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
              hour: 12,
              minute: 0,
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
              hour: 12,
              minute: 0,
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
              hour: 12,
              minute: 0,
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
              hour: 12,
              minute: 0,
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
              hour: 11,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 0,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 11:00 PM",
          "Tuesday: 12:00 – 11:00 PM",
          "Wednesday: 12:00 – 11:00 PM",
          "Thursday: 12:00 – 11:00 PM",
          "Friday: 12:00 PM – 12:00 AM",
          "Saturday: 11:00 AM – 12:00 AM",
          "Sunday: 11:00 AM – 11:00 PM",
        ],
        secondaryHoursType: "KITCHEN",
      },
    ],
    primaryType: "american_restaurant",
    shortFormattedAddress: "571 Gramatan Ave, Mt Vernon",
    photos: [
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CvWW1inVDgl6WZ8ulsU5RlD1NJKj9CVdi-CFezDk6Oibk6dsGL8IDwRmNNvRCe9S-j6jlgpfqtQenaqsmN0N1juVgkjLD0kMrKz-kmqJq0rhzHC65sW-BIxz72CikdE5-sW3twRyo8WYRGWsmPTfoG4QRT3HpegpbW2",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Maggie Spillane's Ale House and Rooftop",
            uri: "//maps.google.com/maps/contrib/106435698067998768834",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVR4U247et2Ok8VqVffhh-TUHF_Ku6hIaL4wBpKmK-cu6eXPg4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CtiVlb7SSMgSz-zKDktFYJ93IWsqH0SmMbKQGHSECRgceCeKe6JUT95igNehX6a-4H-EgdbRhL8AOkApX26deqDlHn1cu9xSDSBf5HpDs7PsuJvsbcdWnvXBEqx8WQsthH5aI2RF2bK0olvnSuIa8_rlCw96esqc6UH",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Maggie Spillane's Ale House and Rooftop",
            uri: "//maps.google.com/maps/contrib/106435698067998768834",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVR4U247et2Ok8VqVffhh-TUHF_Ku6hIaL4wBpKmK-cu6eXPg4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CufnwjhNLo0xc1YGlXQm2WK6VIK-rcNryVUyoh1eYEF8kKT2TXz4-DH1OLxyHNhgT5f3YGe5lx8kE-SKaCfSKjPk5gwRRNiORvMrBOyxxPnpQJFd7lWhUxhYl4t336raogAdtjVQhxydGGPAxwLKe4eFL_itbG5-bZA",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "Kel Ar",
            uri: "//maps.google.com/maps/contrib/113775708780393704509",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLtLDFImCCnym4sTJIm9v-oZBpMTwrH53Ef-T3h1lcl0wGS7Q=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CuCzzeUsl1zuemk-ZRot7ADAOgqhluiDDno9NkHUHlBFtcdIgpd_SsK9jwt_LLaw-Tq4zTUtaKACWKd7bZZfO82mKpp3L8Fy3HjfjYDXOkTEQ9C-q90kh-7t7OvMdKRn1ZANTMbLd-HRINiubnRC2rfAUwznKn2n6Pk",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Lorena W",
            uri: "//maps.google.com/maps/contrib/117856844632677286155",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocJ8JJWObbH4V2Ab44eGg3B6zNOIEicVptIEn6zwzMmpGEM4Lg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_Csh9Nc1BgOj8JjtIrpI-FKyHYAq359QZPzPphpDqCauD3tE4bJjlyTnVG_MbGY6nsk--L9ANQQ54JO0LWYZVrXFC7q6SdlkmWsApJRuP3TI5-QNQ8a2zYUxl8XOmR-wqkG-i4opc_W4P3ws277dHuujHL8gBhrPZdCk",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "David K",
            uri: "//maps.google.com/maps/contrib/114977162681690667327",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXtboaUyo_Jq45KsaeZH1C_pjpB0ZOn9G3ORZKc5aPO0ovus4T4Hw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_Ctei16qsaymW8hE5nztVcPPHeB3dF-w1ShuJni8D3TE6NLaD6IYB4YOtXZMKcMsvTjrZiemqfxdQjV5ZFCpubXX1iqmxRvGfZTW4LbfPWRgoJQXyNtJnUS3E0sw65oDcL7XLsTv2squ22aTL3OJLcHTWIw06V-Xv0it",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Maggie Spillane's Ale House and Rooftop",
            uri: "//maps.google.com/maps/contrib/106435698067998768834",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVR4U247et2Ok8VqVffhh-TUHF_Ku6hIaL4wBpKmK-cu6eXPg4=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CsqbAgWq8Jf-2yLzUiVMCbkHQFyHXib-IU1s9FUEsxjHPp2-y6LK3jrrirp0MSKuGYha-z_PWeF7JlpCUM-imXLt2O64KgbW_pi__dzCeangftqKrbaszS7h6VW1eeVG2gQT8HY_klLbB45mbh1Wg5KHD1y_3804--p",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Roodlyne Woods",
            uri: "//maps.google.com/maps/contrib/111524359342142530503",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUx40UpARMV8tiM_wWc2r_Gxe-ZAxs3Fv7axaEkGFHPt2ON74Y=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CsVYKqq9MxYPvm38bmKyu4971XUgOqdVjmUgmarHLuSAnW3_e0LAqVJb2ilkC2HLnYXMZecWCLf2-UNuQ4NrQ9OVUt55Qjnu3Bm2rgoI6VOttPzA3Zlqd7YBG28D7Qh0zyfKAnvJlZJbNG-bp4KV-8yt8NRU8aojTHO",
        widthPx: 1600,
        heightPx: 739,
        authorAttributions: [
          {
            displayName: "Brenda Btrayed Oliver",
            uri: "//maps.google.com/maps/contrib/102745241926829807994",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVVoEL18msE23QBGV_rmuvJeLLQ5e5Wt3ukkxj3t-bq3susxe8=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CtUINafbO6Rwi2s3TKZtBhpMDtWoUBXfHdVtLloLsfuuJAF-nG-H-IzEfaiZJNQ49N-cQxlaPM25TIIUkc6EyXT-7EhSOqGhtXnFDwUTJuYoP6WnM7aeICJeV7lqMnr0_tCvKOjFEgBB37LipYZWJ01XScMy2nFZBB0",
        widthPx: 4000,
        heightPx: 2252,
        authorAttributions: [
          {
            displayName: "Brenda Btrayed Oliver",
            uri: "//maps.google.com/maps/contrib/102745241926829807994",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVVoEL18msE23QBGV_rmuvJeLLQ5e5Wt3ukkxj3t-bq3susxe8=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJxxDLVlGNwokRPgtjAbxyevY/photos/AelY_CubQShg9ia80vW1VUnkmY75xnw4eqF2FlZWIVy-ctRy3ZjPhvvo-wB0yOJNgVJP8T7GVcmT6Gd9hCA5i44dQxU67k81PAqhv0A8CoBj_FCUBZJGi9MGZgCLIBzVaxbo_jayc24fUD0WBjt4hTlyhpD1WnuFDJ9m1jzM",
        widthPx: 4800,
        heightPx: 3090,
        authorAttributions: [
          {
            displayName: "Xiomara Liz Gines Rodriguez",
            uri: "//maps.google.com/maps/contrib/114489898649489933574",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVdSXxjRZjDQAFyyz2-MnKvDxWy6AcObXd_ojSxIJkOSCnD3s8=s100-p-k-no-mo",
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
    name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio",
    id: "ChIJJZ99iq2SwokRkbZKRzJeoio",
    types: [
      "italian_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "10 Palmer Ave, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "10",
        shortText: "10",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Palmer Avenue",
        shortText: "Palmer Ave",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9412211,
      longitude: -73.8379159,
    },
    rating: 4.6,
    websiteUri: "http://rosiesbronxville.com/",
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
            hour: 20,
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
        "Monday: 12:00 – 8:30 PM",
        "Tuesday: 12:00 – 8:30 PM",
        "Wednesday: 12:00 – 8:30 PM",
        "Thursday: 12:00 – 8:30 PM",
        "Friday: 12:00 – 9:30 PM",
        "Saturday: 12:00 – 9:30 PM",
        "Sunday: 12:00 – 8:30 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 685,
    displayName: {
      text: "Rosie's Bistro Italiano",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 20,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 20,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 20,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 20,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 20,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 – 8:30 PM",
        "Tuesday: 12:00 – 8:30 PM",
        "Wednesday: 12:00 – 8:30 PM",
        "Thursday: 12:00 – 8:30 PM",
        "Friday: 12:00 – 9:30 PM",
        "Saturday: 12:00 – 9:30 PM",
        "Sunday: 12:00 – 8:30 PM",
      ],
    },
    primaryType: "italian_restaurant",
    shortFormattedAddress: "10 Palmer Ave, Bronxville",
    photos: [
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_CtLkRvYq8TLROywLg9eVMYZzUf_6b1UezH-qdtHY9UzQ8cq3DGnzwzvEwWaUHHUnNgvnmOSgvhslELvk5Pi3QbQc0INpqiaNEDDa39oRAdMoJtMmQOmScX6x033Q3sGbGmVX6bIteRdz3KoEDS9-AQl7-FgXkISQM4S",
        widthPx: 4800,
        heightPx: 3204,
        authorAttributions: [
          {
            displayName: "Zvi Shapira",
            uri: "//maps.google.com/maps/contrib/102377657754236385313",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXlfEDLP5gtGxn6y7MrU6FSkOLrIeAP3hvkakh8VM-Yrwg9A1O-=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_CtwS4J2h3Z1J4o91qlhyOVdhzVcBfB6v6zvLe0SapewgPI0wM2qq15AkSKw0rjwEIXq6Z2dPyXQ7HNteGqFJzcvaBHKDNTsJYcFUMP3dJtDxlNAfk3YHbvn8BwMvV8VYPbKVgA6uZyRV2b0pG_QlAH-WEYyB5KGN_Dh",
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
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_Cuy5KgIs2xy1ZaTZ8-0vmhq-RxYrfybNUrU9cXOV7OvGN9ErhmAtCL4p01Kn6tyMhRHijK51TxL58pTYDKHdE8O7ujPAnApR9NPqy9VSAauvZ7bFtFyGdFj_lmC2yLJ5KBWdaRu6TILzXTV2xux31ddddh7iR-OywU2",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "J.",
            uri: "//maps.google.com/maps/contrib/109143634381712227841",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXcw_1JZSZIIK5ufGlB7zPf_ShSr1vFwICrYi-3tVjbV9LSf1pf=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_CuL6Gt3OFtI6hFEkyXkd5hic7O6dU7y9G3L8qQFQbnx3CyxB6rfMxyszdd5a4iotj8BBgUTz-rD5it9-i5KE2sDFLaWsUb1w2yAEU4fUx0VBUGe3oWsylNccS_P_PGfk4vbTUpMyPogwmJJp8jBRiearVhZ_ujAs77-",
        widthPx: 3072,
        heightPx: 4080,
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
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_CtkalOATNcIU9bgo-wUz4jooZGztZkctFaz2VyHSrnPoaLB4SyugNVy2WfSO4pFckZdT1TWfUwdBJz7GCzOR7GEf05AQUyDPogJTlrVWU9-ro9NiPtBwDBSViWb76knLYrmQaUu5294IELHEJ8Vtpvc0cbQtaQV1DL4",
        widthPx: 1848,
        heightPx: 3208,
        authorAttributions: [
          {
            displayName: "Hy Mayer",
            uri: "//maps.google.com/maps/contrib/108278630450163148791",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUta89KLvBfkXdLZB1Sc4Gu9Kiiv-yWKPqoDA_P3b6Mbm40VsgAwQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_CsuS_3xweW90QgEdSVbQw7CVNXVgmaNPjNCbI-WI7uEtXCYKgWvlKcVHDz-VicjO-FOkM_en9PgzRMA_VIMeNQn0ycvk25VYqsiOOerNSfiD3MjAxWVsXC83ZKm6SM57Q26OPSglevQ4fI-cvTEHtXb5aMbWcAYAj1d",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Donny M",
            uri: "//maps.google.com/maps/contrib/111483564916078492645",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXRAZVwfQMCE0w_Rq913CCIv-D-G6WZno488yZf8SYAkRvsl_PN9A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_CsKEqBNsSOo82BuW7wqpD2MzDMJ5ghqVn2RcwM4l0p_Lqk24DCDg7QSvvayIrO9HRmG5LHy7yxIf554FJeQYpiGlGN_eVRnDIONOGUb5NfeTn_ePW-AlHlJbEifm85MLkic4R8WMKFFusiABpwc03buGPf10c-JMob1",
        widthPx: 1802,
        heightPx: 2429,
        authorAttributions: [
          {
            displayName: "Hy Mayer",
            uri: "//maps.google.com/maps/contrib/108278630450163148791",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUta89KLvBfkXdLZB1Sc4Gu9Kiiv-yWKPqoDA_P3b6Mbm40VsgAwQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_CtXSkJquYIHcF9fLcQdgcfkVPnZkDuVCjNQj--u5Vhd5q1-wKhXn6xl_VpRW8iITvosOczvbTDrnuMLuodX1aZUs8RPKwk7p-qi0R29URjoha9-OPmB3e7naeZdukJMFPBr37-Z3QlFklw67TIAEg9d5vQkIG_PQnPr",
        widthPx: 2268,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Amanda Petrescu",
            uri: "//maps.google.com/maps/contrib/103240297358981213320",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUNezYtXCQP1eLl6P33zLOAtapjjAvJvWg_tXYP6rWoZJy7mAOi=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_Cs7zwPYI0Ad9AZ1-qgNNcue8fi0D_NvmfIfLx4y4TSOgGoiDfS2IBeceAHN-VpYDHdzVnc3Hw5jtLeu-aDewHJe8n4Y0GBT-LQEYMXEcFGJwA6OqkNhFZ7sxbauWDYceqFer9m4-ZMHyL9p6Gfi0GJhF7iWm5RNhyw0",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "J.",
            uri: "//maps.google.com/maps/contrib/109143634381712227841",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXcw_1JZSZIIK5ufGlB7zPf_ShSr1vFwICrYi-3tVjbV9LSf1pf=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJJZ99iq2SwokRkbZKRzJeoio/photos/AelY_Cvfm8WLRA2SS4r8xn3vBoP_dxeFn1TFwh2uTNzG5Ph2iUm0mecX3P5kTWPh_BuCk7re568fabgD5c-AZrBPiWx7zIpJZgVrUT4qStJ-YKWmwz0vSbWiS7hYGLYn2AhtSr10P0a24v5s1yDUU45QRNpxPkZxN3E6Y43s",
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
    ],
    accessibilityOptions: {
      wheelchairAccessibleEntrance: false,
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
    addressComponents: [
      {
        longText: "5-7",
        shortText: "5-7",
        types: ["premise"],
        languageCode: "en",
      },
      {
        longText: "John R Albanese Place",
        shortText: "John R Albanese Pl",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10709",
        shortText: "10709",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
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
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
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
    primaryType: "italian_restaurant",
    shortFormattedAddress: "5-7, John R Albanese Pl, Eastchester",
    photos: [
      {
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CtD4SJrfmgT2j4ePJEAIhk6Dzxcin31KlKg9-LMMf8YOInJJ7xlHzPrvYxYL14Bf1iz-3SLXYjoMPqT9CPxsBcnatWb5-PmreBwMaImurI7dPveoAH25phcJQhHHd88ClffgBNu0gX1ZHXqgdVhtVukOH8w2j7givoK",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CtzJKWDOxsPkssuPIAWhJ_lzIx5DyWUj_8OQifN8LCF2bgz-V7yJTuA2exPMiswC2_EIYaDPrx4KUyPT8bAzVAszxyK5SH5IGf6hEGMuDGFscgoA-ld5nDhvfoqjALKlIpM_7zdfzJ685MfjB-fDLmhtRNzU70cUaB1",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CuZOmto-NHc0a-ZunVQke3PDvrgkjwj1gIsvQjLgP6o_8u-t7kufQuGGKqUGENJ1H9cDj4XstQw8vhyPe-IP-kO6gydnVcyhx9NpAz_0lVkJjxEWuB6rQXMcX8XY_0HEQAUKptulo0s4GqG5Q6MDDjHoqgkXkTa6SwS",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CuB8AHaII7IYTV3V_MTDtvA32f0gtkFuW3wpma1nvXf8DhP-1EVhiVqHRRqy2xC7YIXCDCSio-RZ9DxxseOlwWGCoY1bli7wQu8RR_3-GyFbLUvE51MD-boVdgo9nSOW1zxzzQaRHDX1OBYAHTr2pNwKjfif_2W0BuO",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_Cu05cYmrilUvTZoksk36RXBmJB-PQ-jAnK_gjOjmO-qfl-QO8gO1HfEdZvyG10i0atmTimU2IKlLu4yEQruYBhgFVY_cR_O5CJhpStRTR91DriKsYIso9nlIhdjUv3sQLTstPWvQ0LRaE_B5EmaNZNorHdK2bybWSOJ",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CtmJ85QGRH-JzXzr-Eh_9_JDcaoDinLvJqAIM8l2C5KJyqmSs9eaZbTRCwCL9hHCjTFCePnhFTl7FzW_zp_SSgdm3QPQoTiWRhPydynTewHos3B0mQy9wL4Wfk47NOURy7EhEssqOJbl-IPkCYG8omX9EBIAR62nHi5",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CsJgD4tzxlf_I0ivkmsiqMnePgYfMYGJXRtjI6zJ3UBZN7nrnnVXkuSuwnMJye0xxctNm4Ju40w2B8lD2VVxvXgg4qLKNZeaj_ehu5-VOeiZ6XWlZKE9IeW8bHM39x9ZwOZKR_JgR1ccMMeQWnvyiJTJKMUfqWbCmws",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CuuHlBW9k78VGaMhPIqP4Qk3zVHaWzze2ef-2HKHaGz3N8Mfyo7ub7knulhqxSnsxu6-uYBoaqmSKJk3mCkaiTclpbYN25sRuPi-7kk74h5E_tp8IqDEJNFDGukqNLxIRuCf0WyuT0hkP6OAQzzgJJG6Zk5rMwB17oA",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_CvGlzJwnqPcEs77DIkxxpu0Hv6Ff9cJa2l2WZvVnGjzyR3A0CFMUIuKdtczAr4pnpRY1vbOCJcjgzfPGxZt2umqIrsG3b53udyRmiSLEJElHHUAUbzPkAgRMc6LiLjyqcuE8lI6y9ql1bRIGIg-sDKypvSoGwulU92s",
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
        name: "places/ChIJ3dQdIsCSwokRs0eyh6JtnNU/photos/AelY_Cs8qPVXdKbytzlgLPFpGZ-LsSibppf4kF6CgSWdT06L3NnBXDv0vDhKCpZbxwFy4YfV_MkvY28H6osmJWJ-VYiA-MixusKiFlldZqG2PbDriJypCDv5zHvejSYX8Fk98nUdxGuME5oBP0zY_WpsE7cgAs_wxitCpx-9",
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
    name: "places/ChIJDYixUwKTwokRPRmLS0smLjY",
    id: "ChIJDYixUwKTwokRPRmLS0smLjY",
    types: ["bar", "restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "219 Main St, Eastchester, NY 10709, USA",
    addressComponents: [
      {
        longText: "219",
        shortText: "219",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Main Street",
        shortText: "Main St",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10709",
        shortText: "10709",
        types: ["postal_code"],
        languageCode: "en-US",
      },
      {
        longText: "2901",
        shortText: "2901",
        types: ["postal_code_suffix"],
        languageCode: "en-US",
      },
    ],
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
    userRatingCount: 341,
    displayName: {
      text: "Jack's",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 1,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 23,
            minute: 59,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 3,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 4,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 5,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 6,
            hour: 2,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 0,
            hour: 2,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
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
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
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
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_Cs0hOBs3We3gsDVdgOjCarj3sh5rBfI-euY8G1qshMq_Ief7mKkg3gzPRhdfzU7WjJQLMHG_FWALld77sVqboCsZELBQ9nJXpUYLBFjM-SWGa1jd3fM5iMBMcPJfJgCVNVs0_JBzou-Q2EjLOkS2vHLIdKdYniy0s65",
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
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_Ct7sNZe-0q7zEbvNaKtgBNu_jDigGPjWZBKzqxNHHVUyRg1nsKDtade-kmvbzg7n1-wVRMzfdxrzgi9HogCE7fotR7jgQ8pued_vudIAkZaRC3jwX8Jr5Hg-5IB5nv8NQOYxQ_jGoRbJtuDw237ntSx6lWkZTaHjBvg",
        widthPx: 3024,
        heightPx: 4032,
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
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_CsHj2GX-xLS6v2Ekaeg51poDtkW6vCbMWQBBJKW4LfeMt-wdeX5u36ntf8E3wdlQ7wJHpo_ip1Y1yaDHfBb4xYTWXoMBc7MWuwjsouJGkKPpWDFYX8EJJuk-pOmkb7X7JKVn0emerez4ibHoNoJ4CADVwx71vnVCS2z",
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
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_CsoRT3dlTE-_9CSqKgyNGEHRsbhnqvzLbcHeBYDy7TedaoU1Zqs0j8AV8DaMBnRydMsAl04mB_AxY7H4RjVCukyrf85ZFTWOPbrU6vCkfuc2-zdUpg7RnmJx4ytWkCOA2OccGdte7BtaYeR-APrmpD_s36fSGPmBZ7E",
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
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_CtafTHlNA8SMDFcPdIr4o5zksN8oz0WuoWwlzbY5I4KltQlN71fGUaUjEo3VhKP-fOOe7KdchENEYmdjIM24b3L21Z4K0PN8wXu6ujIzIxK7Ev27Bxh3frCgphn44X8Gnoj7XPwAL7-r1wE3xOaIrQpkBtFpQsRLkuq",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Judy Luo",
            uri: "//maps.google.com/maps/contrib/112527693418309422445",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjU5h-HS-IZZKdwFqOyp_jJThxM2j1rQUdDFHwsH6Md7QvNw1Vyj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_Cv1chbrDA_QhV9oOBvNHbw8he-aFXWbNwKQnnchX7_J4WvOWQzjyPyC9P9_N3wr0gxtImDw5B17Ii9vQalMPIuuDodISmZ2EJBgZkQtZEYmla29WNLRzCpwI3FKKTpihv3RvOnNYsfyMXNoik3hXxD6M_wpNjDpC2HE",
        widthPx: 4000,
        heightPx: 3000,
        authorAttributions: [
          {
            displayName: "J Iskander",
            uri: "//maps.google.com/maps/contrib/106919901381164780302",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocImj8zbMx5SkaouTbeVTwsfQ-hBOispR6af5DyVfdGyFy_sWOx-=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_CudVPYymT9Gvw80dxu9i_MkbKCqXJ2HbI85C7ARn2m8uA4nUvni_T8mGV2Z1Bbxrd3HCUkmTFRFCxaFPgdnWqK917cr_tPLMYYUUJd6ZG384S7z9CPNR2M2ViMnHjBn7ryNeBd_Aw45yJfLCKvF_WNVMGKXXa0_k3yY",
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
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_CuVq7d0AjuK_gDGiiuHD4sN7uly5fxkM89gKXaT1BfOwxGFapEhRYo3kbktXeCmp9eCrvijSmvCalXwNclsNEoMWnbEVE_mn7PGIF3uKmpSX2m2GaqJsqU2n_DCww5LnCdRO18yV0EvbWhRdBDwW-Ur2teq1JNJcG_F",
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
      {
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_CuuWAF34MrTwmxa-AkE3A26iugJOLGK027Xhxwwnsq8NGsJJ1E5wBXtODXwvovXtt_4HrsasA5i9i4F6nHetIbdzUsx0fipnhppQ7l3am_C2dCamSyVS8yLsGUv2i7h3U9NDRyU_kOPS5BsNAd49TjoNV0wMNh3VMFl",
        widthPx: 686,
        heightPx: 914,
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
        name: "places/ChIJDYixUwKTwokRPRmLS0smLjY/photos/AelY_CshxTjuMdJLl5zNDfUJBAFL9u5pB6zMLgPLVWxzl_vSxY5RLtq3Cv7MJ8ACakhqsLIoqnbboxwY1n1sN_22HVkIDUEGedvNR8krCa2n4du_tIYcFazze74tTdE4EiP1F93RQFci31F6kbJ-CNGhGP6GvEw5ubdDXb1r",
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
    ],
    accessibilityOptions: {
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
    addressComponents: [
      {
        longText: "16",
        shortText: "16",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Depot Square",
        shortText: "Depot Square",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Tuckahoe",
        shortText: "Tuckahoe",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10707",
        shortText: "10707",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
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
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 13,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 15,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 15,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 15,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 15,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 15,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
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
    primaryType: "italian_restaurant",
    shortFormattedAddress: "16 Depot Square, Tuckahoe",
    photos: [
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_CshBY802P-VDjC5Wy9npaYKlWd0O7GChtw7CnEfuWOJV7YCwMVj0e40K0kBdxql145Vyt7y6RO7dLTim_QncVR4-a1khg7GDHHadTwaimE3OyMc_qdR4HFZ2zTxiy8yHEVGD97mQiCFzaOi4y28qT6_Fj82wKgZUDdD",
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
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_Csnq4eOv6iWeCHY8YlBFqMjypIuETU5t2CAF8tLhhmpDfl-Va-dwkCF-zJtyoNVf8wmZPkPsacW2Pa1fTTjRUTAVtoZFAjqT723QapUj6Q9ho1Ye6EQA106NTeohVZDEkY0NXthv6nZbYrDoCrcANVo4_OLSntOWOCg",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Jim Blinn",
            uri: "//maps.google.com/maps/contrib/118430726648511021467",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKK7F4x7i8c7wjIAJRr6nlW2Ks-iKEydLYreRMhaBu7Ypq0-A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_CuWjHU2EdcLZRjAK1iutrHWS9ZJVd0qtFh2OLKHUfo3_RCP-nr2HH-ideR7j1gNRCkJ1fgAmR1hfMtwnJN4Mk_KJtRy8Q-pIXfmlX91s2AkIJAJmv99RXd1SyQzP4U7EbxbzwHii9kuvvzrZV99-x3eNTcyvfRuZlXX",
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
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_Ct4Q5TmdsXANq1-n1WPmBixI9x_SiYS3mdE22qNygoNrXK0WA0GkfBeiNKxy3Z7GGevuagw3xM6427caZ3XwnDhjmtJ-BtTdmgd5jFPdW70Oojb2ozGF9BdjZn7WrDRmD6i5g_O6CG70fVZ78zCxLx9MyenQlOeh_r_",
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
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_Ct9oVrRR4jAjxClI_AES2UuAYmwixb-PRlxjpHej-T-UZHfBEpazr7TxO-O9OjUuH_yaOhlsLZohqMR26mVnFomDvX59jmXHY22avicY92SCgRdZ13B9p51iNK0ATg8Cg_UXwQruY7xZr5HB2LRSGWgyPiYTWOIFLnR",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "Jim Blinn",
            uri: "//maps.google.com/maps/contrib/118430726648511021467",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKK7F4x7i8c7wjIAJRr6nlW2Ks-iKEydLYreRMhaBu7Ypq0-A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_CuP70IgLYw-pSvbXM8JHLksZtIKt8eoFqBEc_hfgdD6tsPuc8xGme2NhhltOGgzQZ5iHh-y7QhkgiKvjIE3y36rrX1D3sDYv4ileoIAEqz57QquOFjGggDHEbhl5Aai5w-Hbr2wAss3uMw7yIzCrDpPoUAkYEdpkKBb",
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
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_CvUeztfLuxOLIswaIWKsFCYTozfg6jNnq7S4FRKU01gtueNrF0aMiwUG53wEZVPWt-dmovBEFHcejUwCER-11bbj999J6fE-8krstCwTjFN2-fn9_Gq0BDQ0HtyRbRz1GRR3bOR21_W2D2sWy2jRN3N1OMSNu_GziJZ",
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
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_CuPzFch_f4Fj3x2_H8sZJToj2teBl88E1-tPOa9-TP-k4Vc7GjUZNaIHn5nWElfOOlBN-f8EOsgxO47acFBRJX0o7JBpr5ePunzXFq0y92yDaj63pvS13Yl7Rk0acjTAxMmIWeGBEiZkOtWE5KZBitlQ5ve9HhPXuVL",
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
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_CviL8rn80nw6GwGHZX25B33KbXPk86NXgYryGxGpu_xB0jh0g02yaEMBGGdfKlJ2vpsfzBSuUxceCAO7_SKv4ZAn2-A08LGhWGjBHFyuMlrVG0gftQ_I2PmC0oyNcXIUQ-SEccNVgaJiV9fTvwKbXvyrUx4DuLWpcjL",
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
        name: "places/ChIJu0cRRTKTwokRfNplZS8Lbjc/photos/AelY_CtSIGgwAyWYz6qX7hloampV4SHQISbntY6gwuxgIKzYjeFXcml4yni1QGQtrGfnKed9-KEMTEM0H6EfjLgAKuQngq_VkKdLhtneEUNGctMpxnCZYQQ-iSBHZTQ9ksgcp4UrykxYwDiMGfdks05IL5j0KsO-tOfsvzHN",
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
    addressComponents: [
      {
        longText: "2",
        shortText: "2",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Scarsdale Road",
        shortText: "Scarsdale Rd",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Crestwood",
        shortText: "Crestwood",
        types: ["neighborhood", "political"],
        languageCode: "en",
      },
      {
        longText: "Yonkers",
        shortText: "Yonkers",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10707",
        shortText: "10707",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
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
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 23,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 23,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
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
    primaryType: "restaurant",
    shortFormattedAddress: "2 Scarsdale Rd, Yonkers",
    photos: [
      {
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_CuWWERvDKxnSEbCkSLZNWcRuO_xd34Qphq-0IhNfW8vOYEETrR9YDigAh0HL4NE5-XELwid_rpOqmpjziVqstsF47kJTyE6YzXKLA9KU5flJD9dfS6bBBXsCyKXxCsetaJDheqkd6_7WrFuBrbkbg9CZNcxhUMSqCwf",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_CuNNlLiylbU7gQjr6wFOPXJJUO4gRya7wM-0Yp_ItY8JM0bTGTNE8vjNyubxLcG0DysELwkRXhZSTyXjMLiUQNTM84DdQsOe98G4xfLaxiADT4Gtuv3LzW1WSHNlLhNDr7rAX1ZjsZWvProOn5ZPfyRWakSAodlLOul",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_CtrFWNUWXumZ8R7ksttFAVho7DmA3OdnKd0fjgtWq1TmzL30m2tjcnbLkGjd6efkGQw7zEw2k-1C4ngW3NwXsmYkHhxeiezKXuxYRUr90NUgTDWq0xeOnq84Gd_zbgsri_kWUJ-wmA8NhvcQQSFPsYtGutJUxGbvHD6",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_Ctl1aet2GuCxM84BajSDY1IeJzqs5FVHVIEAKEbeFPNZqUQGLmq5D1hEVQ3TfGJ4mh61_LiZATyWo823vbwd3CKEvEBY1tLKJbvg0eD1WO2aNVKYVpqLcSNSNQLrXgRkIlv0vKrlfLpACzBKe6xGVW6GWdfYxXcB-mz",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_CtdQvx9VUtOZhmuPrNkdP5xH9mYl9nfJIJbZ4FYcwk9_S3EuJVgVLafavkuVT8HICD2amsSlTvhK6T4dpcvoRsGYwZp7zcLpnCxA6vYbZ1SRayjmf1pAyEs_JR8tQUHPIYdc2O51DrjWGOkSTnCRWSn2XryhN4kkXiX",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_CvaZBrCEyV33ljszGyZ2c1u7WGSttmZxImJnD59W1o3lLac5R03KZQLFhUVUzl0Uuk-mbkMeYZ8NPRFA96Ka90KJ7p2lN6LY_pYSgs2bvmcjTl62ozRV2YoqGyV2b7P9eLQ8gH5TJnmYi7MMZLC-KJd86r0MMCRazQe",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_CtM_nnyqcD8NcN2zhIMeW-w1T7Iv55tXoZdISYsnJKqbQSsJ9FP110CBwcTc--5J3thfM3bxi42uO-sx-tQcx4WzUMnHzsDXl5xgAd3XkqycQdBPjl412gyfLjEQt5NEOtk-qxo_RtPCXaB2U7XBVdzj4DGZ-73G95H",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_Cv7Gi2toYcgT_IxUmsDQHmXWFFwUEgpylR-aTg10X9OiGmfw_1jOWxSADnYCRDVyInckzRe2nTL9LqLzQszQ3hTbuYIdglrDHGe51cGH28i2fCB298boJFECprUTW263aVJ7RPJPzZOaoXmIL3rRyD4E6BFyd-0Ywy5",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_CuimKVeGDthgYxuDJMBvwD5ipnL3n0KVsRqyno0kyuvBqeBQRY8QveKdFX7tZx2rbMLH3AxgjvFcvrUELd-TzAW4oze8H_Dmu43MoQOA4rIaeg_VnIPpSyqNqFWCPiYLKHuS_GdW_mrilJPwpr54IU72cph6s769zAp",
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
        name: "places/ChIJBzAI6pKTwokRquXPFwGcFOA/photos/AelY_Cv6ipbzcYVyXgDA5E0m-VqGcBcDXRDEYACot9qaWxNiBA3FOYPfgQCMVNS2FwfQuluMc85Nhc8QKpnWH2lejqIUXL6eme0gHDV5OLmTmTD9nj30tek6P3VKy6W4OFh0UhDA-0eIRhjS8YGN1fSia-hHAsC7fIWcI1tU",
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
    ],
    accessibilityOptions: {
      wheelchairAccessibleParking: true,
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
  },
  {
    name: "places/ChIJG3TgE66SwokRX0scyzq-V6o",
    id: "ChIJG3TgE66SwokRX0scyzq-V6o",
    types: [
      "american_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "74 Pondfield Rd, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "74",
        shortText: "74",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Pondfield Road",
        shortText: "Pondfield Rd",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
      {
        longText: "3801",
        shortText: "3801",
        types: ["postal_code_suffix"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9403778,
      longitude: -73.833586099999991,
    },
    rating: 4.4,
    websiteUri: "http://www.underhillscrossing.com/",
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
            hour: 22,
            minute: 30,
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
            minute: 30,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:30 AM – 10:00 PM",
        "Tuesday: 11:30 AM – 10:00 PM",
        "Wednesday: 11:30 AM – 10:00 PM",
        "Thursday: 11:30 AM – 10:00 PM",
        "Friday: 11:30 AM – 10:30 PM",
        "Saturday: 11:00 AM – 10:30 PM",
        "Sunday: 11:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_EXPENSIVE",
    userRatingCount: 455,
    displayName: {
      text: "Underhills Crossing",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 22,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 22,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:30 AM – 10:00 PM",
        "Tuesday: 11:30 AM – 10:00 PM",
        "Wednesday: 11:30 AM – 10:00 PM",
        "Thursday: 11:30 AM – 10:00 PM",
        "Friday: 11:30 AM – 10:30 PM",
        "Saturday: 11:00 AM – 10:30 PM",
        "Sunday: 11:00 AM – 9:00 PM",
      ],
    },
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 19,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 20,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 20,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 20,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 20,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 20,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 16,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 20,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 4:00 – 8:00 PM",
          "Tuesday: 4:00 – 8:00 PM",
          "Wednesday: 4:00 – 8:00 PM",
          "Thursday: 4:00 – 8:00 PM",
          "Friday: 4:00 – 8:00 PM",
          "Saturday: 4:00 – 8:00 PM",
          "Sunday: 4:00 – 7:00 PM",
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
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 19,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 20,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 20,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 20,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 20,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 8:30 PM",
          "Tuesday: 12:00 – 8:30 PM",
          "Wednesday: 12:00 – 8:30 PM",
          "Thursday: 12:00 – 8:30 PM",
          "Friday: 12:00 – 9:00 PM",
          "Saturday: 12:00 – 9:00 PM",
          "Sunday: 12:00 – 7:30 PM",
        ],
        secondaryHoursType: "TAKEOUT",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 11:00 AM – 3:00 PM",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
      {
        openNow: false,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 11,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 11:30 AM – 3:00 PM",
          "Tuesday: 11:30 AM – 3:00 PM",
          "Wednesday: 11:30 AM – 3:00 PM",
          "Thursday: 11:30 AM – 3:00 PM",
          "Friday: 11:30 AM – 3:00 PM",
          "Saturday: 11:00 AM – 3:00 PM",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "LUNCH",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 20,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 21,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 15,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 3:00 – 9:00 PM",
          "Tuesday: 3:00 – 9:00 PM",
          "Wednesday: 3:00 – 9:00 PM",
          "Thursday: 3:00 – 9:30 PM",
          "Friday: 3:00 – 10:00 PM",
          "Saturday: 3:00 – 10:00 PM",
          "Sunday: 3:00 – 8:30 PM",
        ],
        secondaryHoursType: "DINNER",
      },
    ],
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 16,
              minute: 0,
            },
            close: {
              day: 0,
              hour: 19,
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
              hour: 20,
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
              hour: 20,
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
              hour: 20,
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
              hour: 20,
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
              hour: 20,
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
              hour: 20,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 4:00 – 8:00 PM",
          "Tuesday: 4:00 – 8:00 PM",
          "Wednesday: 4:00 – 8:00 PM",
          "Thursday: 4:00 – 8:00 PM",
          "Friday: 4:00 – 8:00 PM",
          "Saturday: 4:00 – 8:00 PM",
          "Sunday: 4:00 – 7:00 PM",
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
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 12:00 – 8:30 PM",
          "Tuesday: 12:00 – 8:30 PM",
          "Wednesday: 12:00 – 8:30 PM",
          "Thursday: 12:00 – 8:30 PM",
          "Friday: 12:00 – 9:00 PM",
          "Saturday: 12:00 – 9:00 PM",
          "Sunday: 12:00 – 7:30 PM",
        ],
        secondaryHoursType: "TAKEOUT",
      },
      {
        openNow: false,
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
        ],
        weekdayDescriptions: [
          "Monday: Closed",
          "Tuesday: Closed",
          "Wednesday: Closed",
          "Thursday: Closed",
          "Friday: Closed",
          "Saturday: 11:00 AM – 3:00 PM",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "BRUNCH",
      },
      {
        openNow: false,
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
              day: 1,
              hour: 11,
              minute: 30,
            },
            close: {
              day: 1,
              hour: 15,
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
              hour: 15,
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
              hour: 15,
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
              hour: 15,
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
              hour: 15,
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
        ],
        weekdayDescriptions: [
          "Monday: 11:30 AM – 3:00 PM",
          "Tuesday: 11:30 AM – 3:00 PM",
          "Wednesday: 11:30 AM – 3:00 PM",
          "Thursday: 11:30 AM – 3:00 PM",
          "Friday: 11:30 AM – 3:00 PM",
          "Saturday: 11:00 AM – 3:00 PM",
          "Sunday: 11:00 AM – 3:00 PM",
        ],
        secondaryHoursType: "LUNCH",
      },
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 15,
              minute: 0,
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
              hour: 15,
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
              hour: 15,
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
              hour: 15,
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
              hour: 22,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: 3:00 – 9:00 PM",
          "Tuesday: 3:00 – 9:00 PM",
          "Wednesday: 3:00 – 9:00 PM",
          "Thursday: 3:00 – 9:30 PM",
          "Friday: 3:00 – 10:00 PM",
          "Saturday: 3:00 – 10:00 PM",
          "Sunday: 3:00 – 8:30 PM",
        ],
        secondaryHoursType: "DINNER",
      },
    ],
    primaryType: "american_restaurant",
    shortFormattedAddress: "74 Pondfield Rd, Bronxville",
    photos: [
      {
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_CtEK3TQn6DqRVogkHRHpqmzSlBo1GqE8AWRMLMQCfItgqtc-1R8ATD-Vi-8leDVMbuWgXPvi5rzQN9faDaxqK48hMcokjeGjNJqaEmvoJ7zLCh--arQhzhgEaXNVfCVTFZ5sTB_FIq2Hxz0vk4OJk_7uSIfvFrh5IWq",
        widthPx: 850,
        heightPx: 314,
        authorAttributions: [
          {
            displayName: "Underhills Crossing",
            uri: "//maps.google.com/maps/contrib/103357425819361248278",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXPdeA5-piNbIadZ2W5M5FQAF5lIc6FQDaEKdTFQJ1PZd0716s=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_CsBGDQIlDt_nR0WDgf26g9GwQKRZAnsBqucWlvR-KtoX0E5ixC81cHWy8sjrP0MIs6vCafnDlifKiU_HixNTG33RlMvH1VdPjqIqGtCoKQPL0d4xVWjEcBPKlSZ_O5a9eIZ0eyfcAIBVGidqEhrDaK3nev-okDuxHUX",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Donna Jackson",
            uri: "//maps.google.com/maps/contrib/113431868701443650462",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXEYnfmoPg1jc97TmzQXORtXKOF9VbkS1LdAWP0IiNgoVPEH1rN=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_Cvl6yuONr1ZzxUzf5O53x2KzoWHU2Cru4hQAhsrORrzuvJepbvBBledKDIBB4QckY1P8suWHFap1SwsxeckjYKMUJ1qMf88QW97gbySvC6UcLox7mj8N1n5OqXTjsaWvNOAaPZG6nl8WRToh8p58yEGKg5Ir9sHg-hE",
        widthPx: 3072,
        heightPx: 4080,
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
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_CvKrA6oQIoXB-9bVI755pdMQ7ILzTv60z0LOlyMjbQ6YCVWHsuNDPjFQkgYPi1qnheC34Fn06viy2H-hJRbS_mBRcmGWqw8squH9WHkGe2196PdSNNzpgHSSCt72k0gTesU8TJrw-yfpH7MjK0nY2o94UBbCeBe-SDh",
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
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_Cs_EaKJU6ldK0KHb3TGvL1hFdAx0a6A_7LtkwpOVwpEPu1fjeZjkV80x8lNuSLlWxE0WqXi7N1cmj2dmrz5QIv1sn1w_z2AgNg2zDowzTSVx10CujopM6-Ii2WUxIZX95RoymyQy3PPGSS00-R_kWDGgGmcvL-7X6jK",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Carmine Battista",
            uri: "//maps.google.com/maps/contrib/105370633778241153025",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXdqmQxSkDZiKWzMj-lQoSJwv2cpR8yDliWEqYOUROPDtOv4pM=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_CsTYx7fyI-tmLVj1DwmUJa8XxfuyvvSKQOGS4yCoBi64uJ8QhXZn6sOnoLndc7d4nDmcddnhcCuwOPRhbSxzjMXVE_ryeiARZ0o6hhx5AP1qaiDtZf0M-CpCDmOXUrh3osztWyRqff7L6MQnFUHgdWHFnwJYGT66Cpk",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "V",
            uri: "//maps.google.com/maps/contrib/117620114219458563753",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocIa0OxihzOODheFM9i9cdvU9bst8eEowB_9dtK-2RcE7x1Obg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_CvDWJk1emzEigzaQRS05lzUSdBaG1svCrgjSNigIwLkVQ6VUqHvS-PWq_QJu7MkeU_z4oNBWz79DYlR8UAvz4ShS2Q24k7mUcripD50HpzKJ1Vooa0bjB0T5NL60RxW4Ot4u852t76G-o9cEEg5Sv_lkcoQLpAL8slT",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Carmine Battista",
            uri: "//maps.google.com/maps/contrib/105370633778241153025",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXdqmQxSkDZiKWzMj-lQoSJwv2cpR8yDliWEqYOUROPDtOv4pM=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_Cv-7T9PbHW0x2KW9UsrOW9CCWeu3DbNijFtwFmDk8xBPfZJPz2m2FzON-RPIC-P0xUfDKArF3PqKmNkUpwfC0g0OJzVMc-YdUKyN3IW3iUqfvUbjcaViWcMkxx-Mx0PprLHO7n7ufBHpRqNkMsASnjQd4NvQXaKV96U",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Carmine Battista",
            uri: "//maps.google.com/maps/contrib/105370633778241153025",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXdqmQxSkDZiKWzMj-lQoSJwv2cpR8yDliWEqYOUROPDtOv4pM=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_CshhM7RaoOS7prgjLHifsj-bLfI1jB4jLZ-eDJtBQBTY6gtyOdUUpIE1mU-QC1R59v7X_T4dkVO9nZenEp8NmrLnc9CipXxO4ePD5a2p77XVCsaB3Ds3-WhLCmsjhhZp1KQDpUnuGWem2uE8tbKBIruT7xewYrbHAE6",
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
        name: "places/ChIJG3TgE66SwokRX0scyzq-V6o/photos/AelY_Cvdaz3Tz0loQTEb1SjNuzWwUpwIIHd43DhNQoKKC2KfMIpDdt43us-AeA0MxYIMNRYs-dRhTydXXpMTqHiZFlRt-dEaz_PEXzB6giI9lWerOOq33Ol-Xua7Nb0plkThnavkdXzxyvEr716Q0pQDX_XFnNFH-LQEGYt7",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Larinzon Bruno",
            uri: "//maps.google.com/maps/contrib/114101730503913719322",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocL9NAssS95MOX52-Xm2I8CoE_H_p-au2WJkAE1Fu-8tfBzmkg=s100-p-k-no-mo",
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
    addressComponents: [
      {
        longText: "Train Station",
        shortText: "Train Station",
        types: ["point_of_interest", "establishment"],
        languageCode: "en",
      },
      {
        longText: "1",
        shortText: "1",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Depot Square",
        shortText: "Depot Square",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Tuckahoe",
        shortText: "Tuckahoe",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10707",
        shortText: "10707",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
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
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 6,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 19,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 5,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 20,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 5,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 20,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 5,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 20,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 5,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 20,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 5,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 20,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 6,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 20,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
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
    primaryType: "coffee_shop",
    shortFormattedAddress: "Train Station, 1 Depot Square, Tuckahoe",
    photos: [
      {
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CvcKoHGmlhspUehFIFbJiiTyErBuRBt-FABHIuVp7NJslU_dKEIJF5FcFrx94piD7jJmvO0BQ5CbQ7Bt7A8HnFdAk6oAlDAcYfjXKmtMnv-BXXfU3U-XCb-JPCsVM7eW5LTYL26l7em64jqicWE180zcdXki4UucsR8",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CstY4IuXDViv3PqeNWJIb0lFD1Q016XgybRH_3Ijl_upKoTXhGEqsfjNx6oYDDa4EEFLfbTZlk4fDKL8NHI3S5qneUB6x1q4VYY17v3cdL9zd3BvbBijeN_qsS9GuRGXY4b3soz-4pUa9fFeANU4IVBpPFrjwAm9NH4",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CuJoDTjeVCQ3ji0eEMuW3HudFOL6k0E5rpim7y65uJ9loVrFwCu9XOikAc_o_llBlcpTKATXLRNAiVl2blYEKGBYpyWkwolJi7eZRKxZM4tyY9Ca6_8_VcML_-W54fVPHYPTWwr6Iu_EXEGUGzJJdtdRb31Bnww_AC-",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_Cv47pgXwQSwvgtNVi7mJe0PnrqxQfwL0_xSggP-_GnMX8szjgZbuoKtC4wvtUeuTfNpCHglzvLZMVG3_q7BNAbq1yd396tIpTjfLO8yIORDp5wbvNB4D71uSxpq87Q9yLiQleHlWEALpqoUC2AMvAk7dpyuHwySkkUB",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CuluRBOmasooCW9hf_S5GXhZU0IE6tcAtxyXgPlMugac8AR6VKb-mbHJRpwISkPKM_xjFwkD5S3H9U5ArTqYw74oRwpqThcZC_TEF4JMIM77Dd6x2mJoXYgJ6MxOD00HpbvGsJduUEWDnFaURKKMPqgtU29jORsT8AY",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CuFgZif17tQz-gfSdWX6fTuwVS11BvnC6GA3tcKZzr0QarTNMzD3B493_RgSc7wkXdSSDl0LWNjFeeEW0buTuMPB8LsymhzUil7WUtrnm1M8JiMsT9IGsVrJlxe-pjRmsPIzttR5OKHRhQf3lErN_s4EkwTkeqD9-B-",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CsG8Y2yoxjaCHFJDcNlIhm8bYqVZYyHaUphfdhqHL9fvzNKG35PBrq_8OW6v20R1qaIsgg6dcQGB_jfwHnZOc-25HfZlm4FfbSwAQ6pC8YAOaIdHa5SLmh1EfFjU1yfmgcwKqkK98lC8qeM9BvnuFTT2l3zRzJmvA1P",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CuFygo9VWY2gM8qmlLOYpuLSD8Zlj6pcAZgjlcE4qFtNirdgyvtZn61yMLYtPtNIOJljVQ_6U5UePpU2utVOON7lPggdQRMSfI2Kmq_ygijv15ez1FrxmxvJFIeH5f1N7kfvjjaTtHfmP3uif2FnFTJbCa53gKFsBE",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_CvgPw19-6MbbDsJp62uvUxA7lXuazyuTH7v_0hZ5quXoDRRC4s4Ag9khdsjy81OlciwD37cDFxa1rnvuCAmMBBpmyfvjNCG9tFmwIcukuhptWb7iK-sAdvPYWjJFcWUvrtbCSvtPPWnjcBUP5lartquGTOiAPbOtbiX",
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
        name: "places/ChIJE4lzm8eSwokRiN93djbk0Ig/photos/AelY_Cu-F2Xt6pdWdmSQZGymWKm2iYoeJBF-yUYodQrcd4tuN6DG_9hq024WcrALm4bC6FWwPmuFj-p6loed3_qkz32lLldqgyEqqa6C6wOZHTHbx_B8hvybbKz6P347XcsvBnOnJ7saZeO_Dd-NIMfxTZDyNNqOb_cpJuAV",
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
    name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY",
    id: "ChIJl4RjnqeTwokRgvrQWgt9EmY",
    types: [
      "american_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "124 Pondfield Rd, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "124",
        shortText: "124",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Pondfield Road",
        shortText: "Pondfield Rd",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9387247,
      longitude: -73.8328142,
    },
    rating: 4.4,
    websiteUri: "http://theurbanhamlet.com/",
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
            hour: 21,
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
        "Monday: 11:30 AM – 9:30 PM",
        "Tuesday: 11:30 AM – 9:30 PM",
        "Wednesday: 11:30 AM – 9:30 PM",
        "Thursday: 11:30 AM – 9:30 PM",
        "Friday: 11:30 AM – 10:00 PM",
        "Saturday: 11:30 AM – 10:00 PM",
        "Sunday: 11:30 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 323,
    displayName: {
      text: "The Urban Hamlet",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:30 AM – 9:30 PM",
        "Tuesday: 11:30 AM – 9:30 PM",
        "Wednesday: 11:30 AM – 9:30 PM",
        "Thursday: 11:30 AM – 9:30 PM",
        "Friday: 11:30 AM – 10:00 PM",
        "Saturday: 11:30 AM – 10:00 PM",
        "Sunday: 11:30 AM – 9:00 PM",
      ],
    },
    primaryType: "american_restaurant",
    shortFormattedAddress: "124 Pondfield Rd, Bronxville",
    photos: [
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_Cs-MZpCpUbb5f_yI7gHiQs6QuNzWUnEdeekGPqKA9gG48cdpjj5PmPdn-okWXuWquQqLwdl1rrTU2Wolal8YgD2EOrzjwTHVJOzLWZtX73sDo-QJC8EHGNCq9D8weUVydgRIVyrf6Np7K2nWTPgoOs_yBKHWdWz-p3i",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "The Urban Hamlet",
            uri: "//maps.google.com/maps/contrib/101613830390933577682",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5-IDr066a-5GEM3dW9iCRAV9TDuGF5XIhxgb2xGo0Qb95lVU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_Cshx-VFWDTyPYluC01nFpimZc-3ujG54PiwOLKdiBYsQSYr7e97sjJv-jfNPMRzFLieOd18kndh4T-v2Dm2dWszWV1S2JOxpJSq-4-6gf4Y_-7SoADSPyusMCj-_ZleoDjCrwlRFg6m4ooepDoBVzFKYIUfGhH93Juo",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "The Urban Hamlet",
            uri: "//maps.google.com/maps/contrib/101613830390933577682",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5-IDr066a-5GEM3dW9iCRAV9TDuGF5XIhxgb2xGo0Qb95lVU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_Cs-aFXWp3P8vy1MJj6Oj9wpN-vlPTxvxN-8zXMNXM8t6kOUZ2sdnjfCVI276fgzm1y8vnx6CQ0f7dQz1iE2cNxx53APPBgQ4pXgPdoJCwxKrH8C9vXBXWJMx60ijacQzadrmvsjufojIH-ln2ezhjBz3YaqogAkDryk",
        widthPx: 4000,
        heightPx: 1868,
        authorAttributions: [
          {
            displayName: "Paul Siegel",
            uri: "//maps.google.com/maps/contrib/111906036776763074121",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXFx_G_udc9DRrl5Jnyz5NWEj0gYqLnjZGpR_W0llKzQiS6NVDw5g=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_CuuHhXXMnpwq5xZNCFU_6gL-O6afN_J_kkzucqGyCoE0YyOhFMtyyyiwrZWBdp-vjoUe_HNvLTn40OGBqnkTGt5MW8J2ay9FKtU42-AYtAp_erxBipC1vVR75H6lIHpW-w3K6oiziGmAXxX5V8XdVuCIrGSiGhUrjy9",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "The Urban Hamlet",
            uri: "//maps.google.com/maps/contrib/101613830390933577682",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5-IDr066a-5GEM3dW9iCRAV9TDuGF5XIhxgb2xGo0Qb95lVU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_CutN6BOidhTYkCw_CTC0jDjER7HgdRDSv8TADKUXfyL0bYrFD_MAQXtVTFIKs-SGbArYykIOKA25cmk2qUCNuzCBfLpM_0KKo9JjTwYNQKlzZZqCkcf196xKjkKESnGyP1scNXyfC_NFyeTf8WY_y0390eZOEiRPHIk",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "The Urban Hamlet",
            uri: "//maps.google.com/maps/contrib/101613830390933577682",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5-IDr066a-5GEM3dW9iCRAV9TDuGF5XIhxgb2xGo0Qb95lVU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_CvOkfmNz-dRWnWOr022BMFs0L5l5ZFEW0cpPhlEj6wLA8O_7kNwgwpOcC81HoydSeo_1ekH0VJ_L1VsjCZuDgjuxnbArtIzm5375vE7ZxI6X6seVy5AVCfKt8VzWFdqzTNrEVgf4tIYP2VmVliGarPBNJK9kgRXw-6H",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "The Urban Hamlet",
            uri: "//maps.google.com/maps/contrib/101613830390933577682",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5-IDr066a-5GEM3dW9iCRAV9TDuGF5XIhxgb2xGo0Qb95lVU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_CtAAMwmNsGPoJIdPpxWOcILfzSqJy4vXFg0imILCPghCvTA2bcnKv4JzZOGh0jT6amgnpnhEmW7MRCGz9udxbkyrGUz8-_yB-fxAiBvjvMnVq0uBcHrdnMrscB31riNICwuo747nVvVvFlGD8wFSWQjEw0M4qigsgOX",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "The Urban Hamlet",
            uri: "//maps.google.com/maps/contrib/101613830390933577682",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5-IDr066a-5GEM3dW9iCRAV9TDuGF5XIhxgb2xGo0Qb95lVU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_Cvg-gxk1l2mwIddMEdHlxUo7fKFxIG0rgh5Mcv4208vE-UwNtzfRFwsZ8IHW2oNKVOzFHGuqzVjAPEGrsjM_PYjDPzycqkmwZsw4gFdciuQo1v8apsl8WIGdArBy9XHjEK4Bp8FI5mF__x-PWaZe8BBxPVGNlxtDgip",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Samreth Kagnoeung",
            uri: "//maps.google.com/maps/contrib/115464909674303705007",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjU_GoSc_IS54vdmof_impNrPuSl19VMHpG6IF1l4z2Etfm2ymdRRQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_CsQxSxvUQaiHuoR_Yv3xiypACwhmTbHID87L1k62FmaUhKpB6PRYHbrtqE624z1L0cYK9XDmhluhddKw2VnVqSm6kLlbUN6657GtESqiBHmVac-vnQBVMkYJ-A-whvq3-6blEGht9z_nLZBJw8M_cXZPZ-wa3MT5wWU",
        widthPx: 800,
        heightPx: 800,
        authorAttributions: [
          {
            displayName: "The Urban Hamlet",
            uri: "//maps.google.com/maps/contrib/101613830390933577682",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjW5-IDr066a-5GEM3dW9iCRAV9TDuGF5XIhxgb2xGo0Qb95lVU=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJl4RjnqeTwokRgvrQWgt9EmY/photos/AelY_CtS2xV43-LaYYkVIAdSvR8Rz1PueuXC2T95cgCyQCzGaW8rZNY7p6902LUAEzyLrEN2OU4Ked_v2jylwUUwYmh7c7ABu6ULRuXVn-DiifO5hxMdIvTgLlDKqX3tOgezpVB4DYkSNC3ZpI7QIxvVvbDgAWn3RZn1fHX6",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Frank Lucus",
            uri: "//maps.google.com/maps/contrib/101828356860680569955",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUB3a7uUY7mWsjReQhN0LMu4oylhrV5S2rTSwa_JhPNjuOPKtMy=s100-p-k-no-mo",
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
    addressComponents: [
      {
        longText: "8",
        shortText: "8",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Columbus Avenue",
        shortText: "Columbus Ave",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Tuckahoe",
        shortText: "Tuckahoe",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10707",
        shortText: "10707",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
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
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 14,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 0,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 14,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 14,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 14,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 14,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 14,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 14,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 17,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 21,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
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
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 0,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
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
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 0,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 12,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 14,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 17,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 21,
              minute: 30,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_CtHedx3bk2E8rJIJ63om9kqR93u7_ImdAC6Ew9LwP5pHWDJFJUbPVeRp_mOjnpcK5HbUdvYjIzZnCOuYfFcIvPXKXt38HYGHzFhjkYdR9UWUAk4gjmUNS-UhYwW_ADLtGolWqGvaraXTx4zEoPBUCig6ucWlueVBa0t",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_CtBK5L7aa1mNSud4zLfZnSECY_2pn8GEJFRFdf6gUjQtDEdp1qOCljlKuxSa24m30rHareFeKGM-VIWlFvtd8qamSYDiwdESxgz2tC31igdHK7ssW7P8FGgaLYN1WSE0ylKwouRKC_j4otgqAjhKaAZ7QZdSrlfpe6E",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_CstjWZkzStXQX6KwtDrK5oNysG_2LyPHH4lbYjsVjfoilEjTWWPWShALcEDJ58N23k5DV3BQ1guJWO6rDP7LC-VtHJTE3E9HvvP2R1UQ9kjdC37_Vkula0K4ebB2jcmv_of910m9Nk5_76MCmuIwayoleOU-o7144jh",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_CunlNsG_ICw6BsMhDZ5JnHatxWC_bg6blKA2IRZRZur4ReNkRH-7nDcEBThUc-bSp0sd7oZmwl8tN996rfysu4y3M0BJX6HHnAQgBjnSRkbdBPR2sUQbNOpnNjTXhM-l64X4L5SAsK0utuW3e2TnJx3h20uAm9ANTxb",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_Ctmwi98nCrn8CmzeOLFxgIKAPMq03bsMn5QyCZeYKKqvFCF1J4sRPXvAqO6ho13ji_QOSI6DWjDCxYCq8kWkXwH2em7BRNc30g_VOtk9ksee3YcBWUe568aWPzQ4RVIJ2Ntwz0_x69jJAJAnpD5CiOvP1qF6Ozvr67o",
        widthPx: 2900,
        heightPx: 3440,
        authorAttributions: [
          {
            displayName: "Olga Kovalenko",
            uri: "//maps.google.com/maps/contrib/101251715473489422681",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWANLqw-tn4AVVzclM_qtdzNvNPTpHfGdY_wNnr5HHC25p1g4OfWQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_Cstmu6wKYsfcOUrtWTqWROT3WvXAhFSKj-aQqhhin2cRRfJRPOk0DfEGltcAAt329QI3XRUgUl-jtVWSWxvrsEEqG9ja0DewK6YyYayCEF-yWs8F5B11wx2JtFf9ObgVMHQ6Nucf7NKInBflsVSUKUv_EAGNfiKq2ov",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_Ct0hCWTrGVFdBtEyehYejozZrxS1eEWWyyokX2Uw-liOy2pK0xhOSV8czTXaOIQL0xuOHhjzw68ySRBpjcsgQWYRYLqg-Sib6iEDQOj7JNRZZOf9K3S2ALBgXoq_1lkBpd5awqyT2OEzGcp2O1N-rA8j63DeAWKDCSj",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_Cvn_NbI692J8yhYdo6YamiGRGMnIOpUs7pQQDH8caWlwww-idJNU34IVR-jN7uXsujc0vB8FJajKr6yeoCXmqK0TU8QdVsV2GLOq6h1Pe5xhjeqJSdGy6GQcp9CjlbSLFentfA-c7S2cGpp2VCs4TyAuC6U9bMiuAkY",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_CuXkyJkjgx7lbuncqQPtf1RsMkEwsxuskfYYwR9Kkgu6OgGY0W9K4a9mqnBiB84BCyMXW3mQ9QxFijYzBert69q1VAoxzKo-MNa4BaWS8BT9pbsMxrgwO6Kq5bP2P5uvwJLqZHByZnrARpCQ__zQWx74cE2YD5kKOeI",
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
        name: "places/ChIJN78jnMeSwokRpT5Sq_QGD58/photos/AelY_Cs2EjdmQ8WHfR5Su_e3djtypP1H-Qhw_7GpG3MrM_6XIVncZQuxeC_7sB8Gp1onL11Ba1Wdii37N02-clzrzd6SAEPLZi1EAhUKUV4fqHxA5xnyyQ8ylNV0xVPm6qmtZ1qVWQAjUkZJipzjTPTYVJB46pRAUeM_1Pk6",
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
    addressComponents: [
      {
        longText: "97",
        shortText: "97",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Lake Avenue",
        shortText: "Lake Ave",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Tuckahoe",
        shortText: "Tuckahoe",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10707",
        shortText: "10707",
        types: ["postal_code"],
        languageCode: "en-US",
      },
      {
        longText: "3927",
        shortText: "3927",
        types: ["postal_code_suffix"],
        languageCode: "en-US",
      },
    ],
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
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
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
    primaryType: "italian_restaurant",
    shortFormattedAddress: "97 Lake Ave, Tuckahoe",
    photos: [
      {
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_CsU-YYpw7Fh1axizuaoBsU6f2sGgKhB0kotY37ouN1-P3nb0mw6ILT2f4NDi_32hZa1GhSqoQgYIIebZU24VJcox-L9kjQVHw_zj3-bh9HwCZuGoZ0zi1Vbn8Obpq0dphB0-_9bmmIPhbmxlwhp6GdtjAoflsdYpxuU",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_CumCuer96WARVqnjnReyss-mDga1nVdGtV6h2yoGM3gMHzT2YmEmmd4G-1WreQ5bP-_HAQCtQI5p4pvjF6L_uCO2bd1qLe_g1HjXnMkGAVpNigy8Fc3SAXoNlat0fLzftQrDr1IQ7_JlknPdf6KMrMviyZpmyYEiO2D",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_Cvco5prVjO54H07a_OsAe6AhbHy0mL3cUlUpQlG_dWfcga_1ls__4pYpuaxNs2ReBjIEg-n3kIjMxDvJi0ntxRVcVRJl796P911JVGWHC9RX0-BBmmLysq6wWduw-NfepMGGelgYURSv-Sg9vr0yUyj9oBXvAYY3cb4",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_Csvj649x06qsVxoeomhaPWkUcJTjpKDP-qdyPTyN8Sn9a6bGUWQaVVs70awxdT5JC0GbxD90jQR4eqJXd_dAv7mxlOK9mI48y8i2Pv6Pjairzw0Ly0g_NWCJ5pIMOOe4DekXoSH-1Dw9Fho9aREPt9hL_jFsnRF-11y",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_CtaNKXLWIIV0kk-0UDhw2XRaz48HFxDhgWCbPJCG7kjHE4SEkbsD67TrdwosDoq9acRuqnaLvt_7FJW6nD8ijR0HuO9vze1WR2ntFs5WtnSWKsVDFyCBbdJdPtbHMz8SXDoFs9YfgSq3wCGMoijzrkuQf9GamoAaC9G",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_CuI3NcGKWPx2A6JJT-Ds0rKW0vU_R2od1hatl_mwoPM979tFHxKO1AxSZBLWnZDrvu97_fucftMeESp7Nac-SNWFfAU5DYQFWevmNqnr0cqMFK_QZkqlKwHOgpNukHsmoCKMHTFDW4gGRazbZJQFgNsvZVxo60A3UDa",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_CvG_YNfqvX7snMxoGJE3yGBUNflK5qOfSCSkaenShZ2ENYoQjqzRr-r4HBusUB4kM2p-XhF3QySG3gwQUB2zPJnhh5nm2wKnd502wWE3VkirOYGQUALSCuXpNSxfS-WfbzrvtJRmupcZKTagZt6MWmbmvFUwoqXXzdd",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_Ct_vRjO0zq_P6DOYfi1CdLaMkSyBIabo7m1NRP69-Hoy5BtMM8Sc8EJnWHX2qv18FMuRAqzKmNI3s0aF3X0_3JaKsvpFsJilmQToCjC_Zf27LTugO_z3JfxyOYRzlOweJU0hsQF9kagiyxEVPigexQCAzyOH1mFGzLJ",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_CteHsBbr8GeFEq-AfiNcLhGrEP18lw34u1HVd1BSWwdbzFNZsC95BDco-1mb8KD5ZsO2HIzFDboRTvGjjJWgf1dCMymmnUAhKto3TtNxwr7zPhJ8CGo0up6EywWpAV29wx9QufmG7r82Cx5ydw_EPPazshe_suvN9AO",
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
        name: "places/ChIJqyTM-MeSwokRwtBPDSglPUg/photos/AelY_Ct9I8tVPBiqEbrXJ-EHXxejxj1SkBARsmNnTq18ZJiNsyxIx48IxkRCL4EVbTaEDsQeCxn4rcEn8rEKNVCbrqi_COB6dOipoQ0EXgp9vNohZECilGRYeMGJM5vGdvonC86Zny_P0ZF_y82JTXdWaV1DcnCQ7pA-oGwF",
        widthPx: 4800,
        heightPx: 4215,
        authorAttributions: [
          {
            displayName: "Angelina's",
            uri: "//maps.google.com/maps/contrib/111961368510838484053",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUNXhFPQMQLRMqOiI_Vhp25h30ef8pDGGFVFiWqaecDL0yaVm4=s100-p-k-no-mo",
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
    name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs",
    id: "ChIJiUIlT3mTwokRrJDV5pZnTMs",
    types: [
      "pizza_restaurant",
      "fast_food_restaurant",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "50 Pondfield Rd W, Yonkers, NY 10708, USA",
    addressComponents: [
      {
        longText: "50",
        shortText: "50",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Pondfield Road West",
        shortText: "Pondfield Rd W",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Cedar Knolls",
        shortText: "Cedar Knolls",
        types: ["neighborhood", "political"],
        languageCode: "en",
      },
      {
        longText: "Yonkers",
        shortText: "Yonkers",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9440573,
      longitude: -73.8399147,
    },
    rating: 4.4,
    websiteUri: "http://ginosofbronxville.com/",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 10,
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
            hour: 10,
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
            hour: 10,
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
            hour: 10,
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
            hour: 10,
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
            hour: 10,
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
        "Monday: 10:00 AM – 9:00 PM",
        "Tuesday: 10:00 AM – 9:00 PM",
        "Wednesday: 10:00 AM – 9:00 PM",
        "Thursday: 10:00 AM – 9:00 PM",
        "Friday: 10:00 AM – 10:00 PM",
        "Saturday: 10:00 AM – 10:00 PM",
        "Sunday: 10:00 AM – 9:00 PM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 272,
    displayName: {
      text: "Gino’s Pizza",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 10,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 0,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 10,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 10,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 10,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 3,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 10,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 4,
            hour: 21,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 10,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 5,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 10,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 6,
            hour: 22,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 10:00 AM – 9:00 PM",
        "Tuesday: 10:00 AM – 9:00 PM",
        "Wednesday: 10:00 AM – 9:00 PM",
        "Thursday: 10:00 AM – 9:00 PM",
        "Friday: 10:00 AM – 10:00 PM",
        "Saturday: 10:00 AM – 10:00 PM",
        "Sunday: 10:00 AM – 9:00 PM",
      ],
    },
    primaryType: "pizza_restaurant",
    shortFormattedAddress: "50 Pondfield Rd W, Yonkers",
    photos: [
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_Cub6bP0F0iBymV8DgP6_ywFRgwFF8t9N-1OEXrifz4gp2i1-B7aFNiyl74F2mvwTxqWUrfknAzbAZ6UJgL3ukCyWT991bf9_DCWUiHjQoGpQHoyAu9nScYVI-CuwGFX2WahNhNpZTiajXEf1ScQE24SrGyrJosTZ8GF",
        widthPx: 3912,
        heightPx: 2202,
        authorAttributions: [
          {
            displayName: "Gino’s Pizza",
            uri: "//maps.google.com/maps/contrib/114453206485464619051",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWe5FiSPFl0G0AF6wwDDVqkyYpkrjXH6Tjv-jpK-RMtAPWmztbj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CuUGkClZ9wPTyiG9EVtWuh5XUxz8LfvmjyiK4v6-HGqEGL-T_ejkcnPWn3xxzjw-Te3FhfB60Va3wYEQ_d0T-L7sPOqi3b9vOK6ya0ivXZ170WGdrXX63CQAyxlU_g7FX-_r0ZjDByvxPInk12D0byjK6gM7_3D67bA",
        widthPx: 1804,
        heightPx: 1015,
        authorAttributions: [
          {
            displayName: "Gino’s Pizza",
            uri: "//maps.google.com/maps/contrib/114453206485464619051",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWe5FiSPFl0G0AF6wwDDVqkyYpkrjXH6Tjv-jpK-RMtAPWmztbj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CvKkclO3dCk7bq3Y1toHjCLlZ3xzCp3vqGwA1MzLuNJN6pFUYEso1B1mcx61oXSgr1doKPGwyrDfNwqmPqTJmOM-yefxhcoraMffd0se44JA81VzDydHo1hzIkngVPb-KJK4n7Of0A2aYo3DBLU7gLpWwDnANeIVGEO",
        widthPx: 4192,
        heightPx: 2359,
        authorAttributions: [
          {
            displayName: "Gino’s Pizza",
            uri: "//maps.google.com/maps/contrib/114453206485464619051",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWe5FiSPFl0G0AF6wwDDVqkyYpkrjXH6Tjv-jpK-RMtAPWmztbj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CvYFe3Ubvwy31Twk85sP2PEpoVaJUKjbs0lI5T8k2UTOCk74vsvB4F5cUC5G2Bj7nDPLNO7l1p_xa3-ccp66hNH2-CY4UqFv5IFwjZVD-nwoNgs_4E2F1W2JHHmfEV9xBCZnM1LjCgvLeqS_plIv6gKUUnH-mks8gQb",
        widthPx: 3000,
        heightPx: 4000,
        authorAttributions: [
          {
            displayName: "Drea Molina",
            uri: "//maps.google.com/maps/contrib/116032394472967696454",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWpc6Hey4GN_4qUSeY-qv9AVW4-uRmskACkRY2e-y9R9qFCvamaCw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CvwuHkgVPRbeqZ0ra9p0aUitWY41TIGGeWOfRh2Kw2cQYzNPD_TQaduydp2Hj81OqD3A778HcjqnF_iygu7-BDGmG5iqvtEiS41eHlhSLNea0vi51YiOv4arbOhnUHa-VuucHe7htf6rBZZm04TGKQuM3Hxkd2SDnE4",
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
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CumU3VyB9MgKmNlGgf87HZh3yz7lkdtxd7TEvDuYGQ45OGAf-K8mLKJmcJHU-WktaIQ4NGF8B3W4tcYA96zBMa2jw_mkKrj-qr8Z3lwPa3GVjyk_PK90JVGDZw4UP8JoNzIZgt1wz7Lk2Ispu8fMP5LC112ViDrgIR8",
        widthPx: 743,
        heightPx: 743,
        authorAttributions: [
          {
            displayName: "Gino’s Pizza",
            uri: "//maps.google.com/maps/contrib/114453206485464619051",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWe5FiSPFl0G0AF6wwDDVqkyYpkrjXH6Tjv-jpK-RMtAPWmztbj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CvzU1WGxIbDjzI9kWDMjItIt6VUk3HL4Nb1BB1MTRSzEm8ViAoaPkP3O_dBgI6Of0_dzqWzoINYyC4djbAfgLma7PPuRHHwJ0Y6z1Mnu2TQ16HDGznmoIPbuO8hbt_HMtjaZun5fYJeuicHWXDHaYIOQwm9dIY6TJ1F",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Gino’s Pizza",
            uri: "//maps.google.com/maps/contrib/114453206485464619051",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWe5FiSPFl0G0AF6wwDDVqkyYpkrjXH6Tjv-jpK-RMtAPWmztbj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CsCSGOleH_uMbpkNRaqubjnlVFvZj65fFP9Ee0zbWD9cDKC8-D2R2QgOXW8RoU_mh4taLXmfj0Jzgl8bUltn1imXXcqBJJYeFI8ZHORJ2BfXt6LOt-UrwcNW9c8cU_6_1UpEO-tOnY7z6nNXbvCArNlZppSbaDoRweT",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Gino’s Pizza",
            uri: "//maps.google.com/maps/contrib/114453206485464619051",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWe5FiSPFl0G0AF6wwDDVqkyYpkrjXH6Tjv-jpK-RMtAPWmztbj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_Cuof-6dc0M9waVzZTgNx1FVC4pxPBrp32TYcxUbD7_ngYzPxJopX9gLW-OO_1BGCqy9RWDq9h3fKz2xq2QJsvH50wHt7gQ2QgBn6GMg3GWaTzIWUWoWc6jWF8sTPiPeT5SSfHzrpmiOHd0nCajI9gSXX-NC6q0Fw4md",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Gino’s Pizza",
            uri: "//maps.google.com/maps/contrib/114453206485464619051",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWe5FiSPFl0G0AF6wwDDVqkyYpkrjXH6Tjv-jpK-RMtAPWmztbj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJiUIlT3mTwokRrJDV5pZnTMs/photos/AelY_CsEM4SxTBMZ4g9xSYj3MeXi1GPxVqmefmt8-r9fLW2T4AVdqts_9SexpUwiiEzng9tME1LiVaMtaGheKJlrZq4-amjyL5PDvZUPEU3hwME3kbBLFVk7JPDbTK_SPmw0m4s58PkfSe5Z0NlikNIgZaRRpvTWEDTjvYqD",
        widthPx: 4800,
        heightPx: 3200,
        authorAttributions: [
          {
            displayName: "Saeed Mirdavardoost",
            uri: "//maps.google.com/maps/contrib/111634673481720470751",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUhLG9OyDxQe-jzU6pYaL-JvXCSKB6pu102G6abolklH71Aek45=s100-p-k-no-mo",
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
    name: "places/ChIJ0aowaK6SwokRL-HTR_foN38",
    id: "ChIJ0aowaK6SwokRL-HTR_foN38",
    types: ["bar", "restaurant", "food", "point_of_interest", "establishment"],
    formattedAddress: "60 Kraft Ave, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "60",
        shortText: "60",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Kraft Avenue",
        shortText: "Kraft Ave",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
      {
        longText: "4110",
        shortText: "4110",
        types: ["postal_code_suffix"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9392889,
      longitude: -73.83451389999999,
    },
    rating: 4.4,
    websiteUri: "http://jcfogartys.com/",
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
            hour: 1,
            minute: 30,
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 1,
            minute: 30,
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 1,
            minute: 30,
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 4,
            hour: 1,
            minute: 30,
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 5,
            hour: 1,
            minute: 30,
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 6,
            hour: 1,
            minute: 30,
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
          },
          close: {
            day: 0,
            hour: 1,
            minute: 30,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 1:30 AM",
        "Tuesday: 11:00 AM – 1:30 AM",
        "Wednesday: 11:00 AM – 1:30 AM",
        "Thursday: 11:00 AM – 1:30 AM",
        "Friday: 11:00 AM – 1:30 AM",
        "Saturday: 11:00 AM – 1:30 AM",
        "Sunday: 11:00 AM – 1:30 AM",
      ],
    },
    priceLevel: "PRICE_LEVEL_MODERATE",
    userRatingCount: 532,
    displayName: {
      text: "J C Fogarty's",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 1,
            hour: 1,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 23,
            minute: 59,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 0,
            minute: 0,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 2,
            hour: 1,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 3,
            hour: 1,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 4,
            hour: 1,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 5,
            hour: 1,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 6,
            hour: 1,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 11,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 0,
            hour: 1,
            minute: 30,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 11:00 AM – 1:30 AM",
        "Tuesday: 11:00 AM – 1:30 AM",
        "Wednesday: 11:00 AM – 1:30 AM",
        "Thursday: 11:00 AM – 1:30 AM",
        "Friday: 11:00 AM – 1:30 AM",
        "Saturday: 11:00 AM – 1:30 AM",
        "Sunday: 11:00 AM – 1:30 AM",
      ],
    },
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
            close: {
              day: 0,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 18,
              },
            },
          },
          {
            open: {
              day: 1,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
            close: {
              day: 1,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
          {
            open: {
              day: 2,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 2,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
          },
          {
            open: {
              day: 3,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
            close: {
              day: 3,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 14,
              },
            },
          },
          {
            open: {
              day: 4,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
            close: {
              day: 4,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 15,
              },
            },
          },
          {
            open: {
              day: 5,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
            close: {
              day: 5,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 16,
              },
            },
          },
          {
            open: {
              day: 6,
              hour: 11,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
            },
            close: {
              day: 6,
              hour: 22,
              minute: 0,
              date: {
                year: 2024,
                month: 8,
                day: 17,
              },
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
          "Sunday: 11:00 AM – 10:00 PM",
        ],
        secondaryHoursType: "KITCHEN",
      },
    ],
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
          "Sunday: 11:00 AM – 10:00 PM",
        ],
        secondaryHoursType: "KITCHEN",
      },
    ],
    primaryType: "restaurant",
    shortFormattedAddress: "60 Kraft Ave, Bronxville",
    photos: [
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CtZQOxc_cgVJ7pmmc5ZUaT7AW6kCGO9hM_vTP_3VsaWGtjO63cgEbrJY1gBXFZJl9BwgVGTYBS790TZQfKHReeGGY8klOl3aZX6LR8ZceYwinqtYJTdo06T0D-pS7LpaNAKYqqni-Eq54uKat0uNEmLwS_pyZNGxPXp",
        widthPx: 2448,
        heightPx: 3264,
        authorAttributions: [
          {
            displayName: "Army G",
            uri: "//maps.google.com/maps/contrib/110676994141518641408",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUdOw_Tl_j9d9nzOh8uX0sTbp-z0KQQK3UXZHYEw0fKCVezH3cqJg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CtOqixV-7ZOoK-BYH0ruTa8OZVQeqb9P7OwPMRjpsnbeVCjJUIWH5-wKmVvWoHJINDAxeaUdV6NB2pC-LMgWnEEDjx9sLB2mwgqnyvWZPHDiY9qlBLEPLu0mLZjq74fTaPH2L5ZN2C4u0LOTDxkK_qNnNtZKsRrVsa8",
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
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CtwIO4MvFKjlyLjojSiW16d_q2vKerKQGRpTVHInjKtQlM7iApTY0YKng5j9sSQH1akL9gO6DkNX6nnUaoNHZLX74zVOW9OVgtGxh1tLmN35WyFpB_ZqC7EB5QhiJhkMVncsDESQ9pfdj3SKInglcs3G5MINoLD9cuk",
        widthPx: 2609,
        heightPx: 3713,
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
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CuwYvhZMB6SMTZQlG___Oyeoun51DSMFwQU_qPSlxRqflttXci2upsxjx3tvf9gQofBzSHaWQFU5lTUNS-6qcckZZcr9H5gzArWtu72jNEemAjpcuFOxVOOsp9vCeK_J7U_AyT7wOc6ooWBVsNjZPQq4HYVzXBS8eD3",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Tony Shkurtaj",
            uri: "//maps.google.com/maps/contrib/108063350920350331139",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocKJYmO6_MhFxanxxXBc4TWvIA-ARw4aBeCCmNyOSwrii-U0tQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_Cvr8JCAi4OfaOBnne4awaC3vP0_i4wotinFrFz2XVBqCAqEhgq-OaSUxlOU9AMb3zZIU-VczJsxMb4r-dXFCqKqj5dKIu2_B7F8f-qPDFhSk75EPm2_1asK6sfVmRW5MfOyZW1i66PuR6NWmnlmH3woI5aoZWyo62Kk",
        widthPx: 4032,
        heightPx: 2268,
        authorAttributions: [
          {
            displayName: "soxxpuppet",
            uri: "//maps.google.com/maps/contrib/113279348064979698475",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXNBS72pjlA_sFxvr2t1B5nFUqkuqJaxKHKZ9K2hXrMOb_fiDpL=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CsnfAdzIDE5Bu5r9oMdC57vL16omr2io_by4JxHLVCT5QbvBamxAjEmbspWom96QDRhsgL6Nn5MYe4N2eXHlBRzVGTveXoEqMc8TkS55EG-EAKKn7z5NNF3OIgJ7eQE5U-gRXIo5mQ40FxqXJb-DbRxV7pilc58T5-y",
        widthPx: 1200,
        heightPx: 1600,
        authorAttributions: [
          {
            displayName: "Genesis Balloons & Decorations",
            uri: "//maps.google.com/maps/contrib/107570140054536850403",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUueQRQbJWslvQq02d9sXGy44ZJqTRLlRHn_myvJYUDOUEwLB8=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_Cu-CpBaJHOJXWBNqog2tbSC4xoZsYbBZOiCfqLEWuSHLsV6IwJRCcTdTa69HwJycT07MYSolESlX2VSFR75MCBtjqXF3ars9aBeE8fq0PFx3vZQRB5_N9LpcqEaPYrljDzYl2Vw7e4aitMykGukgrY7aEFN4wWcv6j9",
        widthPx: 2268,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Illey Graham",
            uri: "//maps.google.com/maps/contrib/111127826653062456923",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjU6SlAeXeUW2CRYU8hrcu-4roDUGWDAZCYcro1LGEMjRvfBszAb=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CtWkcGOgKJIENaUYHcyhwfGc_GQ2BWkObuTHX4_M2_ykAdgQAuTs1k0dRSo0ERrX3EnV1iXXtpk9j1bwbmsyxbi4fCbmtcgibJwsGtvBk1dIJfqydlSHiNLaxUNLtn-U-mNeMnsLK8aTY1kVzlX5RJQEkOop8X0oNWi",
        widthPx: 4048,
        heightPx: 3036,
        authorAttributions: [
          {
            displayName: "Jeanne Marie Hoffman",
            uri: "//maps.google.com/maps/contrib/109375371905095030322",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXhTpfWbNQtyA7jznRtxqquI4VlpxC6pL0Is7rmDezwymXRSCEj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CvmYCyZbbi76aKkal0ygbCEYStoL-NVwxfy8jIFNGB77FWaEQonL8HDFRNSzIyfAvtK-JAOclBewJ4TOJWxIa8CUGQQZc3omV84knWDfEG0hu7XhJwsbPkrBBxidk_ILf3tRCBJDYPu7VYFrlDIfHmFNfC77saF4QQd",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Jeanne Marie Hoffman",
            uri: "//maps.google.com/maps/contrib/109375371905095030322",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXhTpfWbNQtyA7jznRtxqquI4VlpxC6pL0Is7rmDezwymXRSCEj=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJ0aowaK6SwokRL-HTR_foN38/photos/AelY_CvPoSLB2ygsHl9p6SOyFr0rqKrlRPbRpKfrPurbvvRWrwNPYG5ZEH1b6E04NP7Pn-JFjoXqi2eWZ1OdwtDMgENQb_VfAq-TOAX_BRDP0luYVvYPreXg1g4bPWDtnAR6ql3zqxQ9eJmoMI_RFBeTOi9kVBZgOm5Dfifv",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "dalrick dandy",
            uri: "//maps.google.com/maps/contrib/117017372155994499398",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXLHHkutoIvpYAeMkUAWhmqAxXSv-9RtqSTnCz4tC_f6ABEVeQ=s100-p-k-no-mo",
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
    name: "places/ChIJH-lolKzywokRCvohk-BdCT0",
    id: "ChIJH-lolKzywokRCvohk-BdCT0",
    types: [
      "coffee_shop",
      "breakfast_restaurant",
      "fast_food_restaurant",
      "bakery",
      "meal_takeaway",
      "cafe",
      "restaurant",
      "food",
      "point_of_interest",
      "store",
      "establishment",
    ],
    formattedAddress: "850 Bronx River Rd, Yonkers, NY 10708, USA",
    addressComponents: [
      {
        longText: "850",
        shortText: "850",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Bronx River Road",
        shortText: "Bronx River Rd",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Southeast Yonkers",
        shortText: "Southeast Yonkers",
        types: ["neighborhood", "political"],
        languageCode: "en",
      },
      {
        longText: "Yonkers",
        shortText: "Yonkers",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.9280231,
      longitude: -73.841957499999992,
    },
    rating: 3.8,
    websiteUri:
      "https://locations.dunkindonuts.com/en/ny/yonkers/850-bronx-river-rd/332995?utm_source=google&utm_medium=local&utm_campaign=localmaps&utm_content=332995&y_source=1_MTIxMDc0NTktNzE1LWxvY2F0aW9uLndlYnNpdGU%3D",
    regularOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 0,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Open 24 hours",
        "Tuesday: Open 24 hours",
        "Wednesday: Open 24 hours",
        "Thursday: Open 24 hours",
        "Friday: Open 24 hours",
        "Saturday: Open 24 hours",
        "Sunday: Open 24 hours",
      ],
    },
    priceLevel: "PRICE_LEVEL_INEXPENSIVE",
    userRatingCount: 403,
    displayName: {
      text: "Dunkin'",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 2,
            hour: 0,
            minute: 0,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 1,
            hour: 23,
            minute: 59,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: Open 24 hours",
        "Tuesday: Open 24 hours",
        "Wednesday: Open 24 hours",
        "Thursday: Open 24 hours",
        "Friday: Open 24 hours",
        "Saturday: Open 24 hours",
        "Sunday: Open 24 hours",
      ],
    },
    currentSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 2,
              hour: 0,
              minute: 0,
              truncated: true,
              date: {
                year: 2024,
                month: 8,
                day: 13,
              },
            },
            close: {
              day: 1,
              hour: 23,
              minute: 59,
              truncated: true,
              date: {
                year: 2024,
                month: 8,
                day: 19,
              },
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Open 24 hours",
          "Tuesday: Open 24 hours",
          "Wednesday: Open 24 hours",
          "Thursday: Open 24 hours",
          "Friday: Open 24 hours",
          "Saturday: Open 24 hours",
          "Sunday: Open 24 hours",
        ],
        secondaryHoursType: "DELIVERY",
      },
    ],
    regularSecondaryOpeningHours: [
      {
        openNow: true,
        periods: [
          {
            open: {
              day: 0,
              hour: 0,
              minute: 0,
            },
          },
        ],
        weekdayDescriptions: [
          "Monday: Open 24 hours",
          "Tuesday: Open 24 hours",
          "Wednesday: Open 24 hours",
          "Thursday: Open 24 hours",
          "Friday: Open 24 hours",
          "Saturday: Open 24 hours",
          "Sunday: Open 24 hours",
        ],
        secondaryHoursType: "DELIVERY",
      },
    ],
    primaryType: "coffee_shop",
    shortFormattedAddress: "850 Bronx River Rd, Yonkers",
    photos: [
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CsZk_CHgVgkQ-Lil65j4rfpMdUQRPeKkehZVvj6Rrwxzfk8pNlB4-V6rqgBzdq6HUG22IGbNy9IbEbU131TGpFohdMtpqt-aNpcYhqT4s6o--bhrv6xxaJLKIcL7zVM034z6PbWPnWg52L0Nv8b9Ssjx7h4_iopAhUo",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Ohona Yousha",
            uri: "//maps.google.com/maps/contrib/115556299338220815481",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWsEWb6XWv12TZL3s-eHsp-wb1oquXjsS4DmnimUiI5lOd8ajos=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CuzLIfA2EyxUh2PCmWpVb5bXvQPUPWxuRY26sxVoaCooXYIGAcgwPEzzzqIyJOasK_LSgP2k5MGXiDzoJetynEO4U8ZzSiVxSYimKDychGUzJNqPrivi1QLOPUQWyNmJfqyYq_p7l5WkvOFrOq9CUwp4evqN9SDektI",
        widthPx: 480,
        heightPx: 270,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/105877729310124761177",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXxfRhVIGq6GVpkgODA1hU3ua-UwGjPItvXz_06K7ER-Q3JdhuE=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CsrI4Nyihdrv5ThV5-e_HwVQCACyBAaKXn2GiGE4gBD6PkV_43jhT8POuGXsJFTsnGN3GYSeZO4lz27EUv0X9DTh1_Tt6xhc6UTX4XXHxHZlm1n6-byeAev-6Ayw_u7z25hVgEVTZc1Y3yj5S8bxqc96HCEKO7eOgBR",
        widthPx: 862,
        heightPx: 1009,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/105877729310124761177",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXxfRhVIGq6GVpkgODA1hU3ua-UwGjPItvXz_06K7ER-Q3JdhuE=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CtCX1gW-B7V-9cIpQ1xLc6XQLymJn_FMdqbBDsvZxBX8r2lAqNtZDBJ-bEU_iELS_e_VGK0NWsH1BZFKOv_WNJGy6aKkfO6gDXAUFf7TMYsEuEHPAztQKNShdac6GA-uq4nOTNp3jF89JshbP2ZRSE7b0Ae_hb9Xx1w",
        widthPx: 866,
        heightPx: 793,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/105877729310124761177",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXxfRhVIGq6GVpkgODA1hU3ua-UwGjPItvXz_06K7ER-Q3JdhuE=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_Cvb4EngRPbKh1O-pfYlhyNzEudicb1lCP5ssejHkQ7vAmtBCPa0E2q1gQuYwYTDQ17yQlhJT1SotHfG_rqmKN9X1qLcnebkrcoFk7EVLmBHUMdL53stAT5w3WFq4nrK5lC4LsbjoFViXASSf9QrdNBImDRaLjTrgWU0",
        widthPx: 620,
        heightPx: 506,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/105877729310124761177",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXxfRhVIGq6GVpkgODA1hU3ua-UwGjPItvXz_06K7ER-Q3JdhuE=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CtgBhyd0zXKrqJsreG45e1zOXUpwl9dibEnq_5p35ox0VjKLCtiy1iTiv_IgXpy5H4V6J2sDomLk1_LYi5UA4sO6heML0egVdiuV1xxy-bMOCdPWOMNgSMOFvPxudqT86TBHgQzenerie3Tw8CC03dEbOyh8bt9V7AL",
        widthPx: 3264,
        heightPx: 1836,
        authorAttributions: [
          {
            displayName: "Ron Law",
            uri: "//maps.google.com/maps/contrib/117179274809457721299",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUF9HtU2WArG714Ao07szDa_0yDn-yv7KnwiJXTK9cCCIUzXR2P5A=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CsN_d8Epd1A7VmTJz9Ea8_bgUAm8QPE7vLuWj7dAJlKKWv1ewLP77OdpzMIsZDQ5QEMOM1KU5_5lHieE9JavbvaxP-WtLJdQpybTICXL1kt7Vwx1BMKsi7yzFbsSzcQyMk0BmGPS5b6UcPmh8TnJIiSazExtJh3WfNS",
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Patrick travers",
            uri: "//maps.google.com/maps/contrib/118189597313407092250",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLoDh1Mib0vNxw1ceGDnFr88nY49oykuXk_aV1akNUewgQLsA=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CsiEiL5SAmSePzfHGjin8HEXoHCdYt9R0SuyWA-M3zKGzXCEWrb8qKjV5WvAlbhRY9FviuLC-s7252-vjrRzXfIS8EeGxuh1IE8nFxh7UAHnMHZLjdkrYPDM8qXuQTbTabjZCTsYNZRXXTBpftQsVoHKLQNF_suJcGC",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Hari Nair",
            uri: "//maps.google.com/maps/contrib/114874217721418603491",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjWUaoPOOdPjFlpF-V2fzRXdR60OU4SAQTPFQj7038jmVVBAqeao5w=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CuwOxTnolUob5OGPvXUXt-Ld9HyDb8RpfnrufClDHPHKo_4gbbdQoPbV72qzY62YnPA_g5cwH3BwZexf0p1fbdboJ-_4YSmjuvAu7KSFeyh9VMIzPi25JzWeIcL1eVxr1ATSvhJvByTPw076l4N5dvkb8BzgMmQfasD",
        widthPx: 620,
        heightPx: 506,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/105877729310124761177",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXxfRhVIGq6GVpkgODA1hU3ua-UwGjPItvXz_06K7ER-Q3JdhuE=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJH-lolKzywokRCvohk-BdCT0/photos/AelY_CtprhgpnVUkFuimDpz6UOSEg-Rr_dqmiRoGNKgnzD7vUQXye03OvNY6TsVV1KgzydpvG_20za_0JEoAqk1_nrROu2tm2chkSaoXQy-SRAJAwmEB-egRjEuZmceQQbQuepAivx3HDZd78RFreGGfq2Xr4MhR9zvETyoN",
        widthPx: 620,
        heightPx: 506,
        authorAttributions: [
          {
            displayName: "Dunkin'",
            uri: "//maps.google.com/maps/contrib/105877729310124761177",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXxfRhVIGq6GVpkgODA1hU3ua-UwGjPItvXz_06K7ER-Q3JdhuE=s100-p-k-no-mo",
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
    name: "places/ChIJZReJaq6SwokRbZGfHBROUZU",
    id: "ChIJZReJaq6SwokRbZGfHBROUZU",
    types: [
      "american_restaurant",
      "bar",
      "restaurant",
      "food",
      "point_of_interest",
      "establishment",
    ],
    formattedAddress: "18-20 Park Pl, Bronxville, NY 10708, USA",
    addressComponents: [
      {
        longText: "18-20",
        shortText: "18-20",
        types: ["street_number"],
        languageCode: "en-US",
      },
      {
        longText: "Park Place",
        shortText: "Park Pl",
        types: ["route"],
        languageCode: "en",
      },
      {
        longText: "Bronxville",
        shortText: "Bronxville",
        types: ["locality", "political"],
        languageCode: "en",
      },
      {
        longText: "Eastchester",
        shortText: "Eastchester",
        types: ["administrative_area_level_3", "political"],
        languageCode: "en",
      },
      {
        longText: "Westchester County",
        shortText: "Westchester County",
        types: ["administrative_area_level_2", "political"],
        languageCode: "en",
      },
      {
        longText: "New York",
        shortText: "NY",
        types: ["administrative_area_level_1", "political"],
        languageCode: "en",
      },
      {
        longText: "United States",
        shortText: "US",
        types: ["country", "political"],
        languageCode: "en",
      },
      {
        longText: "10708",
        shortText: "10708",
        types: ["postal_code"],
        languageCode: "en-US",
      },
    ],
    location: {
      latitude: 40.939835699999996,
      longitude: -73.834142500000013,
    },
    rating: 4.2,
    websiteUri: "http://www.petesofbronxville.com/",
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
            hour: 1,
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
            hour: 4,
            minute: 0,
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 PM – 12:00 AM",
        "Tuesday: 12:00 PM – 12:00 AM",
        "Wednesday: 12:00 PM – 12:00 AM",
        "Thursday: 12:00 PM – 12:00 AM",
        "Friday: 12:00 PM – 1:00 AM",
        "Saturday: 12:00 PM – 4:00 AM",
        "Sunday: 12:00 PM – 12:00 AM",
      ],
    },
    userRatingCount: 424,
    displayName: {
      text: "Pete's Park Place Tavern",
      languageCode: "en",
    },
    currentOpeningHours: {
      openNow: true,
      periods: [
        {
          open: {
            day: 0,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
          close: {
            day: 1,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 1,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
          close: {
            day: 1,
            hour: 23,
            minute: 59,
            truncated: true,
            date: {
              year: 2024,
              month: 8,
              day: 19,
            },
          },
        },
        {
          open: {
            day: 2,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 13,
            },
          },
          close: {
            day: 3,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
        },
        {
          open: {
            day: 3,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 14,
            },
          },
          close: {
            day: 4,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
        },
        {
          open: {
            day: 4,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 15,
            },
          },
          close: {
            day: 5,
            hour: 0,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
        },
        {
          open: {
            day: 5,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 16,
            },
          },
          close: {
            day: 6,
            hour: 1,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
        },
        {
          open: {
            day: 6,
            hour: 12,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 17,
            },
          },
          close: {
            day: 0,
            hour: 4,
            minute: 0,
            date: {
              year: 2024,
              month: 8,
              day: 18,
            },
          },
        },
      ],
      weekdayDescriptions: [
        "Monday: 12:00 PM – 12:00 AM",
        "Tuesday: 12:00 PM – 12:00 AM",
        "Wednesday: 12:00 PM – 12:00 AM",
        "Thursday: 12:00 PM – 12:00 AM",
        "Friday: 12:00 PM – 1:00 AM",
        "Saturday: 12:00 PM – 4:00 AM",
        "Sunday: 12:00 PM – 12:00 AM",
      ],
    },
    primaryType: "bar",
    shortFormattedAddress: "18-20 Park Pl, Bronxville",
    photos: [
      {
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_CuXI4KSq_2rleqHAjkF_3LaZH1UmgoTsGvjKpk_qB18penTdGiNvGxKbCcMRQG8D4d3uxWm96CaYtNiqukditHM9Dhm0tkanwCCSAr_Ihs9lq74KrCWE1MEv3Jmv7Ox32pmv82LsaFm3UvccZSbtIBMUnnjsBmZ3vwr",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Christine Devoy",
            uri: "//maps.google.com/maps/contrib/107286623939460137515",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVbvF2ymxT1o_WMKE7OoX-0JMUEBoliTJnZIGF0duzkFKs8uUKB=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_CucqhFq1ToSZ-A-_6B1X9PiA6jTLz9Cr2c5TM6fCocsa-R2m8E7Xn2OfszmdFPGavQJyXQqKVj9XN6gG6sHUjuzSUb_tPIleSBopZTXZbxekaB-7mAJ7WETXab6yav8B3hGT1F9vCq_Ii4MLYWmiiWLIYVIdBj5bYm2",
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
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_CvOvRK7Tif84JC2eAwPUc9iESEw_fvjrXIggkWAsP1GZpc2ayqOSJMji5YG2to1mUzoV2N9YSzZWdEvCP9srLqc8e9nM1AoHWI0fVcvbUDtzYrKlnFxX4qwMT1-d3pW3LAMMM-ekhIyz4q1UZtoZIHbbCfJnigT_KTD",
        widthPx: 3615,
        heightPx: 2643,
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
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_Ct8Z6GCm0NO7fT5a3J-F2gcE5NZ9Kbm5xhXImsC5xmnc7nswyHx3PTkrFZfO5vubNTVEej3gRWNAZ5fq5_4psW1jRsaAMF_eXqjTnY7mFkMVO3Ai1wKx5HLSCXx5dfQbRoHzo4AKWDEFMxzdcCAD6LrRFUaEF3_3-DO",
        widthPx: 3024,
        heightPx: 3024,
        authorAttributions: [
          {
            displayName: "Amelina Castillo",
            uri: "//maps.google.com/maps/contrib/117114678707981705303",
            photoUri:
              "//lh3.googleusercontent.com/a/ACg8ocLPNfmtVCIrjD29Whvap-nF9C2HT6yjPNe2ihawcnvuhOXhuQ=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_Cs55TVy5dLj-XeebdpjTmuskkoq1ml7jx-uUkBnVmxZ8hhdeKVpLp2r12c1Rz8yTqw42g7jYHjjsOKbF-A8F59FVHAjB1Dnrx0n4EHWtlmzIZRzSl_w-Wd_CXxOvaSS5_fkRyNSkqmD6s5V4l7A84eW4Ninpk8lMLFp",
        widthPx: 3078,
        heightPx: 1866,
        authorAttributions: [
          {
            displayName: "regina osullivan",
            uri: "//maps.google.com/maps/contrib/100228429572626059363",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjXJOqDn0kKdrqEmX1wklSCTCG-9TUVwHhd1gJiOgdl8BL_7SV0Ozg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_Cub3uYC9PXfV4d2UHNrVua2Kd9atSxg7rfHqNzGQiktVdPLox2qouPAGYteVl2KSgkC-Lrt1rmMJWszPNNQ68u8mHvQIomOhAJLmNO87nIqpWG6jPay_-RbNF2lJMtnJGzqgsAoWeM142c7b1FI5m_cspxGj667RVmV",
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
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_Cuw2nnXZNi9SJWNyZlR-_KDP7CkxtJWRy2fhFhQc31a2VivgA6OvfJ0B2BQYaiF5i9uaKjCNlxKNfEYS20Qud6So8-k1dz18CU1cIle82DbsrVljjQ6I6ijYmkSPdc2itx3SrO8KmITtEGB4B9xTg-yUzlauRi3U4Ty",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "William Freer",
            uri: "//maps.google.com/maps/contrib/113793213493976468070",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUmXe48e6SfEQXbQbzj6fg4nxnqS9omsRz-rOSOGkd_NfWDsRGOuw=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_CtO9bk3Utu1OGUNlWEeK5gxjF6PSCe9gSHkMIbuRBCqf8eC7ZXIwsmEsaRb8tNkawPSbjBqkFV5cKUgKebLASpyuc4blO3MlQqNwFel2UzuTtqOJmVVEJYpNF0IyFlPiRVVwEd5eUuqj5wiLL3zDwfPG5AhE9uqKbdk",
        widthPx: 3024,
        heightPx: 4032,
        authorAttributions: [
          {
            displayName: "Christine Devoy",
            uri: "//maps.google.com/maps/contrib/107286623939460137515",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjVbvF2ymxT1o_WMKE7OoX-0JMUEBoliTJnZIGF0duzkFKs8uUKB=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_CsiXYJgN41FwL8zHLgFEil6noZunq8LE5793pwff8ex6zdiGGI7_Fd-ONY7qulhfK0H37pNFOJV-j-LpYANLIfV9FU_zYd835UvSoVcFoKO4-4bN40u2u6ZXKIiUh-13tBs8-N7uP2QnrzopwT5MHpDAgkvwpNl6bTf",
        widthPx: 3264,
        heightPx: 2448,
        authorAttributions: [
          {
            displayName: "Army G",
            uri: "//maps.google.com/maps/contrib/110676994141518641408",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUdOw_Tl_j9d9nzOh8uX0sTbp-z0KQQK3UXZHYEw0fKCVezH3cqJg=s100-p-k-no-mo",
          },
        ],
      },
      {
        name: "places/ChIJZReJaq6SwokRbZGfHBROUZU/photos/AelY_CvMxDc5wsIzjxBZtwpC_WGeaEuJZoWfqYFmLVwN_0S6pZ7OtfylQI_IycNQI-YADNebsdJZKllw5yd8GYfKdL-Li2UYEIEn9uAOiiRMdNCzPfyNP73R3e2He2Z-mk02dr4MupC6IWUOFgdFLg3DtW2FgYI8qi6ii6Y-",
        widthPx: 2933,
        heightPx: 2264,
        authorAttributions: [
          {
            displayName: "Space Dandy",
            uri: "//maps.google.com/maps/contrib/100563658592719678557",
            photoUri:
              "//lh3.googleusercontent.com/a-/ALV-UjUpsyu8vW2oXbHTCKLwcc5cH-Jvk0s4MCCm5AZoYHbnHtDP22X9=s100-p-k-no-mo",
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
];

exports.sample_google_data = asyncHandler(async (req, res, next) => {
  //get lat and long and get address info if we don't already have it
  const { location_id, location_coords, radius } = parse_location_data(
    req.query
  );

  const metersRadius = radius * MILES_TO_METERS;

  let locationInfo = {
    location_id: location_id || "",
    location_coords: location_coords || [],
    address: "",
  };
  try {
    if (!location_coords.length && location_id) {
      locationInfo = {
        location_id: "ChIJ-b2RmVlZwokRpb1pwEQjss0",
        location_coords: [40.752714, -73.97722689999999],
        address: "89 E 42nd St, New York, NY 10017, USA",
      };

      //   let key = process.env.PLACES_API_KEY;
      //   let { data } = await axios.get(
      //     `https://places.googleapis.com/v1/places/${location_id}`,
      //     {
      //       headers: {
      //         "X-Goog-Api-Key": key,
      //         "X-Goog-FieldMask": "id,formattedAddress,location",
      //       },
      //     }
      //   );
      //   locationInfo = {
      //     location_id: data.id,
      //     location_coords: [data.location.latitude, data.location.longitude],
      //     address: data.formattedAddress,
      //   };
    }
    // let placeInfo = await axios.post(
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
    //       "X-Goog-Api-Key": key,
    //       "X-Goog-FieldMask":
    //         "places.accessibilityOptions,places.addressComponents,places.formattedAddress,places.name,places.id,places.shortFormattedAddress,places.displayName,places.location,places.photos,places.types,places.primaryType,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.regularSecondaryOpeningHours,places.currentSecondaryOpeningHours,places.rating,places.userRatingCount,places.websiteUri",
    //     },
    //   }
    // );
    // console.log(placeInfo);
    // let places = placeInfo.data.places;

    let { sqlValueString, tag_map, place_ids, places_data } =
      process_google_data(places);

    const scheduled_at = await meals_model.meal_get_scheduled_time(
      req.params.mealId
    );

    // console.log(places_data);
    const original = `values('ChIJ3z_bIK6SwokRz3XMu8xCPI8', 4.3,'{"breakfast_restaurant"}'),
        ('ChIJ23paVWmTwokRd0rp8kdKM0w', 4.8,'{}'),
        ('ChIJv0CFoxKTwokR4Sfgcmab1EI', 4.6,'{}'),
        ('ChIJfxSm1EyTwokRYGIgYm3dqls', 4.2,'{"brunch_restaurant"}'),
        ('ChIJK0BTQK6SwokRN5bYvABnbvU', 4,'{"coffee_shop","breakfast_restaurant","cafe"}'),
        ('ChIJxxDLVlGNwokRPgtjAbxyevY', 4.3,'{"american_restaurant","bar"}'),
        ('ChIJJZ99iq2SwokRkbZKRzJeoio', 4.6,'{"italian_restaurant"}'),
        ('ChIJ3dQdIsCSwokRs0eyh6JtnNU', 4.5,'{"italian_restaurant","pizza_restaurant","bar"}'),
        ('ChIJDYixUwKTwokRPRmLS0smLjY', 4.6,'{"bar"}'),
        ('ChIJu0cRRTKTwokRfNplZS8Lbjc', 4.4,'{"italian_restaurant"}'),
        ('ChIJBzAI6pKTwokRquXPFwGcFOA', 4.3,'{}'),
        ('ChIJG3TgE66SwokRX0scyzq-V6o', 4.4,'{"american_restaurant"}'),
        ('ChIJE4lzm8eSwokRiN93djbk0Ig', 4.1,'{"coffee_shop","breakfast_restaurant","cafe"}'),
        ('ChIJl4RjnqeTwokRgvrQWgt9EmY', 4.4,'{"american_restaurant"}'),
        ('ChIJN78jnMeSwokRpT5Sq_QGD58', 4.4,'{"indian_restaurant","bar"}'),
        ('ChIJqyTM-MeSwokRwtBPDSglPUg', 4.5,'{"italian_restaurant"}'),
        ('ChIJiUIlT3mTwokRrJDV5pZnTMs', 4.4,'{"pizza_restaurant","fast_food_restaurant"}'),
        ('ChIJ0aowaK6SwokRL-HTR_foN38', 4.4,'{"bar"}'),
        ('ChIJH-lolKzywokRCvohk-BdCT0', 3.8,'{"coffee_shop","breakfast_restaurant","fast_food_restaurant","cafe"}'),
        ('ChIJZReJaq6SwokRbZGfHBROUZU', 4.2,'{"american_restaurant","bar"}')`;
    const testValue1 = `values('ChIJlZuJwOiSwokRrJNNhf-PrWE', 4.5,'{"pizza_restaurant","italian_restaurant","bar"}'),
      ('ChIJZ7aROYmTwokRc95v_J8fw6o', 3,'{"vegan_restaurant","vegetarian_restaurant"}'),
      ('ChIJsdgOWwKTwokRFMerkmAr0cY', 4.5,'{"italian_restaurant","bar"}'),
      ('ChIJ3dQdIsCSwokRs0eyh6JtnNU', 4.5,'{"italian_restaurant","pizza_restaurant","bar"}'),
      ('ChIJ--5iQuiSwokR7jxhtfFChCw', 4.3,'{"italian_restaurant","pizza_restaurant"}'),
      ('ChIJvd_wzOiSwokRKwzdpR4KUM4', 4.2,'{"japanese_restaurant","sushi_restaurant"}'),
      ('ChIJdXWPRu-SwokRa_l7nmeaCKk', 4.5,'{"sandwich_shop"}'),
      ('ChIJDYixUwKTwokRPRmLS0smLjY', 4.6,'{"bar"}'),
      ('ChIJVQGVOAOTwokRTb7nlptnV4o', 4.1,'{"italian_restaurant","pizza_restaurant","bar"}'),
      ('ChIJc4PrvuiSwokRB9FSa4E-M2c', 4.5,'{"hamburger_restaurant","american_restaurant"}'),
      ('ChIJjzQuZOmSwokRJY6Tl0nn3TM', 4.4,'{"american_restaurant"}'),
      ('ChIJ9-DcCKKTwokRYUxQqy5dQlU', 4.5,'{"mexican_restaurant"}'),
      ('ChIJu0cRRTKTwokRfNplZS8Lbjc', 4.4,'{"italian_restaurant"}'),
      ('ChIJBzAI6pKTwokRquXPFwGcFOA', 4.3,'{}'),
      ('ChIJE4lzm8eSwokRiN93djbk0Ig', 4.1,'{"coffee_shop","breakfast_restaurant","cafe"}'),
      ('ChIJN78jnMeSwokRpT5Sq_QGD58', 4.4,'{"indian_restaurant","bar"}'),
      ('ChIJqyTM-MeSwokRwtBPDSglPUg', 4.5,'{"italian_restaurant"}'),
      ('ChIJW-Hq2ByTwokRL4y1jAbdAw4', 3.9,'{"coffee_shop","breakfast_restaurant","cafe"}'),
      ('ChIJ466AQ6aTwokRsYGb5D8a3s4', 4.6,'{"spanish_restaurant"}'),
      ('ChIJVV2WwceSwokR4t52AJ6MZ2M', 4.5,'{"bar"}')`;

    // console.log(sqlValueString);
    await restaurants_model.add_restaurants(place_ids);

    res.status(200).json({
      restaurantsMap: places_data,
      google_sql_string: sqlValueString,
      tag_map: tag_map,
      locationInfo: locationInfo,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

exports.update_google_data = async (req, res, next) => {
  try {
    // need lat, long, and radius
    const { location_id, location_coords, radius } = parse_location_data(
      req.body
    );
    console.log(req.decoded.member_id);
    if (!location_coords.length && location_id) {
      locationInfo = {
        location_id: "ChIJ-b2RmVlZwokRpb1pwEQjss0",
        location_coords: [40.752714, -73.97722689999999],
        address: "89 E 42nd St, New York, NY 10017, USA",
      };

      //   let key = process.env.PLACES_API_KEY;
      //   let { data } = await axios.get(
      //     `https://places.googleapis.com/v1/places/${location_id}`,
      //     {
      //       headers: {
      //         "X-Goog-Api-Key": key,
      //         "X-Goog-FieldMask": "id,formattedAddress,location",
      //       },
      //     }
      //   );
      //   locationInfo = {
      //     location_id: data.id,
      //     location_coords: [data.location.latitude, data.location.longitude],
      //     address: data.formattedAddress,
      //   };
    }

    const metersRadius = radius * MILES_TO_METERS;

    // get google data
    //let {data} = await axios.post(
    //   "https://places.googleapis.com/v1/places:searchNearby",
    //   {
    //     includedTypes: ["restaurant"],
    //     maxResultCount: 20,
    //     locationRestriction: {
    //       circle: {
    //         center: {
    //           latitude: latitude,
    //           longitude: longitude,
    //         },
    //         radius: metersRadius,
    //       },
    //     },
    //   },
    //   {
    //     headers: {
    //       "X-Goog-Api-Key": key,
    //       "X-Goog-FieldMask":
    //         "places.accessibilityOptions,places.addressComponents,places.formattedAddress,places.name,places.id,places.shortFormattedAddress,places.displayName,places.location,places.photos,places.types,places.primaryType,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.regularSecondaryOpeningHours,places.currentSecondaryOpeningHours,places.rating,places.userRatingCount,places.websiteUri",
    //     },
    //   }
    // );
    // console.log(data);
    // let places = data.places;

    let { sqlValueString, tag_map, place_ids, places_data } =
      process_google_data(places);

    await restaurants_model.update_google_restaurants(
      req.params.mealId,
      sqlValueString
    );

    await restaurants_model.add_restaurants(place_ids);

    res.status(200).json({
      restaurantsMap: places_data,
      google_sql_string: sqlValueString,
      tag_map: tag_map,
      locationInfo: locationInfo,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
};

function filter_by_hours(hoursList, date) {
  let weekday = date.getDay() - 1;
  if (weekday < 0) weekday = 6;
  let yesterday = weekday - 1;
  if (yesterday < 0) yesterday = 6;

  const processHoursString = (index, day) => {
    const hoursString = hoursList[index].split(": ")[1];
    console.log(hoursString);
    if (hoursString.trim() == "Closed") {
      return false;
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
        output[0] = Number(output[0]) + 12;
      } else if (output[0] == "1" && timeArr == "AM") {
        output[0] = "0";
      }

      let returnVal = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );

      returnVal.setHours(Number(output[0]) - index);
      returnVal.setMinutes(output[1]);

      return returnVal;
    });

    if (hours[1] < hours[0]) {
      hours[1].setDate(
        date.getDate() + 1,
        hours[1].getHours(),
        hours[1].getMinutes()
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

  if (date < hours[0]) {
    return (
      yesterdayHours && date >= yesterdayHours[0] && date <= yesterdayHours[1]
    );
  }
  return hours && date >= hours[0] && date <= hours[1];
}

function filter_by_budget(res_budget, budget_min, budget_max) {
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
  return restaurant_budget <= budget_max && restaurant_budget >= budget_min;
}

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

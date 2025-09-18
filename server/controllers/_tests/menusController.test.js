const { fetchAndLocateMenu, scrapeMenuPages } = require("../menusController");

const testUrls = [
  "http://thebronxvillediner.com/",
  "http://playabowls.com/",
  "https://lacasabronxville.com/",
  "https://thetacoproject.com/locations/bronxville/",
  "https://www.starbucks.com/store-locator/store/12029/",
  "http://www.underhillscrossing.com/",
  "http://theurbanhamlet.com/",
  "http://jcfogartys.com/",
  "http://ilbaciotrattoria.com/",
  "http://www.petesofbronxville.com/",
  "http://www.scaliniosteria.com/",
  "http://www.haikubronxvilleny.com/",
  "https://www.opafreshgreek.com/",
  "http://www.langesofbronxville.com/",
  "http://tredicisocial.com/",
  "http://www.wildgingerny.net/?utm_source=gmb&utm_medium=website",
  "http://thetavery.com/",
  "https://erniesbronxville.com/",
  "https://www.hunaniii.com/",
  "http://bacionepastashop.com/",
];

// describe("test fetch and locate", () => {
//   it("test with one url", async () => {
//     await fetchAndLocateMenu(testUrls[0]);
//   });
//   it("test 403 website", async () => {
//     await fetchAndLocateMenu(testUrls[8]);
//   });
//   //   it("test with all urls", async () => {
//   //     for (url of testUrls) {
//   //       await fetchAndLocateMenu(url);
//   //     }
//   //   });
// });

describe.skip("test scrape menu pages", () => {
  it("test with one url", async () => {
    let menuLinks = await scrapeMenuPages([testUrls[0]]);
    expect(Object.keys(menuLinks).length).toBe(1);
  });
  it("test with greek url", async () => {
    let menuLinks = await scrapeMenuPages(["https://www.opafreshgreek.com/"]);
    expect(Object.keys(menuLinks).length).toBe(1);
  });
  it("test with all urls", async () => {
    let menuLinks = await scrapeMenuPages(testUrls);
    console.log(menuLinks);
    expect(Object.keys(menuLinks).length).toBe(20);
  }, 90000);
});

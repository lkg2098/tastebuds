const sms = require("../sms");
const asyncHandler = require("express-async-handler");
const { generate_password_auth_token } = require("./auth");

exports.sendCode = asyncHandler(async (req, res, next) => {
  const phone_number = req.phone;

  sms.verify.v2
    .services(process.env.TWILIO_VERIFY_SID)
    .verifications.create({ to: process.env.TEST_PHONE, channel: "sms" })
    .then((verification) => {
      console.log(verification.sid);
      if (verification.sid && verification.status == "pending") {
        res.status(200).json({
          message: `Sent code to ${phone_number.replace(
            /\d(?=.*\d{2,}$)/g,
            "X"
          )}`,
        });
      } else {
        res
          .status(500)
          .json({ error: "Extrenal service error. Something went wrong" });
      }
    })
    .catch((err) => res.status(500).json({ error: err }));
});

exports.verifyCode = asyncHandler(async (req, res, next) => {
  if (
    req.url == "/signup" &&
    req.body.phone_number.replace(/\-| /g, "") != process.env.TEST_PHONE
  ) {
    console.log("HERE");
    next();
  } else {
    const { code } = req.body;
    let phone_number;
    if (req.body.phone_number) {
      phone_number = req.body.phone_number;
    } else if (req.phone) {
      phone_number = req.phone;
    }
    if (phone_number) {
      let cleanedPhone = phone_number.replace(/\-| /g, "");
      sms.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks.create({ to: process.env.TEST_PHONE, code: code })
        .then((verification_check) => {
          console.log(verification_check.status);
          if (verification_check.status == "approved") {
            next();
          } else if (verification_check.status == "failed") {
            res.status(401).json({ error: "Ivalid code." });
          } else if (verification_check.status == "expired") {
            res.status(410).json({ error: "This code has expired." });
          } else if (verification_check.status == "max_attempts_reached") {
            res
              .status(429)
              .json({ error: "Too many requests. try again later" });
          } else if (
            verification_check.status == "canceled" ||
            verification_check.status == "deleted"
          ) {
            res.status(404).json({
              error:
                "No verification code for this phone number. Please try sending again.",
            });
          } else {
            res
              .status(500)
              .json({ error: "Extrenal service error. Something went wrong" });
          }
        })
        .catch((err) => res.status(500).json({ error: err }));
    } else {
      res.status(401).json({ error: "No phone number provided" });
    }
  }
});

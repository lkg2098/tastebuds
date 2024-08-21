const sms = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

sms.sendCode = (phone_number) => {
  sms.verify.v2
    .services(process.env.TWILIO_VERIFY_SID)
    .verifications.create({ to: phone_number, channel: "sms" })
    .then((verification) => console.log(verification.sid));
};

sms.verifyCode = (phone_number, code) => {
  sms.verify.v2
    .services(process.env.TWILIO_VERIFY_SID)
    .verificationChecks.create({ to: phone_number, code: code })
    .then((verification_check) => console.log(verification_check.status));
};

module.exports = sms;

const sendEmail = require('./src/utils/emailSender');

(async () => {
  try {
    await sendEmail(
      "itsupikiokami113@gmail.com",
      "Test Ticket Email",
      "This is a test email",
      null
    );
    console.log("✅ Test email sent!");
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
})();
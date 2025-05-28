const otpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const storeOTP = (email, otp) => {
  console.log(`Stored OTP for ${email}: ${otp}, expires at ${new Date(Date.now() + 5 * 60 * 1000)}`);
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
};

const verifyOTP = (email, otp) => {
  const entry = otpStore.get(email);
  console.log(`Verifying OTP for ${email}: Provided OTP=${otp}, Stored Entry=`, entry);
  if (!entry) {
    console.log(`No OTP found for ${email}`);
    return false;
  }
  const isValid = entry.otp === otp && Date.now() <= entry.expires;
  console.log(`OTP verification: ${isValid}`);
  if (isValid) otpStore.delete(email); // One-time use
  return isValid;
};

// Clean up expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, { expires }] of otpStore.entries()) {
    if (now > expires) {
      otpStore.delete(email);
      console.log(`Cleaned expired OTP for ${email}`);
    }
  }
}, 10 * 60 * 1000);

module.exports = { generateOTP, storeOTP, verifyOTP };
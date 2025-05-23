const otpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const storeOTP = (email, otp) => {
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
};

const verifyOTP = (email, otp) => {
  const entry = otpStore.get(email);
  if (!entry) return false;
  const isValid = entry.otp === otp && Date.now() <= entry.expires;
  if (isValid) otpStore.delete(email); // One-time use
  return isValid;
};

module.exports = { generateOTP, storeOTP, verifyOTP };

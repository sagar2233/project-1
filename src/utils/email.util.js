const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: email,
    subject: 'Welcome to MechoTech – Your OTP Code Inside!',
    text: `
Hi there,

Welcome to MechoTech! We're excited to have you on board.

To get started, please use the following One-Time Password (OTP) to verify your email address:

🔐 OTP: ${otp}

This code is valid for the next 10 minutes. Please do not share this OTP with anyone.

If you did not request this code, please ignore this email or contact our support team immediately.

Thank you for joining MechoTech – let’s build something amazing together!

Warm regards,  
The MechoTech Team  
support@mechotech.com
    `,
  });
};


module.exports = { sendOTPEmail };

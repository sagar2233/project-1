const nodemailer = require('nodemailer');

   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: parseInt(process.env.SMTP_PORT) || 587,
     secure: process.env.SMTP_SECURE === 'true',
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS,
     },
   });

   const sendOTPEmail = async (email, otp) => {
     if (!email) throw new Error('No recipient email provided');
     if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
       throw new Error('Missing SMTP credentials');
     }

     const mailOptions = {
       from: `"Your App Name" <${process.env.SMTP_USER}>`,
       to: email,
       subject: 'Your OTP for Registration',
       text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
     };

     await transporter.sendMail(mailOptions);
     console.log(`OTP email sent to ${email}`);
   };

   module.exports = { sendOTPEmail };
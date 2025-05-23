const express = require('express');
const authRoutes = require('./routes/auth.routes');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

module.exports = app;

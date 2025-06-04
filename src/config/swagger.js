const path = require('path');

const express = require('express');


const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'API documentation for web and mobile clients',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server',
      },
    ],
  },

  apis: [path.join(__dirname, '../routes/*.js').replace(/\\/g, '/')],
};

console.log(path.join(__dirname, '../routes/*.js')); // Log the path to verify it's correct

const swaggerSpec = require('swagger-jsdoc')(options);
module.exports = swaggerSpec;


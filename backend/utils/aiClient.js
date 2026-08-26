const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 20000,
});

const getTaskBreakdown = async ({ title, description }) => {
  const { data } = await client.post('/breakdown', { title, description });
  return data;
};

const getDigest = async ({ tasks, userName }) => {
  const { data } = await client.post('/digest', { tasks, user_name: userName });
  return data;
};

module.exports = { getTaskBreakdown, getDigest };

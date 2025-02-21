const axios = require('axios');

exports.verifyCaptcha = async (req, res, next) => {
  const { captcha } = req.body;

  if (!captcha) {
    return res.status(400).json({ error: 'Captcha token is required' });
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captcha
        }
      }
    );

    const { success } = response.data;

    if (!success) {
      return res.status(400).json({ error: 'Invalid captcha' });
    }

    next();
  } catch (error) {
    console.error('Error verifying captcha:', error);
    return res.status(500).json({ error: 'Error verifying captcha' });
  }
};


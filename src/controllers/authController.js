const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer=require("nodemailer")
const { validateRegistrationInput, validateLoginInput } = require('../utils/validateUser');
const crypto = require('crypto');
// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
   
    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email'
      });
    }

    // Generate email content
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Your Password Recovery',
      html: `
        <h2>Password Recovery</h2>
        <p>Hello ${user.firstName},</p>
        <p>Your password is: <strong>${user.password}</strong></p>
        <p>Please login with this password and change it immediately for security purposes.</p>
        <p>Best regards,<br/>Your Application Team</p>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Password has been sent to your email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not send password to email'
    });
  }
};
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { error, isValid } = validateRegistrationInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error });
    }

    const {
      firstName,
      lastName,
      organizationName,
      email,
      password,
      mobile,
      landlineNo,
      address,
      state,
      city,
      pincode,
      ...rest
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        error: 'Email is already registered'
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      organizationName,
      email,
      password,
      mobile,
      landlineNo,
      address,
      state,
      city,
      pincode,
      ...rest
    });

    const verificationToken = user.createEmailVerificationToken();
    await user.save();
    const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject: 'Email Verification - Auction Platform',
      html: `
        <h2>Verify Your Email</h2>
        <p>Hello ${user.firstName},</p>
        <p>Thank you for registering with our auction platform. Please verify your email by clicking the link below:</p>
        <a href="${verificationURL}" style="padding: 10px 15px; background-color: rgb(209 43 63); color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you didn't create this account, please ignore this email.</p>
        <p>Best regards,<br/>The Auction Team</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Verification email sent successfully to:", user.email);
    } catch (error) {
      console.error("Error sending verification email:", error);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { errors, isValid } = validateLoginInput(req.body);
    if (!isValid) {
      return res.status(400).json({ errors });
    }
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email before logging in'
      });
    }
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error:'Invalid credentials'
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }
 
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    // User is already available from auth middleware
    const user = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};
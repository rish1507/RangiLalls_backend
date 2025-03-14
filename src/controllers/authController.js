const User = require('../models/User');
const AuctionBid = require('../models/AuctionBid');
const jwt = require('jsonwebtoken');
const nodemailer=require("nodemailer")
const { validateRegistrationInput, validateLoginInput } = require('../utils/validateUser');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Property = require("../models/Property")
const mongoose=require("mongoose")
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


// Update the forgot password controller to use tokens
exports.verifyResetToken = async (req, res) => {
  console.log("hi");
  try {
    const { token } = req.params;
    
    // Find user with this token and check if it's not expired
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(200).json({
        valid: false
      });
    }
    
    res.status(200).json({
      valid: true
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      valid: false,
      error: 'Could not verify token'
    });
  }
};

// Reset password using token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find user with this token and check if it's not expired
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Password reset token is invalid or has expired'
      });
    }
    
    // Update the user's password
    const salt = await bcrypt.genSalt(10);
    user.password = newPassword;
    
    // Clear the reset token fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not reset password'
    });
  }
};

// Update the forgot password controller to use tokens
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email'
      });
    }
    
    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token expiration (1 hour)
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    
    await user.save();
    
    // Create reset URL - adjust with your frontend URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Hello ${user.firstName || 'there'},</p>
          <p>You requested a password reset. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #FF6B00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
          <p>Regards,<br/>Rangi Lalls Team</p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not send password reset email'
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

exports.updateProfile = async (req, res) => {
  try {
    const { 
      firstName, lastName, organizationName, 
      mobile, landlineNo, pancardNo, 
      address, state, city, pincode,
      bankName, accountNo, ifscCode
    } = req.body;
    
    // Only update fields that are provided
    const updateData = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (organizationName) updateData.organizationName = organizationName;
    if (mobile) updateData.mobile = mobile;
    if (landlineNo !== undefined) updateData.landlineNo = landlineNo;
    if (pancardNo !== undefined) updateData.pancardNo = pancardNo;
    if (address !== undefined) updateData.address = address;
    if (state) updateData.state = state;
    if (city) updateData.city = city;
    if (pincode) updateData.pincode = pincode;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountNo !== undefined) updateData.accountNo = accountNo;
    if (ifscCode !== undefined) updateData.ifscCode = ifscCode;
    
    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating profile'
    });
  }
};
// Add property to interested list
exports.addInterestedProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    console.log(propertyId);
    const property = await Property.findOne({ _id: propertyId });
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    // Add to interested list if not already there
    const user = await User.findById(req.user._id);
    
    if (!user.interestedProperties.includes(propertyId)) {
      user.interestedProperties.push(propertyId);
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Property added to interested list'
    });
  } catch (error) {
    console.error('Error adding interested property:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating interested properties'
    });
  }
};

// Remove property from interested list
exports.removeInterestedProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // Find and update user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Remove from interested list
    user.interestedProperties = user.interestedProperties.filter(
      id => id.toString() !== propertyId
    );
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Property removed from interested list'
    });
  } catch (error) {
    console.error('Error removing interested property:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating interested properties'
    });
  }
};

// Get interested properties
exports.getInterestedProperties = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // If no interested properties, return empty array
    if (!user.interestedProperties || user.interestedProperties.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get all interested properties using Mongoose Population or find
    
    const properties = await Property.find({
      _id: { $in: user.interestedProperties }
    });
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Error fetching interested properties:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching interested properties'
    });
  }
};

// Get user's bidding history
exports.getUserBiddingHistory = async (req, res) => {
  try {
    // Get user bids
    const bids = await AuctionBid.find({ userId: req.user._id })
      .sort({ timestamp: -1 });
    
    // If no bids, return empty array
    if (!bids || bids.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get auction IDs from bids
    const auctionIds = [...new Set(bids.map(bid => bid.auctionId))];
    
    // Get property details for each auction using Mongoose model
    
    const properties = await Property.find({
      _id: { $in: auctionIds }
    });
    
    // Create a map of auction ID to property
    const propertyMap = new Map();
    properties.forEach(property => {
      propertyMap.set(property._id.toString(), property);
    });
    
    // Enhance each bid with property details and status
    const enhancedBids = bids.map(bid => {
      const property = propertyMap.get(bid.auctionId);
      
      // Determine if this is the highest bid for the auction
      const isWinningBid = bids
        .filter(b => b.auctionId === bid.auctionId)
        .sort((a, b) => b.amount - a.amount)[0]._id.toString() === bid._id.toString();
      
      // Determine if the auction is still active
      const auctionActive = isAuctionActive(property?.auctionDate);
      
      return {
        ...bid.toObject(),
        property,
        isWinningBid,
        auctionActive
      };
    });
    
    res.json({
      success: true,
      data: enhancedBids
    });
  } catch (error) {
    console.error('Error fetching bidding history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching bidding history'
    });
  }
};

// Helper function to check if auction is active
const isAuctionActive = (auctionDate) => {
  if (!auctionDate) return false;
  
  const auctionEndDate = new Date(auctionDate);
  // Set auction end time to 5 PM on auction day
  auctionEndDate.setHours(17, 0, 0, 0);
  
  // Compare with current time
  const now = new Date();
  
  return now <= auctionEndDate;
};
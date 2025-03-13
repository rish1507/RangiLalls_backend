const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required"],
    trim: true,
    maxLength: 30,
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
    trim: true,
  },
  organizationName: {
    type: String,
    required: [true, "Organization name is required"],
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    default: "India",
  },
  state: {
    type: String,
    required: [true, "State is required"],
  },
  city: {
    type: String,
    required: [true, "City is required"],
  },
  pincode: {
    type: String,
    required: [true, "Pincode is required"],
    match: [/^[1-9][0-9]{5}$/, "Please enter a valid pincode"],
  },
  landlineNo: {
    type: String,
  },
  mobile: {
    type: String,
    required: [true, "Mobile number is required"],
    match: [/^[0-9]{10}$/, "Please enter a valid mobile number"],
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  fax: {
    type: String,
  },
  pancardNo: {
    type: String,
    match: [
      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      "Please enter a valid PAN card number",
    ],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 8,
    select: false,
  },
  preferredLocation: {
    country: {
      type: String,
      default: "India",
    },
    state: String,
    city: String,
  },
  preferredIndustry: String,
  preferredSubIndustry: String,
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // New fields for profile management
  bankName: {
    type: String,
  },
  accountNo: {
    type: String,
  },
  ifscCode: {
    type: String,
  },
  
  interestedProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  
  bids: [{
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    amount: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
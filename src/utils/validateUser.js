// Validation functions for all user-related data
const validateRegistrationInput = (data) => {
  let error = null;
  
  // Validate First Name
  if (!data.firstName) {
      error = "First name is required";
  }
  else if (data.firstName.length > 30) {
      error = "First name cannot exceed 30 characters";
  }
  // Validate Last Name
  else if (!data.lastName) {
      error = "Last name is required";
  }
  // Validate Organization Name
  else if (!data.organizationName) {
      error = "Organization name is required";
  }
  // Validate Email
  else if (!data.email) {
      error = "Email is required";
  }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      error = "Invalid email format";
  }
  // Validate Password
  else if (!data.password) {
      error = "Password is required";
  }
  else if (data.password.length < 8) {
      error = "Password must be at least 8 characters";
  }
  else if (data.password.length > 20) {
      error = "Password must be less than 20 characters";
  }
  else if (!/\d/.test(data.password)) {
      error = "Password must contain at least 1 number";
  }
  else if (!/[a-zA-Z]/.test(data.password)) {
      error = "Password must contain at least 1 letter";
  }
  else if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
      error = "Password must contain at least 1 special character";
  }
  // Validate Confirm Password
  else if (!data.confirmPassword) {
      error = "Confirm password is required";
  }
  else if (data.password !== data.confirmPassword) {
      error = "Passwords do not match";
  }
  // Validate Mobile Number
  else if (!data.mobile) {
      error = "Mobile number is required";
  }
  else if (!/^[0-9]{10}$/.test(data.mobile)) {
      error = "Invalid mobile number format";
  }
  // Validate Landline (if provided)
  else if (data.landlineNo && !/^\d{2,4}[-]\d{6,8}$/.test(data.landlineNo)) {
      error = "Invalid landline number format (e.g., 022-12345678)";
  }
  // Validate Pincode
  else if (!data.pincode) {
      error = "Pincode is required";
  }
  else if (!/^[1-9][0-9]{5}$/.test(data.pincode)) {
      error = "Invalid pincode format";
  }
  // Validate PAN Card (if provided)
  else if (data.pancardNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pancardNo)) {
      error = "Invalid PAN card format";
  }
  // Validate State
  else if (!data.state) {
      error = "State is required";
  }
  // Validate City
  else if (!data.city) {
      error = "City is required";
  }
  // Check Terms Acceptance
  else if (!data.acceptTerms) {
      error = "You must accept the terms and conditions";
  }

  return {
      error,
      isValid: !error
  };
};
const validateLoginInput = (data) => {
  let error = null;

  // Validate Email
  if (!data.email) {
      error = "Email is required";
  }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      error = "Invalid email format";
  }
  // Validate Password
  else if (!data.password) {
      error = "Password is required";
  }

  return {
      error,
      isValid: !error
  };
};

const validateProfileUpdate = (data) => {
  let error = null;

  // Validate First Name (if provided)
  if (data.firstName && data.firstName.length > 30) {
      error = "First name cannot exceed 30 characters";
  }
  // Validate Mobile (if provided)
  else if (data.mobile && !/^[0-9]{10}$/.test(data.mobile)) {
      error = "Invalid mobile number format";
  }
  // Validate PAN Card (if provided)
  else if (data.pancardNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pancardNo)) {
      error = "Invalid PAN card format";
  }
  // Validate Pincode (if provided)
  else if (data.pincode && !/^[1-9][0-9]{5}$/.test(data.pincode)) {
      error = "Invalid pincode format";
  }

  return {
      error,
      isValid: !error
  };
};

const validatePasswordChange = (data) => {
  let error = null;

  // Validate Current Password
  if (!data.currentPassword) {
      error = "Current password is required";
  }
  // Validate New Password
  else if (!data.newPassword) {
      error = "New password is required";
  }
  else if (data.newPassword.length < 8) {
      error = "Password must be at least 8 characters";
  }
  else if (data.newPassword.length > 20) {
      error = "Password must be less than 20 characters";
  }
  else if (!/\d/.test(data.newPassword)) {
      error = "Password must contain at least 1 number";
  }
  else if (!/[a-zA-Z]/.test(data.newPassword)) {
      error = "Password must contain at least 1 letter";
  }
  else if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.newPassword)) {
      error = "Password must contain at least 1 special character";
  }
  // Validate Confirm New Password
  else if (!data.confirmNewPassword) {
      error = "Confirm new password is required";
  }
  else if (data.newPassword !== data.confirmNewPassword) {
      error = "Passwords do not match";
  }

  return {
      error,
      isValid: !error
  };
};
  
  module.exports = {
    validateRegistrationInput,
    validateLoginInput,
    validateProfileUpdate,
    validatePasswordChange
  };
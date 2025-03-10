// controllers/adminController.js
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User =require("../models/User")
const AuctionRegistration=require("../models/AuctionRegistration")
const { v4: uuidv4 } = require('uuid'); // Import UUID package
// Get property count
exports.getPropertyCount = async (req, res) => {
  try {
    const count = await Property.countDocuments();
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error counting properties:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Upload properties from Excel
exports.uploadProperties = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const propertiesData = XLSX.utils.sheet_to_json(sheet);

    if (propertiesData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data found in Excel sheet'
      });
    }
    // Validate required fields
    
    
    const cleanedPropertiesData = propertiesData.map(property => {
      const cleanedProperty = {};
      
      // Clean keys by trimming whitespace
      Object.keys(property).forEach(key => {
        const cleanKey = key.trim();
        cleanedProperty[cleanKey] = property[key];
      });
      
      return cleanedProperty;
    });
    // Process properties for insertion
    const processedProperties = cleanedPropertiesData.map(property => {
      // Ensure numeric fields are stored as numbers
  
      if (property['CIF ID']) property['CIF ID'] = Number(property['CIF ID']);
     

      if (property['Auction Date'] && typeof property['Auction Date'] === 'number') {
        property['Auction Date'] = excelDateToString(property['Auction Date']);
      }
      
      if (property['EMD Submission'] && typeof property['EMD Submission'] === 'number') {
        property['EMD Submission'] = excelDateToString(property['EMD Submission']);
      }
      
      if (property['Date'] && typeof property['Date'] === 'number') {
        property['Date'] = excelDateToString(property['Date']);
      }
      return {
        ...property,
        'Auction ID': uuidv4(),
        bids: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    // Use bulk operations for better performance
    const result = await mongoose.connection.db.collection('Properties').bulkWrite(
      processedProperties.map(property => ({
        updateOne: {
          filter: { 'Auction ID': property['Auction ID'] },
          update: { $set: property },
          upsert: true
        }
      }))
    );

    res.json({
      success: true,
      count: result.upsertedCount + result.modifiedCount,
      message: `Successfully processed ${result.upsertedCount + result.modifiedCount} properties`
    });
  } catch (error) {
    console.error('Error uploading properties:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error processing Excel file'
    });
  }
};

// Helper function to parse excel date in format "DD-MMM-YY"
function excelDateToString(excelDate) {
  // Excel dates are number of days since 12/30/1899
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  const day = date.getDate().toString().padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  
  return `${day}-${month}-${year}`;
}
// Helper to check if two dates are the same day
// controllers/adminController.js - add these functions

// Get all auction registrations
exports.getAllRegistrations = async (req, res) => {
  try {
    const registrations = await AuctionRegistration.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Update registration status
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const registration = await AuctionRegistration.findById(registrationId);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }
    
    // Update status
    registration.status = status;
    
    // If approving, generate confirmation code
    if (status === 'approved' && !registration.confirmationCode) {
      registration.confirmationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    
    await registration.save();
    
    // Send email notification based on status
    await sendStatusUpdateEmail(registration);
    
    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Helper function to send email notifications
const sendStatusUpdateEmail = async (registration) => {
  try {
    const user = await User.findById(registration.user);
    if (!user) return;
    
    let subject, message;
    
    switch (registration.status) {
      case 'approved':
        subject = 'Your Auction Registration is Approved';
        message = `
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Your registration for auction ID: ${registration.auctionId} has been approved.</p>
        `;
        break;
      case 'rejected':
        subject = 'Your Auction Registration Status';
        message = `
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>We regret to inform you that your registration for auction ID: ${registration.auctionId} has been rejected.</p>
          <p>Please contact our support team for more information.</p>
        `;
        break;
      default:
        return; // Don't send email for pending status
    }
    
    // Send email (using your existing email function)
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject,
      html: message
    };
    
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending status update email:', error);
  }
};

// In adminController.js
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total properties count
    const totalProperties = await mongoose.connection.db.collection("Properties").countDocuments();
    // Get pending registrations count
    const pendingRegistrations = await AuctionRegistration.countDocuments({ status: 'pending' });
    
    // Get active auctions count (auctions happening today)
    const today = new Date();
    const todayStr = `${today.getDate()}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][today.getMonth()]}-${today.getFullYear().toString().slice(-2)}`;
    const activeAuctions = await mongoose.connection.db.collection("Properties").countDocuments({ "Auction Date": todayStr });
    
    res.json({
      success: true,
      data: {
        totalProperties,
        pendingRegistrations,
        activeAuctions
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
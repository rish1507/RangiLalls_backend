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
    
    // Log raw headers to debug
    const rawHeaders = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log('Raw Excel Headers:', rawHeaders);
    
    const propertiesData = XLSX.utils.sheet_to_json(sheet);

    if (propertiesData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data found in Excel sheet'
      });
    }

    // Clean keys and fix field formats
    const processedProperties = propertiesData.map(property => {
      // Create a new object with all properties
      const result = {};
      
      // Process each property
      Object.keys(property).forEach(key => {
        // Create a clean key by trimming whitespace
        const cleanKey = key.trim();
        
        // Special mapping for known problematic fields
        if (cleanKey === 'Reserve Price (Rs.)') {
          result['Reserve Price (Rs)'] = property[key];
        } 
        else if (cleanKey === 'CUSTOMER NAME' || cleanKey === ' CUSTOMER NAME ' || cleanKey === 'CUSTOMER NAME ') {
          result['CUSTOMER NAME'] = property[key];
        }
        else if (cleanKey === 'EMD Submission' || cleanKey === ' EMD Submission') {
          result['EMD Submission'] = property[key];
        }
        else {
          // Normal field, just copy it with the trimmed key
          result[cleanKey] = property[key];
        }
      });
      
      // Convert numeric fields
      if (result['CIF ID']) result['CIF ID'] = Number(result['CIF ID']);
      
      // Handle date conversions
      if (result['Auction Date'] && typeof result['Auction Date'] === 'number') {
        result['Auction Date'] = excelDateToString(result['Auction Date']);
      }
      
      if (result['EMD Submission'] && typeof result['EMD Submission'] === 'number') {
        result['EMD Submission'] = excelDateToString(result['EMD Submission']);
      }
      
      if (result['Date'] && typeof result['Date'] === 'number') {
        result['Date'] = excelDateToString(result['Date']);
      }
      
      // Add standard fields
      result['Auction ID'] = uuidv4();
      result['createdAt'] = new Date();
      result['updatedAt'] = new Date();
      
      return result;
    });
    
    // Log a processed property to verify
    console.log('First processed property:', JSON.stringify(processedProperties[0], null, 2));

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

exports.getAuctionRegistrations = async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    if (!auctionId) {
      return res.status(400).json({
        success: false,
        error: 'Auction ID is required'
      });
    }
    
    // Query by 'auctionId' field - note this field in MongoDB is "Auction ID" as stored in Properties collection
    const registrations = await AuctionRegistration.find({ auctionId: auctionId })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching auction registrations:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Update an auction
exports.updateAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const updates = req.body;
    
    if (!auctionId) {
      return res.status(400).json({
        success: false,
        error: 'Auction ID is required'
      });
    }
    
    // Prevent updating the Auction ID itself
    if (updates['Auction ID']) {
      delete updates['Auction ID'];
    }
    
    // Add updatedAt timestamp
    updates.updatedAt = new Date();
    
    const result = await mongoose.connection.db.collection("Properties").updateOne(
      { "Auction ID": auctionId },
      { $set: updates }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Auction updated successfully'
    });
  } catch (error) {
    console.error('Error updating auction:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Delete an auction
exports.deleteAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    if (!auctionId) {
      return res.status(400).json({
        success: false,
        error: 'Auction ID is required'
      });
    }
    
    const result = await mongoose.connection.db.collection("Properties").deleteOne({ "Auction ID": auctionId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Auction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting auction:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.addProperty = async (req, res) => {
  try {
    const propertyData = req.body;
    
    if (!propertyData['Auction ID']) {
      return res.status(400).json({
        success: false,
        error: 'Auction ID is required'
      });
    }
    
    // Validate required fields
    const requiredFields = [
      'Loan Account No',
      'CIF ID',
      'CUSTOMER NAME',
      'Property Location (City)',
      'State',
      'Property Type',
      'Types of Possession',
      'Reserve Price (Rs)',
      'EMD Submission',
      'Auction Date'
    ];
    
    for (const field of requiredFields) {
      if (!propertyData[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`
        });
      }
    }
    const auctionId = uuidv4();
    propertyData['Auction ID'] = auctionId;
    // Add timestamps
    propertyData.createdAt = new Date();
    propertyData.updatedAt = new Date();
    
    // Ensure bids array exists
    if (!propertyData.bids) {
      propertyData.bids = [];
    }
    
    // Insert the property into MongoDB
    const result = await mongoose.connection.db.collection('Properties').insertOne(propertyData);
    
    if (result.acknowledged) {
      res.json({
        success: true,
        message: 'Property added successfully',
        propertyId: result.insertedId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add property'
      });
    }
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};
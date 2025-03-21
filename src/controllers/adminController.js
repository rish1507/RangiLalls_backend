// controllers/adminController.js
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const Property = require("../models/Property");
const User = require("../models/User");
const AuctionRegistration = require("../models/AuctionRegistration");
const AuctionBid = require('../models/AuctionBid');

/**
 * @desc    Get all completed auction reports
 * @route   GET /api/admin/auction-reports
 * @access  Private/Admin
 */
exports.getAuctionReports = async (req, res) => {
  try {
    // Get all properties with auctions that have ended
    const currentDate = new Date();
    const properties = await Property.find({
      auctionDate: { $lt: currentDate } // Only include past auctions
    }).sort({ auctionDate: -1 });

    // Create the auction reports
    const reports = await Promise.all(
      properties.map(async property => {
        // Get all bids for this auction
        const bids = await AuctionBid.find({ auctionId: property._id.toString() })
          .sort({ amount: -1 });

        // Count unique bidders (participants)
        const uniqueBidderIds = [...new Set(bids.map(bid => bid.userId.toString()))];
        
        // Get bidder details for the highest bid
        let highestBidderName = 'No bids';
        if (bids.length > 0) {
          const highestBidder = await User.findById(bids[0].userId);
          if (highestBidder) {
            highestBidderName = `${highestBidder.firstName} ${highestBidder.lastName}`;
          }
        }

        // Count approved registrations
        const registrationCount = await AuctionRegistration.countDocuments({
          auctionId: property._id,
          status: 'approved'
        });

        // Return report data
        return {
          _id: property._id,
          auctionId: property._id.toString(),
          propertyType: property.propertyType,
          propertyLocation: property.propertyLocation,
          state: property.state,
          customerName: property.customerName,
          auctionDate: property.auctionDate,
          reservePrice: property.reservePrice,
          totalBids: bids.length,
          highestBid: bids.length > 0 ? bids[0].amount : 0,
          highestBidder: highestBidderName,
          registeredParticipants: registrationCount,
          activeBidders: uniqueBidderIds.length,
          bids: bids.map(bid => ({ amount: bid.amount, timestamp: bid.timestamp })) // Just basic bid data
        };
      })
    );

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Error generating auction reports:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating auction reports'
    });
  }
};

/**
 * @desc    Get auction report for a specific auction
 * @route   GET /api/admin/auction-reports/:auctionId
 * @access  Private/Admin
 */
exports.getAuctionReportById = async (req, res) => {
  try {
    const { auctionId } = req.params;

    // Get auction property
    const property = await Property.findById(auctionId);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    // Get all bids for this auction
    const bids = await AuctionBid.find({ auctionId: property._id.toString() })
      .sort({ amount: -1 });

    // Map the bids with user details
    const bidsWithDetails = await Promise.all(
      bids.map(async (bid) => {
        const user = await User.findById(bid.userId);
        return {
          amount: bid.amount,
          timestamp: bid.timestamp,
          bidder: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
          organization: user ? user.organizationName : 'N/A'
        };
      })
    );

    // Count unique bidders
    const uniqueBidderIds = [...new Set(bids.map(bid => bid.userId.toString()))];

    // Count approved registrations
    const registrationCount = await AuctionRegistration.countDocuments({
      auctionId: property._id,
      status: 'approved'
    });

    // Return report data
    const report = {
      _id: property._id,
      auctionId: property._id.toString(),
      propertyType: property.propertyType,
      propertyLocation: property.propertyLocation,
      state: property.state,
      customerName: property.customerName,
      auctionDate: property.auctionDate,
      reservePrice: property.reservePrice,
      totalBids: bids.length,
      highestBid: bids.length > 0 ? bids[0].amount : 0,
      highestBidder: bidsWithDetails.length > 0 ? bidsWithDetails[0].bidder : 'No bids',
      registeredParticipants: registrationCount,
      activeBidders: uniqueBidderIds.length,
      bids: bidsWithDetails
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error(`Error generating auction report for auction ${req.params.auctionId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error generating auction report'
    });
  }
};
// Get property count
exports.getPropertyCount = async (req, res) => {
  try {
    const count = await Property.countDocuments();

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error counting properties:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// Upload properties from Excel
exports.uploadProperties = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Log raw headers to debug
    const rawHeaders = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    const propertiesData = XLSX.utils.sheet_to_json(sheet);
    console.log(propertiesData.length);
    if (propertiesData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No data found in Excel sheet",
      });
    }

    // Define required fields
    const requiredFields = [
      "Loan Account No",
      "CIF ID",
      "CUSTOMER NAME",
      "ZONE",
      "REGION",
      "Property Location (City)",
      "State",
      "Property Type",
      "Vendor",
      "Types of  Possession",
      "Reserve Price (Rs.)",
      "EMD Submission",
      "Auction Date",
      "Property Schedule",
    ];

    // First, validate the Excel headers
    const excelHeaders = new Set(rawHeaders.map((header) => header.trim()));
    const missingHeaders = [];

    // Check for missing headers with flexibility for different formats
    requiredFields.forEach((field) => {
      // Special case for Reserve Price which might be in different formats
      if (field === "Reserve Price (Rs.)") {
        if (
          !excelHeaders.has("Reserve Price (Rs.)") &&
          !excelHeaders.has("Reserve Price (Rs)") &&
          !excelHeaders.has("Reserve Price")
        ) {
          missingHeaders.push(field);
        }
      }
      // Special case for EMD Submission which might have a space prefix
      else if (field === "EMD Submission") {
        if (!excelHeaders.has("EMD Submission")) {
          missingHeaders.push(field);
        }
      }
      // Special case for CUSTOMER NAME which might have spaces
      if (!excelHeaders.has("CUSTOMER NAME")) {
        missingHeaders.push("CUSTOMER NAME");
      }
      // Normal case
      else if (!excelHeaders.has(field)) {
        missingHeaders.push(field);
      }
    });

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Excel file is missing required columns: ${missingHeaders.join(
          ", "
        )}`,
      });
    }

    // Clean keys and fix field formats
    const processedProperties = propertiesData.map((property, index) => {
      // Create a new object with all properties
      const result = {};

      // Process each property
      Object.keys(property).forEach((key) => {
        // Create a clean key by trimming whitespace
        const cleanKey = key.trim();

        // Special mapping for known problematic fields
        if (cleanKey === "Reserve Price (Rs.)") {
          result["Reserve Price (Rs)"] = property[key];
        } else if (cleanKey === "CUSTOMER NAME") {
          result["CUSTOMER NAME"] = property[key];
        } else if (cleanKey === "EMD Submission") {
          result["EMD Submission"] = property[key];
        } else {
          // Normal field, just copy it with the trimmed key
          result[cleanKey] = property[key];
        }
      });

      // Validate individual row data
      const missingFields = [];
      const normalizedRequiredFields = [
        "Loan Account No",
        "CIF ID",
        "CUSTOMER NAME",
        "ZONE",
        "REGION",
        "Property Location (City)",
        "State",
        "Property Type",
        "Vendor",
        "Types of  Possession",
        "Reserve Price (Rs)", // Note: Normalized to the format we use in the database
        "EMD Submission",
        "Auction Date",
        "Property Schedule",
      ];

      normalizedRequiredFields.forEach((field) => {
        if (
          result[field] === undefined ||
          result[field] === null ||
          result[field] === ""
        ) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        throw new Error(
          `Row ${index + 2} (${
            result["CUSTOMER NAME"] || "Unknown"
          }) is missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Convert numeric fields
      if (result["CIF ID"]) result["CIF ID"] = Number(result["CIF ID"]);

      // Handle date conversions
      if (
        result["Auction Date"] &&
        typeof result["Auction Date"] === "number"
      ) {
        result["Auction Date"] = excelDateToString(result["Auction Date"]);
      }

      if (
        result["EMD Submission"] &&
        typeof result["EMD Submission"] === "number"
      ) {
        result["EMD Submission"] = excelDateToString(result["EMD Submission"]);
      }

      if (result["Date"] && typeof result["Date"] === "number") {
        result["Date"] = excelDateToString(result["Date"]);
      }

      // Convert Reserve Price to number
      if (result["Reserve Price (Rs)"]) {
        const price = Number(result["Reserve Price (Rs)"]);
        if (isNaN(price)) {
          throw new Error(
            `Row ${index + 2} (${
              result["CUSTOMER NAME"] || "Unknown"
            }) has an invalid Reserve Price: ${result["Reserve Price (Rs)"]}`
          );
        }
        result["Reserve Price (Rs)"] = price;
      }

      // Add standard fields
      result["createdAt"] = new Date();
      result["updatedAt"] = new Date();

      return result;
    });

    const results = [];
    for (const prop of processedProperties) {
      // Convert to schema-friendly format
      const propertyData = {
        loanAccountNo: prop["Loan Account No"],
        cifId: prop["CIF ID"],
        customerName: prop["CUSTOMER NAME"],
        zone: prop["ZONE"],
        region: prop["REGION"],
        propertyLocation: prop["Property Location (City)"],
        state: prop["State"],
        propertyType: prop["Property Type"],
        vendor : prop["Vendor"],
        possessionType: prop["Types of  Possession"],
        reservePrice: prop["Reserve Price (Rs)"],
        emdSubmission: new Date(prop["EMD Submission"]), // Convert to Date
        auctionDate: new Date(prop["Auction Date"]), // Convert to Date
        propertySchedule: prop["Property Schedule"],
      };
      // Find and update or create
      const property = await Property.findOneAndUpdate(
        { propertySchedule: propertyData.propertySchedule }, // Unique identifier
        propertyData,
        { upsert: true, new: true }
      );

      results.push(property);
    }

    res.json({
      success: true,
      count: results.length,
      message: `Successfully processed ${results.length} properties`,
    });
  } catch (error) {
    console.error("Error uploading properties:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error processing Excel file",
    });
  }
};
// Helper function to parse excel date in format "DD-MMM-YY"
function excelDateToString(excelDate) {
  // Excel dates are number of days since 12/30/1899
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  const day = date.getDate().toString().padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
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
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// Update registration status
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status value",
      });
    }

    const registration = await AuctionRegistration.findById(registrationId);

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Registration not found",
      });
    }

    // Update status
    registration.status = status;

    // If approving, generate confirmation code
    if (status === "approved" && !registration.confirmationCode) {
      registration.confirmationCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
    }

    await registration.save();

    // Send email notification based on status
    await sendStatusUpdateEmail(registration);

    res.json({
      success: true,
      data: registration,
    });
  } catch (error) {
    console.error("Error updating registration status:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
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
      case "approved":
        subject = "Your Auction Registration is Approved";
        message = `
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Your registration for auction ID: ${registration.auctionId} has been approved.</p>
        `;
        break;
      case "rejected":
        subject = "Your Auction Registration Status";
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
      html: message,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending status update email:", error);
  }
};

// In adminController.js
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total properties count
    const totalProperties = await mongoose.connection.db
      .collection("Properties")
      .countDocuments();
    // Get pending registrations count
    const pendingRegistrations = await AuctionRegistration.countDocuments({
      status: "pending",
    });

    // Get active auctions count (auctions happening today)
    const today = new Date();
    const todayStr = `${today.getDate()}-${
      [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][today.getMonth()]
    }-${today.getFullYear().toString().slice(-2)}`;
    const activeAuctions = await mongoose.connection.db
      .collection("Properties")
      .countDocuments({ "Auction Date": todayStr });

    res.json({
      success: true,
      data: {
        totalProperties,
        pendingRegistrations,
        activeAuctions,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

exports.getAuctionRegistrations = async (req, res) => {
  try {
    const { auctionId } = req.params;

    if (!auctionId) {
      return res.status(400).json({
        success: false,
        error: "Auction ID is required",
      });
    }

    // Query by 'auctionId' field - note this field in MongoDB is "Auction ID" as stored in Properties collection
    const registrations = await AuctionRegistration.find({
      auctionId: auctionId,
    })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    console.error("Error fetching auction registrations:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
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
        error: "Auction ID is required",
      });
    }

    // Prevent updating the Auction ID itself
    if (updates["Auction ID"]) {
      delete updates["Auction ID"];
    }

    // Add updatedAt timestamp
    updates.updatedAt = new Date();

    const result = await Property.findByIdAndUpdate(auctionId, updates, { new: true });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Auction not found",
      });
    }

    res.json({
      success: true,
      message: "Auction updated successfully",
    });
  } catch (error) {
    console.error("Error updating auction:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
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
        error: "Auction ID is required",
      });
    }

    const result = await mongoose.connection.db
      .collection("Properties")
      .deleteOne({ "Auction ID": auctionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Auction not found",
      });
    }

    res.json({
      success: true,
      message: "Auction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting auction:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

exports.addProperty = async (req, res) => {
  try {
    const propertyData = req.body;
    console.log(propertyData);
    // Validate required fields
    const requiredFields = [
      "loanAccountNo",
      "cifId",
      "customerName",
      "zone",
      "region",
      "propertyLocation",
      "state",
      "propertyType",
      "vendor",
      "possessionType",
      "reservePrice",
      "emdSubmission",
      "auctionDate",
      "propertySchedule",
    ];
    
    for (const field of requiredFields) {
      if (!propertyData[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`,
        });
      }
    }
    
    // Parse dates if they're strings
    if (typeof propertyData.emdSubmission === 'string') {
      propertyData.emdSubmission = new Date(propertyData.emdSubmission);
    }
    
    if (typeof propertyData.auctionDate === 'string') {
      propertyData.auctionDate = new Date(propertyData.auctionDate);
    }
    
    // Create a new property using the Mongoose model
    const savedProperty = await Property.create(propertyData);
    
    // Save the property
    
    res.json({
      success: true,
      message: "Property added successfully",
      propertyId: savedProperty._id,
      property: savedProperty
    });
  } catch (error) {
    console.error("Error adding property:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
};
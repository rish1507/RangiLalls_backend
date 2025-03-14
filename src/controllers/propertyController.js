// src/controllers/propertyController.js
const Property = require('../models/Property');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const mongoose = require("mongoose");

exports.getProperties = async (req, res) => {
  try {
    // Get all properties from the collection
    const properties = await Property.find({}).lean();
    console.log(properties.length);
    // Get current date for comparison
    const currentDate = new Date();
    
    // Function to parse date in format "DD-MMM-YY" (e.g., "11-Mar-25")
    const parseAuctionDate = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return null;
      
      // Split the date string
      const parts = dateStr.split('-');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0], 10);
      const month = parts[1]; // Month abbreviation (e.g., 'Mar')
      let year = parseInt(parts[2], 10);
      
      // Convert 2-digit year to 4-digit year (assuming 20xx for years < 50)
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      
      // Create a date string in a format JavaScript can parse
      const dateString = `${day} ${month} ${year}`;
      return new Date(dateString);
    };
    
    // Sort properties: expired auctions last, active auctions first
    const sortedProperties = properties.sort((a, b) => {
      // Parse auction dates
      const auctionDateA = parseAuctionDate(a["Auction Date"]);
      const auctionDateB = parseAuctionDate(b["Auction Date"]);
      
      // Check if auction dates are valid
      const isValidDateA = auctionDateA && !isNaN(auctionDateA.getTime());
      const isValidDateB = auctionDateB && !isNaN(auctionDateB.getTime());
      
      // Check if auctions are expired
      const isExpiredA = isValidDateA && auctionDateA < currentDate;
      const isExpiredB = isValidDateB && auctionDateB < currentDate;
      
      // Sort logic: expired auctions last
      if (isExpiredA && !isExpiredB) return 1;      // A is expired, B is not -> B comes first
      if (!isExpiredA && isExpiredB) return -1;     // A is not expired, B is -> A comes first
      
      // If both are expired or both are active, sort by date (nearest first)
      if (isValidDateA && isValidDateB) {
        return auctionDateA - auctionDateB;
      }
      
      // Handle cases where one or both dates are invalid
      if (!isValidDateA) return 1;  // Invalid dates go last
      if (!isValidDateB) return -1;
      
      return 0;
    });
    
    res.status(200).json({
      success: true,
      data: sortedProperties
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ error: "Error fetching properties" });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};
// src/controllers/propertyController.js
const Property = require('../models/Property');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const mongoose = require("mongoose");

exports.getProperties = async (req, res) => {
  try {
    const properties = await mongoose.connection.db.collection("Property").find().toArray();
    res.status(200).json({
      success: true,
      data: properties
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
// controllers/adminController.js
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Property = require('../models/Property');

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
      if (property['Reserve Price (Rs.)']) property['Reserve Price (Rs.)'] = Number(property['Reserve Price (Rs.)']);
      if (property['Auction ID']) property['Auction ID'] = Number(property['Auction ID']);

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

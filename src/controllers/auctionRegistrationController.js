const AuctionRegistration = require('../models/AuctionRegistration');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const numberToWords = require('number-to-words');
const cloudinary = require('cloudinary').v2;
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
  });
// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate EMD Challan PDF
const generateEMDChallan = async (registrationData) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `EMD_Challan_${registrationData.challanNo}.pdf`;
    const filePath = path.join(__dirname, '../temp', fileName);
    
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Title
    doc.fontSize(20).text('EMD Challan', { align: 'center' });
    doc.moveDown();

    // Content
    doc.fontSize(12);

    // Bank Name and Challan No (Single Line)
    const startX = 50; // Left margin
    const labelWidth = 150; // Fixed width for labels
    
    doc.font('Helvetica-Bold')
      .text('Bank Name / Branch:', startX, doc.y, { continued: true });
    doc.font('Helvetica')
      .text('  ____________________', { continued: true });
    
    doc.font('Helvetica-Bold')
      .text('  Challan No:', { continued: true });
    doc.font('Helvetica')
      .text(` ${registrationData.challanNo || '____________________'}`);
    doc.moveDown();

    // Helper function for aligned key-value pairs
    function writeKeyValue(label, value) {
      const y = doc.y;
      doc.font('Helvetica-Bold')
        .text(label, startX, y, { 
          width: labelWidth,
          continued: false
        });
      
      doc.font('Helvetica')
        .text(value, startX + labelWidth, y);
    }

    // Write aligned content
    writeKeyValue('Towards:', `${registrationData.firstName} ${registrationData.lastName}`);
    doc.moveDown();
    writeKeyValue('Auction Id:', registrationData.auctionId);
    doc.moveDown();
    writeKeyValue('EMD Amount:', `Rs. ${registrationData.emdAmount.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}/-`);
    doc.moveDown();

    // EMD A/C Details Section
    doc.font('Helvetica-Bold')
      .text('EMD A/C Details:', startX);
    doc.font('Helvetica')
      .text(
        `The Earnest Money Deposit is Rs.${registrationData.emdAmount}/- ` +
        `(${numberToWords.toWords(registrationData.emdAmount).toUpperCase()} ONLY) ` +
        `i.e. 10% of the Reserve Price, which shall be deposited through ${registrationData.paymentMode} ` +
        `to the credit of "Cholamandalam Investment and Finance Company Limited", before submitting the tender online.`,
        {
          width: doc.page.width - 2 * startX
        }
      );
    doc.moveDown();

    // Placeholder for Received From & Cheque No
    const receivedFromX = startX;
    const chequeNoX = doc.page.width / 2;
    
    doc.font('Helvetica-Bold')
      .text('Received From:', receivedFromX, doc.y, { continued: true });
    doc.font('Helvetica')
      .text('  ____________________', { continued: true });
    
    doc.font('Helvetica-Bold')
      .text('   Cheque No/Draft No:', { continued: true });
    doc.font('Helvetica')
      .text('  ____________________');

    // Finalize PDF
    doc.end();

    writeStream.on('finish', () => {
      resolve(filePath);
    });

    writeStream.on('error', reject);
  });
};


const sendEMDEmail = async (registrationData, challanPath) => {
  const emailContent = `
    <div style="font-family: Arial, sans-serif;">
      <h5 style="font-weight: bold; font-size: 18px;text-align: center;">Sub: Auction Focus EMD</h5>
      <p>Dear ${registrationData.firstName} ${registrationData.lastName},</p>

      <p>You have submitted earnest money for the following Auction: <br>
      Please find the attached challan copy.</p>

      <p><strong>Auction Date:</strong> ${new Date(registrationData.auctionDate).toLocaleDateString()}</p>
      <p><strong>Auction ID:</strong> ${registrationData.auctionId}</p>

      <p>Once your payment is confirmed, you will get a confirmation code, which you must use for bidding the first time in the e-auction.</p>

      <p>For further queries, contact us at: <strong>+91-9310367526 </strong> <br>
      or write to us at: <strong><a href="mailto:rangilallsauction@gmail.com">rangilallsauction@gmail.com</a></strong></p>
    </div>`;

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: registrationData.email,
    subject: 'EMD Challan - Auction Registration',
    html: emailContent, // Use 'html' instead of 'text'
    attachments: [{
      filename: 'EMD_Challan.pdf',
      path: challanPath
    }]
  };

  return transporter.sendMail(mailOptions);
};



// Controller functions
exports.registerForAuction = async (
  req, res) => {
  try {
    // Get user ID from authenticated request
    const userId = req.user._id;

    // Check if user has already registered for this auction
    const existingRegistration = await AuctionRegistration.findOne({
      user: userId,
      auctionId: req.body.auctionId
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered for this auction'
      });
    }

    // Generate challan number
    const challanNo = `CH${Date.now().toString().slice(-6)}`;
    
    // Calculate EMD amount (10% of offer value)
    const emdAmount = Math.round(req.body.offerValue * 0.1);
    
    // Handle file uploads
    const uploadToCloudinary = async (file, folder) => {
        try {
          const b64 = Buffer.from(file.buffer).toString('base64');
          let dataURI = "data:" + file.mimetype + ";base64," + b64;
          
          const result = await cloudinary.uploader.upload(dataURI, {
            folder: `auction-registrations/${folder}`,
            resource_type: 'auto'
          });
          return result.secure_url;
        } catch (error) {
          throw new Error(`Failed to upload ${folder}: ${error.message}`);
        }
      };
      // In your controller, modify the file upload calls:
      const pancardUrl = await uploadToCloudinary(req.files.pancardFile[0], 'pancard');
      const addressProofUrl = await uploadToCloudinary(req.files.addressProof[0], 'address-proof');
      const paymentReceiptUrl = req.files.paymentReceipt ? 
        await uploadToCloudinary(req.files.paymentReceipt[0], 'payment-receipts') : null;

    // Create registration record
    const registrationData = {
      ...req.body,
      user: userId,
      challanNo,
      emdAmount,
      pancardFile: pancardUrl,
      addressProof: addressProofUrl,
      paymentReceipt: paymentReceiptUrl,
      confirmationCode: uuidv4().slice(0, 8).toUpperCase()
    };

    const registration = await AuctionRegistration.create(registrationData);

    // Generate EMD Challan PDF
    const challanPath = await generateEMDChallan(registrationData);

    // Send email with challan
    await sendEMDEmail(registrationData, challanPath);

    // Clean up temporary PDF file
    fs.unlink(challanPath, (err) => {
      if (err) console.error('Error deleting temporary challan file:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. EMD Challan has been sent to your email.',
      data: registration
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Get all registrations for a user
exports.getUserRegistrations = async (req, res) => {
  try {
    const registrations = await AuctionRegistration.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get specific registration details
exports.getRegistrationDetails = async (req, res) => {
  try {
    const registration = await AuctionRegistration.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


exports.checkAuctionAccess = async (req, res) => {
  try {
    const { auctionId } = req.params;
    console.log(auctionId,req.user._id);
    const registration = await AuctionRegistration.findOne({
      auctionId,
      user: req.user._id,
      status: 'approved'
    });
    if (!registration) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to participate in this auction'
      });
    }
    
    // Check if auction is live
    const auctionDate = new Date(registration.auctionDate).toDateString();
    const today = new Date().toDateString();

    if (auctionDate < today) {
      return res.status(403).json({
        success: false,
        error: 'This auction is not currently live'
      });
    }

    res.json({
      success: true,
      message: 'Access granted to auction'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error checking auction access'
    });
  }
};

// Get user's registered auctions
exports.getRegisteredAuctions = async (req, res) => {
  try {
    const registrations = await AuctionRegistration.find({
      user: req.user._id,
      status: 'approved'
    });

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching registered auctions'
    });
  }
};
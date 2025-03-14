const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  loanAccountNo: {
    type: String,
    required: true,
    trim: true
  },
  cifId: {
    type: Number,
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  zone:{
    type:String,
    required:true,
    trim :true
  },
  region :{
    type:String,
    required:true,
    trim :true
  },
  propertyLocation: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  propertyType: {
    type: String,
    required: true
  },
  possessionType: {
    type: String,
    required: true
  },
  reservePrice: {
    type: Number,
    required: true
  },
  vendor: {
    type: String,
    required: true
  },
  emdSubmission: {
    type: Date,
    required: true
  },
  auctionDate: {
    type: Date,
    required: true
  },
  propertySchedule: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('properties', propertySchema);
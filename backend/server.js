const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Connect to MongoDB (optional)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-financing';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
    msmeAddress: String,
    buyerAddress: String,
    invoiceAmount: Number,
    dueDate: Date,
    invoiceNumber: String,
    description: String,
    documentHash: String,
    riskScore: Number,
    status: { type: String, default: 'pending' }, // pending, financed, settled, defaulted
    createdAt: { type: Date, default: Date.now },
    tokenId: Number
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Invoice Financing Backend is running' });
});

app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices', upload.single('document'), async (req, res) => {
    try {
        const invoiceData = {
            ...req.body,
            documentHash: req.file ? req.file.filename : null
        };
        
        const invoice = new Invoice(invoiceData);
        await invoice.save();
        
        res.status(201).json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const totalInvoices = await Invoice.countDocuments();
        const totalFinanced = await Invoice.countDocuments({ status: 'financed' });
        const activeInvestors = 5; // Placeholder
        
        res.json({
            totalInvoices,
            totalFinanced,
            defaultRate: '2.5%',
            activeInvestors
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});
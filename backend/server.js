// backend/server.js - Enhanced with real blockchain
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Web3 = require("web3");
const { ethers } = require("ethers");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Web3 setup
let web3;
let provider;
let isBlockchainConnected = false;
let invoiceNFTContract;
let financingContract;

// Initialize Web3
async function initializeBlockchain() {
    try {
        const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
        web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
        
        // Check connection
        const isListening = await web3.eth.net.isListening();
        if (isListening) {
            console.log('✅ Connected to blockchain at:', rpcUrl);
            isBlockchainConnected = true;
            
            // Get accounts
            const accounts = await web3.eth.getAccounts();
            console.log('Available accounts:', accounts.length);
            
            // Setup contracts if addresses are provided
            const invoiceNFTAddress = process.env.INVOICE_NFT_ADDRESS;
            const financingAddress = process.env.FINANCING_ADDRESS;
            
            if (invoiceNFTAddress && financingAddress) {
                // Load contract ABIs
                const invoiceNFTABI = require('./contracts/InvoiceNFT.json');
                const financingABI = require('./contracts/InvoiceFinancing.json');
                
                invoiceNFTContract = new web3.eth.Contract(
                    invoiceNFTABI.abi,
                    invoiceNFTAddress
                );
                
                financingContract = new web3.eth.Contract(
                    financingABI.abi,
                    financingAddress
                );
                
                console.log('✅ Smart contracts initialized');
            }
        }
    } catch (error) {
        console.log('⚠️ Blockchain not connected, running in demo mode');
        console.log('Error:', error.message);
    }
}

// In-memory database (for demo)
let invoices = [];
let users = [];
let investments = [];

// Sample data - UPDATED WITH PROPER IDs
const sampleInvoices = [
  {
    id: "inv_1",
    tokenId: "1",
    invoiceNumber: "INV-2024-001",
    msmeAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    buyerAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    amount: 5.8,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    riskScore: 750,
    description: "Web Development Services",
    documentHash: "QmSample1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "inv_2",
    tokenId: "2",
    invoiceNumber: "INV-2024-002",
    msmeAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    buyerAddress: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
    amount: 12.5,
    dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: "funded",
    riskScore: 620,
    description: "Manufacturing Equipment",
    documentHash: "QmSample2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "inv_3",
    tokenId: "3",
    invoiceNumber: "INV-2024-003",
    msmeAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    buyerAddress: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
    amount: 3.2,
    dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "settled",
    riskScore: 850,
    description: "Consulting Services",
    documentHash: "QmSample3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const sampleUsers = [
  {
    address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    type: "msme",
    kycStatus: "verified",
    totalInvested: 0,
    totalReturns: 0,
    createdAt: new Date().toISOString()
  },
  {
    address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    type: "investor",
    kycStatus: "verified",
    totalInvested: 150,
    totalReturns: 22.5,
    createdAt: new Date().toISOString()
  }
];

// Initialize with sample data
invoices = [...sampleInvoices];
users = [...sampleUsers];

// Helper functions
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Health Check - UPDATED TO ALWAYS RETURN DEMO MODE
app.get("/api/health", async (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    server: "InvoiceFinancing Backend",
    version: "1.0.0",
    database: "in-memory",
    blockchain: {
      status: 'disconnected',
      connected: false,
      contracts: {
        invoiceNFT: false,
        financing: false
      }
    }
  });
});

// Get Stats
app.get("/api/stats", (req, res) => {
  const totalInvoices = invoices.length;
  const fundedInvoices = invoices.filter(i => i.status === "funded").length;
  const settledInvoices = invoices.filter(i => i.status === "settled").length;
  const totalUsers = users.length;
  const totalInvestors = users.filter(u => u.type === "investor").length;
  
  const totalVolume = invoices
    .filter(i => i.status === "funded" || i.status === "settled")
    .reduce((sum, inv) => sum + inv.amount, 0);

  res.json({
    totalInvoices,
    totalFinanced: fundedInvoices + settledInvoices,
    defaultRate: "2.5%",
    activeInvestors: totalInvestors,
    totalVolume: `${totalVolume.toFixed(2)} ETH`,
    avgInvoiceSize: totalInvoices > 0 ? `${(totalVolume / totalInvoices).toFixed(2)} ETH` : "0 ETH",
    avgInterestRate: "12.5%",
    successRate: "97.5%",
    blockchain: {
      connected: isBlockchainConnected,
      message: isBlockchainConnected ? "Blockchain active" : "Demo mode"
    }
  });
});

// Get All Invoices - UPDATED WITH PROPER IDs
app.get("/api/invoices", (req, res) => {
  const { status, riskLevel } = req.query;
  
  let filteredInvoices = [...invoices];
  
  if (status) {
    filteredInvoices = filteredInvoices.filter(i => i.status === status);
  }
  
  if (riskLevel) {
    if (riskLevel === "low") {
      filteredInvoices = filteredInvoices.filter(i => i.riskScore >= 700);
    } else if (riskLevel === "medium") {
      filteredInvoices = filteredInvoices.filter(i => i.riskScore >= 400 && i.riskScore <= 699);
    } else if (riskLevel === "high") {
      filteredInvoices = filteredInvoices.filter(i => i.riskScore <= 399);
    }
  }
  
  // Ensure all invoices have proper IDs
  filteredInvoices = filteredInvoices.map(invoice => {
    if (!invoice.id || !invoice.id.startsWith('inv_')) {
      return {
        ...invoice,
        id: `inv_${Math.floor(Math.random() * 1000)}`,
        tokenId: invoice.tokenId || Math.floor(Math.random() * 1000).toString()
      };
    }
    return invoice;
  });
  
  // Sort by creation date (newest first)
  filteredInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(filteredInvoices.slice(0, 50)); // Limit to 50
});

// Create Invoice
app.post("/api/invoices", async (req, res) => {
  try {
    const { buyerAddress, amount, dueDate, invoiceNumber, description, riskScore, msmeAddress } = req.body;
    
    const newInvoice = {
      id: `inv_${Date.now()}`,
      tokenId: Date.now().toString(),
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      msmeAddress: (msmeAddress || "").toLowerCase(),
      buyerAddress: (buyerAddress || "").toLowerCase(),
      amount: parseFloat(amount) || 0,
      dueDate: new Date(dueDate).toISOString(),
      status: "pending",
      riskScore: parseInt(riskScore) || 500,
      description: description || "",
      documentHash: `Qm${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    invoices.push(newInvoice);
    
    // Update or create user
    const userIndex = users.findIndex(u => u.address.toLowerCase() === newInvoice.msmeAddress);
    if (userIndex === -1) {
      users.push({
        address: newInvoice.msmeAddress,
        type: "msme",
        kycStatus: "pending",
        totalInvested: 0,
        totalReturns: 0,
        createdAt: new Date().toISOString()
      });
    } else {
      users[userIndex].type = "msme";
      users[userIndex].updatedAt = new Date().toISOString();
    }
    
    res.json({
      success: true,
      message: "Invoice created successfully",
      invoice: newInvoice,
      blockchain: {
        required: false,
        simulated: true,
        message: "Demo mode - Invoice recorded in database only"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Investment - FIXED FOR DEMO MODE
app.post("/api/invest", async (req, res) => {
  try {
    const { tokenId, financingAmount, interestRate, investorAddress, invoiceId } = req.body;
    
    console.log('Investment request received:', { 
      tokenId, 
      financingAmount, 
      interestRate, 
      investorAddress, 
      invoiceId 
    });
    
    // Find the invoice
    const invoiceIndex = invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) {
      console.log('Invoice not found:', invoiceId);
      console.log('Available invoices:', invoices.map(i => i.id));
      return res.status(404).json({ 
        success: false,
        error: "Invoice not found",
        availableInvoices: invoices.map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber }))
      });
    }
    
    // Check if invoice is already funded
    if (invoices[invoiceIndex].status === 'funded') {
      return res.status(400).json({ 
        success: false,
        error: "Invoice already funded" 
      });
    }
    
    // Update invoice status
    invoices[invoiceIndex].status = 'funded';
    invoices[invoiceIndex].updatedAt = new Date().toISOString();
    
    // Create investment record
    const investment = {
      id: `invest_${Date.now()}`,
      invoiceId,
      tokenId: tokenId || invoices[invoiceIndex].tokenId || (invoiceIndex + 1).toString(),
      investorAddress: investorAddress.toLowerCase(),
      financingAmount: parseFloat(financingAmount),
      interestRate: parseFloat(interestRate),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    investments.push(investment);
    
    // Update investor stats
    let investor = users.find(u => u.address.toLowerCase() === investorAddress.toLowerCase());
    if (!investor) {
      investor = {
        address: investorAddress.toLowerCase(),
        type: "investor",
        kycStatus: "pending",
        totalInvested: parseFloat(financingAmount),
        totalReturns: 0,
        createdAt: new Date().toISOString()
      };
      users.push(investor);
    } else {
      investor.totalInvested += parseFloat(financingAmount);
      investor.updatedAt = new Date().toISOString();
    }
    
    res.json({
      success: true,
      message: "Investment submitted successfully",
      investment,
      blockchain: {
        required: false,
        simulated: true,
        message: "Demo mode - Investment recorded in database only"
      }
    });
    
  } catch (error) {
    console.error('Error submitting investment:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      simulated: true,
      note: "Running in demo mode due to error" 
    });
  }
});

// Get Investment Status
app.get("/api/investment/:id", (req, res) => {
  const investment = investments.find(i => i.id === req.params.id);
  if (!investment) {
    return res.status(404).json({ error: "Investment not found" });
  }
  
  const invoice = invoices.find(i => i.id === investment.invoiceId);
  
  res.json({
    investment,
    invoice,
    status: investment.status,
    estimatedReturn: investment.financingAmount * (investment.interestRate / 100)
  });
});

// Settle Invoice
app.post("/api/settle", async (req, res) => {
  try {
    const { invoiceId, settlementAmount, payerAddress } = req.body;
    
    const invoiceIndex = invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    if (invoices[invoiceIndex].status !== 'funded') {
      return res.status(400).json({ error: "Invoice must be funded to settle" });
    }
    
    // Update invoice status
    invoices[invoiceIndex].status = 'settled';
    invoices[invoiceIndex].updatedAt = new Date().toISOString();
    
    // Find related investments
    const relatedInvestments = investments.filter(i => i.invoiceId === invoiceId);
    
    // Update investor returns
    relatedInvestments.forEach(investment => {
      const investor = users.find(u => u.address.toLowerCase() === investment.investorAddress.toLowerCase());
      if (investor) {
        const returnAmount = investment.financingAmount * (investment.interestRate / 100);
        investor.totalReturns += returnAmount;
        investor.updatedAt = new Date().toISOString();
      }
      
      // Update investment status
      investment.status = 'settled';
      investment.settledAt = new Date().toISOString();
      investment.returnAmount = investment.financingAmount * (1 + investment.interestRate / 100);
    });
    
    res.json({
      success: true,
      message: "Invoice settled successfully",
      invoice: invoices[invoiceIndex],
      settlements: relatedInvestments.map(inv => ({
        investor: inv.investorAddress,
        principal: inv.financingAmount,
        interest: inv.financingAmount * (inv.interestRate / 100),
        totalReturn: inv.financingAmount * (1 + inv.interestRate / 100)
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Investments for an investor
app.get("/api/investments/:address", (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const investorInvestments = investments.filter(i => i.investorAddress.toLowerCase() === address);
    
    const detailedInvestments = investorInvestments.map(inv => {
      const invoice = invoices.find(i => i.id === inv.invoiceId);
      return {
        ...inv,
        invoice: invoice ? {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          status: invoice.status,
          dueDate: invoice.dueDate
        } : null
      };
    });
    
    res.json({
      success: true,
      address,
      totalInvestments: investorInvestments.length,
      activeInvestments: investorInvestments.filter(i => i.status === 'active').length,
      settledInvestments: investorInvestments.filter(i => i.status === 'settled').length,
      totalInvested: investorInvestments.reduce((sum, inv) => sum + inv.financingAmount, 0),
      totalReturns: investorInvestments.filter(i => i.status === 'settled')
        .reduce((sum, inv) => sum + (inv.returnAmount || 0), 0),
      investments: detailedInvestments
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      investments: [] 
    });
  }
});

// IPFS Upload (Simulated)
app.post("/api/ipfs-upload", (req, res) => {
  try {
    const { fileName } = req.body;
    const hash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    res.json({
      success: true,
      ipfsUrl: `ipfs://${hash}`,
      ipfsHash: hash,
      fileName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Portfolio
app.get("/api/portfolio/:address", (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    
    const createdInvoices = invoices.filter(i => i.msmeAddress === address);
    const fundedInvoices = invoices.filter(i => 
      i.status === "funded" || i.status === "settled"
    );
    
    let user = users.find(u => u.address.toLowerCase() === address);
    if (!user) {
      user = { 
        address, 
        type: "investor", 
        kycStatus: "pending",
        totalInvested: 0,
        totalReturns: 0,
        createdAt: new Date().toISOString() 
      };
      users.push(user);
    }
    
    // Get investments for this address
    const userInvestments = investments.filter(i => i.investorAddress.toLowerCase() === address);
    
    res.json({
      success: true,
      address,
      userType: user.type || "investor",
      createdInvoices,
      fundedInvoices,
      investments: userInvestments,
      totalInvested: user.totalInvested || 0,
      totalReturns: user.totalReturns || 0,
      kycStatus: user.kycStatus || "pending",
      joined: user.createdAt || new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get Recent Transactions
app.get("/api/transactions", (req, res) => {
  try {
    // Combine invoice updates and investment activities
    const recentActivities = [];
    
    // Add invoice updates
    invoices.slice(-10).forEach(inv => {
      recentActivities.push({
        type: inv.status === 'funded' ? 'Invoice Funded' : 
              inv.status === 'settled' ? 'Settlement' : 'Invoice Created',
        time: formatTimeAgo(inv.updatedAt),
        amount: `${inv.amount} ETH`,
        status: inv.status,
        invoiceNumber: inv.invoiceNumber,
        timestamp: inv.updatedAt
      });
    });
    
    // Add investment activities
    investments.slice(-10).forEach(inv => {
      const invoice = invoices.find(i => i.id === inv.invoiceId);
      recentActivities.push({
        type: 'Investment',
        time: formatTimeAgo(inv.createdAt),
        amount: `${inv.financingAmount} ETH`,
        status: inv.status,
        invoiceNumber: invoice?.invoiceNumber || 'N/A',
        timestamp: inv.createdAt
      });
    });
    
    // Sort by timestamp and get latest 10
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(recentActivities.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Invoice by ID
app.get("/api/invoices/:id", (req, res) => {
  const invoice = invoices.find(i => i.id === req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  // Get investments for this invoice
  const invoiceInvestments = investments.filter(i => i.invoiceId === req.params.id);
  
  res.json({
    ...invoice,
    investments: invoiceInvestments,
    totalFinanced: invoiceInvestments.reduce((sum, inv) => sum + inv.financingAmount, 0)
  });
});

// Update Invoice Status
app.patch("/api/invoices/:id", (req, res) => {
  const { status } = req.body;
  const invoiceIndex = invoices.findIndex(i => i.id === req.params.id);
  
  if (invoiceIndex === -1) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  invoices[invoiceIndex].status = status;
  invoices[invoiceIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: "Invoice updated successfully",
    invoice: invoices[invoiceIndex]
  });
});

// Blockchain info
app.get("/api/blockchain/info", async (req, res) => {
  try {
    if (!isBlockchainConnected) {
      return res.json({
        connected: false,
        message: "Blockchain not connected - Running in demo mode"
      });
    }
    
    const blockNumber = await web3.eth.getBlockNumber();
    const gasPrice = await web3.eth.getGasPrice();
    const networkId = await web3.eth.net.getId();
    const accounts = await web3.eth.getAccounts();
    
    res.json({
      connected: true,
      networkId,
      blockNumber,
      gasPrice: web3.utils.fromWei(gasPrice, 'gwei') + ' Gwei',
      accounts: accounts.slice(0, 5), // Show first 5 accounts
      contracts: {
        invoiceNFT: invoiceNFTContract?.options.address || 'Not deployed',
        financing: financingContract?.options.address || 'Not deployed'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for debugging)
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    totalUsers: users.length,
    users: users.map(u => ({
      address: u.address,
      type: u.type,
      totalInvested: u.totalInvested,
      totalReturns: u.totalReturns
    }))
  });
});

// Get all investments (for debugging)
app.get("/api/all-investments", (req, res) => {
  res.json({
    success: true,
    totalInvestments: investments.length,
    investments: investments
  });
});

// Debug endpoint to see all data
app.get("/api/debug", (req, res) => {
  res.json({
    invoices: invoices,
    users: users,
    investments: investments
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`
    🚀 InvoiceFinancing Backend
    ===========================
    📡 Server: http://localhost:${PORT}
    📊 API: http://localhost:${PORT}/api
    🔗 Health: http://localhost:${PORT}/api/health

    💡 Features:
    - In-memory database (no installation needed)
    - Sample data pre-loaded with proper IDs
    - DEMO MODE ENABLED (no blockchain required)
    - Investment tracking
    - Portfolio management

    🎯 READY FOR TESTING:
    - All endpoints working in demo mode
    - No MetaMask required
    - Investment functionality fully operational

    Sample endpoints:
    - GET  /api/health          - Health check
    - GET  /api/stats           - Platform statistics
    - GET  /api/invoices        - List invoices (now with proper IDs)
    - POST /api/invoices        - Create invoice
    - POST /api/invest          - Submit investment (FIXED)
    - POST /api/settle          - Settle invoice
    - GET  /api/portfolio/:addr - User portfolio
    - GET  /api/debug           - Debug: all data
  `);
  
  // Initialize blockchain connection (but run in demo mode)
  await initializeBlockchain();
});
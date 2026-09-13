const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const BOM = require('../models/BOM');
const WarehouseInventory = require('../models/WarehouseInventory');
const Order = require('../models/Order');
const AluminiumInventory = require('../models/AluminiumInventory');
const AluminiumPurchase = require('../models/AluminiumPurchase');
const AluminiumProduction = require('../models/AluminiumProduction');
const AluminiumLedger = require('../models/AluminiumLedger');
const WarehouseTransfer = require('../models/WarehouseTransfer');
const Settings = require('../models/Settings');
const { rawMaterialsSeed } = require('./seedData');

dotenv.config();

const seedAll = async () => {
  try {
    await connectDB();
    console.log('--- Starting YIMS Database Seeding ---');

    // 1. Clear existing collections
    await Promise.all([
      User.deleteMany(),
      Warehouse.deleteMany(),
      Product.deleteMany(),
      RawMaterial.deleteMany(),
      BOM.deleteMany(),
      WarehouseInventory.deleteMany(),
      Order.deleteMany(),
      AluminiumInventory.deleteMany(),
      AluminiumPurchase.deleteMany(),
      AluminiumProduction.deleteMany(),
      AluminiumLedger.deleteMany(),
      WarehouseTransfer.deleteMany(),
      Settings.deleteMany()
    ]);
    console.log('✔ Cleared existing collections');

    // 2. Seed Admin User
    const admin = await User.create({
      name: 'Yashvee Admin',
      email: 'admin@yims.com',
      password: 'admin123'
    });
    console.log(`✔ Admin created: ${admin.email} / admin123`);

    // 3. Seed Warehouses
    const warehousesData = [
      { name: 'Warehouse 1', code: 'W1', address: 'Main Factory & Aluminium Production Hub, Shed A', status: 'Active', isDefault: true },
      { name: 'Warehouse 2', code: 'W2', address: 'Sub-Assembly & Packaging Facility, Shed B', status: 'Active', isDefault: false },
      { name: 'Warehouse 3', code: 'W3', address: 'Finished Goods Logistics Center, Shed C', status: 'Active', isDefault: false }
    ];
    const warehouses = await Warehouse.insertMany(warehousesData);
    const [w1, w2, w3] = warehouses;
    console.log(`✔ Seeded 3 Warehouses: W1, W2, W3`);

    // 4. Seed Raw Materials
    const createdRawMaterials = await RawMaterial.insertMany(rawMaterialsSeed);
    console.log(`✔ Seeded ${createdRawMaterials.length} Raw Materials with starting inventories and aluminium specs`);

    // Map raw materials by exact name for rapid lookup
    const rmMap = {};
    createdRawMaterials.forEach((rm) => {
      rmMap[rm.name.toUpperCase().trim()] = rm;
    });

    // Populate starting inventory in Warehouse 1 for each Raw Material
    const initialRmInventory = createdRawMaterials.map((rm) => ({
      warehouse: w1._id,
      itemType: 'RawMaterial',
      item: rm._id,
      currentStock: rm.startingInventory,
      reservedStock: 0
    }));
    await WarehouseInventory.insertMany(initialRmInventory);
    console.log(`✔ Initialized Warehouse 1 inventory for all raw materials`);

    // 5. Seed Products (Finished Fixtures + Component Products from Excel)
    const finishedFixtures = [
      { name: '30WFLD', sku: 'PROD-30WFLD', category: 'Floodlight', description: '30W LED Floodlight Complete Fixture' },
      { name: '50WFLD', sku: 'PROD-50WFLD', category: 'Floodlight', description: '50W LED Floodlight Complete Fixture' },
      { name: '100WFLD', sku: 'PROD-100WFLD', category: 'Floodlight', description: '100W LED Floodlight Complete Fixture' },
      { name: '150WFLD', sku: 'PROD-150WFLD', category: 'Floodlight', description: '150W LED Floodlight Complete Fixture' },
      { name: '200WFLD', sku: 'PROD-200WFLD', category: 'Floodlight', description: '200W LED Floodlight Complete Fixture' },
      { name: '100WFLB', sku: 'PROD-100WFLB', category: 'Highbay FLB', description: '100W Highbay FLB Complete Fixture' },
      { name: '150WFLB', sku: 'PROD-150WFLB', category: 'Highbay FLB', description: '150W Highbay FLB Complete Fixture' },
      { name: '200WFLB', sku: 'PROD-200WFLB', category: 'Highbay FLB', description: '200W Highbay FLB Complete Fixture' },
      { name: '24WLence', sku: 'PROD-24WLENCE', category: 'Oval Lence', description: '24W Oval Lence Light Fixture' },
      { name: '36WLence', sku: 'PROD-36WLENCE', category: 'Oval Lence', description: '36W Oval Lence Light Fixture' },
      { name: '24WSL1', sku: 'PROD-24WSL1', category: 'Street Light', description: '24W Street Light SL1 White Glass' },
      { name: '36WSL1', sku: 'PROD-36WSL1', category: 'Street Light', description: '36W Street Light SL1 White Glass' },
      { name: '24WSL1Black', sku: 'PROD-24WSL1-BLK', category: 'Street Light', description: '24W Street Light SL1 Black Glass' },
      { name: '36WSL1Black', sku: 'PROD-36WSL1-BLK', category: 'Street Light', description: '36W Street Light SL1 Black Glass' },
      { name: '30WFLDSR', sku: 'PROD-30WFLDSR', category: 'Silver Reflector', description: '30W Floodlight Silver Reflector Edition' },
      { name: '50WFLDSR', sku: 'PROD-50WFLDSR', category: 'Silver Reflector', description: '50W Floodlight Silver Reflector Edition' },
      { name: '100WFLDSR', sku: 'PROD-100WFLDSR', category: 'Silver Reflector', description: '100W Floodlight Silver Reflector Edition' },
      { name: '150WFLDSR', sku: 'PROD-150WFLDSR', category: 'Silver Reflector', description: '150W Floodlight Silver Reflector Edition' },
      { name: '200WFLDSR', sku: 'PROD-200WFLDSR', category: 'Silver Reflector', description: '200W Floodlight Silver Reflector Edition' },
      { name: 'ND50WFLD', sku: 'PROD-ND50WFLD', category: 'ND Series', description: '50W Floodlight ND Frame Edition' },
      { name: 'ND100WFLD', sku: 'PROD-ND100WFLD', category: 'ND Series', description: '100W Floodlight ND Frame Edition' },
      { name: 'ND150WFLD', sku: 'PROD-ND150WFLD', category: 'ND Series', description: '150W Floodlight ND Frame Edition' },
      { name: 'ND200WFLD', sku: 'PROD-ND200WFLD', category: 'ND Series', description: '200W Floodlight ND Frame Edition' },
      { name: 'ND50WFLDSR', sku: 'PROD-ND50WFLDSR', category: 'ND Silver', description: '50W Floodlight ND Frame Silver Reflector' },
      { name: 'ND100WFLDSR', sku: 'PROD-ND100WFLDSR', category: 'ND Silver', description: '100W Floodlight ND Frame Silver Reflector' },
      { name: 'ND150WFLDSR', sku: 'PROD-ND150WFLDSR', category: 'ND Silver', description: '150W Floodlight ND Frame Silver Reflector' },
      { name: 'ND200WFLDSR', sku: 'PROD-ND200WFLDSR', category: 'ND Silver', description: '200W Floodlight ND Frame Silver Reflector' }
    ];

    const componentProducts = [
      // 50W FLD Components
      '50WFLDGlass', '50WFLDFrame', '50WFLDBody', '50WFLDGasket', '50WFLDHandle', '50WFLDInnerBox', '50WFLDReflector',
      // 100W FLD Components
      '100WFLDGlass', '100WFLDFrame', '100WFLDBody', '100WFLDGasket', '100WFLDHandle', '100WFLDInnerBox', '100WFLDReflector',
      // 150W FLD Components
      '150WFLDGlass', '150WFLDFrame', '150WFLDBody', '150WFLDGasket', '150WFLDHandle', '150WFLDInnerBox', '150WFLDReflector',
      // 200W FLD Components
      '200WFLDGlass', '200WFLDFrame', '200WFLDBody', '200WFLDGasket', '200WFLDHandle', '200WFLDInnerBox', '200WFLDReflector',
      // 100W FLB Components
      '100WFLBFrame', '100WFLBGlass', '100WFLBBody', '100WFLBGasket-1', '100WFLBGasket-2', '100WFLBHandle', '100WFLBChowk', '100WFLBReflector', '100WFLBInnerBox', '100WFLBPlate',
      // 150W FLB Components
      '150WFLBFrame', '150WFLBGlass', '150WFLBBody', '150WFLBGasket-1', '150WFLBGasket-2', '150WFLBHandle', '150WFLBChowk', '150WFLBPlate', '150WFLBInnerBox', '150WFLBReflector',
      // 200W FLB Components
      '200WFLBFrame', '200WFLBGlass', '200WFLBBody', '200WFLBGasket-1', '200WFLBHandle', '200WFLBChowk', '200WFLBPlate', '200WFLBGasket-2', '200WFLBInnerBox', '200WFLBReflector',
      // Lence & SL Components
      '24WLENCEBody', '24WLENCE', '24WLENCEGasket', '24WLENCEInnerBox',
      '36WLENCEBody', '36WLENCE', '36WLENCEGasket', '36WLENCEInnerBox',
      '24WSLBody', '24WSLGlass', '24WSLGasket', '24WSLInnerBox',
      '36WSLBody', '36WSLGlass', '36WSLGasket', '36WSLInnerBox',
      // 30W FLD Components
      '30WFLDGlass', '30WFLDBody', '30WFLDFrame', '30WFLDGasket', '30WFLDHandle', '30WFLDReflector', '30WFLDInnerBox',
      '24WSLGlassBlack', '36WSLGlassBlack',
      // SilverRef Components
      '30WFLDSilverRef', '50WFLDSilverRef', '100WFLDSilverRef', '150WFLDSilverRef', '200WFLDSilverRef',
      // ND Frame Components
      'ND50WFLDFrame', 'ND100WFLDFrame', 'ND150WFLDFrame', 'ND200WFLDFrame'
    ].map((name) => ({
      name,
      sku: `COMP-${name.toUpperCase()}`,
      category: 'Component Product',
      description: `Individual Component Product: ${name}`
    }));

    const allProductDefs = [...finishedFixtures, ...componentProducts];
    const createdProducts = await Product.insertMany(allProductDefs);
    console.log(`✔ Seeded ${createdProducts.length} Products (Finished fixtures & component products)`);

    const prodMap = {};
    createdProducts.forEach((p) => {
      prodMap[p.name.toUpperCase().trim()] = p;
    });

    // Initialize initial finished product stock across warehouses
    // e.g. Warehouse 1 has finished products and component products for immediate sale/shipping
    const initialProdInventory = [];
    createdProducts.forEach((p) => {
      // Seed finished goods stock: e.g. 100 in W1, 50 in W2, 30 in W3
      // For high-volume components like 50WFLDGlass or ND200WFLDFrame, provide sufficient stock for seed orders
      let w1Stock = 100;
      if (p.name === '50WFLDGlass') w1Stock = 1200;
      if (p.name === 'ND200WFLDFrame') w1Stock = 1500;
      if (p.name === '50WFLD') w1Stock = 200;

      initialProdInventory.push({
        warehouse: w1._id,
        itemType: 'Product',
        item: p._id,
        currentStock: w1Stock,
        reservedStock: 0
      });
      initialProdInventory.push({
        warehouse: w2._id,
        itemType: 'Product',
        item: p._id,
        currentStock: 40,
        reservedStock: 0
      });
      initialProdInventory.push({
        warehouse: w3._id,
        itemType: 'Product',
        item: p._id,
        currentStock: 25,
        reservedStock: 0
      });
    });
    await WarehouseInventory.insertMany(initialProdInventory);
    console.log(`✔ Initialized multi-warehouse stock for all products`);

    // 6. Seed Bill of Materials (BOM)
    const bomRecords = [];

    const addBOM = (prodName, rmName, qty = 1) => {
      const prod = prodMap[prodName.toUpperCase().trim()];
      const rm = rmMap[rmName.toUpperCase().trim()];
      if (prod && rm) {
        bomRecords.push({
          product: prod._id,
          rawMaterial: rm._id,
          quantity: qty,
          unitOfMeasure: rm.unit || 'Pcs'
        });
      } else {
        // Warning if match not found
        // console.warn(`BOM missing: ${prodName} -> ${rmName}`);
      }
    };

    // 30WFLD
    ['30W FLD BODY', '30W FLD FRAME', '30W FLD GLASS', '30W FLD RIBIN', '30W FLD HANDLE', '30W FLD REFLECTOR', '30W FLD INNERBOX'].forEach(
      (m) => addBOM('30WFLD', m, 1)
    );

    // 50WFLD
    ['50W FLD BODY', '50W FLD FRAME', '50W FLD GLASS', '50W FLD RIBIN', '50W FLD HANDLE', '50W FLD REFLECTOR', '50W FLD INNERBOX'].forEach(
      (m) => addBOM('50WFLD', m, 1)
    );

    // 100WFLD
    ['100W FLD BODY', '100W FLD FRAME', '100W FLD GLASS', '100W FLD RIBIN', '100W FLD HANDLE', '100W FLD REFLECTOR', '100W FLD INNERBOX'].forEach(
      (m) => addBOM('100WFLD', m, 1)
    );

    // 150WFLD
    ['150W FLD BODY', '150W FLD FRAME', '150W FLD GLASS', '150W FLD RIBIN', '150W FLD HANDLE', '150W FLD REFLECTOR', '150W FLD INNERBOX'].forEach(
      (m) => addBOM('150WFLD', m, 1)
    );

    // 200WFLD
    ['200W FLD BODY', '200W FLD FRAME', '200W FLD GLASS', '200W FLD RIBIN', '200W FLD HANDLE', '200W FLD REFLECTOR', '200W FLD INNERBOX'].forEach(
      (m) => addBOM('200WFLD', m, 1)
    );

    // 100WFLB
    ['100W FLB FRAME', '100W FLB GLASS', '100W FLB BODY', '100W FLB RIBIN BODY', '100W FLB HANDLE', '100W FLB RIBIN BOX', '100W FLB PLATE', '100W FLB INNERBOX', '100W FLB REFLECTOR', '100W FLB BOX'].forEach(
      (m) => addBOM('100WFLB', m, 1)
    );

    // 150WFLB
    ['150W FLB FRAME', '150W FLB GLASS', '150W FLB BODY', '150W FLB RIBIN BODY', '150W FLB HANDLE', '150W FLB RIBIN BOX', '150W FLB PLATE', '150W FLB INNERBOX', '150W FLB REFLECTOR', '150W FLB BOX'].forEach(
      (m) => addBOM('150WFLB', m, 1)
    );

    // 200WFLB
    ['200W FLB FRAME', '200W FLB GLASS', '200W FLB BODY HIGH', '200W FLB RIBIN BODY', '200W FLB HANDLE', '200W FLB RIBIN BOX', '200W FLB PLATE', '200W FLB INNERBOX', '200W FLB REFLECTOR', '200W FLB BOX'].forEach(
      (m) => addBOM('200WFLB', m, 1)
    );

    // 24WLence & 36WLence
    ['24W OVAL BODY', '24W OVAL LENCE COVER', '24W OVAL RIBIN', '24W OVAL INNERBOX'].forEach((m) => addBOM('24WLence', m, 1));
    ['36W OVAL BODY', '36W OVAL LENCE COVER', '36W OVAL RIBIN', '36W OVAL INNERBOX'].forEach((m) => addBOM('36WLence', m, 1));

    // 24WSL1, 36WSL1, 24WSL1Black, 36WSL1Black
    ['24W SL1 BODY', '24W SL1 GLASS WHITE', '24W SL1 RIBIN', '24W SL1 INNERBOX'].forEach((m) => addBOM('24WSL1', m, 1));
    ['36W SL2 BODY', '36W SL2 GLASS WHITE', '36W SL2 RIBIN', '36W SL2 INNERBOX'].forEach((m) => addBOM('36WSL1', m, 1));
    ['24W SL1 BODY', '24W SL1 GLASS BLACK', '24W SL1 RIBIN', '24W SL1 INNERBOX'].forEach((m) => addBOM('24WSL1Black', m, 1));
    ['36W SL2 BODY', '36W SL2 GLASS BLACK', '36W SL2 RIBIN', '36W SL2 INNERBOX'].forEach((m) => addBOM('36WSL1Black', m, 1));

    // Silver Reflector Series
    ['30W FLD SilverRef', '30W FLD BODY', '30W FLD FRAME', '30W FLD RIBIN', '30W FLD HANDLE', '30W FLD INNERBOX', '30W FLD GLASS'].forEach(
      (m) => addBOM('30WFLDSR', m, 1)
    );
    ['50W FLD SilverRef', '50W FLD GLASS', '50W FLD FRAME', '50W FLD BODY', '50W FLD RIBIN', '50W FLD HANDLE', '50W FLD INNERBOX'].forEach(
      (m) => addBOM('50WFLDSR', m, 1)
    );
    ['100W FLD SilverRef', '100W FLD GLASS', '100W FLD FRAME', '100W FLD BODY', '100W FLD RIBIN', '100W FLD HANDLE', '100W FLD INNERBOX'].forEach(
      (m) => addBOM('100WFLDSR', m, 1)
    );
    ['150W FLD SilverRef', '150W FLD GLASS', '150W FLD FRAME', '150W FLD BODY', '150W FLD RIBIN', '150W FLD HANDLE', '150W FLD INNERBOX'].forEach(
      (m) => addBOM('150WFLDSR', m, 1)
    );
    ['200W FLD SilverRef', '200W FLD GLASS', '200W FLD FRAME', '200W FLD BODY', '200W FLD RIBIN', '200W FLD HANDLE', '200W FLD INNERBOX'].forEach(
      (m) => addBOM('200WFLDSR', m, 1)
    );

    // ND Series (ND Frame + regular components)
    ['ND50WFLDFrame', '50W FLD GLASS', '50W FLD BODY', '50W FLD RIBIN', '50W FLD HANDLE', '50W FLD REFLECTOR', '50W FLD INNERBOX'].forEach(
      (m) => addBOM('ND50WFLD', m, 1)
    );
    ['ND100WFLDFrame', '100W FLD GLASS', '100W FLD BODY', '100W FLD RIBIN', '100W FLD HANDLE', '100W FLD REFLECTOR', '100W FLD INNERBOX'].forEach(
      (m) => addBOM('ND100WFLD', m, 1)
    );
    ['ND150WFLDFrame', '150W FLD GLASS', '150W FLD BODY', '150W FLD RIBIN', '150W FLD HANDLE', '150W FLD REFLECTOR', '150W FLD INNERBOX'].forEach(
      (m) => addBOM('ND150WFLD', m, 1)
    );
    ['ND200WFLDFrame', '200W FLD GLASS', '200W FLD BODY', '200W FLD RIBIN', '200W FLD HANDLE', '200W FLD REFLECTOR', '200W FLD INNERBOX'].forEach(
      (m) => addBOM('ND200WFLD', m, 1)
    );

    // ND Silver Reflector Series
    ['ND50WFLDFrame', '50W FLD SilverRef', '50W FLD GLASS', '50W FLD BODY', '50W FLD RIBIN', '50W FLD HANDLE', '50W FLD INNERBOX'].forEach(
      (m) => addBOM('ND50WFLDSR', m, 1)
    );
    ['ND100WFLDFrame', '100W FLD SilverRef', '100W FLD GLASS', '100W FLD BODY', '100W FLD RIBIN', '100W FLD HANDLE', '100W FLD INNERBOX'].forEach(
      (m) => addBOM('ND100WFLDSR', m, 1)
    );
    ['ND150WFLDFrame', '150W FLD SilverRef', '150W FLD GLASS', '150W FLD BODY', '150W FLD RIBIN', '150W FLD HANDLE', '150W FLD INNERBOX'].forEach(
      (m) => addBOM('ND150WFLDSR', m, 1)
    );
    ['ND200WFLDFrame', '200W FLD SilverRef', '200W FLD GLASS', '200W FLD BODY', '200W FLD RIBIN', '200W FLD HANDLE', '200W FLD INNERBOX'].forEach(
      (m) => addBOM('ND200WFLDSR', m, 1)
    );

    // 1-to-1 BOM mapping for Component Products
    addBOM('50WFLDGlass', '50W FLD GLASS', 1);
    addBOM('50WFLDFrame', '50W FLD FRAME', 1);
    addBOM('50WFLDBody', '50W FLD BODY', 1);
    addBOM('50WFLDGasket', '50W FLD RIBIN', 1);
    addBOM('50WFLDHandle', '50W FLD HANDLE', 1);
    addBOM('50WFLDReflector', '50W FLD REFLECTOR', 1);
    addBOM('50WFLDInnerBox', '50W FLD INNERBOX', 1);

    addBOM('100WFLDGlass', '100W FLD GLASS', 1);
    addBOM('100WFLDFrame', '100W FLD FRAME', 1);
    addBOM('100WFLDBody', '100W FLD BODY', 1);
    addBOM('100WFLDGasket', '100W FLD RIBIN', 1);
    addBOM('100WFLDHandle', '100W FLD HANDLE', 1);
    addBOM('100WFLDReflector', '100W FLD REFLECTOR', 1);
    addBOM('100WFLDInnerBox', '100W FLD INNERBOX', 1);

    addBOM('150WFLDGlass', '150W FLD GLASS', 1);
    addBOM('150WFLDFrame', '150W FLD FRAME', 1);
    addBOM('150WFLDBody', '150W FLD BODY', 1);
    addBOM('150WFLDGasket', '150W FLD RIBIN', 1);
    addBOM('150WFLDHandle', '150W FLD HANDLE', 1);
    addBOM('150WFLDReflector', '150W FLD REFLECTOR', 1);
    addBOM('150WFLDInnerBox', '150W FLD INNERBOX', 1);

    addBOM('200WFLDGlass', '200W FLD GLASS', 1);
    addBOM('200WFLDFrame', '200W FLD FRAME', 1);
    addBOM('200WFLDBody', '200W FLD BODY', 1);
    addBOM('200WFLDGasket', '200W FLD RIBIN', 1);
    addBOM('200WFLDHandle', '200W FLD HANDLE', 1);
    addBOM('200WFLDReflector', '200W FLD REFLECTOR', 1);
    addBOM('200WFLDInnerBox', '200W FLD INNERBOX', 1);

    addBOM('ND50WFLDFrame', 'ND50WFLDFrame', 1);
    addBOM('ND100WFLDFrame', 'ND100WFLDFrame', 1);
    addBOM('ND150WFLDFrame', 'ND150WFLDFrame', 1);
    addBOM('ND200WFLDFrame', 'ND200WFLDFrame', 1);

    await BOM.insertMany(bomRecords);
    console.log(`✔ Seeded ${bomRecords.length} Bill of Materials (BOM) relationships`);

    // 7. Seed Aluminium Inventory & Initial Ledger
    const openingAluGm = 50000; // 50 kg opening stock
    const aluInv = await AluminiumInventory.create({
      openingStockGm: openingAluGm,
      purchasedGm: 0,
      usedGm: 0,
      wastageGm: 0,
      availableGm: openingAluGm
    });

    await AluminiumLedger.create({
      date: new Date('2023-01-01'),
      transactionNumber: 'ALU-OPENING-001',
      transactionType: 'Opening Stock',
      aluminiumInGm: openingAluGm,
      aluminiumUsedGm: 0,
      wastageGm: 0,
      balanceGm: openingAluGm,
      reference: 'Excel Seed Initial Opening Stock',
      notes: 'Initial aluminium stock from legacy manufacturing ledger (50 kg)'
    });
    console.log(`✔ Seeded Aluminium Inventory with ${openingAluGm} gm (50 kg) opening balance and ledger entry`);

    // 8. Seed Historical Orders from Excel
    // Order 1: SALE 21-Jun-2023 expected 22-Jun-2023 ND200WFLDFrame 800 note ND
    const prodND200Frame = prodMap['ND200WFLDFRAME'];
    const prod50Glass = prodMap['50WFLDGLASS'];
    const rm30Body = rmMap['30W FLD BODY'];
    const prod50WFLD = prodMap['50WFLD'];
    const rm50Frame = rmMap['50W FLD FRAME'];

    const historicalOrders = [
      {
        orderNumber: 'ORD-1',
        orderType: 'SALE',
        warehouse: w1._id,
        orderDate: new Date('2023-06-21'),
        expectedDate: new Date('2023-06-22'),
        status: 'Completed',
        items: [
          {
            itemType: 'Product',
            item: prodND200Frame._id,
            quantity: 800,
            unitPrice: 150,
            totalPrice: 120000,
            notes: 'ND'
          }
        ],
        totalAmount: 120000,
        partyName: 'Apex Lighting Dist',
        notes: 'Excel Seed Order 1'
      },
      {
        orderNumber: 'ORD-2',
        orderType: 'SALE',
        warehouse: w1._id,
        orderDate: new Date('2023-06-21'),
        expectedDate: new Date('2023-06-22'),
        status: 'Completed',
        items: [
          {
            itemType: 'Product',
            item: prod50Glass._id,
            quantity: 500,
            unitPrice: 45,
            totalPrice: 22500
          }
        ],
        totalAmount: 22500,
        partyName: 'Surat Electricals',
        notes: 'Excel Seed Order 2'
      },
      {
        orderNumber: 'ORD-3',
        orderType: 'PURCHASE',
        warehouse: w1._id,
        orderDate: new Date('2026-07-11'),
        expectedDate: new Date('2026-07-12'),
        status: 'Completed',
        items: [
          {
            itemType: 'RawMaterial',
            item: rm30Body._id,
            quantity: 20,
            unitPrice: 95,
            totalPrice: 1900
          }
        ],
        totalAmount: 1900,
        partyName: 'Precision Die Casters',
        notes: 'Excel Seed Order 3'
      },
      {
        orderNumber: 'ORD-4',
        orderType: 'SALE',
        warehouse: w1._id,
        orderDate: new Date('2026-07-11'),
        expectedDate: new Date('2026-07-12'),
        status: 'Completed',
        items: [
          {
            itemType: 'Product',
            item: prod50WFLD._id,
            quantity: 10,
            unitPrice: 650,
            totalPrice: 6500
          }
        ],
        totalAmount: 6500,
        partyName: 'Modern Illumination Co',
        notes: 'Excel Seed Order 4'
      },
      {
        orderNumber: 'ORD-5',
        orderType: 'PURCHASE',
        warehouse: w1._id,
        orderDate: new Date('2026-07-11'),
        expectedDate: new Date('2026-07-12'),
        status: 'Completed',
        items: [
          {
            itemType: 'RawMaterial',
            item: rm50Frame._id,
            quantity: 200,
            unitPrice: 65,
            totalPrice: 13000
          }
        ],
        totalAmount: 13000,
        partyName: 'Gujarat Alloys & Castings',
        notes: 'Excel Seed Order 5'
      }
    ];

    await Order.insertMany(historicalOrders);
    console.log(`✔ Seeded 5 Historical Excel Orders (ORD-1 to ORD-5)`);

    // Deduct / add stock for these completed seed orders in Warehouse 1 to synchronize balances
    // ORD-1 SALE 800 ND200WFLDFrame
    await WarehouseInventory.findOneAndUpdate(
      { warehouse: w1._id, itemType: 'Product', item: prodND200Frame._id },
      { $inc: { currentStock: -800 } }
    );
    // ORD-2 SALE 500 50WFLDGlass
    await WarehouseInventory.findOneAndUpdate(
      { warehouse: w1._id, itemType: 'Product', item: prod50Glass._id },
      { $inc: { currentStock: -500 } }
    );
    // ORD-3 PURCHASE 20 30W FLD BODY
    await WarehouseInventory.findOneAndUpdate(
      { warehouse: w1._id, itemType: 'RawMaterial', item: rm30Body._id },
      { $inc: { currentStock: 20 } }
    );
    // ORD-4 SALE 10 50WFLD
    await WarehouseInventory.findOneAndUpdate(
      { warehouse: w1._id, itemType: 'Product', item: prod50WFLD._id },
      { $inc: { currentStock: -10 } }
    );
    // ORD-5 PURCHASE 200 50W FLD FRAME
    await WarehouseInventory.findOneAndUpdate(
      { warehouse: w1._id, itemType: 'RawMaterial', item: rm50Frame._id },
      { $inc: { currentStock: 200 } }
    );
    console.log(`✔ Applied seed transaction stock adjustments dynamically`);

    // 9. Seed Default Settings
    await Settings.create({
      companyName: 'Yashvee LED Lighting Pvt. Ltd.',
      companyEmail: 'operations@yashvee.com',
      companyPhone: '+91 98765 43210',
      companyAddress: 'Shed 14-16, Phase II GIDC, Ahmedabad, Gujarat',
      defaultCurrency: 'INR (₹)',
      defaultWeightUnit: 'gm',
      defaultReorderPoint: 200,
      lowStockThresholdPercent: 20,
      theme: 'light'
    });
    console.log(`✔ Seeded Default Company Settings`);

    console.log('\n========================================');
    console.log('✅ YIMS DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('Login credentials: admin@yims.com / admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seedAll();

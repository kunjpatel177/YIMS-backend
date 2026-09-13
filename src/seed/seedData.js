/**
 * Exact seed master data derived from the Excel workbook
 */

const rawMaterialsSeed = [
  // 30W FLD Series
  { name: '30W FLD BODY', sku: 'RM-30W-BODY', category: 'Floodlight', startingInventory: 1500, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 120, unit: 'Pcs' },
  { name: '30W FLD FRAME', sku: 'RM-30W-FRAME', category: 'Floodlight', startingInventory: 1500, reorderPoint: 250, usesAluminium: true, aluminiumRequiredPerUnit: 40, unit: 'Pcs' },
  { name: '30W FLD GLASS', sku: 'RM-30W-GLASS', category: 'Floodlight', startingInventory: 1500, reorderPoint: 280, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '30W FLD RIBIN', sku: 'RM-30W-RIBIN', category: 'Floodlight', startingInventory: 1300, reorderPoint: 350, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '30W FLD HANDLE', sku: 'RM-30W-HANDLE', category: 'Floodlight', startingInventory: 1400, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 30, unit: 'Pcs' },
  { name: '30W FLD REFLECTOR', sku: 'RM-30W-REF', category: 'Floodlight', startingInventory: 1500, reorderPoint: 500, usesAluminium: true, aluminiumRequiredPerUnit: 25, unit: 'Pcs' },
  { name: '30W FLD INNERBOX', sku: 'RM-30W-BOX', category: 'Packaging', startingInventory: 1600, reorderPoint: 550, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // 50W FLD Series
  { name: '50W FLD BODY', sku: 'RM-50W-BODY', category: 'Floodlight', startingInventory: 1300, reorderPoint: 1000, usesAluminium: true, aluminiumRequiredPerUnit: 180, unit: 'Pcs' },
  { name: '50W FLD FRAME', sku: 'RM-50W-FRAME', category: 'Floodlight', startingInventory: 1000, reorderPoint: 2000, usesAluminium: true, aluminiumRequiredPerUnit: 50, unit: 'Pcs' },
  { name: '50W FLD GLASS', sku: 'RM-50W-GLASS', category: 'Floodlight', startingInventory: 1000, reorderPoint: 500, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W FLD RIBIN', sku: 'RM-50W-RIBIN', category: 'Floodlight', startingInventory: 1000, reorderPoint: 500, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W FLD HANDLE', sku: 'RM-50W-HANDLE', category: 'Floodlight', startingInventory: 1000, reorderPoint: 500, usesAluminium: true, aluminiumRequiredPerUnit: 40, unit: 'Pcs' },
  { name: '50W FLD REFLECTOR', sku: 'RM-50W-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 500, usesAluminium: true, aluminiumRequiredPerUnit: 35, unit: 'Pcs' },
  { name: '50W FLD INNERBOX', sku: 'RM-50W-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 500, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // 100W FLD Series
  { name: '100W FLD BODY', sku: 'RM-100W-BODY', category: 'Floodlight', startingInventory: 800, reorderPoint: 500, usesAluminium: true, aluminiumRequiredPerUnit: 250, unit: 'Pcs' },
  { name: '100W FLD FRAME', sku: 'RM-100W-FRAME', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 70, unit: 'Pcs' },
  { name: '100W FLD GLASS', sku: 'RM-100W-GLASS', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W FLD RIBIN', sku: 'RM-100W-RIBIN', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W FLD HANDLE', sku: 'RM-100W-HANDLE', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 50, unit: 'Pcs' },
  { name: '100W FLD REFLECTOR', sku: 'RM-100W-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 50, unit: 'Pcs' },
  { name: '100W FLD INNERBOX', sku: 'RM-100W-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // 150W FLD Series
  { name: '150W FLD BODY', sku: 'RM-150W-BODY', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 350, unit: 'Pcs' },
  { name: '150W FLD FRAME', sku: 'RM-150W-FRAME', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 90, unit: 'Pcs' },
  { name: '150W FLD GLASS', sku: 'RM-150W-GLASS', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '150W FLD RIBIN', sku: 'RM-150W-RIBIN', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '150W FLD HANDLE', sku: 'RM-150W-HANDLE', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 60, unit: 'Pcs' },
  { name: '150W FLD REFLECTOR', sku: 'RM-150W-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 60, unit: 'Pcs' },
  { name: '150W FLD INNERBOX', sku: 'RM-150W-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // 200W FLD Series
  { name: '200W FLD BODY', sku: 'RM-200W-BODY', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 450, unit: 'Pcs' },
  { name: '200W FLD FRAME', sku: 'RM-200W-FRAME', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 120, unit: 'Pcs' },
  { name: '200W FLD GLASS', sku: 'RM-200W-GLASS', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '200W FLD RIBIN', sku: 'RM-200W-RIBIN', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '200W FLD HANDLE', sku: 'RM-200W-HANDLE', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 70, unit: 'Pcs' },
  { name: '200W FLD REFLECTOR', sku: 'RM-200W-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 400, usesAluminium: true, aluminiumRequiredPerUnit: 70, unit: 'Pcs' },
  { name: '200W FLD INNERBOX', sku: 'RM-200W-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 400, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // 100W FLB Series
  { name: '100W FLB BODY', sku: 'RM-100W-FLB-BODY', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 350, unit: 'Pcs' },
  { name: '100W FLB FRAME', sku: 'RM-100W-FLB-FRAME', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 110, unit: 'Pcs' },
  { name: '100W FLB PLATE', sku: 'RM-100W-FLB-PLATE', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 80, unit: 'Pcs' },
  { name: '100W FLB BOX', sku: 'RM-100W-FLB-BOX', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W FLB GLASS', sku: 'RM-100W-FLB-GLASS', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W FLB RIBIN BODY', sku: 'RM-100W-FLB-RIB-BODY', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W FLB RIBIN BOX', sku: 'RM-100W-FLB-RIB-BOX', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W FLB HANDLE', sku: 'RM-100W-FLB-HANDLE', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 60, unit: 'Pcs' },
  { name: '100W FLB REFLECTOR', sku: 'RM-100W-FLB-REF', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 50, unit: 'Pcs' },
  { name: '100W FLB INNERBOX', sku: 'RM-100W-FLB-INNER', category: 'Packaging', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // 150W FLB Series
  { name: '150W FLB BODY', sku: 'RM-150W-FLB-BODY', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 400, unit: 'Pcs' },
  { name: '150W FLB FRAME', sku: 'RM-150W-FLB-FRAME', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 130, unit: 'Pcs' },
  { name: '150W FLB PLATE', sku: 'RM-150W-FLB-PLATE', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 90, unit: 'Pcs' },
  { name: '150W FLB BOX', sku: 'RM-150W-FLB-BOX', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '150W FLB GLASS', sku: 'RM-150W-FLB-GLASS', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '150W FLB RIBIN BODY', sku: 'RM-150W-FLB-RIB-BODY', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '150W FLB RIBIN BOX', sku: 'RM-150W-FLB-RIB-BOX', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '150W FLB HANDLE', sku: 'RM-150W-FLB-HANDLE', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 70, unit: 'Pcs' },
  { name: '150W FLB REFLECTOR', sku: 'RM-150W-FLB-REF', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 60, unit: 'Pcs' },
  { name: '150W FLB INNERBOX', sku: 'RM-150W-FLB-INNER', category: 'Packaging', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // 200W FLB Series
  { name: '200W FLB BODY HIGH', sku: 'RM-200W-FLB-BODY-HI', category: 'Highbay FLB', startingInventory: 800, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 480, unit: 'Pcs' },
  { name: '200W FLB BODY LOW', sku: 'RM-200W-FLB-BODY-LO', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 420, unit: 'Pcs' },
  { name: '200W FLB FRAME', sku: 'RM-200W-FLB-FRAME', category: 'Highbay FLB', startingInventory: 1200, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 140, unit: 'Pcs' },
  { name: '200W FLB PLATE', sku: 'RM-200W-FLB-PLATE', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 100, unit: 'Pcs' },
  { name: '200W FLB BOX', sku: 'RM-200W-FLB-BOX', category: 'Highbay FLB', startingInventory: 100, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '200W FLB GLASS', sku: 'RM-200W-FLB-GLASS', category: 'Highbay FLB', startingInventory: 1000, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '200W FLB RIBIN BODY', sku: 'RM-200W-FLB-RIB-BODY', category: 'Highbay FLB', startingInventory: 1200, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '200W FLB RIBIN BOX', sku: 'RM-200W-FLB-RIB-BOX', category: 'Highbay FLB', startingInventory: 1200, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '200W FLB HANDLE', sku: 'RM-200W-FLB-HANDLE', category: 'Highbay FLB', startingInventory: 1200, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 80, unit: 'Pcs' },
  { name: '200W FLB REFLECTOR', sku: 'RM-200W-FLB-REF', category: 'Highbay FLB', startingInventory: 1200, reorderPoint: 300, usesAluminium: true, aluminiumRequiredPerUnit: 70, unit: 'Pcs' },
  { name: '200W FLB INNERBOX', sku: 'RM-200W-FLB-INNER', category: 'Packaging', startingInventory: 1250, reorderPoint: 300, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // Oval / Lence Series
  { name: '24W OVAL BODY', sku: 'RM-24W-OVAL-BODY', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 90, unit: 'Pcs' },
  { name: '24W OVAL LENCE COVER', sku: 'RM-24W-OVAL-LENCE', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '24W OVAL RIBIN', sku: 'RM-24W-OVAL-RIBIN', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '24W OVAL INNERBOX', sku: 'RM-24W-OVAL-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '36W OVAL BODY', sku: 'RM-36W-OVAL-BODY', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 110, unit: 'Pcs' },
  { name: '36W OVAL LENCE COVER', sku: 'RM-36W-OVAL-LENCE', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '36W OVAL RIBIN', sku: 'RM-36W-OVAL-RIBIN', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '36W OVAL INNERBOX', sku: 'RM-36W-OVAL-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W OVAL BODY', sku: 'RM-50W-OVAL-BODY', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 140, unit: 'Pcs' },
  { name: '50W OVAL LENCE COVER', sku: 'RM-50W-OVAL-LENCE', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W OVAL RIBIN', sku: 'RM-50W-OVAL-RIBIN', category: 'Oval Lence', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W OVAL INNERBOX', sku: 'RM-50W-OVAL-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // Street Light (SL) Series
  { name: '24W SL1 BODY', sku: 'RM-24W-SL1-BODY', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 130, unit: 'Pcs' },
  { name: '24W SL1 GLASS WHITE', sku: 'RM-24W-SL1-GW', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '24W SL1 GLASS BLACK', sku: 'RM-24W-SL1-GB', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '24W SL1 RIBIN', sku: 'RM-24W-SL1-RIBIN', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '24W SL1 INNERBOX', sku: 'RM-24W-SL1-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  { name: '36W SL2 BODY', sku: 'RM-36W-SL2-BODY', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 160, unit: 'Pcs' },
  { name: '36W SL2 GLASS WHITE', sku: 'RM-36W-SL2-GW', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '36W SL2 GLASS BLACK', sku: 'RM-36W-SL2-GB', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '36W SL2 RIBIN', sku: 'RM-36W-SL2-RIBIN', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '36W SL2 INNERBOX', sku: 'RM-36W-SL2-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  { name: '50W SL3 BODY', sku: 'RM-50W-SL3-BODY', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 200, unit: 'Pcs' },
  { name: '50W SL3 GLASS WHITE', sku: 'RM-50W-SL3-GW', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W SL3 GLASS BLACK', sku: 'RM-50W-SL3-GB', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W SL3 RIBIN', sku: 'RM-50W-SL3-RIBIN', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '50W SL3 INNERBOX', sku: 'RM-50W-SL3-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  { name: '100W SL4 BODY', sku: 'RM-100W-SL4-BODY', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 260, unit: 'Pcs' },
  { name: '100W SL4 GLASS WHITE', sku: 'RM-100W-SL4-GW', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W SL4 GLASS BLACK', sku: 'RM-100W-SL4-GB', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W SL4 RIBIN', sku: 'RM-100W-SL4-RIBIN', category: 'Street Light', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: '100W SL4 INNERBOX', sku: 'RM-100W-SL4-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 200, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },

  // Silver Reflector Raw Materials
  { name: '30W FLD SilverRef', sku: 'RM-30W-SILVER-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 30, unit: 'Pcs' },
  { name: '50W FLD SilverRef', sku: 'RM-50W-SILVER-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 40, unit: 'Pcs' },
  { name: '100W FLD SilverRef', sku: 'RM-100W-SILVER-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 55, unit: 'Pcs' },
  { name: '150W FLD SilverRef', sku: 'RM-150W-SILVER-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 70, unit: 'Pcs' },
  { name: '200W FLD SilverRef', sku: 'RM-200W-SILVER-REF', category: 'Floodlight', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 85, unit: 'Pcs' },

  // ND Frame Raw Materials
  { name: 'ND50WFLDFrame', sku: 'RM-ND-50W-FRAME', category: 'Floodlight ND', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 55, unit: 'Pcs' },
  { name: 'ND100WFLDFrame', sku: 'RM-ND-100W-FRAME', category: 'Floodlight ND', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 75, unit: 'Pcs' },
  { name: 'ND150WFLDFrame', sku: 'RM-ND-150W-FRAME', category: 'Floodlight ND', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 95, unit: 'Pcs' },
  { name: 'ND200WFLDFrame', sku: 'RM-ND-200W-FRAME', category: 'Floodlight ND', startingInventory: 1000, reorderPoint: 200, usesAluminium: true, aluminiumRequiredPerUnit: 125, unit: 'Pcs' },

  // Stadium Light & Joint Series
  { name: 'STADIUM LIGHT BODY', sku: 'RM-STADIUM-BODY', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 600, unit: 'Pcs' },
  { name: 'STADIUM 15DEG LENCE', sku: 'RM-STADIUM-LENCE-15', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: 'STADIUM 25DEG LENCE', sku: 'RM-STADIUM-LENCE-25', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: 'STADIUM 60DEG LENCE', sku: 'RM-STADIUM-LENCE-60', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: 'STADIUM LIGHT RIBIN (L)', sku: 'RM-STADIUM-RIBIN-L', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' },
  { name: 'STADIUM HANDLE SINGLE', sku: 'RM-STADIUM-HDL-1', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 150, unit: 'Pcs' },
  { name: 'STADIUM HANDLE DOUBLE', sku: 'RM-STADIUM-HDL-2', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 250, unit: 'Pcs' },
  { name: 'STADIUM HANDLE TRIPLE', sku: 'RM-STADIUM-HDL-3', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 350, unit: 'Pcs' },
  { name: 'STADIUM HANDLE FOURTH', sku: 'RM-STADIUM-HDL-4', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 450, unit: 'Pcs' },
  { name: 'DOUBLE JOINTER', sku: 'RM-DOUBLE-JOINT', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 80, unit: 'Pcs' },
  { name: 'TRIPLE JOINTER', sku: 'RM-TRIPLE-JOINT', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 120, unit: 'Pcs' },
  { name: 'FOURTH JOINTER', sku: 'RM-FOURTH-JOINT', category: 'Stadium Light', startingInventory: 1000, reorderPoint: 100, usesAluminium: true, aluminiumRequiredPerUnit: 160, unit: 'Pcs' },
  { name: 'STADIUM INNERBOX', sku: 'RM-STADIUM-BOX', category: 'Packaging', startingInventory: 1000, reorderPoint: 100, usesAluminium: false, aluminiumRequiredPerUnit: 0, unit: 'Pcs' }
];

module.exports = {
  rawMaterialsSeed
};

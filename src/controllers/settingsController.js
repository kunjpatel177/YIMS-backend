const Settings = require('../models/Settings');

// @route   GET /api/settings
// @desc    Get system settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/settings
// @desc    Update system settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      defaultCurrency,
      defaultWeightUnit,
      defaultReorderPoint,
      lowStockThresholdPercent,
      theme
    } = req.body;

    if (companyName) settings.companyName = companyName.trim();
    if (companyEmail) settings.companyEmail = companyEmail.trim();
    if (companyPhone) settings.companyPhone = companyPhone.trim();
    if (companyAddress) settings.companyAddress = companyAddress.trim();
    if (defaultCurrency) settings.defaultCurrency = defaultCurrency.trim();
    if (defaultWeightUnit) settings.defaultWeightUnit = defaultWeightUnit;
    if (defaultReorderPoint !== undefined) settings.defaultReorderPoint = Number(defaultReorderPoint);
    if (lowStockThresholdPercent !== undefined) settings.lowStockThresholdPercent = Number(lowStockThresholdPercent);
    if (theme) settings.theme = theme;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings
};

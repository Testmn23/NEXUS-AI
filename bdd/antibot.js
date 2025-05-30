const fs = require('fs');
const path = require('path');

// Corrected path for the JSON file to store data
const dataFilePath = path.join(__dirname, '../xmd/antibot.json');

const DEFAULT_GROUP_SETTINGS = {
    enabled: false,
    action: 'kick', // Default action
    allow_known_bots: false,
    known_bot_jids: []
};

// Function to read data from JSON file
function loadAntibotConfig() {
  try {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8');
        return JSON.parse(data);
    }
    return {}; // If file doesn't exist, return an empty object
  } catch (error) {
    console.error('Error reading antibot config from file:', error);
    return {}; // Return an empty object on error
  }
}

// Function to write data to JSON file
function saveAntibotConfig(config) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing antibot config to file:', error);
  }
}

// Function to create initial structure if file does not exist
function initializeDataFile() {
  if (!fs.existsSync(dataFilePath)) {
    saveAntibotConfig({}); // Initialize with an empty object
  }
}

// Initialize data file if not present
initializeDataFile();

// Function to get antibot settings for a specific group
function getGroupAntibotSettings(groupId) {
  const config = loadAntibotConfig();
  const groupSettings = config[groupId] || {};
  // Merge with defaults to ensure all keys are present
  return { ...DEFAULT_GROUP_SETTINGS, ...groupSettings };
}

// Function to update antibot settings for a specific group
function updateGroupAntibotSettings(groupId, newSettings) {
  const config = loadAntibotConfig();
  const currentGroupSettings = getGroupAntibotSettings(groupId); // Gets defaults if group doesn't exist
  
  config[groupId] = { ...currentGroupSettings, ...newSettings };
  
  saveAntibotConfig(config);
  console.log(`Antibot settings for group ${groupId} updated.`);
}

// Function to check if antibot is enabled for a group
function isAntibotEnabled(groupId) {
  return getGroupAntibotSettings(groupId).enabled;
}

// Function to retrieve the antibot action for a group
function getAntibotAction(groupId) {
  return getGroupAntibotSettings(groupId).action;
}

// Function to add a known bot to a group's allowlist
function addKnownBot(groupId, botJid) {
  const settings = getGroupAntibotSettings(groupId);
  if (!settings.known_bot_jids.includes(botJid)) {
    settings.known_bot_jids.push(botJid);
    updateGroupAntibotSettings(groupId, { known_bot_jids: settings.known_bot_jids });
    console.log(`Bot ${botJid} added to known bots for group ${groupId}.`);
  } else {
    console.log(`Bot ${botJid} is already in the known bots list for group ${groupId}.`);
  }
}

// Function to remove a known bot from a group's allowlist
function removeKnownBot(groupId, botJid) {
  const settings = getGroupAntibotSettings(groupId);
  const initialLength = settings.known_bot_jids.length;
  settings.known_bot_jids = settings.known_bot_jids.filter(jid => jid !== botJid);
  
  if (settings.known_bot_jids.length < initialLength) {
    updateGroupAntibotSettings(groupId, { known_bot_jids: settings.known_bot_jids });
    console.log(`Bot ${botJid} removed from known bots for group ${groupId}.`);
  } else {
    console.log(`Bot ${botJid} was not found in the known bots list for group ${groupId}.`);
  }
}

// Export the functions for external use
module.exports = {
  getGroupAntibotSettings,
  updateGroupAntibotSettings,
  isAntibotEnabled,
  getAntibotAction,
  addKnownBot,
  removeKnownBot,
};
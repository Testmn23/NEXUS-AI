const fs = require('fs');
const path = require('path');

// Path to the JSON file storing user rank data
const filePath = path.join(__dirname, '../xmd/users_rank.json');

// Load user rank data from JSON file
function loadRankData() {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return {}; // Default if file doesn't exist
  } catch (err) {
    console.error("Error loading rank data, returning empty object:", err);
    return {}; // Default on error
  }
}

// Save user rank data to JSON file
function saveRankData(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving rank data:", err);
  }
}

// Create default file if it doesn't exist
if (!fs.existsSync(filePath)) {
  saveRankData({});
}

// Function to increment user activity (XP and message count)
async function incrementUserActivity(groupId, userId) {
  try {
    const data = loadRankData();

    if (!data[groupId]) {
      data[groupId] = {};
    }

    if (!data[groupId][userId]) {
      data[groupId][userId] = { xp: 0, messages: 0 };
    }

    data[groupId][userId].xp += 10;
    data[groupId][userId].messages += 1;

    saveRankData(data);
    console.log(`User ${userId} activity in group ${groupId} updated. Current XP: ${data[groupId][userId].xp}, Messages: ${data[groupId][userId].messages}.`);
  } catch (error) {
    console.error("Error updating user activity:", error);
  }
}

// Function to get messages and XP by user ID and group ID
async function getUserStats(groupId, userId) {
  try {
    const data = loadRankData();

    if (data[groupId] && data[groupId][userId]) {
      return { messages: data[groupId][userId].messages, xp: data[groupId][userId].xp };
    } else {
      return { messages: 0, xp: 0 };
    }
  } catch (error) {
    console.error("Error retrieving user stats:", error);
    return { messages: 0, xp: 0 }; // Default values in case of error
  }
}

// Function to get the top users by XP in a specific group
async function getTopUsers(groupId, count = 10) {
  try {
    const data = loadRankData();

    if (!data[groupId]) {
      console.log(`Group ${groupId} not found for getTopUsers.`);
      return []; // Return an empty array if the group doesn't exist
    }

    const groupUsers = data[groupId];
    const sortedUsers = Object.keys(groupUsers)
      .map(userId => ({ 
        userId, 
        xp: groupUsers[userId].xp, 
        messages: groupUsers[userId].messages 
      }))
      .sort((a, b) => b.xp - a.xp) // Sort by XP in descending order
      .slice(0, count); // Get top 'count' users

    return sortedUsers;
  } catch (error) {
    console.error("Error retrieving top users:", error);
    return []; // Return an empty array in case of error
  }
}

// Function to set a user's XP to a specific amount
async function setUserXP(groupId, userId, newXpAmount) {
  try {
    if (typeof newXpAmount !== 'number' || newXpAmount < 0 || !Number.isInteger(newXpAmount)) {
      console.error("Invalid XP amount provided. XP must be a non-negative integer.");
      return;
    }
    const data = loadRankData();

    if (!data[groupId]) {
      data[groupId] = {};
    }
    if (!data[groupId][userId]) {
      data[groupId][userId] = { xp: 0, messages: 0 }; // Keep existing messages if any, though typically 0 for new user
    }

    data[groupId][userId].xp = newXpAmount;
    saveRankData(data);
    console.log(`XP for user ${userId} in group ${groupId} set to ${newXpAmount}.`);
  } catch (error) {
    console.error("Error setting user XP:", error);
  }
}

// Function to add (or subtract) XP from a user
async function addUserXP(groupId, userId, xpToAdd) {
  try {
    if (typeof xpToAdd !== 'number' || !Number.isInteger(xpToAdd)) {
      console.error("Invalid XP amount to add. XP must be an integer.");
      return;
    }
    const data = loadRankData();

    if (!data[groupId]) {
      data[groupId] = {};
    }
    if (!data[groupId][userId]) {
      data[groupId][userId] = { xp: 0, messages: 0 };
    }

    data[groupId][userId].xp += xpToAdd;
    if (data[groupId][userId].xp < 0) {
      data[groupId][userId].xp = 0; // Prevent XP from going below zero
    }
    saveRankData(data);
    console.log(`${xpToAdd} XP added to user ${userId} in group ${groupId}. New XP: ${data[groupId][userId].xp}.`);
  } catch (error) {
    console.error("Error adding user XP:", error);
  }
}

// Function to reset a user's rank (XP and messages)
async function resetUserRank(groupId, userId) {
  try {
    const data = loadRankData();

    if (!data[groupId]) {
      data[groupId] = {};
    }
    // Ensure user entry exists before resetting, or create it if it doesn't
    if (!data[groupId][userId]) {
      data[groupId][userId] = { xp: 0, messages: 0 };
    } else {
      data[groupId][userId].xp = 0;
      data[groupId][userId].messages = 0; // Also reset message count as per typical rank reset logic
    }
    
    saveRankData(data);
    console.log(`Rank for user ${userId} in group ${groupId} has been reset.`);
  } catch (error) {
    console.error("Error resetting user rank:", error);
  }
}

module.exports = {
  loadRankData,
  saveRankData,
  incrementUserActivity,
  getUserStats,
  getTopUsers,
  setUserXP,
  addUserXP,
  resetUserRank,
};

// database.js

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');

// Function to get data from the JSON file
const getData = () => {
    if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath);
        return JSON.parse(data);
    }
    return {}; // Return an empty object if the file doesn't exist
};

// Function to save data to the JSON file
const saveData = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Function to get server data by server ID
const getServerData = (serverId) => {
    const data = getData();
    return data[serverId] || {}; // Return server data or an empty object if not found
};

// Function to save server data
const saveServerData = (serverId, serverData) => {
    const data = getData();
    data[serverId] = serverData; // Store or update the server data
    saveData(data); // Save the updated data back to the JSON file
};

// Example of how to use the database functions
module.exports = {
    getData,
    saveData,
    getServerData,
    saveServerData,
};

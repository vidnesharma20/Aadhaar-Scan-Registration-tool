// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    // Google Sheets (for saving data - optional for now)
    SPREADSHEET_ID: "18p3oBvTo9AHtPYw8lyc6vN70OdbP63AM3WkigspUSaY",
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycby_yIkPyrkVB0G8Mgy_lkXHuj1-I2pB_NnMgNzcpSS2fCIUEZqarKqTwWkkHUbwLb7tWA/exec", // Add Google Apps Script URL when ready
    
    // OCR Settings
    USE_DEMO_MODE: false, // Set to true to test with dummy data
    OCR_LANGUAGE: 'eng', // English text
    
    // ImgBB API Key for photo upload
    IMGBB_API_KEY: "4696d2678ce1b24a9d1d9fe1d940e9cc",

    // Image preprocessing
    ENHANCE_IMAGE: true // Improves OCR accuracy
};


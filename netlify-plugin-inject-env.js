// Netlify build plugin to inject environment variables at runtime
module.exports = {
  onPreBuild: ({ utils }) => {
    console.log('Injecting environment variables for client-side access...');
  },
  
  onBuild: ({ utils }) => {
    // Create a script that will expose the environment variables to the client
    const envScript = `
      // This script is auto-generated during build
      window.env = window.env || {};
      window.env.VITE_GEMINI_API_KEY = "${process.env.VITE_GEMINI_API_KEY || ''}";
    `;
    
    // Write the script to the publish directory
    const fs = require('fs');
    fs.writeFileSync('./dist/env.js', envScript);
    console.log('Environment variables injected successfully!');
  }
};

import { GoogleGenerativeAI } from '@google/generative-ai';

// Declare the window.env property for TypeScript
declare global {
  interface Window {
    env?: {
      VITE_GEMINI_API_KEY?: string;
      [key: string]: any;
    };
  }
}

// Get API key from environment variables with multiple fallback options
const getApiKey = () => {
  // Try different ways to access the environment variable
  const viteEnvKey = import.meta.env.VITE_GEMINI_API_KEY;
  const windowEnvKey = window.env?.VITE_GEMINI_API_KEY;
  const processEnvKey = typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : undefined;
  
  // Use the first available source
  const API_KEY = viteEnvKey || windowEnvKey || processEnvKey;
  
  // Debug log to check if API key is loaded correctly (masked for security)
  if (API_KEY) {
    console.log('Gemini API Key loaded:', `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
  } else {
    console.error('Gemini API Key not found! Please check your environment variables.');
  }
  
  return API_KEY;
};

const API_KEY = getApiKey();

// Initialize the API
export const genAI = new GoogleGenerativeAI(API_KEY);

// Get the Gemini model with simplified configuration
// Using a simpler configuration to avoid potential compatibility issues
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest"
});

// Helper function for text-only generation
export async function generateText(prompt: string): Promise<string> {
  try {
    console.log('Sending request to Gemini API...');

    // Prepare a comprehensive prompt that includes navigation and booking assistance
    const formattedPrompt = `
      You are a helpful assistant for the Care-Coord healthcare platform. Your capabilities include:
      
      1. Providing general health information (but you cannot diagnose conditions or prescribe medications)
      2. Helping users navigate the website
      3. Assisting with booking appointments or lab tests
      
      Website Navigation Guide:
      - Home page: Overview of services and featured doctors
      - Departments page: Information about medical departments (Cardiology, Neurology, Pediatrics, Orthopedics, Dermatology)
      - Doctors page: Browse and search for doctors
      - Appointment page: Book medical appointments
      - Contact page: Contact information and form
      - About page: Information about Care-Coord
      - Profile page: User's personal information (requires login)
      
      
      IMPORTANT INSTRUCTIONS FOR LAB TESTS:
      - When a user asks about lab tests or scheduling a lab test, respond ONLY with: "I'll help you schedule a lab test with our system."
      - DO NOT provide a list of available lab tests
      - DO NOT attempt to schedule lab tests yourself
      - The system will handle lab test scheduling automatically
      
      IMPORTANT INSTRUCTIONS FOR APPOINTMENT BOOKING:
      - When a user asks to make an appointment, ALWAYS ask which department they need FIRST
      - NEVER suggest a specific department or doctor until the user has selected a department
      - NEVER assume which department a user wants based on previous conversations
      - ALWAYS start the appointment booking process by showing ALL available departments
      - Only after the user has selected a department, then show doctors for that department
      - DO NOT ask if the user is logged in - the system will handle this automatically
      
      User question: ${prompt}
      
      Provide a helpful, accurate, and ethical response. If the user wants to book an appointment or lab test, collect the necessary information and guide them through the process:
    `;

    const result = await geminiModel.generateContent(formattedPrompt);
    console.log('Received response from Gemini API');
    return result.response.text();
  } catch (error) {
    console.error("Error generating text with Gemini:", error);

    // Provide a clear error message about the API issue
    if (error instanceof Error) {
      console.error("Error details:", error.message);

      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
        return "I'm currently experiencing high demand. Please try again in a few minutes. For immediate health-related questions, please consult with a healthcare professional.";
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        return "The AI service is temporarily unavailable. Please try again later. For health-related questions, please consult with a healthcare professional.";
      }
    }

    return "I'm sorry, I encountered an error processing your request. Please try again later or consult with a healthcare professional for immediate assistance.";
  }
}

// Helper function for multimodal generation (text + image)
export async function generateTextFromImage(prompt: string, imageData: string): Promise<string> {
  try {
    // Parse the image data (base64)
    const imageBase64 = imageData.split(',')[1] || imageData;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg", // Adjust based on your image type
      },
    };

    // Try with the vision model - using simplified configuration
    console.log('Sending image to Gemini Vision API...');
    const visionModel = genAI.getGenerativeModel({
      model: "gemini-pro-vision"
    });

    // Prepare a health-focused prompt for the image
    const formattedPrompt = `
      You are a helpful healthcare assistant. 
      Analyze this image and provide general health information related to it.
      Remember that you cannot diagnose conditions or prescribe medications.
      Always recommend consulting with a healthcare professional for specific medical advice.
      Keep your answer concise and to the point.
    `;

    const result = await visionModel.generateContent([formattedPrompt, imagePart]);
    return result.response.text();
  } catch (error) {
    console.error("Error generating text from image with Gemini:", error);

    // Provide a clear error message about the API issue
    if (error instanceof Error) {
      console.error("Error details:", error.message);

      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
        return "I'm currently experiencing high demand and cannot process images. Please try again later or describe what you're seeing in text format.";
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        return "The image analysis service is temporarily unavailable. Please try again later or describe what you're seeing in text format.";
      }
    }

    return "I'm sorry, I encountered an error analyzing this image. Please try describing what you're seeing in text format instead.";
  }
}

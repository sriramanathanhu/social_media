// Development-only logging utility
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // API request logging
  apiRequest: (url: string, method: string, hasToken: boolean) => {
    if (isDevelopment) {
      console.log(`🌐 API ${method.toUpperCase()}:`, url, hasToken ? '🔐' : '🔓');
    }
  },
  
  // API error logging
  apiError: (error: any) => {
    if (isDevelopment) {
      console.error('🚨 API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
  }
};

export default logger;
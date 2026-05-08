// Central API configuration for the extension
// Update API_BASE_URL below when backend URL changes
export const API_BASE_URL = 'https://b0gkssgo44c4g0400c4wk800.185.194.217.131.sslip.io';

export const API_ENDPOINTS = {
  getSession: `${API_BASE_URL}/api/get-session`,
  getSessionsList: `${API_BASE_URL}/api/get-sessions-list`,
  extensionLogin: `${API_BASE_URL}/api/extension/login`,
} as const;

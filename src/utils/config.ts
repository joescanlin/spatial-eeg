export interface Settings {
  API_BASE_URL?: string;
}

export const getSettings = (): Settings => {
  return {
    API_BASE_URL: process.env.REACT_APP_API_BASE_URL || '/api',
  };
}; 
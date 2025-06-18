// src/api/api.js

export const API_BASE_URL = 'http://127.0.0.1:8000/api';
export const DJANGO_DOMAIN_URL = 'http://127.0.0.1:8000';

/**
 * Retrieves the authentication token from local storage.
 * @returns {string|null} The auth token or null if not found.
 */
export const getAuthToken = () => localStorage.getItem('authToken');

/**
 * A helper function for making API requests to the Django backend.
 * @param {string} endpoint - The API endpoint to hit (e.g., '/tasks/').
 * @param {string} [method='GET'] - The HTTP method to use.
 * @param {object|FormData|null} [body=null] - The request body for POST/PATCH/PUT requests.
 * @param {boolean} [isFormData=false] - Set to true if the body is a FormData object.
 * @param {string} [responseType='json'] - The expected response type ('json' or 'blob').
 * @returns {Promise<any>} The response data from the API.
 */
export const apiRequest = async (endpoint, method = 'GET', body = null, isFormData = false, responseType = 'json') => {
  const headers = {};
  
  // Set Content-Type header for JSON payloads
  if (!isFormData && body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
  }

  // Add the authorization token to the headers if it exists
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      // Attempt to parse error response, otherwise use status text
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('API Error:', response.status, errorData);
      
      // Handle detailed validation errors from Django Rest Framework
      if (response.status === 400 && typeof errorData === 'object' && errorData !== null) {
        const messages = Object.entries(errorData).map(([key, value]) => {
            if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
            if (typeof value === 'object' && value !== null) return `${key}: ${JSON.stringify(value)}`;
            return `${key}: ${value}`;
        }).join('; ');
        throw new Error(messages || `La requête a echoue avec le statut ${response.status}`);
      }
      
      throw new Error(errorData.detail || errorData.message || errorData.error || `La requête a echoue avec le statut ${response.status}`);
    }

    // Handle responses with no content
    if (response.status === 204) {
      return null;
    }

    // Handle different response types
    if (responseType === 'blob') {
      return response.blob();
    }
    return response.json();

  } catch (error) {
    console.error(`La requête API vers ${endpoint} a echoue:`, error);
    throw error;
  }
};

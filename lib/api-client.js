/**
 * Safely parses JSON responses from fetch calls.
 * If the response is not valid JSON (e.g. HTML returned due to error or proxy redirects),
 * it logs request details, HTTP status code, and a response body preview, then throws a clean error.
 * 
 * @param {Response} res The Fetch API Response object
 * @param {string} [url] Optional request URL for logging
 * @returns {Promise<any>} Parsed JSON data
 */
export async function parseJsonResponse(res, url = '') {
  const contentType = res.headers.get("content-type");
  const requestUrl = url || res.url || 'unknown URL';
  
  if (!contentType || !contentType.includes("application/json")) {
    let text = '';
    try {
      text = await res.text();
    } catch (_) {
      text = '[Could not read response body]';
    }
    
    const status = res.status;
    const preview = text.slice(0, 300);
    
    console.error(`[API ERROR] Non-JSON response received.
- Request URL: ${requestUrl}
- Status Code: ${status}
- Response Preview: ${preview}`);
    
    throw new Error(`Server returned unexpected response (status ${status}). Please try again later.`);
  }

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  
  return data;
}

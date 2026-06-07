// Retry helper for Safari 18 intermittent CORS failures when fetching images
export const verifyImageUrlWithRetry = async (
  url: string,
  maxRetries = 3
): Promise<boolean> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.log(`[ImageUtils] Fetch attempt ${attempt + 1} failed for ${url}`, err);
    }
    
    // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
    if (attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt) * 500;
      console.log(`[ImageUtils] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
};

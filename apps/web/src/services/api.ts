const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export async function getApiMessage(): Promise<string> {
  const response = await fetch(API_BASE_URL);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.text();
}
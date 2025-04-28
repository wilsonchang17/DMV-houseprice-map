// src/services/chatbotApi.js
class ChatbotAPI {
    constructor(baseUrl = 'http://127.0.0.1:8000') {
      this.baseUrl = baseUrl;
      this.endpoint = '/api/chat';
    }
  
    async askQuestion(question) {
      try {
        const response = await fetch(`${this.baseUrl}${this.endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
        });

        if (!response.ok) {
          let errorDetail = `HTTP error ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
          } catch (e) {
            // Ignore if error response is not JSON
          }
          throw new Error(errorDetail);
        }

        return await response.json();
      } catch (error) {
        console.error('Chatbot API error:', error);
        throw error;
      }
    }
}
  
export default ChatbotAPI;
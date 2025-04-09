function MainComponent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const chatContainerRef = useRef(null);
  
  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: (message) => {
      setMessages(prev => [...prev, { role: 'assistant', content: message }]);
      setStreamingMessage('');
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      // First, get search results
      const searchResponse = await fetch(`/integrations/google-search/search?q=${encodeURIComponent(input)}`);
      if (!searchResponse.ok) throw new Error('Search failed');
      const searchData = await searchResponse.json();
      
      // Prepare context with search results
      const searchContext = searchData.items
        .slice(0, 3)
        .map(item => `${item.title}\n${item.snippet}`)
        .join('\n\n');

      // Send to AI with search context
      const aiResponse = await fetch('/integrations/google-gemini-1-5/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant. Use the provided search results to give accurate and up-to-date information. Be concise and friendly in your responses.'
            },
            {
              role: 'user',
              content: `Search results:\n${searchContext}\n\nUser question: ${input}`
            }
          ],
          stream: true
        })
      });

      if (!aiResponse.ok) throw new Error('AI response failed');
      handleStreamResponse(aiResponse);
    } catch (err) {
      console.error(err);
      setError('Sorry, something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh'
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        marginBottom: '20px',
        padding: '20px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }} ref={chatContainerRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: '12px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: msg.role === 'user' ? '#007bff' : '#ffffff',
              color: msg.role === 'user' ? '#ffffff' : '#000000',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {msg.content}
          </div>
        ))}
        {streamingMessage && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            marginBottom: '12px',
            maxWidth: '80%'
          }}>
            {streamingMessage}
          </div>
        )}
        {error && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#ff4444',
            color: 'white',
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        gap: '10px'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            fontSize: '16px'
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#007bff',
            color: '#ffffff',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Code, Settings, Bot, User, Sparkles, Command } from 'lucide-react';

const AIInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [activeTool, setActiveTool] = useState('chat');
  const [settings, setSettings] = useState({
    falKey: '',
    openaiKey: '',
    anthropicKey: '',
    elevenlabsKey: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  const tools = [
    { id: 'chat', name: 'Chat', icon: Bot, description: 'General conversation' },
    { id: 'image', name: 'Generate Image', icon: Image, description: 'Create images with AI' },
    { id: 'code', name: 'Analyze Code', icon: Code, description: 'Code analysis and generation' },
    { id: 'settings', name: 'Settings', icon: Settings, description: 'Configure AI services' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, tool: activeTool };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response;
      
      switch (activeTool) {
        case 'chat':
          response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parameters: {
                messages: [{ role: 'user', content: input }],
                model: 'gpt-4'
              }
            })
          });
          break;
          
        case 'image':
          response = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parameters: {
                prompt: input,
                aspect_ratio: '16:9',
                guidance_scale: 7.5
              }
            })
          });
          break;
          
        case 'code':
          response = await fetch('/api/ai/analyze-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parameters: {
                code: input,
                language: 'javascript',
                task: 'explain'
              }
            })
          });
          break;
          
        default:
          throw new Error('Unknown tool');
      }

      const data = await response.json();
      
      if (data.success) {
        const aiMessage = { 
          role: 'assistant', 
          content: typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2),
          tool: activeTool 
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to process request');
      }
    } catch (error) {
      const errorMessage = { 
        role: 'assistant', 
        content: `Error: ${error.message}`,
        tool: activeTool,
        isError: true 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  };

  const handleSettingsSave = () => {
    // Save settings to backend
    fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    setShowSettings(false);
  };

  const CommandPalette = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
        <div className="flex items-center mb-4">
          <Command className="w-5 h-5 mr-2 text-gray-500" />
          <input
            type="text"
            placeholder="Type a command..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowCommandPalette(false);
            }}
          />
        </div>
        <div className="space-y-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setShowCommandPalette(false);
              }}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <tool.icon className="w-4 h-4 mr-3" />
              <div>
                <div className="font-medium">{tool.name}</div>
                <div className="text-sm text-gray-500">{tool.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const SettingsPanel = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">AI Service Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">FAL AI Key</label>
            <input
              type="password"
              value={settings.falKey}
              onChange={(e) => setSettings(prev => ({ ...prev, falKey: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter your FAL AI key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={settings.openaiKey}
              onChange={(e) => setSettings(prev => ({ ...prev, openaiKey: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter your OpenAI API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
            <input
              type="password"
              value={settings.anthropicKey}
              onChange={(e) => setSettings(prev => ({ ...prev, anthropicKey: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter your Anthropic API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ElevenLabs API Key</label>
            <input
              type="password"
              value={settings.elevenlabsKey}
              onChange={(e) => setSettings(prev => ({ ...prev, elevenlabsKey: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter your ElevenLabs API key"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSettingsSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">AI Assistant</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              ⌘K
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Tool Tabs */}
        <div className="flex space-x-1 mt-3">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`px-3 py-1 text-sm rounded-md flex items-center space-x-1 ${
                activeTool === tool.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <tool.icon className="w-3 h-3" />
              <span>{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : message.isError
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
            }`}>
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                {message.role === 'user' && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <div className="text-sm text-gray-500">AI is thinking...</div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white dark:bg-gray-800 p-4">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type your ${activeTool} request... (⌘K for commands)`}
            className="flex-1 resize-none border-0 focus:ring-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCommandPalette && <CommandPalette />}
      {showSettings && <SettingsPanel />}
    </div>
  );
};

export default AIInterface;
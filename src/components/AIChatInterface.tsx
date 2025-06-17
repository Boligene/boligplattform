import { Bot, Clock, Lightbulb, MessageSquare, Send, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { BoligAnalyse, ChatMessage } from '../types/ai.types';

// Simple ID generator for browser compatibility
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

interface AIChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  boligContext?: BoligAnalyse;
  className?: string;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  messages,
  onSendMessage,
  boligContext,
  className = ''
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageToSend = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    try {
      await onSendMessage(messageToSend);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    'Hva er de største risikoene ved denne boligen?',
    'Hvor mye bør jeg by?',
    'Hvilke spørsmål skal jeg stille på visning?',
    'Er dette en god investering?',
    'Hva med finansiering?'
  ];

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('no-NO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Boligrådgiver</h3>
            <p className="text-sm text-gray-600">
              {boligContext ? 
                `Spør meg om ${boligContext.finn_url ? 'denne boligen' : 'boliganalysen'}` : 
                'Spør meg om boligkjøp og finansiering'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">Start en samtale</h4>
            <p className="text-gray-500 mb-4">Spør meg om noe angående denne boligen eller boligkjøp generelt</p>
            
            {/* Quick Questions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">Eksempel spørsmål:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-blue-100 p-2 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`flex items-center gap-1 mt-2 text-xs ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {formatMessageTime(message.timestamp)}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="bg-blue-600 p-2 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="bg-blue-100 p-2 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">AI tenker...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions (when there are messages) */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Hurtigspørsmål:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={generateId()}
                onClick={() => handleQuickQuestion(question)}
                className="px-2 py-1 text-xs bg-white border border-gray-200 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Skriv ditt spørsmål her..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}; 
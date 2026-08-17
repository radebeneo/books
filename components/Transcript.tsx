'use client';

import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { Messages } from '@/types';

interface TranscriptProps {
    messages: Messages[];
    currentMessage: string;
    currentUserMessage: string;
}

const Transcript = ({ messages, currentMessage, currentUserMessage }: TranscriptProps) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom whenever messages or streaming content changes
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentMessage, currentUserMessage]);

    const isEmpty =
        messages.length === 0 && !currentMessage && !currentUserMessage;

    return (
        <div className="transcript-container">
            {isEmpty ? (
                <div className="transcript-empty">
                    <Mic className="w-12 h-12 text-[var(--text-muted)] opacity-50 mb-4" />
                    <p className="transcript-empty-text">No conversation yet</p>
                    <p className="transcript-empty-hint">
                        Click the mic button above to start talking
                    </p>
                </div>
            ) : (
                <div className="transcript-messages">
                    {/* Committed messages */}
                    {messages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div
                                key={index}
                                className={`transcript-message ${isUser ? 'transcript-message-user' : 'transcript-message-assistant'}`}
                            >
                                <div
                                    className={`transcript-bubble ${isUser ? 'transcript-bubble-user' : 'transcript-bubble-assistant'}`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })}

                    {/* Actively streaming user message */}
                    {currentUserMessage && (
                        <div className="transcript-message transcript-message-user">
                            <div className="transcript-bubble transcript-bubble-user">
                                {currentUserMessage}
                                <span className="transcript-cursor" aria-hidden="true" />
                            </div>
                        </div>
                    )}

                    {/* Actively streaming assistant message */}
                    {currentMessage && (
                        <div className="transcript-message transcript-message-assistant">
                            <div className="transcript-bubble transcript-bubble-assistant">
                                {currentMessage}
                                <span className="transcript-cursor" aria-hidden="true" />
                            </div>
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
};

export default Transcript;
